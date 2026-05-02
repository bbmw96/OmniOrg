// Created by BBMW0 Technologies | bbmw0.com

const BASE = "http://localhost:8443/api/v1";
const TOKEN_KEY = "axiom_demo_token";

export interface AxiomHealth {
  status:    string;
  mesh:      { hasApiKey: boolean; agentCount: number; status: string };
  timestamp: string;
}

export interface AxiomAgent {
  id:         string;
  name:       string;
  role:       string;
  tier:       1 | 2 | 3 | 4 | 5;
  department: string;
  status:     "active" | "busy" | "standby";
  languages:  number;
}

export interface TaskResult {
  output:           string;
  agentsUsed:       string[];
  processingTimeMs: number;
  requestId?:       string;
}

async function getToken(): Promise<string> {
  const cached = localStorage.getItem(TOKEN_KEY);
  if (cached) return cached;

  const reg = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantName: "Dashboard Demo",
      plan:       "starter",
      email:      "dashboard@bbmw0.com",
    }),
  });

  if (!reg.ok) {
    throw new Error(`Registration failed: ${reg.status}`);
  }

  const regData = await reg.json() as { token?: string; tenantId?: string };

  if (regData.token) {
    localStorage.setItem(TOKEN_KEY, regData.token);
    return regData.token;
  }

  const tok = await fetch(`${BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId: regData.tenantId, plan: "starter" }),
  });

  const tokData = await tok.json() as { token: string };
  localStorage.setItem(TOKEN_KEY, tokData.token);
  return tokData.token;
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getToken();
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

export async function fetchHealth(): Promise<AxiomHealth> {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json() as Promise<AxiomHealth>;
}

export async function fetchAgents(): Promise<AxiomAgent[]> {
  const res = await authedFetch("/agents");
  if (!res.ok) throw new Error(`Agents fetch failed: ${res.status}`);
  const data = await res.json() as { agents?: AxiomAgent[] };
  return data.agents ?? [];
}

export async function postTask(order: string): Promise<TaskResult> {
  const start = Date.now();
  const res = await authedFetch("/task", {
    method: "POST",
    body: JSON.stringify({ task: order }),
  });
  if (!res.ok) throw new Error(`Task failed: ${res.status}`);
  const data = await res.json() as Partial<TaskResult>;
  return {
    output:           data.output ?? "Task submitted to OmniOrg.",
    agentsUsed:       data.agentsUsed ?? [],
    processingTimeMs: data.processingTimeMs ?? (Date.now() - start),
    requestId:        data.requestId,
  };
}
