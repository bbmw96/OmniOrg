// Created by BBMW0 Technologies | bbmw0.com
/**
 * OmniOrg Capability Registry
 *
 * Single source of truth for every engine and module OmniOrg has built.
 * Agents query this registry to discover what tools are available and
 * which of those tools are ready to use given the current environment.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type CapabilityStatus = "active" | "beta" | "planned" | "deprecated";

export interface Capability {
  id:            string;
  name:          string;
  module:        string;
  description:   string;
  status:        CapabilityStatus;
  inputSchema?:  Record<string, string>;
  requiresKeys:  string[];
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const CAPABILITIES: Capability[] = [
  {
    id:          "search",
    name:        "Perplexity+ Search",
    module:      "core/search/perplexity-plus-engine",
    description: "AI web search with cited answers",
    status:      "active",
    requiresKeys: ["ANTHROPIC_API_KEY"],
  },
  {
    id:          "heygen",
    name:        "HeyGen+ Video",
    module:      "intelligence/ai-engines/heygen-engine",
    description: "AI video generation via HeyGen",
    status:      "active",
    requiresKeys: ["HEYGEN_API_KEY"],
  },
  {
    id:          "higgsfield",
    name:        "Higgsfield+ Video",
    module:      "intelligence/ai-engines/higgsfield-engine",
    description: "100+ video models via Higgsfield",
    status:      "active",
    requiresKeys: ["HIGGSFIELD_API_KEY", "HIGGSFIELD_API_SECRET"],
  },
  {
    id:          "gemini",
    name:        "Gemini+ AI",
    module:      "intelligence/ai-engines/gemini-engine",
    description: "Google Gemini Pro/Flash with vision",
    status:      "active",
    requiresKeys: ["GEMINI_API_KEY"],
  },
  {
    id:          "ollama",
    name:        "Ollama+ Local LLM",
    module:      "intelligence/ai-engines/ollama-engine",
    description: "Local Llama/Mistral/Qwen inference",
    status:      "active",
    requiresKeys: [],
  },
  {
    id:          "elevenlabs",
    name:        "ElevenLabs+ Voice",
    module:      "intelligence/ai-engines/elevenlabs-engine",
    description: "Voice synthesis and cloning",
    status:      "active",
    requiresKeys: ["ELEVENLABS_API_KEY"],
  },
  {
    id:          "runway",
    name:        "Runway+ Video",
    module:      "intelligence/ai-engines/runway-engine",
    description: "Runway Gen-4 video generation",
    status:      "active",
    requiresKeys: ["RUNWAY_API_KEY"],
  },
  {
    id:          "pika",
    name:        "Pika+ Video",
    module:      "intelligence/ai-engines/pika-engine",
    description: "Pika Art video generation",
    status:      "active",
    requiresKeys: ["PIKA_API_KEY"],
  },
  {
    id:          "kling",
    name:        "Kling+ Video",
    module:      "intelligence/ai-engines/kling-engine",
    description: "Kling AI video generation",
    status:      "active",
    requiresKeys: ["KLING_API_KEY"],
  },
  {
    id:          "grabbit",
    name:        "Grabbit+ Research",
    module:      "intelligence/research/grabbit-plus-engine",
    description: "Headless web content extraction",
    status:      "active",
    requiresKeys: [],
  },
  {
    id:          "notebooklm",
    name:        "NotebookLM+ Sync",
    module:      "intelligence/knowledge/notebooklm-plus-engine",
    description: "Push content to Google NotebookLM",
    status:      "active",
    requiresKeys: [],
  },
  {
    id:          "watchdog",
    name:        "Security Watchdog",
    module:      "intelligence/security/watchdog-agent",
    description: "24/7 threat monitoring daemon",
    status:      "active",
    requiresKeys: [],
  },
  {
    id:          "rag",
    name:        "RAG Knowledge Base",
    module:      "core/knowledge/rag-engine",
    description: "Local semantic search over documents",
    status:      "active",
    requiresKeys: [],
  },
  {
    id:          "orchestrator",
    name:        "Agent Orchestrator",
    module:      "core/agents/agent-orchestrator",
    description: "Spawn armies of parallel AI agents",
    status:      "active",
    requiresKeys: ["ANTHROPIC_API_KEY"],
  },
  {
    id:          "mcp-server",
    name:        "OmniOrg MCP Server",
    module:      "core/mcp/omniorg-mcp-server",
    description: "MCP server exposing OmniOrg to external agents",
    status:      "active",
    requiresKeys: [],
  },
  {
    id:          "social",
    name:        "Social Publisher",
    module:      "intelligence/social/social-publisher",
    description: "Auto-publish to YouTube/Instagram",
    status:      "active",
    requiresKeys: ["YOUTUBE_ACCESS_TOKEN", "INSTAGRAM_ACCESS_TOKEN"],
  },
  {
    id:          "content",
    name:        "Content Pipeline",
    module:      "intelligence/content/content-pipeline",
    description: "AI content generation pipeline",
    status:      "active",
    requiresKeys: ["ANTHROPIC_API_KEY"],
  },
  {
    id:          "deepseek",
    name:        "DeepSeek+ AI",
    module:      "intelligence/ai-engines/deepseek-engine",
    description: "DeepSeek V3 chat + R1 chain-of-thought reasoning + coder mode",
    status:      "active",
    requiresKeys: ["DEEPSEEK_API_KEY"],
  },
  {
    id:          "glm",
    name:        "GLM+ AI",
    module:      "intelligence/ai-engines/glm-engine",
    description: "ZhipuAI GLM-4 multimodal engine with 1M context and ultra-cheap flash tier",
    status:      "active",
    requiresKeys: ["ZHIPUAI_API_KEY"],
  },
  {
    id:          "engine-router",
    name:        "Engine Router",
    module:      "core/engine-router",
    description: "Capability-based inter-engine dispatch mesh with automatic fallback chains",
    status:      "active",
    requiresKeys: [],
  },
  {
    id:          "multi-engine-script",
    name:        "Multi-Engine Script Writer",
    module:      "intelligence/content/multi-engine-script-writer",
    description: "Fires all 7 LLMs simultaneously and returns the best script by score",
    status:      "active",
    requiresKeys: [],
  },
  {
    id:          "master-factory",
    name:        "Master Content Factory",
    module:      "intelligence/content/master-content-factory",
    description: "End-to-end YouTube/Instagram production: script + SEO + video + voice + captions + publish",
    status:      "active",
    requiresKeys: [],
  },
];

// ─── Functions ────────────────────────────────────────────────────────────────

export function getCapabilities(status?: CapabilityStatus): Capability[] {
  if (status === undefined) return [...CAPABILITIES];
  return CAPABILITIES.filter((c) => c.status === status);
}

export function getCapability(id: string): Capability | undefined {
  return CAPABILITIES.find((c) => c.id === id);
}

export function getActiveCapabilities(): Capability[] {
  return CAPABILITIES.filter((c) => c.status === "active");
}

export function getAvailableCapabilities(): Capability[] {
  return CAPABILITIES.filter((c) =>
    c.requiresKeys.every((key) => {
      const val = process.env[key];
      return val !== undefined && val.trim() !== "";
    })
  );
}

export function describeCapabilities(): string {
  const rows = CAPABILITIES.map((c) => {
    const keys = c.requiresKeys.length > 0 ? c.requiresKeys.join(", ") : "none";
    return `| ${c.id} | ${c.name} | ${c.status} | ${c.description} | ${keys} |`;
  });

  return [
    "| ID | Name | Status | Description | Required Keys |",
    "|----|------|--------|-------------|---------------|",
    ...rows,
  ].join("\n");
}
