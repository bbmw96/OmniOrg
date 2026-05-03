// Created by BBMW0 Technologies | bbmw0.com

export interface AIFeature {
  id:          string;
  name:        string;
  domain:      string;
  type:        string;
  description: string;
  tier:        "core" | "advanced" | "specialist" | "elite" | "quantum";
  tags:        string[];
  capability:  string;
  status:      "active" | "beta" | "planned";
}

// ─── 100 Feature Domains ────────────────────────────────────────────────────
const FEATURE_DOMAINS: string[] = [
  "text-ai", "code-ai", "video-ai", "audio-ai", "image-ai",
  "analytics-ai", "research-ai", "automation-ai", "security-ai", "finance-ai",
  "legal-ai", "medical-ai", "education-ai", "gaming-ai", "robotics-ai",
  "iot-ai", "blockchain-ai", "climate-ai", "space-ai", "quantum-ai",
  "social-media-ai", "marketing-ai", "e-commerce-ai", "logistics-ai", "agriculture-ai",
  "construction-ai", "manufacturing-ai", "energy-ai", "pharma-ai", "biotech-ai",
  "chemistry-ai", "physics-ai", "mathematics-ai", "linguistics-ai", "psychology-ai",
  "sociology-ai", "political-ai", "economics-ai", "journalism-ai", "entertainment-ai",
  "sports-ai", "fashion-ai", "food-ai", "travel-ai", "real-estate-ai",
  "insurance-ai", "banking-ai", "investment-ai", "hr-ai", "recruiting-ai",
  "project-management-ai", "crm-ai", "erp-ai", "supply-chain-ai", "inventory-ai",
  "procurement-ai", "accounting-ai", "tax-ai", "compliance-ai", "risk-ai",
  "fraud-ai", "cybersecurity-ai", "network-ai", "cloud-ai", "devops-ai",
  "testing-ai", "monitoring-ai", "observability-ai", "data-pipeline-ai", "etl-ai",
  "database-ai", "search-ai", "recommendation-ai", "personalisation-ai", "nlp-ai",
  "computer-vision-ai", "speech-ai", "translation-ai", "summarisation-ai", "classification-ai",
  "clustering-ai", "prediction-ai", "forecasting-ai", "anomaly-ai", "optimisation-ai",
  "simulation-ai", "planning-ai", "scheduling-ai", "routing-ai", "navigation-ai",
  "mapping-ai", "geospatial-ai", "satellite-ai", "drone-ai", "autonomous-vehicle-ai",
  "robotics-process-ai", "rpa-ai", "workflow-ai", "integration-ai", "api-ai",
];

// ─── 200 Feature Types ───────────────────────────────────────────────────────
const FEATURE_TYPES: string[] = [
  "generator", "analyser", "optimiser", "classifier", "detector",
  "predictor", "recommender", "summariser", "extractor", "transformer",
  "validator", "monitor", "debugger", "builder", "deployer",
  "tester", "reviewer", "scorer", "ranker", "comparator",
  "planner", "scheduler", "router", "executor", "orchestrator",
  "automator", "publisher", "archiver", "indexer", "searcher",
  "retriever", "embedder", "encoder", "decoder", "compressor",
  "streamer", "batcher", "cacher", "queuer", "notifier",
  "alerter", "logger", "auditor", "reporter", "visualiser",
  "simulator", "modeller", "trainer", "fine-tuner", "evaluator",
  "benchmarker", "profiler", "tracer", "fixer", "refactorer",
  "migrator", "versioner", "tagger", "labeller", "annotator",
  "curator", "aggregator", "merger", "splitter", "converter",
  "normaliser", "cleaner", "deduplicator", "sanitiser", "encryptor",
  "decryptor", "signer", "verifier", "authenticator", "authoriser",
  "throttler", "rate-limiter", "load-balancer", "failover-handler", "retry-handler",
  "circuit-breaker", "health-checker", "self-healer", "scaler", "provisioner",
  "decommissioner", "backup-creator", "restore-handler", "snapshot-taker", "diff-generator",
  "syncer", "replicator", "distributor", "broadcaster", "pipeliner",
  "chainer", "composer", "decorator", "adapter", "bridge",
  "proxy", "gateway", "facade", "wrapper", "injector",
  "resolver", "linker", "connector", "wirer", "bootstrapper",
  "initialiser", "configurator", "templater", "scaffolder", "generator-wizard",
  "code-assistant", "pair-programmer", "code-reviewer", "test-writer", "doc-generator",
  "api-designer", "schema-designer", "ui-builder", "ux-analyst", "accessibility-checker",
  "performance-profiler", "seo-optimiser", "content-writer", "copy-editor", "tone-analyser",
  "sentiment-detector", "emotion-recogniser", "intent-classifier", "entity-extractor", "relation-extractor",
  "knowledge-builder", "fact-checker", "bias-detector", "plagiarism-checker", "citation-generator",
  "language-detector", "dialect-recogniser", "transcriber", "interpreter", "lip-reader",
  "gesture-recogniser", "facial-analyser", "pose-estimator", "object-detector", "scene-understander",
  "depth-estimator", "style-transferer", "inpainter", "super-resolver", "coloriser",
  "denoiser", "enhancer", "compressor-video", "editor-video", "captioner-video",
  "chapter-generator", "clip-extractor", "highlight-generator", "thumbnail-creator", "banner-designer",
  "logo-creator", "avatar-generator", "voice-cloner", "music-composer", "sound-designer",
  "foley-artist", "dubber", "lip-syncer", "age-estimator", "gender-classifier",
  "crowd-counter", "traffic-analyser", "route-optimiser", "queue-manager", "appointment-scheduler",
  "meeting-summariser", "action-extractor", "follow-up-generator", "proposal-writer", "contract-analyser",
  "invoice-processor", "receipt-parser", "expense-tracker", "budget-planner", "tax-preparer",
  "audit-preparer", "compliance-checker", "risk-scorer", "fraud-detector", "anomaly-detector",
  "churn-predictor", "lifetime-value-predictor", "lead-scorer", "pipeline-forecaster", "market-analyser",
  "competitor-tracker", "trend-spotter", "virality-predictor", "engagement-optimiser", "a-b-tester",
  "funnel-analyser", "cohort-analyser", "attribution-modeller", "conversion-optimiser", "retention-specialist",
  "personalisation-engine", "hyper-targeter", "audience-builder", "lookalike-finder", "campaign-optimiser",
  "bid-manager", "creative-tester", "brand-safety-monitor", "crisis-detector", "reputation-manager",
  "influencer-finder", "partnership-scout", "deal-closer", "negotiation-assistant", "objection-handler",
  "pitch-builder", "investor-matcher",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toTitleCase(str: string): string {
  return str
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function deriveTier(domainIdx: number, typeIdx: number): AIFeature["tier"] {
  const sum = domainIdx + typeIdx;
  if (sum < 50)  return "core";
  if (sum < 100) return "advanced";
  if (sum < 200) return "specialist";
  if (sum < 270) return "elite";
  return "quantum";
}

function deriveCapabilityVerb(type: string): string {
  if (type.includes("generat")) return "generate";
  if (type.includes("analys"))  return "analyse";
  if (type.includes("optim"))   return "optimise";
  return "execute";
}

function deriveStatus(domainIdx: number): AIFeature["status"] {
  if (domainIdx % 7 === 0)  return "beta";
  if (domainIdx % 13 === 0) return "planned";
  return "active";
}

// ─── Registry build ───────────────────────────────────────────────────────────
const _featureMap: Map<string, AIFeature> = new Map();

for (let di = 0; di < FEATURE_DOMAINS.length; di++) {
  const domain = FEATURE_DOMAINS[di];
  for (let ti = 0; ti < FEATURE_TYPES.length; ti++) {
    const type   = FEATURE_TYPES[ti];
    const id     = `${domain}::${type}`;
    const tier   = deriveTier(di, ti);
    const status = deriveStatus(di);
    const feature: AIFeature = {
      id,
      name:        `${toTitleCase(domain)} ${toTitleCase(type)}`,
      domain,
      type,
      description: `${toTitleCase(type)} capability for ${toTitleCase(domain)} powered by OmniOrg AI`,
      tier,
      tags:        [domain.split("-")[0], type.split("-")[0], tier],
      capability:  `${domain}::${deriveCapabilityVerb(type)}`,
      status,
    };
    _featureMap.set(id, feature);
  }
}

// ─── Exported functions ───────────────────────────────────────────────────────
export function getFeatureCount(): number {
  return _featureMap.size;
}

export function getFeatureById(id: string): AIFeature | undefined {
  return _featureMap.get(id);
}

export function getFeaturesByDomain(domain: string): AIFeature[] {
  const results: AIFeature[] = [];
  for (const feature of _featureMap.values()) {
    if (feature.domain === domain) results.push(feature);
  }
  return results;
}

export function getFeaturesByTier(tier: AIFeature["tier"]): AIFeature[] {
  const results: AIFeature[] = [];
  for (const feature of _featureMap.values()) {
    if (feature.tier === tier) results.push(feature);
  }
  return results;
}

export function searchFeatures(query: string): AIFeature[] {
  const q = query.toLowerCase();
  const results: AIFeature[] = [];
  for (const feature of _featureMap.values()) {
    if (
      feature.id.toLowerCase().includes(q) ||
      feature.name.toLowerCase().includes(q) ||
      feature.description.toLowerCase().includes(q)
    ) {
      results.push(feature);
    }
  }
  return results;
}

export function describeFeatureRegistry(): string {
  const tierCounts: Record<string, number> = {
    core: 0, advanced: 0, specialist: 0, elite: 0, quantum: 0,
  };
  const domainCounts: Record<string, number> = {};
  for (const feature of _featureMap.values()) {
    tierCounts[feature.tier]++;
    domainCounts[feature.domain] = (domainCounts[feature.domain] ?? 0) + 1;
  }

  const tierTable = Object.entries(tierCounts)
    .map(([tier, count]) => `| ${tier} | ${count} |`)
    .join("\n");

  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([domain, count]) => `| ${domain} | ${count} |`)
    .join("\n");

  return [
    "## OmniOrg AI Feature Registry",
    "",
    `**Total Features:** ${_featureMap.size}`,
    `**Domains:** ${FEATURE_DOMAINS.length}`,
    `**Types:** ${FEATURE_TYPES.length}`,
    "",
    "### Features by Tier",
    "| Tier | Count |",
    "|------|-------|",
    tierTable,
    "",
    "### Top 10 Domains by Feature Count",
    "| Domain | Count |",
    "|--------|-------|",
    topDomains,
  ].join("\n");
}
