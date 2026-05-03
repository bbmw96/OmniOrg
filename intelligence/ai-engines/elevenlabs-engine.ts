// Created by BBMW0 Technologies | bbmw0.com
/**
 * ELEVENLABS+ ENGINE
 *
 * OmniOrg-native ElevenLabs voice synthesis engine.
 * Replaces: elevenlabs.io ($5-$330+/mo) with full code ownership.
 *
 * Capabilities:
 *   - List available voices (library + cloned)
 *   - Text-to-speech with quality controls (stability, similarity boost)
 *   - Streaming speech synthesis (real-time audio buffer)
 *   - Voice cloning from audio samples
 *   - Usage and subscription monitoring
 *
 * Auth: xi-api-key header (ELEVENLABS_API_KEY env var)
 * Base URL: https://api.elevenlabs.io/v1
 */

import { proxyFetch } from "../../core/proxy-fetch";
import { config as loadEnv } from "dotenv";
import path from "path";
import { mkdirSync, writeFileSync } from "fs";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const API_KEY  = process.env.ELEVENLABS_API_KEY ?? "";
const BASE_URL = "https://api.elevenlabs.io/v1";
const OUT_DIR  = path.resolve(__dirname, "../../output/elevenlabs");

mkdirSync(OUT_DIR, { recursive: true });

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ElevenLabsVoice {
  voiceId:     string;
  name:        string;
  category:    string;
  previewUrl?: string;
}

interface ElevenLabsTtsOpts {
  modelId?:         string;
  stability?:       number;
  similarityBoost?: number;
}

// ── API helpers ────────────────────────────────────────────────────────────────

function elevenHeaders(contentType = "application/json"): Record<string, string> {
  if (!API_KEY) throw new Error("[ElevenLabs+] ELEVENLABS_API_KEY not set in .env");
  return {
    "xi-api-key":   API_KEY,
    "Content-Type": contentType,
  };
}

async function elevenGet<T>(endpoint: string): Promise<T> {
  const resp = await proxyFetch(`${BASE_URL}${endpoint}`, {
    headers: elevenHeaders(),
  });
  if (!resp.ok) {
    throw new Error(`[ElevenLabs+] GET ${endpoint} failed: ${resp.status} ${await resp.text()}`);
  }
  return resp.json() as Promise<T>;
}

async function elevenPost(endpoint: string, body: unknown): Promise<Response> {
  const resp = await proxyFetch(`${BASE_URL}${endpoint}`, {
    method:  "POST",
    headers: elevenHeaders(),
    body:    JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`[ElevenLabs+] POST ${endpoint} failed: ${resp.status} ${await resp.text()}`);
  }
  return resp;
}

// ── Core API operations ────────────────────────────────────────────────────────

/**
 * List all available voices (pre-made + cloned).
 */
export async function listVoices(): Promise<ElevenLabsVoice[]> {
  type ApiVoice = {
    voice_id:    string;
    name:        string;
    category:    string;
    preview_url?: string;
  };
  type VoicesResp = { voices: ApiVoice[] };

  const data = await elevenGet<VoicesResp>("/voices");
  return (data.voices ?? []).map(v => ({
    voiceId:    v.voice_id,
    name:       v.name,
    category:   v.category ?? "premade",
    previewUrl: v.preview_url,
  }));
}

/**
 * Convert text to speech and save as MP3.
 * Returns the local file path of the saved audio.
 */
export async function textToSpeech(
  text:    string,
  voiceId: string,
  opts?:   ElevenLabsTtsOpts,
): Promise<string> {
  const body = {
    text,
    model_id:       opts?.modelId ?? "eleven_multilingual_v2",
    voice_settings: {
      stability:        opts?.stability        ?? 0.5,
      similarity_boost: opts?.similarityBoost  ?? 0.75,
    },
  };

  const resp = await elevenPost(`/text-to-speech/${voiceId}`, body);
  const buffer = await resp.arrayBuffer();

  const timestamp = Date.now();
  const outPath   = path.join(OUT_DIR, `${voiceId}-${timestamp}.mp3`);
  writeFileSync(outPath, Buffer.from(buffer));

  console.log(`[ElevenLabs+] TTS saved: ${outPath}`);
  return outPath;
}

/**
 * Stream speech synthesis and return audio data as a Buffer.
 * Useful for piping directly to a player or further processing.
 */
export async function streamSpeech(
  text:    string,
  voiceId: string,
): Promise<Buffer> {
  const body = {
    text,
    model_id: "eleven_multilingual_v2",
  };

  const resp = await elevenPost(`/text-to-speech/${voiceId}/stream`, body);
  const arrayBuffer = await resp.arrayBuffer();

  console.log(`[ElevenLabs+] Stream received: ${arrayBuffer.byteLength} bytes`);
  return Buffer.from(arrayBuffer);
}

/**
 * Clone a voice from audio samples.
 * Returns the voice_id of the newly created clone.
 */
export async function cloneVoice(
  name:           string,
  audioFilePaths: string[],
): Promise<string> {
  if (!API_KEY) throw new Error("[ElevenLabs+] ELEVENLABS_API_KEY not set in .env");
  if (audioFilePaths.length === 0) throw new Error("[ElevenLabs+] At least one audio file is required for voice cloning");

  const { readFileSync } = await import("fs");
  const formData = new FormData();
  formData.append("name", name);

  for (const filePath of audioFilePaths) {
    const filename = path.basename(filePath);
    const fileBuffer = readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: "audio/mpeg" });
    formData.append("files", blob, filename);
  }

  const resp = await proxyFetch(`${BASE_URL}/voices/add`, {
    method:  "POST",
    headers: { "xi-api-key": API_KEY },
    body:    formData as unknown as BodyInit,
  });

  if (!resp.ok) {
    throw new Error(`[ElevenLabs+] POST /voices/add failed: ${resp.status} ${await resp.text()}`);
  }

  type CloneResp = { voice_id: string };
  const data = await resp.json() as CloneResp;

  if (!data.voice_id) throw new Error("[ElevenLabs+] No voice_id in clone response: " + JSON.stringify(data));

  console.log(`[ElevenLabs+] Voice cloned: ${data.voice_id} (${name})`);
  return data.voice_id;
}

/**
 * Get current subscription usage (character count and limit).
 */
export async function getUsage(): Promise<{ characterCount: number; characterLimit: number }> {
  type SubResp = {
    character_count: number;
    character_limit: number;
  };

  const data = await elevenGet<SubResp>("/user/subscription");
  return {
    characterCount: data.character_count,
    characterLimit: data.character_limit,
  };
}

export { OUT_DIR as ELEVENLABS_OUTPUT_DIR };
