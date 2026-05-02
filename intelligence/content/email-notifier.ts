// Created by BBMW0 Technologies | bbmw0.com
/**
 * EMAIL NOTIFIER
 *
 * Sends 'CODE PROJECT 9697' alerts to bbmw0@hotmail.com when the autonomous
 * publisher needs human attention: upload failures, quality gate rejections,
 * API credential gaps, or approval required for high-stakes content.
 *
 * Uses Gmail SMTP via nodemailer with an App Password stored in .env as
 * GMAIL_APP_PASSWORD. Generate one at: myaccount.google.com/apppasswords
 * Source Gmail account is ADSENSE_EMAIL from .env (up866106@gmail.com).
 */

import * as nodemailer from "nodemailer";

const ALERT_TO      = "bbmw0@hotmail.com";
const SUBJECT_BASE  = "CODE PROJECT 9697";
const FROM_EMAIL    = process.env.ADSENSE_EMAIL ?? "up866106@gmail.com";
const APP_PASSWORD  = process.env.GMAIL_APP_PASSWORD;

export type AlertSeverity = "info" | "warning" | "action-required" | "critical";

export interface AlertPayload {
  severity:    AlertSeverity;
  title:       string;
  body:        string;
  context?:    Record<string, unknown>;
  timestamp?:  string;
}

function buildTransport(): nodemailer.Transporter | null {
  if (!APP_PASSWORD) {
    console.warn("[EmailNotifier] GMAIL_APP_PASSWORD not set. Alerts will be logged only.");
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: FROM_EMAIL,
      pass: APP_PASSWORD,
    },
  });
}

export async function sendAlert(payload: AlertPayload): Promise<void> {
  const ts        = payload.timestamp ?? new Date().toISOString();
  const subject   = `[${SUBJECT_BASE}] [${payload.severity.toUpperCase()}] ${payload.title}`;

  const contextLines = payload.context
    ? Object.entries(payload.context)
        .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
        .join("\n")
    : "";

  const textBody = [
    `OmniOrg Content Empire Alert`,
    `Time: ${ts}`,
    `Severity: ${payload.severity}`,
    ``,
    payload.body,
    contextLines ? `\nContext:\n${contextLines}` : "",
    ``,
    `-- OmniOrg Autonomous Publisher`,
    `   BBMW0 Technologies | bbmw0.com`,
  ].join("\n");

  // Always log regardless of email availability
  console.log(`[EmailNotifier] ALERT [${payload.severity}]: ${payload.title}`);

  const transport = buildTransport();
  if (!transport) return;

  try {
    const info = await transport.sendMail({
      from:    `"OmniOrg Empire" <${FROM_EMAIL}>`,
      to:      ALERT_TO,
      subject,
      text:    textBody,
    });
    console.log(`[EmailNotifier] Sent: ${info.messageId}`);
  } catch (err) {
    console.error("[EmailNotifier] Failed to send email:", err);
  }
}

// Convenience wrappers
export const alertInfo          = (title: string, body: string, ctx?: Record<string, unknown>) =>
  sendAlert({ severity: "info",            title, body, context: ctx });
export const alertWarning       = (title: string, body: string, ctx?: Record<string, unknown>) =>
  sendAlert({ severity: "warning",         title, body, context: ctx });
export const alertActionRequired = (title: string, body: string, ctx?: Record<string, unknown>) =>
  sendAlert({ severity: "action-required", title, body, context: ctx });
export const alertCritical      = (title: string, body: string, ctx?: Record<string, unknown>) =>
  sendAlert({ severity: "critical",        title, body, context: ctx });
