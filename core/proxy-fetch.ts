// Created by BBMW0 Technologies | bbmw0.com
/**
 * PROXY-FETCH - IP Protection Layer
 *
 * All outbound HTTP requests in OmniOrg route through this module.
 * Your real IP address never reaches target servers when a proxy is configured.
 *
 * Uses undici (Node 18+ built-in) for proxy support - no external ESM packages needed.
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
 */

import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(__dirname, "../.env") });

const PROXY_URL = process.env.OMNIORG_PROXY_URL ?? null;

// Lazy-loaded dispatcher (initialised once on first proxied request)
let _dispatcher: object | null | undefined = undefined;

function getDispatcher(): object | null {
  if (_dispatcher !== undefined) return _dispatcher;

  if (!PROXY_URL) {
    _dispatcher = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const undici = require("undici") as {
      ProxyAgent: new (opts: { uri: string }) => object;
      Socks5ProxyAgent: new (opts: { uri: string }) => object;
    };

    if (PROXY_URL.startsWith("socks")) {
      _dispatcher = new undici.Socks5ProxyAgent({ uri: PROXY_URL });
      console.log(`[ProxyFetch] SOCKS5 proxy active: ${PROXY_URL.replace(/:[^:@]+@/, ":***@")}`);
    } else {
      _dispatcher = new undici.ProxyAgent({ uri: PROXY_URL });
      console.log(`[ProxyFetch] HTTP proxy active: ${PROXY_URL.replace(/:[^:@]+@/, ":***@")}`);
    }
  } catch (err) {
    console.error(`[ProxyFetch] Failed to initialise proxy dispatcher: ${err}. Using direct connection.`);
    _dispatcher = null;
  }

  return _dispatcher;
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
  const dispatcher = getDispatcher();

  if (!dispatcher) {
    return fetch(url, init);
  }

  // undici's fetch accepts a `dispatcher` option not in standard TS RequestInit
  return fetch(url, {
    ...init,
    // @ts-expect-error - undici dispatcher option not in standard RequestInit types
    dispatcher,
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
