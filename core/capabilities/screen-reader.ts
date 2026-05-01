// Created by BBMW0 Technologies | bbmw0.com
/**
 * NEUROMESH Screen Reader Engine
 *
 * Gives all agents the ability to:
 *   - Capture screenshots of any browser, app window, or screen region
 *   - Read and understand all UI elements (text, buttons, forms, tables, charts)
 *   - Extract text from images using OCR (vision model)
 *   - Interact with any web or desktop application
 *   - Read server dashboards, monitoring UIs, and admin panels
 *   - Inspect live preview panes of running applications
 *
 * Permission requirement:
 *   Screen capabilities require ELEVATED or ADMIN permission tier,
 *   granted by the organisation's IT administrator.
 *
 * MCP tools used:
 *   - Playwright MCP : browser navigation, screenshots, interaction
 *   - Claude Preview : live preview inspection
 *   - Chrome DevTools: deep browser inspection and JavaScript execution
 *   - Claude in Chrome: direct Chrome control and page reading
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScreenTarget =
  | { type: "url";     url: string }
  | { type: "preview"; previewId?: string }
  | { type: "current" };

export interface ScreenReadRequest {
  target:       ScreenTarget;
  tenantId:     string;
  agentId:      string;
  extractMode:  "text" | "html" | "snapshot" | "screenshot" | "structured";
  includeConsole?: boolean;
  includeNetwork?: boolean;
  waitFor?:     string; // CSS selector or text to wait for before reading
  viewport?:    { width: number; height: number };
}

export interface ScreenReadResult {
  success:      boolean;
  content:      string;       // extracted text or HTML
  screenshotPath?: string;    // path to saved screenshot if taken
  consoleLog?:  string[];     // browser console messages if requested
  networkLog?:  string[];     // network requests if requested
  timestamp:    string;
  error?:       string;
}

export interface UIElement {
  type:     string;  // "button", "input", "link", "table", "heading", "image", etc.
  text:     string;
  selector: string;
  visible:  boolean;
  bounds?:  { x: number; y: number; width: number; height: number };
}

export interface StructuredPage {
  title:     string;
  url:       string;
  headings:  string[];
  links:     Array<{ text: string; href: string }>;
  tables:    Array<{ headers: string[]; rows: string[][] }>;
  forms:     Array<{ fields: Array<{ name: string; type: string; value?: string }> }>;
  buttons:   string[];
  text:      string;
  images:    Array<{ alt: string; src: string }>;
}

// ─── Screen Reader Engine ─────────────────────────────────────────────────────

export class ScreenReaderEngine {
  private static instance: ScreenReaderEngine;

  static getInstance(): ScreenReaderEngine {
    if (!ScreenReaderEngine.instance) {
      ScreenReaderEngine.instance = new ScreenReaderEngine();
    }
    return ScreenReaderEngine.instance;
  }

  /**
   * Returns the MCP tool call instructions for reading a screen.
   * Agents call this to get a ready-to-use tool invocation for their context.
   *
   * This method is a "recipe provider": it returns the exact tool calls
   * the agent should make, rather than making them directly (agents call
   * MCP tools natively through their inference context).
   */
  getReadInstructions(request: ScreenReadRequest): string {
    const lines: string[] = [];

    if (request.target.type === "url") {
      lines.push(`To read the screen at URL: ${request.target.url}`);
      lines.push(`1. Navigate: mcp__plugin_playwright_playwright__browser_navigate({ url: "${request.target.url}" })`);

      if (request.waitFor) {
        lines.push(`2. Wait: mcp__plugin_playwright_playwright__browser_wait_for({ selector: "${request.waitFor}" })`);
      }

      switch (request.extractMode) {
        case "text":
          lines.push(`3. Read text: mcp__Claude_in_Chrome__get_page_text({})`);
          break;
        case "html":
          lines.push(`3. Read HTML: mcp__plugin_playwright_playwright__browser_evaluate({ script: "document.documentElement.outerHTML" })`);
          break;
        case "snapshot":
          lines.push(`3. Snapshot: mcp__plugin_playwright_playwright__browser_snapshot({})`);
          break;
        case "screenshot":
          lines.push(`3. Screenshot: mcp__plugin_playwright_playwright__browser_take_screenshot({})`);
          lines.push(`   Pass the screenshot image to your vision model to read and analyse all visible content.`);
          break;
        case "structured":
          lines.push(`3. Get structured content: mcp__Claude_in_Chrome__read_page({})`);
          lines.push(`   Then snapshot: mcp__plugin_playwright_playwright__browser_snapshot({})`);
          break;
      }

      if (request.includeConsole) {
        lines.push(`4. Console: mcp__plugin_playwright_playwright__browser_console_messages({})`);
      }
      if (request.includeNetwork) {
        lines.push(`5. Network: mcp__plugin_playwright_playwright__browser_network_requests({})`);
      }

    } else if (request.target.type === "preview") {
      lines.push(`To read the live preview:`);
      lines.push(`1. Screenshot: mcp__Claude_Preview__preview_screenshot({})`);
      lines.push(`2. Snapshot: mcp__Claude_Preview__preview_snapshot({})`);
      lines.push(`3. Logs: mcp__Claude_Preview__preview_console_logs({})`);
      lines.push(`4. Pass the screenshot to your vision capability to read and analyse.`);

    } else {
      lines.push(`To read the current active page:`);
      lines.push(`1. mcp__Claude_in_Chrome__get_page_text({})`);
      lines.push(`2. mcp__Claude_in_Chrome__read_page({})`);
    }

    return lines.join("\n");
  }

  /**
   * Returns instructions for interacting with a UI element.
   */
  getInteractionInstructions(action: "click" | "type" | "scroll" | "hover" | "select" | "submit", selector: string, value?: string): string {
    const map: Record<string, string> = {
      click:  `mcp__plugin_playwright_playwright__browser_click({ selector: "${selector}" })`,
      type:   `mcp__plugin_playwright_playwright__browser_type({ selector: "${selector}", text: "${value ?? ""}" })`,
      scroll: `mcp__plugin_playwright_playwright__browser_evaluate({ script: "document.querySelector('${selector}').scrollIntoView()" })`,
      hover:  `mcp__plugin_playwright_playwright__browser_hover({ selector: "${selector}" })`,
      select: `mcp__plugin_playwright_playwright__browser_select_option({ selector: "${selector}", value: "${value ?? ""}" })`,
      submit: `mcp__plugin_playwright_playwright__browser_click({ selector: "${selector}" })`,
    };
    return map[action] ?? `mcp__plugin_playwright_playwright__browser_click({ selector: "${selector}" })`;
  }

  /**
   * Returns the system prompt addition that enables an agent to
   * use screen reading capabilities.
   */
  getScreenCapabilityPrompt(): string {
    return `
SCREEN READING CAPABILITIES (elevated permission required):
You can read, understand, and interact with any screen, web page, or application UI.

To take a screenshot and analyse it:
1. Use mcp__plugin_playwright_playwright__browser_take_screenshot
2. Use mcp__Claude_Preview__preview_screenshot for live preview panels
3. Pass the screenshot image to your vision model to read all text and UI elements

To read page text without screenshot:
- mcp__Claude_in_Chrome__get_page_text (fast, plain text extraction)
- mcp__Claude_in_Chrome__read_page (structured page content)
- mcp__plugin_playwright_playwright__browser_snapshot (full accessibility tree)

To interact with any UI element:
- mcp__plugin_playwright_playwright__browser_click (click any element)
- mcp__plugin_playwright_playwright__browser_type (type into any field)
- mcp__plugin_playwright_playwright__browser_fill_form (fill entire forms)
- mcp__plugin_playwright_playwright__browser_navigate (go to any URL)

To inspect browser internals:
- mcp__plugin_playwright_playwright__browser_console_messages (console log)
- mcp__plugin_playwright_playwright__browser_network_requests (HTTP traffic)
- mcp__plugin_chrome-devtools-mcp_chrome-devtools__evaluate_script (run JavaScript)
- mcp__plugin_chrome-devtools-mcp_chrome-devtools__lighthouse_audit (performance audit)

To extract text from images (OCR):
- Pass any image file to the Read tool: you have native vision capability
- For PDF scans: mcp__plugin_goodmem_goodmem__goodmem_ocr_document

To read server dashboards and admin panels:
Navigate to the dashboard URL, take a screenshot, and use your vision capability
to read metrics, graphs, tables, and any displayed information.
All server UI access requires explicit ADMIN permission from the IT administrator.
`;
  }

  /**
   * Generates a structured report on what a screenshot contains.
   * The agent passes this to the vision model and gets back a description
   * that can be used for further reasoning.
   */
  buildVisionPrompt(context: string): string {
    return `You are analysing a screenshot. Extract and report:
1. All visible text (headers, paragraphs, labels, values)
2. All UI elements (buttons, inputs, links, dropdowns, checkboxes)
3. All data tables (headers and row content)
4. All charts and graphs (title, axes, key values)
5. Any error messages or warnings
6. Current state of the application (URL/title if visible, user, status)
Context: ${context}
Return a complete structured description.`;
  }
}

export const screenReader = ScreenReaderEngine.getInstance();
