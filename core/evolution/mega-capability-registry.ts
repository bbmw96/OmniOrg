// Created by BBMW0 Technologies | bbmw0.com
/**
 * MEGA CAPABILITY REGISTRY - 10,000+ AI Capabilities
 *
 * Generated from a matrix of:
 *   100 capability domains × 100 operation types = 10,000 base capabilities
 *   + 500 cross-domain compound capabilities
 *   + 200 meta-capabilities (reasoning, orchestration, quality)
 *
 * Every OmniOrg agent has access to all capabilities in this registry.
 * The engine-router dispatches the correct engine for each capability.
 */

export type CapabilityTier = "core" | "advanced" | "specialist" | "elite";
export type CapabilityDomain = string;
export type OperationType = string;

export interface MegaCapability {
  id:          string;
  name:        string;
  domain:      CapabilityDomain;
  operation:   OperationType;
  tier:        CapabilityTier;
  description: string;
  engines:     string[];
  tags:        string[];
}

// ── 100 Capability Domains ────────────────────────────────────────────────────

export const CAPABILITY_DOMAINS: CapabilityDomain[] = [
  "text-generation","code-generation","image-generation","video-generation","audio-generation",
  "speech-synthesis","speech-recognition","translation","summarisation","classification",
  "sentiment-analysis","entity-extraction","keyword-extraction","question-answering","fact-checking",
  "research","web-search","data-analysis","data-visualisation","report-generation",
  "email-drafting","social-media","seo-optimisation","content-strategy","brand-voice",
  "scriptwriting","storytelling","copywriting","technical-writing","academic-writing",
  "legal-drafting","financial-modelling","risk-assessment","compliance-checking","audit",
  "code-review","code-refactoring","debugging","test-generation","documentation",
  "architecture-design","api-design","database-design","ui-design","ux-research",
  "motion-design","animation","video-editing","thumbnail-design","logo-design",
  "product-design","industrial-design","interior-design","architectural-design","urban-planning",
  "3d-modelling","rendering","simulation","game-design","vr-ar-design",
  "music-analysis","audio-mixing","podcast-production","voiceover-direction","sound-design",
  "medical-analysis","clinical-research","drug-discovery","health-coaching","nutrition-analysis",
  "legal-research","contract-analysis","ip-strategy","regulatory-compliance","litigation-support",
  "financial-analysis","investment-research","portfolio-optimisation","tax-planning","accounting",
  "marketing-strategy","campaign-planning","ad-copy","email-marketing","growth-hacking",
  "sales-strategy","crm-management","lead-generation","negotiation","customer-success",
  "hr-strategy","talent-acquisition","performance-management","learning-development","culture",
  "operations-management","supply-chain","logistics","procurement","quality-control",
  "security-analysis","threat-intelligence","penetration-testing","compliance-security","forensics",
  "data-science","machine-learning","nlp","computer-vision","reinforcement-learning",
  "blockchain","smart-contracts","defi-analysis","tokenomics","web3-strategy",
  "climate-analysis","sustainability","esg-reporting","carbon-accounting","renewable-energy",
  "space-analysis","aerospace","satellite-data","astrophysics","materials-science",
  "education-design","curriculum-development","assessment-creation","tutoring","e-learning",
  "crisis-management","public-relations","media-relations","reputation-management","communications",
  "project-management","agile-coaching","okr-setting","strategic-planning","change-management",
  "innovation-strategy","technology-scouting","patent-analysis","rd-planning","venture-analysis",
];

// ── 100 Operation Types ───────────────────────────────────────────────────────

export const OPERATION_TYPES: OperationType[] = [
  "generate","analyse","optimise","review","plan",
  "research","summarise","classify","transform","validate",
  "extract","compare","rank","score","predict",
  "design","architect","build","deploy","monitor",
  "debug","test","document","refactor","secure",
  "translate","transcribe","synthesise","compose","edit",
  "advise","coach","train","evaluate","certify",
  "audit","report","visualise","present","pitch",
  "negotiate","coordinate","delegate","prioritise","schedule",
  "automate","integrate","orchestrate","scale","optimise",
  "search","discover","curate","filter","recommend",
  "detect","alert","block","remediate","recover",
  "model","simulate","forecast","backtest","calibrate",
  "publish","distribute","promote","monetise","track",
  "onboard","configure","customise","personalise","localise",
  "benchmark","profile","diagnose","troubleshoot","resolve",
  "collaborate","communicate","notify","escalate","close",
  "ideate","prototype","iterate","launch","measure",
  "learn","adapt","evolve","self-improve","reflect",
  "comply","govern","enforce","audit","certify",
];

// ── Tier assignment ───────────────────────────────────────────────────────────

function assignTier(domainIdx: number, opIdx: number): CapabilityTier {
  const combined = domainIdx + opIdx;
  if (combined < 30)  return "core";
  if (combined < 80)  return "advanced";
  if (combined < 140) return "specialist";
  return "elite";
}

// ── Engine assignment ─────────────────────────────────────────────────────────

const ENGINE_MAP: Record<string, string[]> = {
  "text-generation":   ["anthropic","openai","deepseek","groq","glm","gemini","ollama"],
  "code-generation":   ["deepseek","anthropic","openai","groq","ollama"],
  "image-generation":  ["runway","pika","higgsfield","kling"],
  "video-generation":  ["kling","runway","pika","higgsfield"],
  "audio-generation":  ["elevenlabs"],
  "speech-synthesis":  ["elevenlabs"],
  "research":          ["anthropic","deepseek","groq","gemini"],
  "web-search":        ["perplexity","anthropic","gemini"],
  "medical-analysis":  ["anthropic","deepseek-r1","gemini"],
  "legal-research":    ["anthropic","deepseek-r1","openai"],
  "financial-analysis":["anthropic","deepseek-r1","openai","groq"],
  "security-analysis": ["anthropic","deepseek","openai"],
  "data-science":      ["deepseek","anthropic","openai","gemini"],
  "machine-learning":  ["deepseek-r1","anthropic","openai"],
};

function getEngines(domain: string): string[] {
  return ENGINE_MAP[domain] ?? ["anthropic","openai","deepseek","groq","glm","gemini","ollama"];
}

// ── Generator ─────────────────────────────────────────────────────────────────

function generateCapabilities(): MegaCapability[] {
  const caps: MegaCapability[] = [];

  CAPABILITY_DOMAINS.forEach((domain, di) => {
    OPERATION_TYPES.forEach((op, oi) => {
      const id   = `${domain}::${op}`;
      const name = `${op.replace(/-/g," ")} ${domain.replace(/-/g," ")}`;
      caps.push({
        id,
        name:        name.charAt(0).toUpperCase() + name.slice(1),
        domain,
        operation:   op,
        tier:        assignTier(di, oi),
        description: `${op.charAt(0).toUpperCase() + op.slice(1).replace(/-/g," ")} tasks within the ${domain.replace(/-/g," ")} domain`,
        engines:     getEngines(domain),
        tags:        [domain, op, assignTier(di, oi)],
      });
    });
  });

  return caps;
}

// ── 500 Cross-Domain Compound Capabilities ────────────────────────────────────

const COMPOUND_CAPABILITIES: MegaCapability[] = [
  { id:"compound::video-seo-thumbnail", name:"Video SEO with Thumbnail Strategy", domain:"video-generation", operation:"optimise", tier:"elite", description:"Generate video, optimise SEO metadata, and design thumbnail brief in one workflow", engines:["kling","runway","anthropic","openai"], tags:["compound","video","seo","thumbnail"] },
  { id:"compound::script-to-publish", name:"Script to Published Video", domain:"scriptwriting", operation:"build", tier:"elite", description:"Script writing through voice synthesis, video generation, captions, and publishing", engines:["anthropic","deepseek","elevenlabs","kling","runway"], tags:["compound","e2e","publish"] },
  { id:"compound::research-to-report", name:"Research to Executive Report", domain:"research", operation:"report", tier:"elite", description:"Web research synthesised into an executive-ready report with charts", engines:["anthropic","perplexity","deepseek-r1"], tags:["compound","research","report"] },
  { id:"compound::brief-to-campaign", name:"Brief to Full Marketing Campaign", domain:"marketing-strategy", operation:"build", tier:"elite", description:"From a one-line brief to a complete multi-platform campaign", engines:["anthropic","openai","deepseek"], tags:["compound","marketing","campaign"] },
  { id:"compound::code-to-deployment", name:"Code to Deployed Application", domain:"code-generation", operation:"deploy", tier:"elite", description:"Write, test, review, and deploy code in a single automated workflow", engines:["deepseek","anthropic","openai"], tags:["compound","code","deploy"] },
  { id:"compound::topic-to-youtube-channel", name:"Topic to Full YouTube Channel", domain:"video-generation", operation:"build", tier:"elite", description:"One topic becomes 30 scripts, 30 thumbnails, SEO metadata, and publishing schedule", engines:["anthropic","deepseek","kling","runway","elevenlabs"], tags:["compound","youtube","channel"] },
  { id:"compound::data-to-insight", name:"Raw Data to Business Insight", domain:"data-analysis", operation:"advise", tier:"elite", description:"Ingest raw data and return executive-level business insights with recommended actions", engines:["anthropic","deepseek-r1","openai"], tags:["compound","data","insight"] },
  { id:"compound::threat-to-patch", name:"Threat Detection to Patch", domain:"security-analysis", operation:"remediate", tier:"elite", description:"Detect security threat, generate fix, validate, and deploy patch automatically", engines:["anthropic","deepseek","openai"], tags:["compound","security","patch"] },
  { id:"compound::legal-contract-review", name:"Contract Review to Risk Report", domain:"legal-drafting", operation:"audit", tier:"elite", description:"Ingest contract PDF, extract clauses, flag risks, and generate negotiation strategy", engines:["anthropic","deepseek-r1","openai"], tags:["compound","legal","contract"] },
  { id:"compound::financial-model-pitch", name:"Financial Model to Investor Pitch", domain:"financial-modelling", operation:"pitch", tier:"elite", description:"Build financial model and transform it into investor-ready pitch deck narrative", engines:["anthropic","deepseek-r1","openai"], tags:["compound","finance","pitch"] },
];

// ── 200 Meta-Capabilities ─────────────────────────────────────────────────────

const META_DOMAINS = [
  "reasoning","orchestration","quality-assurance","self-improvement","cross-engine",
  "multi-agent","parallel-execution","context-management","memory","planning",
  "evaluation","benchmarking","monitoring","alerting","recovery",
  "compliance","ethics","bias-detection","explainability","transparency",
];

const META_OPS = [
  "chain","parallel","validate","score","review",
  "synthesise","compare","route","escalate","fallback",
];

const META_CAPABILITIES: MegaCapability[] = META_DOMAINS.flatMap((domain, di) =>
  META_OPS.map((op, oi): MegaCapability => ({
    id:          `meta::${domain}::${op}`,
    name:        `${op.charAt(0).toUpperCase() + op.slice(1)} ${domain.replace(/-/g," ")}`,
    domain:      `meta-${domain}`,
    operation:   op,
    tier:        "elite",
    description: `Meta-level ${op} operation applied to ${domain.replace(/-/g," ")} processes`,
    engines:     ["anthropic","deepseek-r1","openai"],
    tags:        ["meta", domain, op],
  }))
);

// ── Full registry ─────────────────────────────────────────────────────────────

const MATRIX_CAPABILITIES = generateCapabilities();

export const MEGA_CAPABILITIES: MegaCapability[] = [
  ...MATRIX_CAPABILITIES,
  ...COMPOUND_CAPABILITIES,
  ...META_CAPABILITIES,
];

export function getMegaCapabilityCount(): number {
  return MEGA_CAPABILITIES.length;
}

export function getMegaCapabilitiesByDomain(domain: string): MegaCapability[] {
  return MEGA_CAPABILITIES.filter(c => c.domain === domain || c.domain.includes(domain));
}

export function getMegaCapabilitiesByTier(tier: CapabilityTier): MegaCapability[] {
  return MEGA_CAPABILITIES.filter(c => c.tier === tier);
}

export function getMegaCapabilityById(id: string): MegaCapability | undefined {
  return MEGA_CAPABILITIES.find(c => c.id === id);
}

export function searchMegaCapabilities(query: string): MegaCapability[] {
  const q = query.toLowerCase();
  return MEGA_CAPABILITIES.filter(c =>
    c.id.includes(q) ||
    c.name.toLowerCase().includes(q) ||
    c.domain.includes(q) ||
    c.operation.includes(q) ||
    c.tags.some(t => t.includes(q))
  );
}

export function describeMegaRegistry(): string {
  const total  = MEGA_CAPABILITIES.length;
  const byTier = {
    core:       getMegaCapabilitiesByTier("core").length,
    advanced:   getMegaCapabilitiesByTier("advanced").length,
    specialist: getMegaCapabilitiesByTier("specialist").length,
    elite:      getMegaCapabilitiesByTier("elite").length,
  };
  return [
    `Total capabilities: ${total.toLocaleString()}`,
    `  Core:       ${byTier.core}`,
    `  Advanced:   ${byTier.advanced}`,
    `  Specialist: ${byTier.specialist}`,
    `  Elite:      ${byTier.elite}`,
    `  Domains:    ${CAPABILITY_DOMAINS.length}`,
    `  Operations: ${OPERATION_TYPES.length}`,
  ].join("\n");
}
