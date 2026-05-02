// Created by BBMW0 Technologies | bbmw0.com

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerationConfig,
  SafetySetting,
} from "@google/generative-ai";

export interface InfluencerResearch {
  name: string;
  platform: string;
  subscribers: string;
  niche: string;
  top3Achievements: string[];
  personalityTraits: string[];
  contentStyle: string;
  recentHighlight: string;
  whyPeopleLoveThm: string;
}

export interface ShortsScript {
  hook: string;
  mainContent: {
    point1: string;
    point2: string;
    point3: string;
  };
  cta: string;
  captionText: string;
  hashtags: string[];
}

interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

const MOCK_INFLUENCER_RESEARCH: InfluencerResearch = {
  name: "Unknown Influencer",
  platform: "YouTube",
  subscribers: "1M+",
  niche: "Content Creation",
  top3Achievements: [
    "Built a loyal community",
    "Created viral content",
    "Inspired thousands",
  ],
  personalityTraits: ["Creative", "Authentic", "Passionate"],
  contentStyle: "Engaging and educational",
  recentHighlight: "Recent viral video hit millions of views",
  whyPeopleLoveThm:
    "Their genuine personality and incredible value they provide",
};

const MOCK_SHORTS_SCRIPT: ShortsScript = {
  hook: "You won't believe what this creator achieved!",
  mainContent: {
    point1: "They built an incredible community from scratch",
    point2: "Their content changed how millions of people think",
    point3: "Their dedication to quality is unmatched",
  },
  cta: "Follow for more amazing creator spotlights!",
  captionText:
    "Amazing creator spotlight - drop a comment if you love their work!",
  hashtags: [
    "#Shorts",
    "#Creator",
    "#Inspiration",
    "#YouTube",
    "#ContentCreator",
  ],
};

const SAFETY_SETTINGS: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

export class GeminiClient {
  private client: GoogleGenerativeAI | null = null;
  private readonly defaultModel = "gemini-1.5-pro";
  private readonly fastModel = "gemini-1.5-flash";

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn(
        "[GeminiClient] GEMINI_API_KEY not set — falling back to mock data for all Gemini calls."
      );
      return;
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateContent(
    prompt: string,
    opts: GenerateOptions = {}
  ): Promise<string> {
    if (!this.client) {
      console.warn("[GeminiClient] No API key — returning mock string.");
      return "Mock Gemini response for: " + prompt.slice(0, 60);
    }

    const modelName = opts.model ?? this.defaultModel;
    const generationConfig: GenerationConfig = {};
    if (opts.temperature !== undefined) {
      generationConfig.temperature = opts.temperature;
    }
    if (opts.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = opts.maxTokens;
    }

    const model = this.client.getGenerativeModel({
      model: modelName,
      safetySettings: SAFETY_SETTINGS,
      generationConfig,
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  async generateContentWithContext(
    systemPrompt: string,
    userPrompt: string,
    opts: GenerateOptions = {}
  ): Promise<string> {
    const combined =
      "SYSTEM INSTRUCTIONS:\n" +
      systemPrompt +
      "\n\nUSER REQUEST:\n" +
      userPrompt;
    return this.generateContent(combined, opts);
  }

  async researchInfluencer(name: string): Promise<InfluencerResearch> {
    if (!this.client) {
      console.warn(
        "[GeminiClient] No API key — returning mock InfluencerResearch for: " +
          name
      );
      return { ...MOCK_INFLUENCER_RESEARCH, name };
    }

    const prompt =
      "Research the content creator: " +
      name +
      "\n\n" +
      "Return a JSON object ONLY (no markdown, no explanation) with exactly these fields:\n" +
      "{\n" +
      '  "name": string,\n' +
      '  "platform": "YouTube" | "TikTok" | "Instagram" | "Twitter" | "Podcast",\n' +
      '  "subscribers": string (e.g. "15M"),\n' +
      '  "niche": string (e.g. "Tech Reviews", "Science Education"),\n' +
      '  "top3Achievements": [string, string, string],\n' +
      '  "personalityTraits": [string, string, string],\n' +
      '  "contentStyle": string,\n' +
      '  "recentHighlight": string,\n' +
      '  "whyPeopleLoveThm": string\n' +
      "}\n\n" +
      "Focus on positive, inspiring facts. Be accurate and enthusiastic.";

    try {
      const raw = await this.generateContent(prompt, {
        model: this.defaultModel,
        temperature: 0.7,
        maxTokens: 1024,
      });

      const cleaned = raw
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      const parsed = JSON.parse(cleaned) as InfluencerResearch;
      return parsed;
    } catch (err) {
      console.error(
        "[GeminiClient] Failed to parse researchInfluencer response for " +
          name +
          ":",
        err
      );
      return { ...MOCK_INFLUENCER_RESEARCH, name };
    }
  }

  async generateShortsScript(
    influencer: InfluencerResearch,
    angle: string
  ): Promise<ShortsScript> {
    if (!this.client) {
      console.warn(
        "[GeminiClient] No API key — returning mock ShortsScript for: " +
          influencer.name
      );
      return {
        ...MOCK_SHORTS_SCRIPT,
        captionText:
          "Amazing creator spotlight: " +
          influencer.name +
          " — drop a comment!",
        hashtags: [
          "#Shorts",
          "#" + influencer.name.replace(/\s+/g, ""),
          "#Creator",
          "#Inspiration",
          "#YouTube",
        ],
      };
    }

    const prompt =
      "You are a viral YouTube Shorts scriptwriter.\n\n" +
      "Create a 60-second Shorts script about: " +
      influencer.name +
      "\n" +
      "Angle: " +
      angle +
      "\n\n" +
      "Creator research:\n" +
      JSON.stringify(influencer, null, 2) +
      "\n\n" +
      "Return a JSON object ONLY (no markdown, no explanation) with exactly these fields:\n" +
      "{\n" +
      '  "hook": string (0-5s — one powerful sentence that grabs attention),\n' +
      '  "mainContent": {\n' +
      '    "point1": string (5-20s bullet),\n' +
      '    "point2": string (20-35s bullet),\n' +
      '    "point3": string (35-50s bullet)\n' +
      "  },\n" +
      '  "cta": string (50-60s — call to action),\n' +
      '  "captionText": string (caption for the Short, max 200 chars),\n' +
      '  "hashtags": string[] (8-12 relevant hashtags including #Shorts)\n' +
      "}\n\n" +
      "Rules: positive energy only, exciting language, focus on what makes people LOVE " +
      influencer.name +
      ".";

    try {
      const raw = await this.generateContent(prompt, {
        model: this.fastModel,
        temperature: 0.85,
        maxTokens: 1024,
      });

      const cleaned = raw
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      const parsed = JSON.parse(cleaned) as ShortsScript;
      return parsed;
    } catch (err) {
      console.error(
        "[GeminiClient] Failed to parse generateShortsScript response for " +
          influencer.name +
          ":",
        err
      );
      return {
        ...MOCK_SHORTS_SCRIPT,
        captionText:
          "Amazing creator spotlight: " +
          influencer.name +
          " — drop a comment!",
        hashtags: [
          "#Shorts",
          "#" + influencer.name.replace(/\s+/g, ""),
          "#Creator",
          "#Inspiration",
          "#YouTube",
        ],
      };
    }
  }
}

export const geminiClient = new GeminiClient();
export default geminiClient;
