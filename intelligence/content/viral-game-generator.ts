// Created by BBMW0 Technologies | bbmw0.com

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { agentSecurity } from "../security/agent-security-engine";

export interface GameConcept {
  id: string;
  title: string;
  tagline: string;
  category: "hyper-casual" | "educational-ai" | "viral-social" | "utility-gamified";
  genre: string;
  targetAudience: string;
  coreLoopDescription: string;
  viralMechanic: string;
  monetizationStrategy: string;
  techStack: string;
  estimatedDevTime: string;
  marketingAngle: string;
}

export interface GamePackage {
  id: string;
  generatedAt: string;
  quarter: string;
  concept: GameConcept;
  htmlGameSource: string;
  manifestJson: object;
  googlePlayListing: {
    title: string;
    shortDescription: string;
    fullDescription: string;
    category: string;
    contentRating: string;
    keywords: string[];
  };
  appStoreReadyAssets: {
    iconPrompt: string;
    screenshotPrompts: string[];
    featureGraphicPrompt: string;
  };
  publishingChecklist: string[];
  estimatedPublishDate: string;
}

const CATEGORY_ROTATION: GameConcept["category"][] = [
  "hyper-casual",
  "educational-ai",
  "viral-social",
  "utility-gamified",
];

const CATEGORY_DESCRIPTIONS: Record<GameConcept["category"], string> = {
  "hyper-casual": "a hyper-casual mobile game (endless runner, tap game, or reflex challenge), dead-simple mechanics, satisfying feedback loops, addictive one-more-try feel",
  "educational-ai": "an educational AI quiz app covering AI facts, tech history, or 'Would an AI do this?' challenges, makes learning about AI viral and fun",
  "viral-social": "a viral social game such as an AI prediction game or AI vs Human challenge, designed for screenshots, sharing, and social bragging",
  "utility-gamified": "a utility app with game elements such as an AI learning tracker or productivity game, delivers real value while making daily habits addictive",
};

export class ViralGameGenerator {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  getCurrentQuarter(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based
    const q = Math.floor(month / 3) + 1;
    return `${year}-Q${q}`;
  }

  getCategoryForQuarter(quarter: string): GameConcept["category"] {
    // Parse "YYYY-Qn" and map Q1=0, Q2=1, Q3=2, Q4=3
    const match = quarter.match(/Q(\d)/);
    if (!match) return "hyper-casual";
    const qIndex = (parseInt(match[1], 10) - 1) % 4;
    return CATEGORY_ROTATION[qIndex];
  }

  async generateGameConcept(category: GameConcept["category"]): Promise<GameConcept> {
    const categoryDesc = CATEGORY_DESCRIPTIONS[category];

    const response = await this.anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      system:
        "You are a viral mobile game designer who has shipped 50+ top-10 App Store games. " +
        "You understand what makes games addictive, shareable, and monetizable. " +
        "Generate concepts that ANYONE can pick up in 3 seconds. " +
        "Always respond with ONLY valid JSON, no markdown fences, no prose.",
      messages: [
        {
          role: "user",
          content:
            `Generate a ${categoryDesc} for 2026. ` +
            "Target audience: tech-savvy millennials and Gen-Z who follow AI content on TikTok/YouTube/X. " +
            "The game must be publishable to Google Play and App Store. " +
            "Return ONLY a valid JSON object matching this exact TypeScript interface (no extra fields):\n" +
            "{\n" +
            '  "id": string,          // kebab-case slug, e.g. "tap-the-bot"\n' +
            '  "title": string,\n' +
            '  "tagline": string,     // ≤10 words, punchy\n' +
            '  "category": "' + category + '",\n' +
            '  "genre": string,\n' +
            '  "targetAudience": string,\n' +
            '  "coreLoopDescription": string,\n' +
            '  "viralMechanic": string,\n' +
            '  "monetizationStrategy": string,\n' +
            '  "techStack": string,\n' +
            '  "estimatedDevTime": string,\n' +
            '  "marketingAngle": string\n' +
            "}",
        },
      ],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    // Strip markdown fences if Claude wrapped anyway
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const concept = JSON.parse(cleaned) as GameConcept;
    return concept;
  }

  async generateHtml5Game(concept: GameConcept): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8000,
      system:
        "You are an expert HTML5 game developer. Generate COMPLETE, WORKING single-file HTML5 games. " +
        "The code must be production-ready, mobile-optimized, and run without any external dependencies " +
        "except CDN-hosted libraries. Always respond with ONLY the raw HTML, no markdown fences, no prose.",
      messages: [
        {
          role: "user",
          content:
            `Create a COMPLETE standalone HTML5 game implementing this concept:\n\n` +
            `Title: ${concept.title}\n` +
            `Tagline: ${concept.tagline}\n` +
            `Category: ${concept.category}\n` +
            `Genre: ${concept.genre}\n` +
            `Core loop: ${concept.coreLoopDescription}\n` +
            `Viral mechanic: ${concept.viralMechanic}\n\n` +
            "REQUIREMENTS:\n" +
            "- Single self-contained .html file\n" +
            "- Works fully offline (inline all JS/CSS, only CDN libs allowed)\n" +
            "- Mobile-first: touch events, viewport meta, 375px min width\n" +
            "- Score system with local high-score (localStorage)\n" +
            "- Share button that copies a score message to clipboard\n" +
            '- Footer branding: "Powered by AI · @bbm0902" in small text\n' +
            "- No external fonts that require CORS\n" +
            "- Game must match the concept exactly\n" +
            "Output ONLY the complete HTML document starting with <!DOCTYPE html>",
        },
      ],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";
    return raw.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/, "");
  }

  private async generateGooglePlayListing(
    concept: GameConcept
  ): Promise<GamePackage["googlePlayListing"]> {
    const response = await this.anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      system:
        "You are an App Store optimisation (ASO) expert. Write Google Play Store listings " +
        "that maximise discoverability and conversions. " +
        "Always respond with ONLY valid JSON, no markdown fences, no prose.",
      messages: [
        {
          role: "user",
          content:
            `Write a Google Play Store listing for:\n` +
            `Title: ${concept.title}\n` +
            `Tagline: ${concept.tagline}\n` +
            `Category: ${concept.category}\n` +
            `Core loop: ${concept.coreLoopDescription}\n` +
            `Viral mechanic: ${concept.viralMechanic}\n` +
            `Marketing angle: ${concept.marketingAngle}\n\n` +
            "Return ONLY valid JSON:\n" +
            "{\n" +
            '  "title": string,              // ≤50 chars\n' +
            '  "shortDescription": string,   // ≤80 chars\n' +
            '  "fullDescription": string,    // ≤4000 chars, use \\n for newlines\n' +
            '  "category": string,           // Google Play category\n' +
            '  "contentRating": string,      // e.g. "Everyone"\n' +
            '  "keywords": string[]          // 10-15 ASO keywords\n' +
            "}",
        },
      ],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return JSON.parse(cleaned) as GamePackage["googlePlayListing"];
  }

  private generateAssetPrompts(concept: GameConcept): GamePackage["appStoreReadyAssets"] {
    const style = `vibrant, modern, mobile-game style, no text in image`;
    return {
      iconPrompt:
        `App icon for "${concept.title}": ${concept.tagline}. ` +
        `Key visual element from: ${concept.genre}. ${style}. 1024x1024px.`,
      screenshotPrompts: [
        `Screenshot 1: Gameplay: Show the main game screen of "${concept.title}" in action. ` +
          `Display score counter, core mechanic (${concept.coreLoopDescription}). Portrait 1080x1920px.`,
        `Screenshot 2: Hook moment: Show the most exciting/tense moment in "${concept.title}". ` +
          `Vivid colors, clear UI. Portrait 1080x1920px.`,
        `Screenshot 3: High score / Achievement: Show a high-score celebration screen for "${concept.title}". ` +
          `Confetti, big number, share button visible. Portrait 1080x1920px.`,
        `Screenshot 4: Viral mechanic: Illustrate the viral feature of "${concept.title}": ` +
          `${concept.viralMechanic}. Social share UI elements visible. Portrait 1080x1920px.`,
        `Screenshot 5: Onboarding: Show the first-run welcome screen of "${concept.title}" ` +
          `with simple one-tap instruction. Clean and inviting. Portrait 1080x1920px.`,
      ],
      featureGraphicPrompt:
        `Feature graphic for "${concept.title}" on Google Play. ` +
        `Bold title text, game character or key visual, ${concept.tagline}. ` +
        `Landscape 1024x500px. ${style}.`,
    };
  }

  private buildCapacitorManifest(concept: GameConcept): object {
    return {
      appId: `com.bbmw0.${concept.id.replace(/-/g, "")}`,
      appName: concept.title,
      webDir: "dist",
      version: "1.0.0",
      versionCode: 1,
      bundledWebRuntime: false,
      plugins: {
        SplashScreen: {
          launchShowDuration: 1500,
          backgroundColor: "#000000",
          showSpinner: false,
        },
        StatusBar: {
          style: "dark",
          backgroundColor: "#000000",
        },
      },
      android: {
        buildOptions: {
          keystorePath: "release.keystore",
          keystoreAlias: "key0",
        },
        minSdkVersion: 22,
        targetSdkVersion: 34,
      },
      ios: {
        scheme: concept.title.replace(/\s+/g, ""),
        deploymentTarget: "14.0",
      },
    };
  }

  private buildPublishingChecklist(concept: GameConcept, quarter: string): string[] {
    return [
      `[ ] Game tested on Android (Chrome mobile) and iOS (Safari), tap events work correctly`,
      `[ ] Verify localStorage high-score persists across sessions`,
      `[ ] Test share button: copies score message to clipboard`,
      `[ ] Run game.html through HTML validator (validator.w3.org)`,
      `[ ] Wrap in Capacitor: npx cap add android && npx cap add ios`,
      `[ ] Replace webDir dist content with built game.html`,
      `[ ] Generate signed APK: npx cap build android --release`,
      `[ ] Test APK on physical Android device`,
      `[ ] Generate 512x512 app icon PNG from iconPrompt (asset-prompts.md)`,
      `[ ] Generate 5 portrait screenshots (1080x1920) from screenshotPrompts`,
      `[ ] Generate feature graphic (1024x500) from featureGraphicPrompt`,
      `[ ] Create Google Play Console account (one-time $25 fee)`,
      `[ ] Create new app in Play Console: "${concept.title}"`,
      `[ ] Set content rating: complete questionnaire (target: Everyone)`,
      `[ ] Paste google-play-listing.json fields into Play Console store listing`,
      `[ ] Upload APK to Internal Testing track, install and verify`,
      `[ ] Promote to Production track`,
      `[ ] Submit for review (typically 1-3 days)`,
      `[ ] Tag git commit: ${quarter}-${concept.id}-published`,
      `[ ] Post launch announcement on X/Twitter with #${concept.id.replace(/-/g, "")} hashtag`,
    ];
  }

  getNextScheduledDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const quarterlyDates = [
      new Date(year, 0, 1),   // Jan 1
      new Date(year, 3, 1),   // Apr 1
      new Date(year, 6, 1),   // Jul 1
      new Date(year, 9, 1),   // Oct 1
      new Date(year + 1, 0, 1), // Jan 1 next year
    ];
    const next = quarterlyDates.find((d) => d > now);
    if (!next) return new Date(year + 1, 0, 1).toISOString().split("T")[0];
    return next.toISOString().split("T")[0];
  }

  async generateGamePackage(): Promise<GamePackage> {
    // 1. Security audit
    const ctx = {
      agentId: "game-generator",
      tenantId: "bbmw0-main",
      operation: "generate-and-save-game-package",
      timestamp: new Date().toISOString(),
    };
    agentSecurity.runFullSecurityAudit(ctx);

    // 2. Quarter + category
    const quarter = this.getCurrentQuarter();
    const category = this.getCategoryForQuarter(quarter);
    console.log(`[ViralGameGenerator] Quarter: ${quarter} | Category: ${category}`);

    // 3. Generate concept
    console.log(`[ViralGameGenerator] Generating game concept...`);
    const concept = await this.generateGameConcept(category);
    console.log(`[ViralGameGenerator] Concept: "${concept.title}" (${concept.id})`);

    // 4. Generate HTML5 game source
    console.log(`[ViralGameGenerator] Generating HTML5 game source...`);
    const htmlGameSource = await this.generateHtml5Game(concept);
    console.log(`[ViralGameGenerator] Game source: ${htmlGameSource.length} chars`);

    // 5. Generate Google Play listing
    console.log(`[ViralGameGenerator] Generating Google Play listing...`);
    const googlePlayListing = await this.generateGooglePlayListing(concept);

    // 6. Generate asset prompts
    const appStoreReadyAssets = this.generateAssetPrompts(concept);

    // 7. Build Capacitor manifest
    const manifestJson = this.buildCapacitorManifest(concept);

    // 8. Build publishing checklist
    const publishingChecklist = this.buildPublishingChecklist(concept, quarter);

    // 9. Assemble package
    const pkg: GamePackage = {
      id: uuidv4(),
      generatedAt: new Date().toISOString(),
      quarter,
      concept,
      htmlGameSource,
      manifestJson,
      googlePlayListing,
      appStoreReadyAssets,
      publishingChecklist,
      estimatedPublishDate: this.getNextScheduledDate(),
    };

    console.log(`[ViralGameGenerator] Package assembled: ${pkg.id}`);
    return pkg;
  }

  saveGamePackage(pkg: GamePackage, outputDir: string): void {
    const dir = path.join(outputDir, `${pkg.quarter}-${pkg.concept.id}`);
    fs.mkdirSync(dir, { recursive: true });

    const gamePath = path.join(dir, "game.html");
    fs.writeFileSync(gamePath, pkg.htmlGameSource, "utf-8");
    console.log(`[ViralGameGenerator] Saved: ${gamePath}`);

    const conceptPath = path.join(dir, "concept.json");
    fs.writeFileSync(conceptPath, JSON.stringify(pkg.concept, null, 2), "utf-8");
    console.log(`[ViralGameGenerator] Saved: ${conceptPath}`);

    const listingPath = path.join(dir, "google-play-listing.json");
    fs.writeFileSync(listingPath, JSON.stringify(pkg.googlePlayListing, null, 2), "utf-8");
    console.log(`[ViralGameGenerator] Saved: ${listingPath}`);

    const manifestPath = path.join(dir, "capacitor-manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(pkg.manifestJson, null, 2), "utf-8");
    console.log(`[ViralGameGenerator] Saved: ${manifestPath}`);

    const checklistLines = ["# Publishing Checklist\n", ...pkg.publishingChecklist.map((l) => l + "\n")];
    const checklistPath = path.join(dir, "publishing-checklist.md");
    fs.writeFileSync(checklistPath, checklistLines.join(""), "utf-8");
    console.log(`[ViralGameGenerator] Saved: ${checklistPath}`);

    const assets = pkg.appStoreReadyAssets;
    const assetLines = [
      "# Asset Generation Prompts\n\n",
      "## App Icon (1024x1024)\n\n",
      assets.iconPrompt + "\n\n",
      "## Feature Graphic (1024x500)\n\n",
      assets.featureGraphicPrompt + "\n\n",
      "## Screenshots (1080x1920 portrait)\n\n",
      ...assets.screenshotPrompts.map((p, i) => `### Screenshot ${i + 1}\n\n${p}\n\n`),
    ];
    const assetsPath = path.join(dir, "asset-prompts.md");
    fs.writeFileSync(assetsPath, assetLines.join(""), "utf-8");
    console.log(`[ViralGameGenerator] Saved: ${assetsPath}`);

    console.log(`[ViralGameGenerator] All files written to: ${dir}`);
  }
}

export const viralGameGenerator = new ViralGameGenerator();
