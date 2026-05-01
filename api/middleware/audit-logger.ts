/**
 * AXIOM Audit Logger — GDPR/SOC2 compliant audit trail
 */
import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";

interface AuditEntry {
  tenantId: string;
  method: string;
  path: string;
  timestamp: string;
  ip: string;
  [key: string]: unknown;
}

const LOG_DIR = join(process.env.HOME ?? "C:/Users/BBMW0", ".claude", "logs", "omniorg-audit");

export class AuditLogger {
  static log(entry: AuditEntry): void {
    try {
      mkdirSync(LOG_DIR, { recursive: true });
      const today = new Date().toISOString().slice(0, 10);
      const file = join(LOG_DIR, `audit-${today}.jsonl`);
      appendFileSync(file, JSON.stringify(entry) + "\n");
    } catch {}
  }
}
