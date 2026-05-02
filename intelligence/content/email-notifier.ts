// Created by BBMW0 Technologies | bbmw0.com
/**
 * EMAIL NOTIFIER
 *
 * Routes all CODE PROJECT 9697 alerts through the AgentEmailServer.
 * 20 specialist agents (security, content, growth, analytics, etc.)
 * each have a unique identity at agents.bbmw0.com. The correct agent
 * for the alert type is selected automatically and sends the email
 * to bbmw0@hotmail.com via Resend.
 *
 * No personal Gmail account is used. Each email comes from a distinct
 * agent identity, so you know at a glance which division is reporting.
 *
 * Setup required:
 *   1. RESEND_API_KEY= in .env  (resend.com/signup, free 3,000/month)
 *   2. Verify agents.bbmw0.com in Resend DNS settings (one-time, 2 min)
 */

import { agentSend } from "../core/agent-email-server";

const SUBJECT_BASE = "CODE PROJECT 9697";

export type AlertSeverity = "info" | "warning" | "action-required" | "critical";

export interface AlertPayload {
  severity:   AlertSeverity;
  title:      string;
  body:       string;
  context?:   Record<string, unknown>;
  timestamp?: string;
}

export async function sendAlert(payload: AlertPayload): Promise<void> {
  const ts      = payload.timestamp ?? new Date().toISOString();
  const subject = `[${SUBJECT_BASE}] [${payload.severity.toUpperCase()}] ${payload.title}`;

  const contextLines = payload.context
    ? "\nContext:\n" + Object.entries(payload.context)
        .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
        .join("\n")
    : "";

  const body = [
    `OmniOrg Content Empire Alert`,
    `Time: ${ts}`,
    `Severity: ${payload.severity}`,
    ``,
    payload.body,
    contextLines,
    ``,
    `-- BBMW0 Technologies | bbmw0.com`,
  ].join("\n");

  const { agent, sent } = await agentSend(payload.title, payload.severity, subject, body);

  if (!sent) {
    // Always log so nothing is silently dropped
    console.log(`[Alert][${payload.severity.toUpperCase()}] (${agent.name}) ${payload.title}`);
    console.log(body);
  }
}

// Convenience wrappers
export const alertInfo           = (title: string, body: string, ctx?: Record<string, unknown>) =>
  sendAlert({ severity: "info",            title, body, context: ctx });
export const alertWarning        = (title: string, body: string, ctx?: Record<string, unknown>) =>
  sendAlert({ severity: "warning",         title, body, context: ctx });
export const alertActionRequired = (title: string, body: string, ctx?: Record<string, unknown>) =>
  sendAlert({ severity: "action-required", title, body, context: ctx });
export const alertCritical       = (title: string, body: string, ctx?: Record<string, unknown>) =>
  sendAlert({ severity: "critical",        title, body, context: ctx });
