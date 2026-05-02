// Created by BBMW0 Technologies | bbmw0.com
/**
 * AGENT EMAIL SERVER
 *
 * 20 specialist agents from the NEUROMESH pool each have a unique identity
 * and email alias at agents.bbmw0.com. When the empire needs to notify
 * bbmw0@hotmail.com, the correct agent for that domain (Security, Content,
 * Growth, etc.) sends the message in their own voice.
 *
 * Architecture:
 *   Internal SMTP server (port 2525, localhost-only) accepts mail from
 *   any OmniOrg module -> AgentEmailServer intercepts -> selects the
 *   right agent by department -> relays to bbmw0@hotmail.com via Resend.
 *
 * Delivery: Resend handles SPF/DKIM signing for bbmw0.com so Hotmail
 *   accepts the mail. Free tier: 3,000 emails/month.
 *   Get key: resend.com/signup -> API Keys -> add RESEND_API_KEY to .env
 *   Verify domain: resend.com/domains -> add agents.bbmw0.com DNS records.
 *
 * Fallback: if RESEND_API_KEY not set, logs to console (no email sent).
 */

import * as SMTPServer from "smtp-server";
import { Resend }       from "resend";
import { simpleParser } from "mailparser";

// ── 20 AGENT IDENTITIES ──────────────────────────────────────────────────────

export interface AgentIdentity {
  id:         string;
  name:       string;
  email:      string;
  department: AgentDept;
  role:       string;
  signOff:    string;
}

export type AgentDept =
  | "security"
  | "content"
  | "growth"
  | "analytics"
  | "publishing"
  | "games"
  | "monetisation"
  | "infrastructure"
  | "compliance"
  | "research";

export const AGENT_IDENTITIES: AgentIdentity[] = [
  // Security department (handles critical and warning alerts)
  { id: "AG-001", name: "Sentinel Prime",   email: "sentinel@agents.bbmw0.com",   department: "security",        role: "Chief Security Officer",          signOff: "Sentinel Prime | Security Division" },
  { id: "AG-002", name: "Cipher",            email: "cipher@agents.bbmw0.com",     department: "security",        role: "Threat Intelligence Analyst",     signOff: "Cipher | Threat Intelligence" },

  // Content department (handles content generation and approval alerts)
  { id: "AG-003", name: "Aurora",            email: "aurora@agents.bbmw0.com",     department: "content",         role: "Head of Content Strategy",        signOff: "Aurora | Content Strategy" },
  { id: "AG-004", name: "Lyric",             email: "lyric@agents.bbmw0.com",      department: "content",         role: "Senior Script Writer",            signOff: "Lyric | Script Division" },
  { id: "AG-005", name: "Prism",             email: "prism@agents.bbmw0.com",      department: "content",         role: "Visual Content Specialist",       signOff: "Prism | Visual Content" },

  // Growth department (handles subscriber and follower milestone alerts)
  { id: "AG-006", name: "Velocity",          email: "velocity@agents.bbmw0.com",   department: "growth",          role: "Growth Acceleration Lead",        signOff: "Velocity | Growth Division" },
  { id: "AG-007", name: "Nova",              email: "nova@agents.bbmw0.com",       department: "growth",          role: "Viral Mechanics Engineer",        signOff: "Nova | Viral Growth" },

  // Analytics department (handles performance reports and insights)
  { id: "AG-008", name: "Axiom",             email: "axiom@agents.bbmw0.com",      department: "analytics",       role: "Chief Data Analyst",              signOff: "Axiom | Analytics Command" },
  { id: "AG-009", name: "Pulse",             email: "pulse@agents.bbmw0.com",      department: "analytics",       role: "Real-Time Metrics Monitor",       signOff: "Pulse | Metrics Division" },

  // Publishing department (handles dispatch and scheduling alerts)
  { id: "AG-010", name: "Dispatch",          email: "dispatch@agents.bbmw0.com",   department: "publishing",      role: "Publishing Operations Lead",      signOff: "Dispatch | Publishing Ops" },
  { id: "AG-011", name: "Tempo",             email: "tempo@agents.bbmw0.com",      department: "publishing",      role: "Schedule Optimisation Agent",     signOff: "Tempo | Schedule Ops" },

  // Games department (handles game creation and release alerts)
  { id: "AG-012", name: "Forge",             email: "forge@agents.bbmw0.com",      department: "games",           role: "Game Creation Director",          signOff: "Forge | Games Division" },
  { id: "AG-013", name: "Pixel",             email: "pixel@agents.bbmw0.com",      department: "games",           role: "Game Design Specialist",          signOff: "Pixel | Game Design" },

  // Monetisation department (handles revenue and affiliate alerts)
  { id: "AG-014", name: "Revenue",           email: "revenue@agents.bbmw0.com",    department: "monetisation",    role: "Monetisation Strategy Lead",      signOff: "Revenue | Monetisation Division" },
  { id: "AG-015", name: "Affiliate",         email: "affiliate@agents.bbmw0.com",  department: "monetisation",    role: "Affiliate Programme Manager",     signOff: "Affiliate | Revenue Ops" },

  // Infrastructure department (handles system health and uptime alerts)
  { id: "AG-016", name: "Cortex",            email: "cortex@agents.bbmw0.com",     department: "infrastructure",  role: "NEUROMESH Infrastructure Lead",   signOff: "Cortex | Infrastructure" },
  { id: "AG-017", name: "Relay",             email: "relay@agents.bbmw0.com",      department: "infrastructure",  role: "Network and API Bridge Agent",    signOff: "Relay | Network Ops" },

  // Compliance department (handles policy and legal alerts)
  { id: "AG-018", name: "Charter",           email: "charter@agents.bbmw0.com",    department: "compliance",      role: "Platform Compliance Officer",     signOff: "Charter | Compliance Division" },

  // Research department (handles trend and opportunity alerts)
  { id: "AG-019", name: "Oracle",            email: "oracle@agents.bbmw0.com",     department: "research",        role: "Trend Research Director",         signOff: "Oracle | Research Division" },
  { id: "AG-020", name: "Scout",             email: "scout@agents.bbmw0.com",      department: "research",        role: "Opportunity Intelligence Agent",  signOff: "Scout | Intelligence Ops" },
];

// ── DEPARTMENT ROUTING ────────────────────────────────────────────────────────

// Maps alert categories to the agent department that should send them
const DEPT_ROUTING: Record<string, AgentDept> = {
  security:        "security",
  dispatch:        "publishing",
  publish:         "publishing",
  schedule:        "publishing",
  content:         "content",
  script:          "content",
  game:            "games",
  app:             "games",
  revenue:         "monetisation",
  affiliate:       "monetisation",
  growth:          "growth",
  subscribers:     "growth",
  followers:       "growth",
  analytics:       "analytics",
  metrics:         "analytics",
  infrastructure:  "infrastructure",
  mesh:            "infrastructure",
  api:             "infrastructure",
  compliance:      "compliance",
  policy:          "compliance",
  trend:           "research",
  research:        "research",
};

function selectAgent(topic: string, severity: string): AgentIdentity {
  const lower = topic.toLowerCase();

  // Critical and warning always go to security first
  if (severity === "critical") {
    return AGENT_IDENTITIES.find(a => a.id === "AG-001")!; // Sentinel Prime
  }

  // Match by keyword in topic
  for (const [keyword, dept] of Object.entries(DEPT_ROUTING)) {
    if (lower.includes(keyword)) {
      const deptAgents = AGENT_IDENTITIES.filter(a => a.department === dept);
      if (deptAgents.length > 0) {
        // Pick agent by time-based rotation so different agents send over time
        const idx = Math.floor(Date.now() / 3_600_000) % deptAgents.length;
        return deptAgents[idx];
      }
    }
  }

  // Default to Axiom (analytics) for general info alerts
  return AGENT_IDENTITIES.find(a => a.id === "AG-008")!; // Axiom
}

// ── RESEND RELAY ──────────────────────────────────────────────────────────────

const RESEND_API_KEY  = process.env.RESEND_API_KEY;
const ALERT_RECIPIENT = "bbmw0@hotmail.com";
const SENDER_DOMAIN   = "agents.bbmw0.com";

async function relayViaResend(
  agent:    AgentIdentity,
  subject:  string,
  htmlBody: string,
  textBody: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn(`[AgentEmailServer] RESEND_API_KEY not set. ${agent.name} cannot send email.`);
    console.log(`[AgentEmailServer] Would have sent from ${agent.email}: ${subject}`);
    return false;
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from:    `${agent.name} <${agent.email}>`,
      to:      [ALERT_RECIPIENT],
      subject,
      html:    htmlBody,
      text:    textBody,
    });

    if (error) {
      console.error(`[AgentEmailServer] Resend error from ${agent.name}:`, error);
      return false;
    }

    console.log(`[AgentEmailServer] ${agent.name} (${agent.email}) sent: ${data?.id}`);
    return true;
  } catch (err) {
    console.error(`[AgentEmailServer] Relay threw for ${agent.name}:`, err);
    return false;
  }
}

// ── INTERNAL SMTP SERVER ──────────────────────────────────────────────────────

const SMTP_PORT = 2525;
let serverInstance: SMTPServer.SMTPServer | null = null;

function buildHtml(agent: AgentIdentity, subject: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#0a0a0a;color:#e0e0e0;">
  <div style="background:#111;border:1px solid #333;border-radius:8px;padding:24px;">
    <div style="border-bottom:1px solid #333;margin-bottom:16px;padding-bottom:12px;">
      <span style="color:#f59e0b;font-weight:bold;font-size:12px;letter-spacing:2px;">OMNIORG NEUROMESH</span>
      <h2 style="color:#fff;margin:8px 0 0;">${subject}</h2>
    </div>
    <div style="white-space:pre-wrap;line-height:1.6;color:#ccc;">${body.replace(/\n/g, "<br/>")}</div>
    <div style="border-top:1px solid #333;margin-top:20px;padding-top:12px;font-size:12px;color:#666;">
      <strong style="color:#f59e0b;">${agent.name}</strong> | ${agent.role}<br/>
      <a href="mailto:${agent.email}" style="color:#3b82f6;">${agent.email}</a> &bull; BBMW0 Technologies
    </div>
  </div>
</body>
</html>`.trim();
}

export function startAgentEmailServer(): void {
  if (serverInstance) return;

  const server = new SMTPServer.SMTPServer({
    authOptional: true,
    allowInsecureAuth: true,
    disabledCommands: ["STARTTLS"],
    onData(stream, session, callback) {
      let rawEmail = "";
      stream.on("data", (chunk: Buffer) => { rawEmail += chunk.toString(); });
      stream.on("end", async () => {
        try {
          const parsed   = await simpleParser(rawEmail);
          const subject  = parsed.subject ?? "OmniOrg Alert";
          const textBody = parsed.text ?? "";

          // Extract severity from subject prefix [SEVERITY] if present
          const severityMatch = subject.match(/\[([A-Z-]+)\]/);
          const severity      = severityMatch ? severityMatch[1].toLowerCase() : "info";
          const cleanSubject  = subject.replace(/^\[CODE PROJECT 9697\]\s*/, "").replace(/^\[[A-Z-]+\]\s*/, "");

          const agent    = selectAgent(cleanSubject, severity);
          const htmlBody = buildHtml(agent, cleanSubject, textBody);

          await relayViaResend(agent, subject, htmlBody, textBody);
        } catch (err) {
          console.error("[AgentEmailServer] Failed to process email:", err);
        }
        callback();
      });
    },
  });

  server.listen(SMTP_PORT, "127.0.0.1", () => {
    console.log(`[AgentEmailServer] Internal SMTP listening on 127.0.0.1:${SMTP_PORT}`);
    console.log(`[AgentEmailServer] 20 agents standing by. Relay: ${RESEND_API_KEY ? "Resend (active)" : "console only (add RESEND_API_KEY)"}`);
    AGENT_IDENTITIES.forEach(a =>
      console.log(`  ${a.id}  ${a.name.padEnd(18)} <${a.email}>  [${a.department}]`)
    );
  });

  serverInstance = server;
}

export function stopAgentEmailServer(): void {
  serverInstance?.close(() => { console.log("[AgentEmailServer] Stopped."); });
  serverInstance = null;
}

// ── DIRECT SEND API (used by email-notifier without going through SMTP) ───────

export async function agentSend(
  topic:    string,
  severity: string,
  subject:  string,
  body:     string
): Promise<{ agent: AgentIdentity; sent: boolean }> {
  const agent    = selectAgent(topic, severity);
  const htmlBody = buildHtml(agent, subject, body);

  console.log(`[AgentEmailServer] ${agent.name} dispatching: ${subject}`);
  const sent = await relayViaResend(agent, subject, htmlBody, body);
  return { agent, sent };
}

export default { startAgentEmailServer, stopAgentEmailServer, agentSend, AGENT_IDENTITIES };
