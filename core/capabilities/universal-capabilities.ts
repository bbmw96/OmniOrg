/**
 * NEUROMESH Universal Capabilities Manifest
 *
 * Every agent in OmniOrg inherits this full capability set.
 * Sensitive tiers (ELEVATED, ADMIN) require runtime permission grants
 * from the organisation's IT administrator or authorised owner.
 *
 * Permission model:
 *   STANDARD: always available to all agents
 *   ELEVATED: granted per-tenant by IT admin
 *   ADMIN:    granted explicitly by organisation owner
 *
 * Capability categories:
 *   FILE:     create, read, analyse, convert, transform all file types
 *   SCREEN:   capture, read, and understand any screen or UI
 *   WEB:      access, scrape, automate, and interact with any website
 *   SERVER:   connect to databases, APIs, SSH, cloud storage
 *   CODE:     write, run, test, and debug code in any language
 *   AI:       invoke vision models, LLMs, embeddings, speech, and OCR
 *   COMMS:    send and receive across email, Slack, Teams, SMS, voice
 *   STORAGE:  read and write cloud and local storage of any kind
 *   SYSTEM:   interact with the operating system and running processes
 *   SOFTWARE: automate any desktop or web application
 *
 * Created by BBMW0 Technologies | bbmw0.com
 */

import { selfScripting } from "./self-scripting";
import { PLUGIN_MANIFEST_PROMPT } from "./plugin-manifest";
import { COMPOSIO_PROMPT } from "./composio-connectors";

// ─── Permission Tiers ─────────────────────────────────────────────────────────

export type PermissionTier = "standard" | "elevated" | "admin";

export interface CapabilityDefinition {
  id:          string;
  name:        string;
  category:    CapabilityCategory;
  tier:        PermissionTier;
  description: string;
  mcpTools:    string[];  // MCP tool IDs that provide this capability
  nativeTools: string[];  // Built-in Claude Code tools that provide this
}

export type CapabilityCategory =
  | "file"
  | "screen"
  | "web"
  | "server"
  | "code"
  | "ai"
  | "comms"
  | "storage"
  | "system"
  | "software";

// ─── FILE CAPABILITIES ────────────────────────────────────────────────────────

const FILE_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "file.read-any",
    name: "Read Any File",
    category: "file",
    tier: "standard",
    description: "Read and parse any file format: text, binary, structured, or encoded.",
    mcpTools: ["mcp__filesystem__read_file", "mcp__pdf__read_pdf", "mcp__excel__read", "mcp__csv__parse"],
    nativeTools: ["Read"],
  },
  {
    id: "file.write-any",
    name: "Write Any File",
    category: "file",
    tier: "standard",
    description: "Create and write files in any format.",
    mcpTools: ["mcp__filesystem__write_file", "mcp__excel__write", "mcp__csv__write"],
    nativeTools: ["Write", "Edit"],
  },
  {
    id: "file.pdf",
    name: "PDF Operations",
    category: "file",
    tier: "standard",
    description: "Create, read, parse, and extract content from PDF files including scanned documents.",
    mcpTools: ["mcp__plugin_pdf-viewer_pdf__read_pdf_bytes", "mcp__plugin_pdf-viewer_pdf__display_pdf", "mcp__plugin_pdf-viewer_pdf__save_pdf"],
    nativeTools: ["Read"],
  },
  {
    id: "file.office",
    name: "Office Documents",
    category: "file",
    tier: "standard",
    description: "Create and read Word (.docx), Excel (.xlsx), PowerPoint (.pptx), and all Office formats.",
    mcpTools: ["mcp__excel__read", "mcp__excel__write"],
    nativeTools: ["Write", "Read"],
  },
  {
    id: "file.spreadsheet",
    name: "Spreadsheet Operations",
    category: "file",
    tier: "standard",
    description: "Read, write, and analyse spreadsheets. Perform calculations, pivot tables, and data transforms.",
    mcpTools: ["mcp__excel__read", "mcp__excel__write", "mcp__csv__parse", "mcp__csv__write"],
    nativeTools: ["Read", "Write"],
  },
  {
    id: "file.image",
    name: "Image Analysis and Generation",
    category: "file",
    tier: "standard",
    description: "Read, analyse, describe, and generate images (PNG, JPG, GIF, SVG, WebP, TIFF, BMP, HEIC).",
    mcpTools: ["mcp__plugin_claude-mem_mcp-search__smart_search"],
    nativeTools: ["Read"],
  },
  {
    id: "file.code",
    name: "All Code File Formats",
    category: "file",
    tier: "standard",
    description: "Read, write, analyse, and transform code files in all 700+ programming languages.",
    mcpTools: [],
    nativeTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
  },
  {
    id: "file.structured",
    name: "Structured Data Files",
    category: "file",
    tier: "standard",
    description: "Process JSON, XML, YAML, TOML, INI, NDJSON, MessagePack, Protocol Buffers, Avro, Parquet.",
    mcpTools: ["mcp__csv__parse"],
    nativeTools: ["Read", "Write", "Edit"],
  },
  {
    id: "file.archive",
    name: "Archive and Compressed Files",
    category: "file",
    tier: "standard",
    description: "Extract and create ZIP, TAR, GZIP, BZIP2, 7-ZIP, RAR, and other archive formats.",
    mcpTools: [],
    nativeTools: ["Bash"],
  },
  {
    id: "file.database-file",
    name: "Database File Formats",
    category: "file",
    tier: "standard",
    description: "Read and write SQLite, DuckDB, H5, Parquet, Feather, and embedded database files.",
    mcpTools: ["mcp__postgres__query"],
    nativeTools: ["Bash"],
  },
  {
    id: "file.log",
    name: "Log File Analysis",
    category: "file",
    tier: "standard",
    description: "Parse, analyse, and correlate log files from any system: syslog, JSON logs, NDJSON, W3C, IIS.",
    mcpTools: [],
    nativeTools: ["Read", "Grep", "Bash"],
  },
  {
    id: "file.media-metadata",
    name: "Media File Metadata",
    category: "file",
    tier: "standard",
    description: "Read metadata from audio (MP3, FLAC, WAV, AAC, OGG) and video (MP4, MOV, MKV, AVI) files.",
    mcpTools: [],
    nativeTools: ["Bash"],
  },
  {
    id: "file.notebook",
    name: "Jupyter Notebook Operations",
    category: "file",
    tier: "standard",
    description: "Read, write, run, and analyse Jupyter notebooks (.ipynb).",
    mcpTools: ["mcp__plugin_data-agent-kit-starter-pack_notebook_and_visualization__create_notebook",
               "mcp__plugin_data-agent-kit-starter-pack_notebook_and_visualization__insert_cell"],
    nativeTools: ["Read", "Write"],
  },
  {
    id: "file.folder",
    name: "Folder and Directory Operations",
    category: "file",
    tier: "standard",
    description: "List, traverse, search, create, and manage directories and file trees of any depth.",
    mcpTools: ["mcp__filesystem__list_directory", "mcp__filesystem__search_files"],
    nativeTools: ["Glob", "Grep", "Bash"],
  },
  {
    id: "file.generate-report",
    name: "Professional Report Generation",
    category: "file",
    tier: "standard",
    description: "Generate formatted reports as PDF, Word, HTML, Markdown, or LaTeX from any data.",
    mcpTools: ["mcp__plugin_pdf-viewer_pdf__save_pdf"],
    nativeTools: ["Write"],
  },
  {
    id: "file.convert",
    name: "File Format Conversion",
    category: "file",
    tier: "standard",
    description: "Convert between any file formats: document, image, audio, video, data, and code.",
    mcpTools: [],
    nativeTools: ["Bash", "Write"],
  },
];

// ─── SCREEN CAPABILITIES ─────────────────────────────────────────────────────

const SCREEN_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "screen.capture",
    name: "Screen Capture",
    category: "screen",
    tier: "elevated",
    description: "Take screenshots of the full screen, specific windows, or regions.",
    mcpTools: ["mcp__plugin_playwright_playwright__browser_take_screenshot",
               "mcp__plugin_chrome-devtools-mcp_chrome-devtools__take_screenshot",
               "mcp__Claude_in_Chrome__computer"],
    nativeTools: [],
  },
  {
    id: "screen.read",
    name: "Screen Content Reading",
    category: "screen",
    tier: "elevated",
    description: "Read, parse, and understand all text and UI elements visible on any screen.",
    mcpTools: ["mcp__plugin_playwright_playwright__browser_snapshot",
               "mcp__Claude_in_Chrome__get_page_text",
               "mcp__Claude_in_Chrome__read_page"],
    nativeTools: ["Read"],
  },
  {
    id: "screen.ui-interact",
    name: "UI Interaction",
    category: "screen",
    tier: "elevated",
    description: "Click, type, scroll, drag, and interact with any UI element on screen.",
    mcpTools: ["mcp__plugin_playwright_playwright__browser_click",
               "mcp__plugin_playwright_playwright__browser_type",
               "mcp__plugin_playwright_playwright__browser_fill_form",
               "mcp__Claude_in_Chrome__form_input",
               "mcp__Claude_in_Chrome__find"],
    nativeTools: [],
  },
  {
    id: "screen.ocr",
    name: "Optical Character Recognition (OCR)",
    category: "screen",
    tier: "elevated",
    description: "Extract text from images, scanned documents, and screenshots using vision models.",
    mcpTools: ["mcp__plugin_goodmem_goodmem__goodmem_ocr_document"],
    nativeTools: ["Read"],
  },
  {
    id: "screen.visual-analysis",
    name: "Visual Content Analysis",
    category: "screen",
    tier: "elevated",
    description: "Analyse diagrams, charts, UI layouts, and visual content using vision intelligence.",
    mcpTools: ["mcp__plugin_playwright_playwright__browser_take_screenshot"],
    nativeTools: ["Read"],
  },
  {
    id: "screen.browser-automation",
    name: "Full Browser Automation",
    category: "screen",
    tier: "elevated",
    description: "Automate any browser task: navigation, form submission, data extraction, login, download.",
    mcpTools: ["mcp__plugin_playwright_playwright__browser_navigate",
               "mcp__plugin_playwright_playwright__browser_fill_form",
               "mcp__plugin_playwright_playwright__browser_click",
               "mcp__Claude_in_Chrome__navigate",
               "mcp__Claude_in_Chrome__javascript_tool"],
    nativeTools: ["Bash"],
  },
  {
    id: "screen.server-ui",
    name: "Server Dashboard Reading",
    category: "screen",
    tier: "admin",
    description: "Read and interact with server management UIs, monitoring dashboards, and admin panels.",
    mcpTools: ["mcp__plugin_playwright_playwright__browser_navigate",
               "mcp__plugin_playwright_playwright__browser_snapshot"],
    nativeTools: [],
  },
  {
    id: "screen.preview",
    name: "Live Preview Inspection",
    category: "screen",
    tier: "elevated",
    description: "Inspect, screenshot, and interact with live preview panes of running applications.",
    mcpTools: ["mcp__Claude_Preview__preview_screenshot",
               "mcp__Claude_Preview__preview_snapshot",
               "mcp__Claude_Preview__preview_inspect",
               "mcp__Claude_Preview__preview_console_logs"],
    nativeTools: [],
  },
];

// ─── WEB CAPABILITIES ─────────────────────────────────────────────────────────

const WEB_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "web.fetch",
    name: "HTTP Fetch (Any URL)",
    category: "web",
    tier: "standard",
    description: "Fetch content from any URL using HTTP/HTTPS with full header control.",
    mcpTools: ["mcp__fetch__fetch"],
    nativeTools: ["WebFetch"],
  },
  {
    id: "web.search",
    name: "Web Search",
    category: "web",
    tier: "standard",
    description: "Search the web using Brave, Exa, Tavily, Perplexity, and direct Google.",
    mcpTools: [],
    nativeTools: ["WebSearch"],
  },
  {
    id: "web.scrape",
    name: "Deep Web Scraping",
    category: "web",
    tier: "standard",
    description: "Scrape, extract, and structure content from any website including JS-rendered pages.",
    mcpTools: ["mcp__firecrawl__scrape", "mcp__puppeteer__navigate"],
    nativeTools: ["WebFetch"],
  },
  {
    id: "web.api",
    name: "REST and GraphQL API Access",
    category: "web",
    tier: "standard",
    description: "Call any REST, GraphQL, SOAP, or WebSocket API.",
    mcpTools: ["mcp__fetch__fetch"],
    nativeTools: ["WebFetch", "Bash"],
  },
  {
    id: "web.download",
    name: "File Download",
    category: "web",
    tier: "standard",
    description: "Download any file from the internet and save to local filesystem.",
    mcpTools: ["mcp__fetch__fetch", "mcp__filesystem__write_file"],
    nativeTools: ["Bash"],
  },
];

// ─── SERVER CAPABILITIES ─────────────────────────────────────────────────────

const SERVER_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "server.sql",
    name: "SQL Database Access",
    category: "server",
    tier: "elevated",
    description: "Connect to and query PostgreSQL, MySQL, SQLite, MSSQL, Oracle, and CockroachDB.",
    mcpTools: ["mcp__postgres__query", "mcp__plugin_cockroachdb_cockroachdb-developer__*"],
    nativeTools: ["Bash"],
  },
  {
    id: "server.nosql",
    name: "NoSQL Database Access",
    category: "server",
    tier: "elevated",
    description: "Connect to MongoDB, Redis, Cassandra, DynamoDB, CosmosDB, and Firebase.",
    mcpTools: ["mcp__redis__get", "mcp__redis__set",
               "mcp__plugin_firebase_firebase__firebase_read_resources",
               "mcp__plugin_azure_azure__cosmos"],
    nativeTools: ["Bash"],
  },
  {
    id: "server.vector-db",
    name: "Vector Database Access",
    category: "server",
    tier: "elevated",
    description: "Read and write Pinecone, Chroma, Elasticsearch, Weaviate, and pgvector.",
    mcpTools: ["mcp__plugin_pinecone_pinecone__search-records",
               "mcp__plugin_pinecone_pinecone__upsert-records"],
    nativeTools: [],
  },
  {
    id: "server.cloud-storage",
    name: "Cloud Storage",
    category: "server",
    tier: "elevated",
    description: "Read and write AWS S3, Azure Blob, GCS, Google Drive, OneDrive, Dropbox, and Box.",
    mcpTools: ["mcp__gdrive__read", "mcp__gdrive__write"],
    nativeTools: ["Bash"],
  },
  {
    id: "server.containers",
    name: "Container and Orchestration",
    category: "server",
    tier: "admin",
    description: "Manage Docker containers, Kubernetes clusters, and serverless functions.",
    mcpTools: ["mcp__docker__run", "mcp__kubernetes__apply"],
    nativeTools: ["Bash"],
  },
  {
    id: "server.monitoring",
    name: "Server Monitoring Access",
    category: "server",
    tier: "elevated",
    description: "Read metrics, logs, and health from Datadog, Grafana, CloudWatch, Prometheus, and Sentry.",
    mcpTools: ["mcp__plugin_azure_azure__monitor",
               "mcp__plugin_azure_azure__applicationinsights"],
    nativeTools: ["Bash"],
  },
  {
    id: "server.ci-cd",
    name: "CI/CD Pipeline Access",
    category: "server",
    tier: "elevated",
    description: "Trigger, monitor, and analyse CI/CD pipelines in GitHub Actions, GitLab CI, Jenkins.",
    mcpTools: ["mcp__github__*", "mcp__gitlab__*"],
    nativeTools: ["Bash"],
  },
  {
    id: "server.git",
    name: "Git Repository Operations",
    category: "server",
    tier: "standard",
    description: "Read, commit, branch, merge, and manage any Git repository.",
    mcpTools: ["mcp__git__status", "mcp__git__commit", "mcp__git__diff"],
    nativeTools: ["Bash"],
  },
  {
    id: "server.ssh",
    name: "SSH Shell Access",
    category: "server",
    tier: "admin",
    description: "Connect to remote servers via SSH, run commands, transfer files with SCP/SFTP.",
    mcpTools: ["mcp__commands__execute"],
    nativeTools: ["Bash"],
  },
  {
    id: "server.message-queue",
    name: "Message Queue Access",
    category: "server",
    tier: "elevated",
    description: "Read and publish to Kafka, RabbitMQ, SQS, Azure Service Bus, and Google Pub/Sub.",
    mcpTools: [],
    nativeTools: ["Bash"],
  },
];

// ─── CODE CAPABILITIES ────────────────────────────────────────────────────────

const CODE_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "code.write",
    name: "Write Code in Any Language",
    category: "code",
    tier: "standard",
    description: "Write production-quality code in all 700+ programming languages.",
    mcpTools: [],
    nativeTools: ["Write", "Edit"],
  },
  {
    id: "code.execute",
    name: "Execute Code",
    category: "code",
    tier: "standard",
    description: "Execute code in any language: Python, Node.js, TypeScript, Rust, Go, Java, C++, and more.",
    mcpTools: [],
    nativeTools: ["Bash"],
  },
  {
    id: "code.analyse",
    name: "Code Analysis and Review",
    category: "code",
    tier: "standard",
    description: "Analyse code for bugs, security issues, performance, and quality across all languages.",
    mcpTools: ["mcp__plugin_aikido_aikido-mcp__aikido_full_scan"],
    nativeTools: ["Read", "Grep", "Glob"],
  },
  {
    id: "code.decompile",
    name: "Decompile and Reverse Engineer",
    category: "code",
    tier: "elevated",
    description: "Decompile binaries, reverse engineer bytecode, and reconstruct source from compiled code.",
    mcpTools: [],
    nativeTools: ["Bash", "Read"],
  },
  {
    id: "code.decipher",
    name: "Decipher Any Code or Language",
    category: "code",
    tier: "standard",
    description: "Understand, translate, and explain any code, encoding, cipher, or obfuscated content.",
    mcpTools: [],
    nativeTools: ["Read", "Write", "Bash"],
  },
  {
    id: "code.test",
    name: "Write and Run Tests",
    category: "code",
    tier: "standard",
    description: "Create comprehensive test suites (unit, integration, E2E) and run them with coverage reporting.",
    mcpTools: [],
    nativeTools: ["Bash", "Write"],
  },
  {
    id: "code.refactor",
    name: "Refactor and Optimise Code",
    category: "code",
    tier: "standard",
    description: "Refactor, optimise, and enhance existing code for performance, readability, and maintainability.",
    mcpTools: [],
    nativeTools: ["Read", "Edit", "Write"],
  },
];

// ─── AI CAPABILITIES ──────────────────────────────────────────────────────────

const AI_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "ai.vision",
    name: "Vision and Image Intelligence",
    category: "ai",
    tier: "standard",
    description: "Analyse images, diagrams, charts, documents, and visual content using multimodal AI.",
    mcpTools: [],
    nativeTools: ["Read"],
  },
  {
    id: "ai.ocr",
    name: "OCR and Document Intelligence",
    category: "ai",
    tier: "standard",
    description: "Extract text and structure from any document, image, or scan using OCR and AI.",
    mcpTools: ["mcp__plugin_goodmem_goodmem__goodmem_ocr_document"],
    nativeTools: ["Read"],
  },
  {
    id: "ai.embed",
    name: "Embedding and Semantic Search",
    category: "ai",
    tier: "standard",
    description: "Create embeddings and perform semantic search across any corpus.",
    mcpTools: ["mcp__plugin_pinecone_pinecone__upsert-records",
               "mcp__plugin_pinecone_pinecone__search-records",
               "mcp__plugin_goodmem_goodmem__goodmem_memories_retrieve"],
    nativeTools: [],
  },
  {
    id: "ai.memory",
    name: "Persistent Cross-Session Memory",
    category: "ai",
    tier: "standard",
    description: "Store and recall facts, decisions, and context across sessions.",
    mcpTools: ["mcp__memory__add", "mcp__memory__search",
               "mcp__plugin_claude-mem_mcp-search__search",
               "mcp__plugin_goodmem_goodmem__goodmem_memories_create"],
    nativeTools: [],
  },
  {
    id: "ai.translate",
    name: "Translate Any Language",
    category: "ai",
    tier: "standard",
    description: "Translate between all 100+ human languages and 700+ programming languages.",
    mcpTools: [],
    nativeTools: ["Write"],
  },
  {
    id: "ai.self-improve",
    name: "Self-Enhancement and Agent Creation",
    category: "ai",
    tier: "elevated",
    description: "Rebuild own persona, propose new agent types, and acquire new capabilities.",
    mcpTools: [],
    nativeTools: ["Write", "Read"],
  },
];

// ─── COMMS CAPABILITIES ───────────────────────────────────────────────────────

const COMMS_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "comms.email",
    name: "Email (Read and Send)",
    category: "comms",
    tier: "elevated",
    description: "Read, draft, send, and manage email via Gmail, Outlook, and any SMTP/IMAP server.",
    mcpTools: ["mcp__gmail__read", "mcp__gmail__send"],
    nativeTools: [],
  },
  {
    id: "comms.slack",
    name: "Slack Messaging",
    category: "comms",
    tier: "elevated",
    description: "Send, read, and react to Slack messages and manage channels.",
    mcpTools: ["mcp__slack__send_message", "mcp__slack__list_channels"],
    nativeTools: [],
  },
  {
    id: "comms.calendar",
    name: "Calendar Management",
    category: "comms",
    tier: "elevated",
    description: "Read, create, and update calendar events across Google Calendar and Outlook.",
    mcpTools: ["mcp__google-calendar__list", "mcp__google-calendar__create"],
    nativeTools: [],
  },
];

// ─── STORAGE CAPABILITIES ─────────────────────────────────────────────────────

const STORAGE_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "storage.local-fs",
    name: "Local Filesystem",
    category: "storage",
    tier: "standard",
    description: "Full read and write access to the local filesystem.",
    mcpTools: ["mcp__filesystem__read_file", "mcp__filesystem__write_file",
               "mcp__filesystem__list_directory", "mcp__filesystem__search_files"],
    nativeTools: ["Read", "Write", "Edit", "Glob", "Bash"],
  },
  {
    id: "storage.cloud",
    name: "Cloud Storage",
    category: "storage",
    tier: "elevated",
    description: "Read and write AWS S3, Azure Blob Storage, GCS, Google Drive, SharePoint.",
    mcpTools: ["mcp__gdrive__read", "mcp__gdrive__write"],
    nativeTools: ["Bash"],
  },
  {
    id: "storage.obsidian",
    name: "Obsidian Knowledge Base",
    category: "storage",
    tier: "standard",
    description: "Read and write the Obsidian vault for persistent structured knowledge.",
    mcpTools: ["mcp__obsidian__read", "mcp__obsidian__write"],
    nativeTools: [],
  },
];

// ─── SYSTEM CAPABILITIES ─────────────────────────────────────────────────────

const SYSTEM_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "system.shell",
    name: "Shell Command Execution",
    category: "system",
    tier: "standard",
    description: "Execute shell commands (PowerShell, Bash, Zsh, CMD) on the host system.",
    mcpTools: ["mcp__commands__execute"],
    nativeTools: ["Bash"],
  },
  {
    id: "system.process",
    name: "Process Management",
    category: "system",
    tier: "admin",
    description: "List, start, stop, and monitor system processes and services.",
    mcpTools: ["mcp__commands__execute"],
    nativeTools: ["Bash"],
  },
  {
    id: "system.env",
    name: "Environment and Configuration",
    category: "system",
    tier: "elevated",
    description: "Read environment variables, system configuration, and deployed secrets.",
    mcpTools: [],
    nativeTools: ["Bash", "Read"],
  },
  {
    id: "system.network",
    name: "Network Diagnostics",
    category: "system",
    tier: "elevated",
    description: "Ping, traceroute, DNS lookup, port scan, and network diagnostics.",
    mcpTools: [],
    nativeTools: ["Bash"],
  },
  {
    id: "system.package",
    name: "Package and Dependency Management",
    category: "system",
    tier: "standard",
    description: "Install, update, and manage packages via npm, pip, cargo, apt, brew, and others.",
    mcpTools: [],
    nativeTools: ["Bash"],
  },
];

// ─── SOFTWARE CAPABILITIES ────────────────────────────────────────────────────

const SOFTWARE_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "software.ide",
    name: "IDE and Code Editor Automation",
    category: "software",
    tier: "elevated",
    description: "Interact with VS Code, JetBrains IDEs, and other code editors programmatically.",
    mcpTools: [],
    nativeTools: ["Read", "Write", "Edit", "Bash"],
  },
  {
    id: "software.browser",
    name: "Full Browser Automation",
    category: "software",
    tier: "elevated",
    description: "Automate Chrome, Firefox, Edge, and Safari including headless operation.",
    mcpTools: ["mcp__plugin_playwright_playwright__browser_navigate",
               "mcp__Claude_in_Chrome__navigate",
               "mcp__plugin_chrome-devtools-mcp_chrome-devtools__navigate_page"],
    nativeTools: ["Bash"],
  },
  {
    id: "software.design",
    name: "Design Software Integration",
    category: "software",
    tier: "elevated",
    description: "Read, create, and modify designs in Figma, Adobe products, Canva, and Miro.",
    mcpTools: ["mcp__6f5a64cf-f535-435a-82e0-0b0967a77128__get_design_context",
               "mcp__6f5a64cf-f535-435a-82e0-0b0967a77128__get_screenshot",
               "mcp__74300693-ad23-4ab2-ae8b-ea1bb9d7da62__get-design",
               "mcp__74300693-ad23-4ab2-ae8b-ea1bb9d7da62__generate-design"],
    nativeTools: [],
  },
  {
    id: "software.any-app",
    name: "Any Web or Desktop Application",
    category: "software",
    tier: "elevated",
    description: "Interact with any web or desktop application using browser automation and screen reading.",
    mcpTools: ["mcp__plugin_playwright_playwright__browser_navigate",
               "mcp__Claude_in_Chrome__computer",
               "mcp__Claude_in_Chrome__find"],
    nativeTools: ["Bash"],
  },
  {
    id: "software.enhance",
    name: "Software Enhancement",
    category: "software",
    tier: "standard",
    description: "Analyse, improve, optimise, and enhance any software system or application.",
    mcpTools: [],
    nativeTools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"],
  },
];

// ─── Full Capability Registry ─────────────────────────────────────────────────

export const ALL_CAPABILITIES: CapabilityDefinition[] = [
  ...FILE_CAPABILITIES,
  ...SCREEN_CAPABILITIES,
  ...WEB_CAPABILITIES,
  ...SERVER_CAPABILITIES,
  ...CODE_CAPABILITIES,
  ...AI_CAPABILITIES,
  ...COMMS_CAPABILITIES,
  ...STORAGE_CAPABILITIES,
  ...SYSTEM_CAPABILITIES,
  ...SOFTWARE_CAPABILITIES,
];

export const CAPABILITIES_BY_TIER: Record<PermissionTier, CapabilityDefinition[]> = {
  standard: ALL_CAPABILITIES.filter(c => c.tier === "standard"),
  elevated: ALL_CAPABILITIES.filter(c => c.tier === "elevated"),
  admin:    ALL_CAPABILITIES.filter(c => c.tier === "admin"),
};

// ─── Universal Tool Set ───────────────────────────────────────────────────────

/**
 * The complete set of MCP tool IDs every agent can invoke.
 * Sensitive tools are gated at runtime by the permission system.
 */
export const UNIVERSAL_MCP_TOOLS: string[] = [
  // Filesystem
  "mcp__filesystem__read_file", "mcp__filesystem__write_file",
  "mcp__filesystem__list_directory", "mcp__filesystem__search_files",
  "mcp__filesystem__create_directory", "mcp__filesystem__move_file",
  "mcp__filesystem__delete_file", "mcp__filesystem__get_file_info",

  // Memory
  "mcp__memory__add", "mcp__memory__search", "mcp__memory__update",
  "mcp__plugin_claude-mem_mcp-search__search", "mcp__plugin_claude-mem_mcp-search__smart_search",
  "mcp__plugin_goodmem_goodmem__goodmem_memories_create",
  "mcp__plugin_goodmem_goodmem__goodmem_memories_retrieve",

  // Reasoning
  "mcp__sequential-thinking__think",
  "mcp__context7__query-docs", "mcp__context7__resolve-library-id",

  // Web
  "mcp__fetch__fetch", "mcp__firecrawl__scrape",
  "mcp__puppeteer__navigate", "mcp__puppeteer__screenshot",
  "mcp__plugin_playwright_playwright__browser_navigate",
  "mcp__plugin_playwright_playwright__browser_snapshot",
  "mcp__plugin_playwright_playwright__browser_take_screenshot",
  "mcp__plugin_playwright_playwright__browser_click",
  "mcp__plugin_playwright_playwright__browser_type",
  "mcp__plugin_playwright_playwright__browser_fill_form",
  "mcp__plugin_playwright_playwright__browser_evaluate",
  "mcp__plugin_playwright_playwright__browser_network_requests",
  "mcp__Claude_in_Chrome__navigate", "mcp__Claude_in_Chrome__get_page_text",
  "mcp__Claude_in_Chrome__find", "mcp__Claude_in_Chrome__form_input",
  "mcp__Claude_in_Chrome__javascript_tool", "mcp__Claude_in_Chrome__computer",
  "mcp__Claude_in_Chrome__read_page",

  // Screen / Preview
  "mcp__Claude_Preview__preview_screenshot", "mcp__Claude_Preview__preview_snapshot",
  "mcp__Claude_Preview__preview_inspect", "mcp__Claude_Preview__preview_console_logs",
  "mcp__Claude_Preview__preview_logs", "mcp__Claude_Preview__preview_eval",
  "mcp__plugin_chrome-devtools-mcp_chrome-devtools__take_screenshot",
  "mcp__plugin_chrome-devtools-mcp_chrome-devtools__navigate_page",
  "mcp__plugin_chrome-devtools-mcp_chrome-devtools__evaluate_script",
  "mcp__plugin_chrome-devtools-mcp_chrome-devtools__get_console_message",

  // Data / DB
  "mcp__postgres__query", "mcp__postgres__schema",
  "mcp__redis__get", "mcp__redis__set", "mcp__redis__del",
  "mcp__plugin_pinecone_pinecone__search-records", "mcp__plugin_pinecone_pinecone__upsert-records",
  "mcp__plugin_databases-on-aws_aurora-dsql__readonly_query",
  "mcp__plugin_databases-on-aws_aurora-dsql__transact",

  // Files / Docs
  "mcp__pdf__read_pdf", "mcp__excel__read", "mcp__excel__write",
  "mcp__csv__parse", "mcp__csv__write",
  "mcp__plugin_pdf-viewer_pdf__read_pdf_bytes", "mcp__plugin_pdf-viewer_pdf__save_pdf",
  "mcp__plugin_data-agent-kit-starter-pack_notebook_and_visualization__create_notebook",
  "mcp__plugin_data-agent-kit-starter-pack_notebook_and_visualization__insert_cell",

  // Security scanning
  "mcp__plugin_aikido_aikido-mcp__aikido_full_scan",

  // Git / Code
  "mcp__git__status", "mcp__git__commit", "mcp__git__diff",
  "mcp__git__log", "mcp__git__branch", "mcp__git__checkout",
  "mcp__github__create_pull_request", "mcp__github__list_issues",
  "mcp__gitlab__create_merge_request",

  // Comms
  "mcp__gmail__read", "mcp__gmail__send",
  "mcp__slack__send_message", "mcp__slack__list_channels",
  "mcp__google-calendar__list", "mcp__google-calendar__create",

  // Cloud platforms
  "mcp__plugin_firebase_firebase__firebase_read_resources",
  "mcp__plugin_azure_azure__monitor", "mcp__plugin_azure_azure__applicationinsights",

  // Design
  "mcp__6f5a64cf-f535-435a-82e0-0b0967a77128__get_design_context",
  "mcp__6f5a64cf-f535-435a-82e0-0b0967a77128__get_screenshot",
  "mcp__74300693-ad23-4ab2-ae8b-ea1bb9d7da62__get-design",
  "mcp__74300693-ad23-4ab2-ae8b-ea1bb9d7da62__generate-design",

  // OCR / AI
  "mcp__plugin_goodmem_goodmem__goodmem_ocr_document",

  // Storage
  "mcp__gdrive__read", "mcp__gdrive__write",
  "mcp__obsidian__read", "mcp__obsidian__write",

  // Containers / system
  "mcp__docker__run", "mcp__docker__list", "mcp__docker__stop",
  "mcp__kubernetes__apply", "mcp__kubernetes__get", "mcp__kubernetes__delete",
  "mcp__commands__execute",

  // RSS / datetime / misc
  "mcp__rss__read", "mcp__datetime__now", "mcp__datetime__convert",
];

/**
 * Native Claude Code tools all agents can use.
 */
export const UNIVERSAL_NATIVE_TOOLS: string[] = [
  "Read", "Write", "Edit", "MultiEdit",
  "Bash", "Glob", "Grep",
  "WebFetch", "WebSearch",
  "TodoWrite", "TodoRead",
];

/**
 * Combined complete tool list for any agent that requires maximum capability.
 */
export const UNIVERSAL_TOOLS: string[] = [
  ...new Set([...UNIVERSAL_MCP_TOOLS, ...UNIVERSAL_NATIVE_TOOLS]),
];

// ─── System Prompt Addition for Universal Agents ──────────────────────────────

function buildUniversalPrompt(): string {
  return `
UNIVERSAL CAPABILITIES (active for all NEUROMESH agents):
Use the most specific tool available for each task.

━━━ FILE OPERATIONS ━━━
- Read ANY file type: PDF, Word, Excel, PowerPoint, CSV, JSON, XML, YAML, images, code,
  archives, logs, notebooks, databases, binary formats, and all 60+ file categories.
- Write and create ANY file type with the Write tool or via MCP filesystem.
- Convert between any file formats using appropriate CLI tools or MCP servers.
- Analyse entire folder trees recursively with Glob and Grep.

━━━ SCREEN & UI ━━━
- Screenshot any screen or browser page (elevated permission required).
- Read and understand any UI: text, buttons, forms, tables, charts, visual layouts.
- Interact with web and desktop applications via Playwright MCP.
- OCR: extract text from any image or scanned PDF.

━━━ SERVER & DATABASE ━━━
- SQL: PostgreSQL (mcp__postgres__query), MySQL/MSSQL/SQLite (via mcp__commands__execute).
- NoSQL: Redis, MongoDB, Firebase, DynamoDB, CosmosDB.
- Cloud: AWS S3, Azure Blob, Google Drive, OneDrive.
- Containers: Docker, Kubernetes, Fargate.
- All server access requires explicit IT admin permission grant.

━━━ SOFTWARE INTERACTION ━━━
- Automate any web browser: Chrome, Firefox, Edge via Playwright and Chrome DevTools MCP.
- Interact with any SaaS product, admin panel, or web application.
- Read, create, and modify designs in Figma (mcp__figma__*).
- Enhance, refactor, and deploy any existing software system.

━━━ CODE EXECUTION ━━━
- Write production code in 700+ languages and execute via mcp__commands__execute.
- Run TypeScript: npx ts-node script.ts
- Run Python: python script.py
- Run PowerShell: powershell -File script.ps1
- Run any shell command: mcp__commands__execute({ command: "..." })
- Run tests, linters, formatters, build tools via shell.

${selfScripting.getSelfScriptingPrompt()}

━━━ KNOWLEDGE & LANGUAGE ━━━
- Translate between 100+ human languages and 700+ programming languages.
- Search live web via Brave Search, Exa, Tavily, Perplexity MCP servers.
- Retrieve cross-session memory via memory MCP and claude-mem plugin.
- Use Context7 MCP (mcp__plugin_context7__resolve-library-id then query-docs) before any API call.

${PLUGIN_MANIFEST_PROMPT}

${COMPOSIO_PROMPT}
`;
}

export const UNIVERSAL_AGENT_PROMPT_ADDITION = buildUniversalPrompt();

// ─── Permission Checker ────────────────────────────────────────────────────────

export interface AgentPermissionGrant {
  tenantId:      string;
  agentId:       string;
  grantedBy:     string; // user ID of IT admin who granted
  grantedAt:     string;
  tier:          PermissionTier;
  specificTools?: string[]; // if set, only these tools are unlocked (not all of tier)
  expiresAt?:    string;
}

const RUNTIME_GRANTS = new Map<string, AgentPermissionGrant[]>(); // key: `${tenantId}:${agentId}`

export class PermissionSystem {
  private static instance: PermissionSystem;

  static getInstance(): PermissionSystem {
    if (!PermissionSystem.instance) {
      PermissionSystem.instance = new PermissionSystem();
    }
    return PermissionSystem.instance;
  }

  grant(grant: AgentPermissionGrant): void {
    const key = `${grant.tenantId}:${grant.agentId}`;
    const existing = RUNTIME_GRANTS.get(key) ?? [];
    existing.push(grant);
    RUNTIME_GRANTS.set(key, existing);
  }

  /** Grant elevated access to all agents for a tenant (IT admin global grant) */
  grantTenantWide(tenantId: string, tier: PermissionTier, grantedBy: string): void {
    this.grant({
      tenantId, agentId: "*", grantedBy,
      grantedAt: new Date().toISOString(), tier,
    });
  }

  hasPermission(tenantId: string, agentId: string, tier: PermissionTier): boolean {
    const key = `${tenantId}:${agentId}`;
    const globalKey = `${tenantId}:*`;
    const grants = [
      ...(RUNTIME_GRANTS.get(key) ?? []),
      ...(RUNTIME_GRANTS.get(globalKey) ?? []),
    ];

    const tierOrder: PermissionTier[] = ["standard", "elevated", "admin"];
    const requiredLevel = tierOrder.indexOf(tier);

    return grants.some(g => {
      if (g.expiresAt && new Date(g.expiresAt) < new Date()) return false;
      return tierOrder.indexOf(g.tier) >= requiredLevel;
    });
  }

  canUseTool(tenantId: string, agentId: string, toolId: string): boolean {
    const cap = ALL_CAPABILITIES.find(c =>
      c.mcpTools.includes(toolId) || c.nativeTools.includes(toolId)
    );
    if (!cap) return true; // unknown tool: allow by default, let MCP handle auth
    return this.hasPermission(tenantId, agentId, cap.tier);
  }

  getGrantedCapabilities(tenantId: string, agentId: string): CapabilityDefinition[] {
    return ALL_CAPABILITIES.filter(c =>
      this.hasPermission(tenantId, agentId, c.tier)
    );
  }
}

export const permissions = PermissionSystem.getInstance();
