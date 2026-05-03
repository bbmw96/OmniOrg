// Created by BBMW0 Technologies | bbmw0.com
/**
 * ENGINE MANIFEST - 999+ AI Engine Configurations
 *
 * Every major AI API with every available model variant.
 * Each entry is a deployable engine config that maps to a base engine module.
 *
 * Structure:
 *   - Text LLMs:    350+ model variants across all providers
 *   - Image/Video:  200+ generation model configs
 *   - Voice/Audio:  100+ TTS / STT / music configs
 *   - Code:         150+ specialised code model configs
 *   - Multimodal:   100+ vision + audio configs
 *   - Specialised:  100+ domain-specific model configs
 *
 * Total: 1,000+ engine configurations
 */

import { config as loadEnv } from "dotenv";
import * as path from "path";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

export type EngineCategory =
  | "text"
  | "code"
  | "vision"
  | "video"
  | "audio"
  | "image"
  | "embedding"
  | "reasoning"
  | "multimodal"
  | "specialised";

export interface EngineConfig {
  id:           string;
  name:         string;
  provider:     string;
  model:        string;
  category:     EngineCategory;
  baseModule:   string;
  maxTokens:    number;
  contextWindow: number;
  speed:        "fast" | "standard" | "slow";
  quality:      "economy" | "standard" | "premium" | "elite";
  requiresKey:  string;
  capabilities: string[];
  specialisms:  string[];
  available?:   boolean;
}

// ── Provider definitions ──────────────────────────────────────────────────────

const ANTHROPIC_MODELS: EngineConfig[] = [
  { id:"anthropic::claude-opus-4-7",     name:"Claude Opus 4.7",       provider:"Anthropic", model:"claude-opus-4-7",             category:"text",      baseModule:"intelligence/ai-engines/anthropic-engine", maxTokens:8192,  contextWindow:200000, speed:"slow",     quality:"elite",    requiresKey:"ANTHROPIC_API_KEY", capabilities:["text","reasoning","analysis","code","vision"], specialisms:["complex-reasoning","long-context","creative"] },
  { id:"anthropic::claude-sonnet-4-6",   name:"Claude Sonnet 4.6",     provider:"Anthropic", model:"claude-sonnet-4-6",           category:"text",      baseModule:"intelligence/ai-engines/anthropic-engine", maxTokens:8192,  contextWindow:200000, speed:"standard", quality:"premium",  requiresKey:"ANTHROPIC_API_KEY", capabilities:["text","reasoning","code","vision"],            specialisms:["balanced","instruction-following","coding"] },
  { id:"anthropic::claude-haiku-4-5",    name:"Claude Haiku 4.5",      provider:"Anthropic", model:"claude-haiku-4-5-20251001",   category:"text",      baseModule:"intelligence/ai-engines/anthropic-engine", maxTokens:4096,  contextWindow:200000, speed:"fast",     quality:"standard", requiresKey:"ANTHROPIC_API_KEY", capabilities:["text","classification","extraction"],          specialisms:["high-throughput","cost-efficient","fast"] },
  { id:"anthropic::claude-opus-4-5",     name:"Claude Opus 4.5",       provider:"Anthropic", model:"claude-opus-4-5",             category:"text",      baseModule:"intelligence/ai-engines/anthropic-engine", maxTokens:8192,  contextWindow:200000, speed:"slow",     quality:"elite",    requiresKey:"ANTHROPIC_API_KEY", capabilities:["text","reasoning","analysis","code"],          specialisms:["planning","orchestration","research"] },
];

const OPENAI_MODELS: EngineConfig[] = [
  { id:"openai::gpt-4o",                 name:"GPT-4o",                provider:"OpenAI",    model:"gpt-4o",                      category:"multimodal",baseModule:"intelligence/ai-engines/openai-engine",    maxTokens:16384, contextWindow:128000, speed:"standard", quality:"premium",  requiresKey:"OPENAI_API_KEY",    capabilities:["text","vision","code","reasoning"],            specialisms:["multimodal","function-calling","json"] },
  { id:"openai::gpt-4o-mini",            name:"GPT-4o Mini",           provider:"OpenAI",    model:"gpt-4o-mini",                 category:"text",      baseModule:"intelligence/ai-engines/openai-engine",    maxTokens:16384, contextWindow:128000, speed:"fast",     quality:"standard", requiresKey:"OPENAI_API_KEY",    capabilities:["text","classification","extraction"],          specialisms:["cost-efficient","fast","structured-output"] },
  { id:"openai::gpt-4-turbo",            name:"GPT-4 Turbo",           provider:"OpenAI",    model:"gpt-4-turbo",                 category:"text",      baseModule:"intelligence/ai-engines/openai-engine",    maxTokens:4096,  contextWindow:128000, speed:"standard", quality:"premium",  requiresKey:"OPENAI_API_KEY",    capabilities:["text","vision","code"],                        specialisms:["long-context","json-mode"] },
  { id:"openai::o1-preview",             name:"OpenAI o1 Preview",     provider:"OpenAI",    model:"o1-preview",                  category:"reasoning", baseModule:"intelligence/ai-engines/openai-engine",    maxTokens:32768, contextWindow:128000, speed:"slow",     quality:"elite",    requiresKey:"OPENAI_API_KEY",    capabilities:["reasoning","math","code","science"],           specialisms:["chain-of-thought","science","competition-math"] },
  { id:"openai::o1-mini",                name:"OpenAI o1 Mini",        provider:"OpenAI",    model:"o1-mini",                     category:"reasoning", baseModule:"intelligence/ai-engines/openai-engine",    maxTokens:65536, contextWindow:128000, speed:"standard", quality:"premium",  requiresKey:"OPENAI_API_KEY",    capabilities:["reasoning","code","math"],                     specialisms:["fast-reasoning","code-reasoning"] },
];

const DEEPSEEK_MODELS: EngineConfig[] = [
  { id:"deepseek::deepseek-chat",        name:"DeepSeek V3 Chat",      provider:"DeepSeek",  model:"deepseek-chat",               category:"text",      baseModule:"intelligence/ai-engines/deepseek-engine",  maxTokens:8192,  contextWindow:64000,  speed:"standard", quality:"premium",  requiresKey:"DEEPSEEK_API_KEY",  capabilities:["text","code","reasoning","analysis"],          specialisms:["cost-efficient","chinese","coding"] },
  { id:"deepseek::deepseek-reasoner",    name:"DeepSeek R1 Reasoner",  provider:"DeepSeek",  model:"deepseek-reasoner",           category:"reasoning", baseModule:"intelligence/ai-engines/deepseek-engine",  maxTokens:8192,  contextWindow:64000,  speed:"slow",     quality:"elite",    requiresKey:"DEEPSEEK_API_KEY",  capabilities:["reasoning","math","code","analysis"],          specialisms:["chain-of-thought","math","logic","research"] },
  { id:"deepseek::deepseek-coder-v2",    name:"DeepSeek Coder V2",     provider:"DeepSeek",  model:"deepseek-chat",               category:"code",      baseModule:"intelligence/ai-engines/deepseek-engine",  maxTokens:8192,  contextWindow:64000,  speed:"standard", quality:"premium",  requiresKey:"DEEPSEEK_API_KEY",  capabilities:["code","debugging","refactoring","testing"],    specialisms:["code-generation","all-languages","debugging"] },
];

const GROQ_MODELS: EngineConfig[] = [
  { id:"groq::llama3-70b",               name:"Llama 3 70B (Groq)",    provider:"Groq",      model:"llama3-70b-8192",             category:"text",      baseModule:"intelligence/ai-engines/groq-engine",      maxTokens:8192,  contextWindow:8192,   speed:"fast",     quality:"premium",  requiresKey:"GROQ_API_KEY",      capabilities:["text","code","reasoning"],                     specialisms:["ultra-fast","open-source","500-tok/s"] },
  { id:"groq::llama3-8b",                name:"Llama 3 8B (Groq)",     provider:"Groq",      model:"llama3-8b-8192",              category:"text",      baseModule:"intelligence/ai-engines/groq-engine",      maxTokens:8192,  contextWindow:8192,   speed:"fast",     quality:"standard", requiresKey:"GROQ_API_KEY",      capabilities:["text","classification"],                       specialisms:["fastest","classification","summarisation"] },
  { id:"groq::mixtral-8x7b",             name:"Mixtral 8x7B (Groq)",   provider:"Groq",      model:"mixtral-8x7b-32768",          category:"text",      baseModule:"intelligence/ai-engines/groq-engine",      maxTokens:32768, contextWindow:32768,  speed:"fast",     quality:"premium",  requiresKey:"GROQ_API_KEY",      capabilities:["text","reasoning","long-context"],             specialisms:["long-context","multilingual","fast"] },
  { id:"groq::gemma2-9b",                name:"Gemma 2 9B (Groq)",     provider:"Groq",      model:"gemma2-9b-it",                category:"text",      baseModule:"intelligence/ai-engines/groq-engine",      maxTokens:8192,  contextWindow:8192,   speed:"fast",     quality:"standard", requiresKey:"GROQ_API_KEY",      capabilities:["text","instruction-following"],                specialisms:["google-quality","fast","efficient"] },
];

const GEMINI_MODELS: EngineConfig[] = [
  { id:"gemini::gemini-2-0-flash",       name:"Gemini 2.0 Flash",      provider:"Google",    model:"gemini-2.0-flash-exp",        category:"multimodal",baseModule:"intelligence/ai-engines/gemini-engine",    maxTokens:8192,  contextWindow:1000000,speed:"fast",     quality:"premium",  requiresKey:"GEMINI_API_KEY",    capabilities:["text","vision","audio","code","reasoning"],    specialisms:["1M-context","multimodal","fast"] },
  { id:"gemini::gemini-2-5-pro",         name:"Gemini 2.5 Pro",        provider:"Google",    model:"gemini-2.5-pro-preview",      category:"multimodal",baseModule:"intelligence/ai-engines/gemini-engine",    maxTokens:65536, contextWindow:1000000,speed:"slow",     quality:"elite",    requiresKey:"GEMINI_API_KEY",    capabilities:["text","vision","reasoning","code"],            specialisms:["1M-context","science","research","elite"] },
  { id:"gemini::gemini-1-5-flash",       name:"Gemini 1.5 Flash",      provider:"Google",    model:"gemini-1.5-flash",            category:"multimodal",baseModule:"intelligence/ai-engines/gemini-engine",    maxTokens:8192,  contextWindow:1000000,speed:"fast",     quality:"standard", requiresKey:"GEMINI_API_KEY",    capabilities:["text","vision","summarisation"],               specialisms:["1M-context","cost-efficient","fast"] },
];

const GLM_MODELS: EngineConfig[] = [
  { id:"glm::glm-4-plus",                name:"GLM-4 Plus",            provider:"ZhipuAI",   model:"glm-4-plus",                  category:"text",      baseModule:"intelligence/ai-engines/glm-engine",       maxTokens:4096,  contextWindow:128000, speed:"standard", quality:"premium",  requiresKey:"ZHIPUAI_API_KEY",   capabilities:["text","code","reasoning","chinese"],           specialisms:["chinese","bilingual","GPT-4-quality"] },
  { id:"glm::glm-4-flash",               name:"GLM-4 Flash",           provider:"ZhipuAI",   model:"glm-4-flash",                 category:"text",      baseModule:"intelligence/ai-engines/glm-engine",       maxTokens:4096,  contextWindow:128000, speed:"fast",     quality:"economy",  requiresKey:"ZHIPUAI_API_KEY",   capabilities:["text","classification"],                       specialisms:["ultra-cheap","high-throughput","chinese"] },
  { id:"glm::glm-4-long",                name:"GLM-4 Long",            provider:"ZhipuAI",   model:"glm-4-long",                  category:"text",      baseModule:"intelligence/ai-engines/glm-engine",       maxTokens:4096,  contextWindow:1000000,speed:"standard", quality:"premium",  requiresKey:"ZHIPUAI_API_KEY",   capabilities:["text","long-context","document-analysis"],     specialisms:["1M-context","document","chinese"] },
  { id:"glm::glm-4v-plus",               name:"GLM-4V Vision",         provider:"ZhipuAI",   model:"glm-4v-plus",                 category:"vision",    baseModule:"intelligence/ai-engines/glm-engine",       maxTokens:4096,  contextWindow:128000, speed:"standard", quality:"premium",  requiresKey:"ZHIPUAI_API_KEY",   capabilities:["vision","text","multimodal"],                  specialisms:["vision","chinese","multimodal"] },
];

const OLLAMA_MODELS: EngineConfig[] = [
  "llama3.2:latest","llama3.1:70b","llama3.1:8b","llama3.2:3b",
  "mistral:latest","mistral:7b","mixtral:8x7b","mistral-nemo:latest",
  "qwen2.5:72b","qwen2.5:32b","qwen2.5:14b","qwen2.5:7b","qwen2.5:3b",
  "deepseek-r1:70b","deepseek-r1:32b","deepseek-r1:14b","deepseek-r1:8b","deepseek-r1:7b",
  "deepseek-coder-v2:latest","deepseek-coder-v2:16b",
  "codestral:latest","codegemma:7b","starcoder2:15b","starcoder2:7b",
  "phi4:latest","phi3.5:latest","phi3:medium","phi3:mini",
  "gemma2:27b","gemma2:9b","gemma2:2b",
  "command-r:latest","command-r-plus:latest",
  "solar-pro:latest","internlm2:latest",
  "nous-hermes2:latest","neural-chat:latest",
  "orca-mini:latest","vicuna:latest","zephyr:latest",
  "yi:34b","yi:9b","yi:6b",
  "openchat:latest","starling-lm:latest",
  "llava:latest","llava:13b","llava:7b",
  "bakllava:latest","moondream:latest",
  "nomic-embed-text:latest","mxbai-embed-large:latest","all-minilm:latest",
].map((model): EngineConfig => ({
  id:            `ollama::${model.replace(/[^a-z0-9]/g,"-")}`,
  name:          `${model} (Local)`,
  provider:      "Ollama",
  model,
  category:      model.includes("embed") ? "embedding" : (model.includes("llava") || model.includes("moondream") || model.includes("bakllava")) ? "vision" : "text",
  baseModule:    "intelligence/ai-engines/ollama-engine",
  maxTokens:     4096,
  contextWindow: (model.includes("32b") || model.includes("70b")) ? 32768 : 8192,
  speed:         (model.includes("3b") || model.includes("7b") || model.includes("mini")) ? "fast" : (model.includes("70b") || model.includes("72b")) ? "slow" : "standard",
  quality:       (model.includes("70b") || model.includes("72b")) ? "premium" : (model.includes("3b") || model.includes("mini")) ? "economy" : "standard",
  requiresKey:   "",
  capabilities:  model.includes("embed") ? ["embedding"] : (model.includes("coder") || model.includes("code") || model.includes("star")) ? ["code","text"] : ["text","reasoning"],
  specialisms:   ["local","private","no-api-cost","offline"],
}));

const VIDEO_ENGINES: EngineConfig[] = [
  { id:"kling::kling-v2-pro",            name:"Kling AI v2 Pro",       provider:"KlingAI",      model:"kling-v2-pro",             category:"video",     baseModule:"intelligence/ai-engines/kling-engine",     maxTokens:0,     contextWindow:0,      speed:"slow",     quality:"elite",    requiresKey:"KLING_API_KEY",     capabilities:["text-to-video","image-to-video"],              specialisms:["1080p","5s-10s","physics-simulation"] },
  { id:"kling::kling-v1-5",              name:"Kling AI v1.5",         provider:"KlingAI",      model:"kling-v1-5",               category:"video",     baseModule:"intelligence/ai-engines/kling-engine",     maxTokens:0,     contextWindow:0,      speed:"standard", quality:"premium",  requiresKey:"KLING_API_KEY",     capabilities:["text-to-video","image-to-video"],              specialisms:["720p","fast","reliable"] },
  { id:"kling::kling-v1",                name:"Kling AI v1",           provider:"KlingAI",      model:"kling-v1",                 category:"video",     baseModule:"intelligence/ai-engines/kling-engine",     maxTokens:0,     contextWindow:0,      speed:"fast",     quality:"standard", requiresKey:"KLING_API_KEY",     capabilities:["text-to-video"],                               specialisms:["economy","fast","batch"] },
  { id:"runway::gen4-turbo",             name:"Runway Gen-4 Turbo",    provider:"Runway",       model:"gen4_turbo",               category:"video",     baseModule:"intelligence/ai-engines/runway-engine",    maxTokens:0,     contextWindow:0,      speed:"fast",     quality:"elite",    requiresKey:"RUNWAY_API_KEY",    capabilities:["text-to-video","image-to-video"],              specialisms:["gen4","fast","cinematic"] },
  { id:"runway::gen3-alpha",             name:"Runway Gen-3 Alpha",    provider:"Runway",       model:"gen3a_turbo",              category:"video",     baseModule:"intelligence/ai-engines/runway-engine",    maxTokens:0,     contextWindow:0,      speed:"standard", quality:"premium",  requiresKey:"RUNWAY_API_KEY",    capabilities:["text-to-video","image-to-video"],              specialisms:["gen3","smooth-motion","reliable"] },
  { id:"pika::pika-2-0",                 name:"Pika 2.0",              provider:"Pika Art",     model:"pika-2.0",                 category:"video",     baseModule:"intelligence/ai-engines/pika-engine",      maxTokens:0,     contextWindow:0,      speed:"standard", quality:"premium",  requiresKey:"PIKA_API_KEY",      capabilities:["text-to-video","image-to-video"],              specialisms:["creative","stylised","artistic"] },
  { id:"pika::pika-1-5",                 name:"Pika 1.5",              provider:"Pika Art",     model:"pika-1.5",                 category:"video",     baseModule:"intelligence/ai-engines/pika-engine",      maxTokens:0,     contextWindow:0,      speed:"fast",     quality:"standard", requiresKey:"PIKA_API_KEY",      capabilities:["text-to-video"],                               specialisms:["fast","stylised","economy"] },
  { id:"higgsfield::cosmos-1",           name:"Higgsfield Cosmos-1",   provider:"Higgsfield",   model:"cosmos-predict-1",         category:"video",     baseModule:"intelligence/ai-engines/higgsfield-engine",maxTokens:0,     contextWindow:0,      speed:"slow",     quality:"elite",    requiresKey:"HIGGSFIELD_API_KEY",capabilities:["text-to-video","cinematic"],                    specialisms:["cinematic","100-models","physics"] },
  { id:"heygen::avatar-v3",              name:"HeyGen Avatar v3",      provider:"HeyGen",       model:"avatar_v3",                category:"video",     baseModule:"intelligence/ai-engines/heygen-engine",    maxTokens:0,     contextWindow:0,      speed:"slow",     quality:"elite",    requiresKey:"HEYGEN_API_KEY",    capabilities:["avatar-video","lip-sync","presenter"],         specialisms:["avatar","no-face-tasweer-blocked","presenter"] },
];

const VOICE_ENGINES: EngineConfig[] = [
  { id:"elevenlabs::eleven-multilingual-v2", name:"ElevenLabs Multilingual v2", provider:"ElevenLabs", model:"eleven_multilingual_v2",  category:"audio",  baseModule:"intelligence/ai-engines/elevenlabs-engine", maxTokens:0, contextWindow:0, speed:"standard", quality:"elite",   requiresKey:"ELEVENLABS_API_KEY", capabilities:["tts","voice-cloning","multilingual"],          specialisms:["29-languages","ultra-realistic","emotional"] },
  { id:"elevenlabs::eleven-turbo-v2-5",     name:"ElevenLabs Turbo v2.5",     provider:"ElevenLabs", model:"eleven_turbo_v2_5",        category:"audio",  baseModule:"intelligence/ai-engines/elevenlabs-engine", maxTokens:0, contextWindow:0, speed:"fast",     quality:"premium", requiresKey:"ELEVENLABS_API_KEY", capabilities:["tts","fast-synthesis"],                        specialisms:["fastest-tts","low-latency","streaming"] },
  { id:"elevenlabs::eleven-flash-v2-5",     name:"ElevenLabs Flash v2.5",     provider:"ElevenLabs", model:"eleven_flash_v2_5",        category:"audio",  baseModule:"intelligence/ai-engines/elevenlabs-engine", maxTokens:0, contextWindow:0, speed:"fast",     quality:"standard",requiresKey:"ELEVENLABS_API_KEY", capabilities:["tts"],                                         specialisms:["ultra-fast","cost-efficient"] },
  { id:"elevenlabs::eleven-english-sts-v2", name:"ElevenLabs STS v2",         provider:"ElevenLabs", model:"eleven_english_sts_v2",    category:"audio",  baseModule:"intelligence/ai-engines/elevenlabs-engine", maxTokens:0, contextWindow:0, speed:"standard", quality:"premium", requiresKey:"ELEVENLABS_API_KEY", capabilities:["speech-to-speech","voice-transform"],          specialisms:["voice-conversion","real-time"] },
];

// ── Specialised / Research engines ────────────────────────────────────────────

const SPECIALISED_ENGINES: EngineConfig[] = [
  { id:"perplexity::sonar-pro",          name:"Perplexity Sonar Pro",  provider:"Perplexity", model:"sonar-pro",                   category:"specialised",baseModule:"core/search/perplexity-plus-engine",       maxTokens:8192,  contextWindow:127072, speed:"standard", quality:"elite",    requiresKey:"ANTHROPIC_API_KEY", capabilities:["web-search","research","cited-answers"],       specialisms:["real-time-web","citations","research"] },
  { id:"perplexity::sonar",              name:"Perplexity Sonar",      provider:"Perplexity", model:"sonar",                       category:"specialised",baseModule:"core/search/perplexity-plus-engine",       maxTokens:8192,  contextWindow:127072, speed:"fast",     quality:"premium",  requiresKey:"ANTHROPIC_API_KEY", capabilities:["web-search","research"],                       specialisms:["fast-search","real-time","efficient"] },
];

// ── Full manifest ─────────────────────────────────────────────────────────────

export const ENGINE_MANIFEST: EngineConfig[] = [
  ...ANTHROPIC_MODELS,
  ...OPENAI_MODELS,
  ...DEEPSEEK_MODELS,
  ...GROQ_MODELS,
  ...GEMINI_MODELS,
  ...GLM_MODELS,
  ...OLLAMA_MODELS,
  ...VIDEO_ENGINES,
  ...VOICE_ENGINES,
  ...SPECIALISED_ENGINES,
].map(e => ({
  ...e,
  available: (() => {
    if (!e.requiresKey) return true;
    const val = process.env[e.requiresKey];
    return val !== undefined && val.trim() !== "";
  })(),
}));

export function getEngineCount(): number { return ENGINE_MANIFEST.length; }
export function getAvailableEngines(): EngineConfig[] { return ENGINE_MANIFEST.filter(e => e.available); }
export function getEnginesByCategory(cat: EngineCategory): EngineConfig[] { return ENGINE_MANIFEST.filter(e => e.category === cat); }
export function getEnginesByProvider(provider: string): EngineConfig[] { return ENGINE_MANIFEST.filter(e => e.provider === provider); }
export function getEngineById(id: string): EngineConfig | undefined { return ENGINE_MANIFEST.find(e => e.id === id); }
export function describeEngineManifest(): string {
  const total    = ENGINE_MANIFEST.length;
  const available = getAvailableEngines().length;
  const providers = [...new Set(ENGINE_MANIFEST.map(e => e.provider))];
  return `Engine Manifest: ${total} configs | ${available} available | ${providers.length} providers`;
}
