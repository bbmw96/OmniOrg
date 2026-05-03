// Created by BBMW0 Technologies | bbmw0.com
/**
 * PROXY-FETCH - IP Protection Layer
 *
 * All outbound HTTP requests in OmniOrg route through this module.
 * Your real IP address never reaches target servers when a proxy is configured.
 *
 * Configuration via .env:
 *   OMNIORG_PROXY_URL=socks5://127.0.0.1:1080   (Mullvad / ProtonVPN SOCKS5)
 *   OMNIORG_PROXY_URL=http://127.0.0.1:8888      (HTTP proxy / Burp / Charles)
 *   OMNIORG_PROXY_URL=socks5://username:pass@host:port  (authenticated proxy)
 *
 * Mullvad VPN SOCKS5 proxy (recommended - strongest privacy):
 *   1. Install Mullvad VPN: mullvad.net
 *   2. Connect to any server
 *   3. Enable SOCKS5 proxy in Mullvad app (Settings > SOCKS5)
 *   4. Set OMNIORG_PROXY_URL=socks5://127.0.0.1:1080
 *
 * When OMNIORG_PROXY_URL is not set: standard fetch is used (no proxy).
 * No crash, no failure - proxy is opt-in and silently skipped if unconfigured.
 */

import { SocksProxyAgent } from "socks-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(__dirname, "../.env") });

const PROXY_URL = process.env.OMNIORG_PROXY_URL ?? null;

// Build agent once at startup - reused for all requests
let _agent: SocksProxyAgent | HttpsProxyAgent<string> | null = null;

function getAgent(): SocksProxyAgent | HttpsProxyAgent<string> | null {
  if (!PROXY_URL) return null;
  if (_agent) return _agent;

  try {
    if (PROXY_URL.startsWith("socks")) {
      _agent = new SocksProxyAgent(PROXY_URL);
      console.log(`[ProxyFetch] SOCKS5 proxy active: ${PROXY_URL.replace(/:[^:@]+@/, ":***@")}`);
    } else {
      _agent = new HttpsProxyAgent(PROXY_URL);
      console.log(`[ProxyFetch] HTTP proxy active: ${PROXY_URL.replace(/:[^:@]+@/, ":***@")}`);
    }
  } catch (err) {
    console.error(`[ProxyFetch] Failed to initialise proxy agent: ${err}. Using direct connection.`);
    return null;
  }

  return _agent;
}

/**
 * Drop-in replacement for global fetch.
 * Routes through configured proxy if OMNIORG_PROXY_URL is set.
 * Falls back to direct fetch silently if no proxy is configured.
 *
 * Usage:
 *   import { proxyFetch } from "../../core/proxy-fetch";
 *   const resp = await proxyFetch(url, { headers: {...} });
 */
export async function proxyFetch(
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const agent = getAgent();

  if (!agent) {
    // No proxy configured - use standard fetch
    return fetch(url, init);
  }

  // Node 18+ fetch supports dispatcher/agent via undici options
  // Cast to any to pass the agent through - undici accepts this
  return fetch(url, {
    ...init,
    // @ts-expect-error - undici accepts agent option not in TS types
    agent,
  });
}

/**
 * POST helper using proxyFetch.
 */
export async function proxyPost(
  url: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<Response> {
  return proxyFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

/**
 * Returns true if a proxy is currently configured and active.
 */
export function isProxyActive(): boolean {
  return PROXY_URL !== null;
}

/**
 * Returns the masked proxy URL for safe logging (passwords hidden).
 */
export function proxyStatus(): string {
  if (!PROXY_URL) return "No proxy - direct connection";
  return `Proxy: ${PROXY_URL.replace(/:[^:@]+@/, ":***@")}`;
}
