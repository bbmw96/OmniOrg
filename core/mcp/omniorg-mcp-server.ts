// Created by BBMW0 Technologies | bbmw0.com
/**
 * OMNIORG MCP SERVER
 *
 * Exposes OmniOrg capabilities as standard MCP tools.
 * Any external AI agent (Claude Code, Cursor, Copilot, etc.) can call
 * these tools once this server is registered in claude_desktop_config.json.
 *
 * REGISTRATION NOTE:
 * To register as an MCP server, add to claude_desktop_config.json:
 *   {
 *     "mcpServers": {
 *       "omniorg": {
 *         "command": "node",
 *         "args": ["dist/core/mcp/omniorg-mcp-server.js"]
 *       }
 *     }
 *   }
 *
 * Transport: stdio (reads from stdin, writes to stdout).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import Anthropic from "@anthropic-ai/sdk";
import { config as loadEnv } from "dotenv";
import path from "path";

import { search as perplexitySearch, quickSearch } from "../search/perplexity-plus-engine";
import { proxyFetch } from "../proxy-fetch";
import {
  watchdogEventCount,
  watchdogCriticalCount,
} from "../../intelligence/security/watchdog-agent";
import {
  generateTextVideo,
  type HiggsfieldTextToVideoRequest,
} from "../../intelligence/ai-engines/higgsfield-engine";

import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

// ── Anthropic client (for omniorg_summarise, omniorg_generate_content, omniorg_agent_spawn) ──

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── MCP Server instance ────────────────────────────────────────────────────────

const server = new Server(
  { name: "omniorg", version: "2.0.0" },
  { capabilities: { tools: {} } },
);

// ── Tool definitions (JSON Schema) ────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "omniorg_search",
      description:
        "AI-powered web search using the OmniOrg Perplexity+ engine. Returns a cited Markdown answer synthesised from real web sources.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "The search query or question to answer.",
          },
          mode: {
            type: "string",
            enum: ["quick", "deep"],
            description:
              "quick - fast single-query search with 3 sources. deep - expanded multi-query search with up to 10 sources.",
          },
        },
        required: ["query", "mode"],
      },
    },
    {
      name: "omniorg_grab_page",
      description:
        "Fetches a web page and returns its main article content cleaned by Mozilla Readability. Strips ads, navigation, and boilerplate.",
      inputSchema: {
        type: "object" as const,
        properties: {
          url: {
            type: "string",
            description: "Full URL of the web page to fetch (must include https://).",
          },
        },
        required: ["url"],
      },
    },
    {
      name: "omniorg_youtube_transcript",
      description:
        "Extracts the transcript from a YouTube video. Returns plain text of all captions.",
      inputSchema: {
        type: "object" as const,
        properties: {
          url: {
            type: "string",
            description:
              "Full YouTube video URL, e.g. https://www.youtube.com/watch?v=XXXXXXXXXXX",
          },
        },
        required: ["url"],
      },
    },
    {
      name: "omniorg_summarise",
      description:
        "Fetches a web article and returns an AI-generated summary with key takeaways and topic tags.",
      inputSchema: {
        type: "object" as const,
        properties: {
          url: {
            type: "string",
            description: "Full URL of the article to summarise.",
          },
        },
        required: ["url"],
      },
    },
    {
      name: "omniorg_generate_video",
      description:
        "Generates a video from a text prompt using the OmniOrg Higgsfield+ engine. Returns the local file path of the generated video.",
      inputSchema: {
        type: "object" as const,
        properties: {
          prompt: {
            type: "string",
            description: "Text description of the video to generate.",
          },
          model: {
            type: "string",
            description:
              "Higgsfield model slug, e.g. 'kling-video/v2.1/pro/text-to-video' or 'wan/2.1/t2v-turbo'.",
          },
          aspectRatio: {
            type: "string",
            description: "Optional aspect ratio: '16:9', '9:16', or '1:1'. Defaults to '16:9'.",
          },
        },
        required: ["prompt", "model"],
      },
    },
    {
      name: "omniorg_generate_content",
      description:
        "Generates long-form content (blog post, social copy, email, or video script) on any topic using Claude.",
      inputSchema: {
        type: "object" as const,
        properties: {
          topic: {
            type: "string",
            description: "The topic or subject for the content.",
          },
          format: {
            type: "string",
            enum: ["blog", "social", "email", "script"],
            description:
              "Content format: blog (full article), social (short-form post), email (newsletter/campaign), script (video/podcast script).",
          },
          tone: {
            type: "string",
            description:
              "Optional tone descriptor, e.g. 'professional', 'casual', 'persuasive', 'educational'. Defaults to 'professional'.",
          },
        },
        required: ["topic", "format"],
      },
    },
    {
      name: "omniorg_security_status",
      description:
        "Returns the current OmniOrg security watchdog status including total event counts and number of blocked IPs.",
      inputSchema: {
        type: "object" as const,
        properties: {},
        required: [],
      },
    },
    {
      name: "omniorg_agent_spawn",
      description:
        "Spawns a Claude sub-agent via the Anthropic SDK to handle a task autonomously. Returns the agent's full response.",
      inputSchema: {
        type: "object" as const,
        properties: {
          task: {
            type: "string",
            description: "The task description for the sub-agent to complete.",
          },
          context: {
            type: "string",
            description:
              "Additional context or background information the agent should know before starting the task.",
          },
        },
        required: ["task", "context"],
      },
    },
  ],
}));

// ── Tool handlers ──────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ── omniorg_search ────────────────────────────────────────────────────
      case "omniorg_search": {
        const { query, mode } = args as { query: string; mode: "quick" | "deep" };

        const result =
          mode === "quick"
            ? await quickSearch(query)
            : await perplexitySearch(query, { maxSources: 10, expandQueries: true });

        const text = [
          result.answer,
          "",
          `**Sources searched:** ${result.sources.length}`,
          `**Searched at:** ${result.searchedAt}`,
        ].join("\n");

        return { content: [{ type: "text", text }] };
      }

      // ── omniorg_grab_page ─────────────────────────────────────────────────
      case "omniorg_grab_page": {
        const { url } = args as { url: string };

        const resp = await proxyFetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept:
              "text/html,application/xhtml+xml,*/*;q=0.8",
            "Accept-Language": "en-GB,en;q=0.9",
          },
        });

        if (!resp.ok) {
          return {
            content: [{ type: "text", text: `Failed to fetch page: HTTP ${resp.status}` }],
            isError: true,
          };
        }

        const html = await resp.text();
        const dom = new JSDOM(html, { url });
        const article = new Readability(dom.window.document).parse();

        if (!article) {
          return {
            content: [{ type: "text", text: "Could not extract article content from this page." }],
            isError: true,
          };
        }

        const text = [
          `# ${article.title}`,
          "",
          `**Source:** ${url}`,
          "",
          article.textContent?.trim() ?? "(no text content)",
        ].join("\n");

        return { content: [{ type: "text", text: text.slice(0, 50_000) }] };
      }

      // ── omniorg_youtube_transcript ────────────────────────────────────────
      case "omniorg_youtube_transcript": {
        const { url } = args as { url: string };

        const videoId = extractYouTubeId(url);
        if (!videoId) {
          return {
            content: [
              {
                type: "text",
                text: `Invalid YouTube URL. Could not extract video ID from: ${url}`,
              },
            ],
            isError: true,
          };
        }

        const transcript = await fetchYouTubeTranscript(videoId);
        return { content: [{ type: "text", text: transcript }] };
      }

      // ── omniorg_summarise ─────────────────────────────────────────────────
      case "omniorg_summarise": {
        const { url } = args as { url: string };

        const resp = await proxyFetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          },
        });

        if (!resp.ok) {
          return {
            content: [{ type: "text", text: `Failed to fetch article: HTTP ${resp.status}` }],
            isError: true,
          };
        }

        const html = await resp.text();
        const dom = new JSDOM(html, { url });
        const article = new Readability(dom.window.document).parse();

        if (!article || !article.textContent) {
          return {
            content: [{ type: "text", text: "Could not extract article content for summarisation." }],
            isError: true,
          };
        }

        const truncated = article.textContent.trim().slice(0, 12_000);

        const aiResp = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          messages: [
            {
              role: "user",
              content: `Summarise the following article. Return:
1. A 2-3 sentence summary
2. Key takeaways as a bullet list (max 5 bullets)
3. Topic tags as a comma-separated list

Article title: ${article.title}
Article URL: ${url}

Article text:
${truncated}`,
            },
          ],
        });

        const summary =
          aiResp.content[0].type === "text"
            ? aiResp.content[0].text
            : "No summary generated.";

        return {
          content: [
            {
              type: "text",
              text: `# Summary: ${article.title}\n\n**Source:** ${url}\n\n${summary}`,
            },
          ],
        };
      }

      // ── omniorg_generate_video ────────────────────────────────────────────
      case "omniorg_generate_video": {
        const { prompt, model, aspectRatio } = args as {
          prompt: string;
          model: string;
          aspectRatio?: string;
        };

        const req: HiggsfieldTextToVideoRequest = {
          modelId: model,
          prompt,
          aspectRatio: aspectRatio ?? "16:9",
        };

        const localPath = await generateTextVideo(req);

        return {
          content: [
            {
              type: "text",
              text: `Video generated successfully.\n**Local path:** ${localPath}\n**Model:** ${model}\n**Aspect ratio:** ${aspectRatio ?? "16:9"}`,
            },
          ],
        };
      }

      // ── omniorg_generate_content ──────────────────────────────────────────
      case "omniorg_generate_content": {
        const { topic, format, tone } = args as {
          topic: string;
          format: "blog" | "social" | "email" | "script";
          tone?: string;
        };

        const effectiveTone = tone ?? "professional";

        const formatInstructions: Record<string, string> = {
          blog: "Write a full blog article (800-1200 words) with a title, introduction, 3-5 sections with subheadings, and a conclusion.",
          social:
            "Write a short-form social media post (max 280 characters for Twitter/X variant + longer LinkedIn variant). Include relevant hashtags.",
          email:
            "Write an email campaign message with a compelling subject line, greeting, body (3-4 short paragraphs), call-to-action, and sign-off.",
          script:
            "Write a video or podcast script with an intro hook, 3-5 main segments with transitions, and an outro with call-to-action.",
        };

        const aiResp = await anthropic.messages.create({
          model: "claude-opus-4-7",
          max_tokens: 2_000,
          messages: [
            {
              role: "user",
              content: `${formatInstructions[format]}

Topic: ${topic}
Tone: ${effectiveTone}

Write the content now:`,
            },
          ],
        });

        const content =
          aiResp.content[0].type === "text"
            ? aiResp.content[0].text
            : "No content generated.";

        return {
          content: [
            {
              type: "text",
              text: `**Format:** ${format} | **Topic:** ${topic} | **Tone:** ${effectiveTone}\n\n---\n\n${content}`,
            },
          ],
        };
      }

      // ── omniorg_security_status ───────────────────────────────────────────
      case "omniorg_security_status": {
        const statusText = [
          "## OmniOrg Security Watchdog Status",
          "",
          `- **Total events recorded:** ${watchdogEventCount}`,
          `- **Critical events:** ${watchdogCriticalCount}`,
          `- **Status:** ${watchdogEventCount === 0 ? "No threats detected" : "Watchdog active - see logs/security for details"}`,
        ].join("\n");

        return { content: [{ type: "text", text: statusText }] };
      }

      // ── omniorg_agent_spawn ───────────────────────────────────────────────
      case "omniorg_agent_spawn": {
        const { task, context } = args as { task: string; context: string };

        const aiResp = await anthropic.messages.create({
          model: "claude-opus-4-7",
          max_tokens: 4_096,
          system:
            "You are an OmniOrg specialist agent. Complete the task and return your result.",
          messages: [
            {
              role: "user",
              content: `Context:\n${context}\n\nTask:\n${task}`,
            },
          ],
        });

        const result =
          aiResp.content[0].type === "text"
            ? aiResp.content[0].text
            : "Agent returned no text output.";

        return {
          content: [
            {
              type: "text",
              text: `## Agent Result\n\n**Task:** ${task}\n\n---\n\n${result}`,
            },
          ],
        };
      }

      // ── unknown tool ──────────────────────────────────────────────────────
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Tool execution failed: ${message}` }],
      isError: true,
    };
  }
});

// ── YouTube helpers ────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1) || null;
    }
    const v = parsed.searchParams.get("v");
    if (v) return v;
    const match = parsed.pathname.match(/\/(?:embed|v|shorts)\/([^/?]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Fetches a YouTube transcript via the public timedtext API.
 * Falls back to a Readability-cleaned description page if captions unavailable.
 */
async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  try {
    // Fetch the video page to extract the caption track URL
    const pageResp = await proxyFetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
    );

    if (!pageResp.ok) {
      return `Could not fetch YouTube page: HTTP ${pageResp.status}`;
    }

    const html = await pageResp.text();

    // Extract caption base URL from ytInitialPlayerResponse
    const captionMatch = html.match(/"captionTracks":\s*\[.*?"baseUrl":"([^"]+)"/);
    if (!captionMatch) {
      return "No captions available for this video. The video may not have subtitles, or they may be auto-generated and unavailable via the public API.";
    }

    const captionUrl = captionMatch[1].replace(/\\u0026/g, "&");
    const captResp = await proxyFetch(captionUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!captResp.ok) {
      return `Caption fetch failed: HTTP ${captResp.status}`;
    }

    const xml = await captResp.text();

    // Parse <text> elements from the XML transcript
    const textMatches = xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g);
    const lines: string[] = [];
    for (const m of textMatches) {
      const decoded = m[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]+>/g, "")
        .trim();
      if (decoded) lines.push(decoded);
    }

    if (lines.length === 0) {
      return "Transcript parsed but contained no text lines.";
    }

    return `**YouTube Transcript** (video ID: ${videoId})\n\n${lines.join(" ")}`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Transcript extraction failed: ${message}`;
  }
}

// ── Entry point ────────────────────────────────────────────────────────────────

if (require.main === module) {
  const transport = new StdioServerTransport();
  server
    .connect(transport)
    .then(() => {
      // Server running on stdio - do not write to stdout (breaks MCP protocol)
      process.stderr.write("[OmniOrg MCP] Server started on stdio transport\n");
    })
    .catch((err: Error) => {
      process.stderr.write(`[OmniOrg MCP] Fatal: ${err.message}\n`);
      process.exit(1);
    });
}

export { server };
