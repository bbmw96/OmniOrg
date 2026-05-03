/**
 * OmniOrg MCP Server (compiled JS entry point)
 * Run with: node scripts/mcp-server.js
 * Source: scripts/mcp-server.ts
 */

"use strict";

const { Server } = require("@modelcontextprotocol/sdk/dist/cjs/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/dist/cjs/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/dist/cjs/types.js");
const fs = require("fs");
const path = require("path");

const AI_ENGINES_DIR = path.resolve(__dirname, "../intelligence/ai-engines");

function countEngines() {
  try {
    const files = fs.readdirSync(AI_ENGINES_DIR);
    return files.filter((f) => f.endsWith("-engine.ts") || f.endsWith("-engine.js")).length;
  } catch (_) {
    return 0;
  }
}

function listEngineNames() {
  try {
    const files = fs.readdirSync(AI_ENGINES_DIR);
    return files
      .filter((f) => f.endsWith("-engine.ts") || f.endsWith("-engine.js"))
      .map((f) => f.replace(/-engine\.(ts|js)$/, ""));
  } catch (_) {
    return [];
  }
}

const server = new Server(
  { name: "omniorg", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "omniorg_status",
      description:
        "Returns the count and names of AI engines registered in OmniOrg's intelligence/ai-engines directory.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "omniorg_status") {
    const count = countEngines();
    const names = listEngineNames();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              engine_count: count,
              engines: names,
              engines_dir: AI_ENGINES_DIR,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`OmniOrg MCP Server error: ${err}\n`);
  process.exit(1);
});
