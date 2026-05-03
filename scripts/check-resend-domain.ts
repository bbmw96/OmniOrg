// Created by BBMW0 Technologies | bbmw0.com
// Polls Resend API for agents.bbmw0.com domain verification status.
// Runs via Task Scheduler every 30 min until status is "verified".
// Sends a confirmation email to bbmw0@hotmail.com when green.

import "../api/env";
import { Resend } from "resend";
import { execFileSync } from "child_process";

const DOMAIN  = "agents.bbmw0.com";
const NOTIFY  = "bbmw0@hotmail.com";
const API_KEY = process.env.RESEND_API_KEY;

async function main(): Promise<void> {
  if (!API_KEY) {
    console.error("[DomainCheck] RESEND_API_KEY not set in .env");
    process.exit(1);
  }

  const resend = new Resend(API_KEY);

  const { data, error } = await resend.domains.list();

  if (error || !data) {
    console.error("[DomainCheck] Failed to fetch domains:", error);
    process.exit(1);
  }

  const domain = (data as { data?: Array<{ name: string; status: string }> })
    .data?.find(d => d.name === DOMAIN);

  if (!domain) {
    console.log(`[DomainCheck] ${DOMAIN} not found in Resend  -  add it at resend.com/domains first.`);
    process.exit(0);
  }

  console.log(`[DomainCheck] ${DOMAIN} status: ${domain.status}`);

  if (domain.status === "verified") {
    console.log("[DomainCheck] Domain verified! Sending confirmation email...");

    await resend.emails.send({
      from:    `Sentinel Prime <sentinel@${DOMAIN}>`,
      to:      [NOTIFY],
      subject: "[CODE PROJECT 9697] agents.bbmw0.com VERIFIED",
      html: `
        <div style="font-family:Arial,sans-serif;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;max-width:600px;">
          <div style="color:#f59e0b;font-size:12px;letter-spacing:2px;font-weight:bold;">OMNIORG NEUROMESH</div>
          <h2 style="color:#22c55e;margin:12px 0;">Domain Verified</h2>
          <p>All 20 NEUROMESH agents are now cleared to send email from <strong style="color:#f59e0b;">agents.bbmw0.com</strong>.</p>
          <p>The daily empire run at 07:00 will deliver alerts to this address from their individual agent identities.</p>
          <div style="border-top:1px solid #333;margin-top:20px;padding-top:12px;font-size:12px;color:#666;">
            Sentinel Prime | Security Division &bull; BBMW0 Technologies
          </div>
        </div>`,
      text: "agents.bbmw0.com is verified. All 20 NEUROMESH agents are cleared to send email.",
    });

    console.log("[DomainCheck] Confirmation sent to bbmw0@hotmail.com");

    // Self-remove the polling task now that verification is complete
    try {
      execFileSync("schtasks", ["/Delete", "/TN", "OmniOrg Domain Check", "/F"]);
      console.log("[DomainCheck] Polling task removed.");
    } catch { /* task may not exist on first run */ }

    process.exit(0);
  }

  console.log(`[DomainCheck] Not yet verified (${domain.status}). Will check again in 30 min.`);
  process.exit(0);
}

main().catch(err => {
  console.error("[DomainCheck] Error:", err);
  process.exit(1);
});
