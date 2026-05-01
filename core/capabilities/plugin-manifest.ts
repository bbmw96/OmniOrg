/**
 * NEUROMESH Plugin & MCP Manifest
 *
 * Complete catalogue of every tool, MCP server, Claude plugin, and native
 * capability available to all 20,000+ NEUROMESH agents.
 *
 * Auto-injected into every agent's system prompt at registry construction time
 * so every agent knows exactly what tools it can reach for.
 *
 * Sources:
 *   - 50+ MCP servers (always-available + API-key-gated)
 *   - 100+ Claude Code plugins (official + community + thedotmack)
 *   - 13 Agent Skills (ARIA+, FRAMER+, KLEO+, BLAZE+, etc.)
 *   - All native Claude Code tools (Read, Write, Edit, Bash, Glob, Grep, etc.)
 *   - All Claude AI capabilities (vision, extended thinking, etc.)
 *
 * Created by BBMW0 Technologies | bbmw0.com
 */

// ─── MCP Server Registry ──────────────────────────────────────────────────────

export interface MCPServer {
  id:          string;
  name:        string;
  category:    MCPCategory;
  tools:       string[];         // key tool identifiers
  alwaysOn:    boolean;          // false = requires API key
  description: string;
}

export type MCPCategory =
  | "filesystem" | "browser" | "database" | "cloud" | "search" | "communication"
  | "developer" | "ai-ml" | "media" | "productivity" | "monitoring" | "security"
  | "finance" | "e-commerce" | "social" | "iot" | "data" | "memory";

export const MCP_SERVERS: MCPServer[] = [
  // ── Always-available (no API key) ────────────────────────────────────────
  { id:"filesystem",         name:"Filesystem",          category:"filesystem",    alwaysOn:true,  tools:["read_file","write_file","list_directory","create_directory","move_file","delete_file","search_files"], description:"Full read/write access to C:/Users/BBMW0 and all project directories." },
  { id:"memory",             name:"Memory Graph",        category:"memory",        alwaysOn:true,  tools:["create_entities","create_relations","search_nodes","open_nodes","add_observations"], description:"Persistent knowledge graph. Store brand voices, project decisions, key facts across all sessions." },
  { id:"sequential-thinking",name:"Sequential Thinking", category:"ai-ml",         alwaysOn:true,  tools:["sequentialthinking"], description:"Deep multi-step reasoning for problems with 3+ interdependent parts. Use for ULTRATHINK protocol." },
  { id:"everything",         name:"MCP Everything",      category:"developer",     alwaysOn:true,  tools:["echo","add","longRunningOperation","sampleLLM","getTinyImage","printEnv","annotatedMessage","getResourceList","readResource"], description:"Full MCP primitive test server. Useful for debugging and integration testing." },
  { id:"context7",           name:"Context7 Docs",       category:"developer",     alwaysOn:true,  tools:["resolve-library-id","query-docs"], description:"Live documentation lookup. Use ALWAYS before writing API calls for any library or framework." },
  { id:"puppeteer",          name:"Puppeteer Browser",   category:"browser",       alwaysOn:true,  tools:["navigate","screenshot","click","fill","evaluate","select","hover","wait","pdf"], description:"Browser automation: navigate, scrape, screenshot, fill forms, extract data from any web page." },
  { id:"playwright",         name:"Playwright E2E",       category:"browser",       alwaysOn:true,  tools:["browser_navigate","browser_click","browser_type","browser_snapshot","browser_take_screenshot","browser_evaluate","browser_fill_form","browser_network_requests"], description:"Full E2E browser automation with accessibility tree, network inspection, and form interaction." },
  { id:"fetch",              name:"HTTP Fetch",           category:"developer",     alwaysOn:true,  tools:["fetch"], description:"Make HTTP requests to any URL: REST APIs, GraphQL, webhooks, data endpoints." },
  { id:"datetime",           name:"Date & Time",          category:"productivity",  alwaysOn:true,  tools:["now","convert_timezone","format_date","calculate_duration"], description:"Accurate time, timezone conversions, date arithmetic." },
  { id:"gdrive",             name:"Google Drive",         category:"cloud",         alwaysOn:true,  tools:["read","write","list","search","create_folder"], description:"Read and write Google Drive files, create folders, search documents." },
  { id:"google-calendar",    name:"Google Calendar",      category:"productivity",  alwaysOn:true,  tools:["list_events","create_event","update_event","delete_event","get_free_busy"], description:"Full calendar management: events, scheduling, availability checking." },
  { id:"gmail",              name:"Gmail",                category:"communication", alwaysOn:true,  tools:["read_emails","send_email","search_emails","create_draft","list_labels"], description:"Email read, compose, send, search, label management." },
  { id:"docker",             name:"Docker",               category:"developer",     alwaysOn:true,  tools:["run","list","stop","logs","build","pull","push","inspect","exec"], description:"Full Docker container lifecycle management." },
  { id:"kubernetes",         name:"Kubernetes",           category:"developer",     alwaysOn:true,  tools:["apply","get","delete","logs","describe","exec","scale","rollout"], description:"Kubernetes cluster management: deployments, services, ingress, pods." },
  { id:"commands",           name:"Shell Commands",       category:"developer",     alwaysOn:true,  tools:["execute"], description:"Run any shell command (PowerShell, CMD, Bash). Admin permission gates destructive commands." },
  { id:"obsidian",           name:"Obsidian Notes",       category:"memory",        alwaysOn:true,  tools:["read_note","write_note","list_notes","search_notes","create_note"], description:"Read/write Obsidian vault at C:/Users/BBMW0/OneDrive/Documents/Obsidian." },
  { id:"postgres",           name:"PostgreSQL",           category:"database",      alwaysOn:true,  tools:["query","schema","list_tables","describe_table"], description:"Direct PostgreSQL queries (postgresql://localhost/mydb)." },
  { id:"redis",              name:"Redis",                category:"database",      alwaysOn:true,  tools:["get","set","del","keys","hget","hset","lpush","lpop","zadd","zrange"], description:"Redis cache operations (redis://localhost:6379)." },
  { id:"git",                name:"Git",                  category:"developer",     alwaysOn:true,  tools:["status","diff","log","commit","branch","checkout","merge","push","pull","stash"], description:"Full Git operations via MCP: branch management, commits, diffs, history." },
  { id:"pdf",                name:"PDF Tools",            category:"data",          alwaysOn:true,  tools:["parse","extract_text","extract_tables","extract_images","merge","split"], description:"Parse, extract text/tables/images from any PDF file." },
  { id:"excel",              name:"Excel / XLSX",         category:"data",          alwaysOn:true,  tools:["read","write","create","update_cell","get_sheet","list_sheets","create_chart"], description:"Full Excel/XLSX read-write: cells, sheets, charts, formulas." },
  { id:"csv",                name:"CSV Operations",       category:"data",          alwaysOn:true,  tools:["read","write","parse","filter","transform","aggregate"], description:"CSV data processing: parse, filter, transform, aggregate, export." },
  { id:"rss",                name:"RSS Feeds",            category:"data",          alwaysOn:true,  tools:["fetch_feed","parse_entries","search_feeds"], description:"RSS/Atom feed reading and parsing for news and content aggregation." },

  // ── Requires API key ─────────────────────────────────────────────────────
  { id:"github",          name:"GitHub",            category:"developer",    alwaysOn:false, tools:["search_repos","get_file","create_issue","create_pr","list_prs","merge_pr","create_repo","push_files","get_commits"], description:"Full GitHub: repos, issues, PRs, commits, file management, Actions." },
  { id:"gitlab",          name:"GitLab",            category:"developer",    alwaysOn:false, tools:["list_projects","get_file","create_mr","list_mrs","create_issue"], description:"GitLab: projects, merge requests, issues, pipelines." },
  { id:"brave-search",    name:"Brave Search",      category:"search",       alwaysOn:false, tools:["search","news_search","image_search"], description:"Privacy-focused web search with news and image search." },
  { id:"exa",             name:"Exa AI Search",     category:"search",       alwaysOn:false, tools:["search","find_similar","get_contents"], description:"AI-powered semantic web search. Best for research and technical queries." },
  { id:"tavily",          name:"Tavily Research",   category:"search",       alwaysOn:false, tools:["search","research"], description:"Research-optimised search for deep topic investigation." },
  { id:"perplexity",      name:"Perplexity AI",     category:"search",       alwaysOn:false, tools:["search"], description:"AI search with citations and synthesis." },
  { id:"apify",           name:"Apify Scrapers",    category:"browser",      alwaysOn:false, tools:["run_actor","get_dataset","call_actor"], description:"Web scraping at scale: Amazon, LinkedIn, social media, custom scrapers." },
  { id:"youtube",         name:"YouTube",           category:"media",        alwaysOn:false, tools:["search","get_transcript","get_video_info","get_channel"], description:"YouTube video search, transcripts, channel data." },
  { id:"firecrawl",       name:"Firecrawl",         category:"browser",      alwaysOn:false, tools:["scrape","crawl","map","search","extract"], description:"AI-powered web crawling and structured data extraction from any site." },
  { id:"figma",           name:"Figma",             category:"media",        alwaysOn:false, tools:["get_file","get_components","get_styles","get_images","export"], description:"Figma design file access: components, styles, assets, export." },
  { id:"shopify",         name:"Shopify",           category:"e-commerce",   alwaysOn:false, tools:["list_products","get_product","create_product","list_orders","get_order","update_inventory"], description:"Shopify store management: products, orders, inventory, customers." },
  { id:"stripe",          name:"Stripe",            category:"finance",      alwaysOn:false, tools:["list_customers","create_customer","list_charges","create_charge","list_subscriptions","create_payment_intent"], description:"Stripe payment processing: customers, charges, subscriptions, invoices." },
  { id:"hubspot",         name:"HubSpot",           category:"productivity", alwaysOn:false, tools:["list_contacts","create_contact","list_deals","create_deal","list_companies"], description:"HubSpot CRM: contacts, deals, companies, pipelines." },
  { id:"salesforce",      name:"Salesforce",        category:"productivity", alwaysOn:false, tools:["query","create_record","update_record","list_objects"], description:"Salesforce CRM: SOQL queries, record CRUD, object metadata." },
  { id:"zendesk",         name:"Zendesk",           category:"productivity", alwaysOn:false, tools:["list_tickets","create_ticket","update_ticket","list_users"], description:"Zendesk support: tickets, users, organizations, macros." },
  { id:"jira",            name:"Jira",              category:"productivity", alwaysOn:false, tools:["search_issues","create_issue","update_issue","list_projects","get_issue","add_comment"], description:"Jira: issue management, project boards, sprints, epics." },
  { id:"linear",          name:"Linear",            category:"productivity", alwaysOn:false, tools:["list_issues","create_issue","update_issue","list_projects","list_teams"], description:"Linear: engineering issue tracking, cycles, roadmaps." },
  { id:"sentry",          name:"Sentry",            category:"monitoring",   alwaysOn:false, tools:["list_issues","get_issue","list_events","resolve_issue","list_projects"], description:"Sentry error monitoring: issues, events, releases, performance." },
  { id:"supabase",        name:"Supabase",          category:"database",     alwaysOn:false, tools:["query","insert","update","delete","list_tables","get_schema","auth_admin"], description:"Supabase: PostgreSQL queries, Auth, Storage, Edge Functions." },
  { id:"cloudflare",      name:"Cloudflare",        category:"cloud",        alwaysOn:false, tools:["list_zones","list_dns_records","create_dns_record","list_workers","deploy_worker"], description:"Cloudflare: DNS, Workers, Pages, R2, KV, D1 database." },
  { id:"notion",          name:"Notion",            category:"productivity", alwaysOn:false, tools:["search","get_page","create_page","update_page","list_databases","query_database"], description:"Notion: pages, databases, blocks, workspace management." },
  { id:"google-maps",     name:"Google Maps",       category:"data",         alwaysOn:false, tools:["geocode","reverse_geocode","directions","places_search","distance_matrix"], description:"Google Maps: geocoding, directions, places search, distance matrix." },
  { id:"slack",           name:"Slack",             category:"communication",alwaysOn:false, tools:["send_message","list_channels","post_message","upload_file","create_channel","list_users"], description:"Slack: messaging, channels, files, workspace management." },
  { id:"airtable",        name:"Airtable",          category:"data",         alwaysOn:false, tools:["list_bases","list_tables","list_records","create_record","update_record","delete_record"], description:"Airtable: bases, tables, records, views, formulas." },
  { id:"trello",          name:"Trello",            category:"productivity", alwaysOn:false, tools:["list_boards","list_cards","create_card","update_card","move_card","add_checklist"], description:"Trello: boards, lists, cards, checklists, labels." },
  { id:"wordpress",       name:"WordPress",         category:"media",        alwaysOn:false, tools:["list_posts","create_post","update_post","list_pages","list_media","upload_media"], description:"WordPress: posts, pages, media, users, plugins, themes." },
  { id:"pexels",          name:"Pexels",            category:"media",        alwaysOn:false, tools:["search_photos","get_photo","search_videos","get_video","curated_photos"], description:"Pexels: royalty-free stock photos and videos." },
  { id:"twitter",         name:"X / Twitter",       category:"social",       alwaysOn:false, tools:["post_tweet","search_tweets","get_timeline","list_followers","send_dm"], description:"X/Twitter: post, search, timeline, DMs, analytics." },
  { id:"vercel",          name:"Vercel",            category:"developer",    alwaysOn:false, tools:["list_projects","get_deployment","create_deployment","list_domains","list_env_vars"], description:"Vercel: deployments, domains, environment variables, functions." },
  { id:"railway",         name:"Railway",           category:"developer",    alwaysOn:false, tools:["list_projects","create_project","get_deployment","list_services"], description:"Railway: projects, services, deployments, variables." },
  { id:"mongodb",         name:"MongoDB Atlas",     category:"database",     alwaysOn:false, tools:["find","insert","update","delete","aggregate","list_collections","create_collection"], description:"MongoDB Atlas: document queries, aggregation pipelines, CRUD." },
  { id:"elasticsearch",   name:"Elasticsearch",     category:"database",     alwaysOn:false, tools:["search","index","delete","get","bulk","create_index"], description:"Elasticsearch: full-text search, analytics, indexing." },
  { id:"chromadb",        name:"ChromaDB",          category:"database",     alwaysOn:false, tools:["create_collection","add","query","delete","update","get"], description:"ChromaDB vector database (local): embeddings, semantic search." },
  { id:"aws-kb",          name:"AWS Knowledge Base",category:"cloud",        alwaysOn:false, tools:["query","retrieve","ingest"], description:"Amazon Bedrock Knowledge Base: RAG, document ingestion, semantic retrieval." },
  { id:"n8n",             name:"n8n Workflows",     category:"productivity", alwaysOn:false, tools:["list_workflows","execute_workflow","get_executions","create_workflow"], description:"n8n workflow automation: trigger workflows, manage executions." },
  { id:"heroku",          name:"Heroku",            category:"developer",    alwaysOn:false, tools:["list_apps","get_app","list_dynos","create_addon","list_addons"], description:"Heroku: apps, dynos, add-ons, config vars." },
  { id:"clickup",         name:"ClickUp",           category:"productivity", alwaysOn:false, tools:["list_tasks","create_task","update_task","list_spaces","list_lists"], description:"ClickUp: tasks, spaces, lists, goals, time tracking." },
  { id:"todoist",         name:"Todoist",           category:"productivity", alwaysOn:false, tools:["list_tasks","create_task","complete_task","list_projects"], description:"Todoist: personal task management, projects, labels, priorities." },
  { id:"pinecone",        name:"Pinecone",          category:"database",     alwaysOn:false, tools:["search-records","upsert-records","describe-index","list-indexes","create-index-for-model"], description:"Pinecone vector database: high-scale semantic search and retrieval." },
  { id:"datadog",         name:"Datadog",           category:"monitoring",   alwaysOn:false, tools:["list_monitors","create_monitor","list_metrics","query_metrics","list_logs"], description:"Datadog observability: metrics, logs, traces, monitors, dashboards." },
];

// ─── Claude Plugins Registry ──────────────────────────────────────────────────

export interface ClaudePlugin {
  id:          string;
  name:        string;
  marketplace: "official" | "awesome-cc" | "awesome-plugins" | "thedotmack";
  category:    string;
  agents?:     string[];
  skills?:     string[];
  description: string;
}

export const CLAUDE_PLUGINS: ClaudePlugin[] = [
  // ── Design ───────────────────────────────────────────────────────────────
  { id:"figma",              name:"Figma",               marketplace:"official",     category:"Design",       description:"Figma design file inspection, component extraction, asset export, Code Connect." },
  { id:"frontend-design",    name:"Frontend Design",     marketplace:"official",     category:"Design",       description:"UI component design, accessibility, responsive layouts, design systems." },
  { id:"playground",         name:"Playground",          marketplace:"official",     category:"Design",       description:"Interactive code playground and live preview." },
  { id:"miro",               name:"Miro",                marketplace:"official",     category:"Design",       description:"Miro collaborative whiteboard: diagrams, wireframes, planning boards." },
  { id:"cloudinary",         name:"Cloudinary",          marketplace:"official",     category:"Design",       description:"Cloudinary image/video CDN: upload, transform, optimise media assets." },
  { id:"adobe-for-creativity",name:"Adobe Creative",     marketplace:"official",     category:"Design",       description:"Adobe Creative Suite integration for design workflows." },

  // ── Security ─────────────────────────────────────────────────────────────
  { id:"aikido",             name:"Aikido Security",     marketplace:"official",     category:"Security",     description:"Automated security scanning: SAST, SCA, secrets detection, DAST." },
  { id:"semgrep",            name:"Semgrep",             marketplace:"official",     category:"Security",     description:"Static analysis: code bugs, security issues, custom rules." },
  { id:"sonarqube",          name:"SonarQube",           marketplace:"official",     category:"Security",     description:"Code quality and security: vulnerabilities, code smells, coverage." },
  { id:"nightvision",        name:"NightVision DAST",    marketplace:"official",     category:"Security",     description:"Dynamic application security testing for web APIs and apps." },
  { id:"enterprise-security-reviewer", name:"Enterprise Security Reviewer", marketplace:"official", category:"Security", description:"Enterprise-grade security review agent." },
  { id:"data-privacy-engineer",name:"Data Privacy",     marketplace:"official",     category:"Security",     description:"GDPR/CCPA compliance, PII detection, privacy-by-design review." },
  { id:"security-guidance",  name:"Security Guidance",  marketplace:"awesome-cc",   category:"Security",     description:"OWASP Top-10 security guidance and threat modelling." },

  // ── Language Servers (LSPs) ───────────────────────────────────────────────
  { id:"pyright-lsp",        name:"Pyright (Python)",   marketplace:"official",     category:"LSP",          description:"Python type checking, IntelliSense, import resolution." },
  { id:"typescript-lsp",     name:"TypeScript LSP",     marketplace:"official",     category:"LSP",          description:"TypeScript/JavaScript intellisense, type checking, refactoring." },
  { id:"rust-analyzer-lsp",  name:"Rust Analyzer",      marketplace:"official",     category:"LSP",          description:"Rust language support: types, macros, refactoring." },
  { id:"gopls-lsp",          name:"gopls (Go)",          marketplace:"official",     category:"LSP",          description:"Go language server: completion, docs, formatting." },
  { id:"csharp-lsp",         name:"C# LSP",             marketplace:"official",     category:"LSP",          description:"C# language support via OmniSharp." },
  { id:"clangd-lsp",         name:"clangd (C/C++)",     marketplace:"official",     category:"LSP",          description:"C/C++ language server: completion, diagnostics, refactoring." },
  { id:"kotlin-lsp",         name:"Kotlin LSP",         marketplace:"official",     category:"LSP",          description:"Kotlin language support." },
  { id:"lua-lsp",            name:"Lua LSP",            marketplace:"official",     category:"LSP",          description:"Lua language server." },
  { id:"php-lsp",            name:"PHP LSP",            marketplace:"official",     category:"LSP",          description:"PHP Intelephense language server." },
  { id:"swift-lsp",          name:"Swift LSP",          marketplace:"official",     category:"LSP",          description:"Swift language support via sourcekit-lsp." },
  { id:"ruby-lsp",           name:"Ruby LSP",           marketplace:"official",     category:"LSP",          description:"Ruby language server from Shopify." },
  { id:"jdtls-lsp",          name:"Java (jdtls)",       marketplace:"official",     category:"LSP",          description:"Java development tools language server." },
  { id:"elixir-ls-lsp",      name:"ElixirLS",           marketplace:"official",     category:"LSP",          description:"Elixir language server." },

  // ── Dev Workflow ─────────────────────────────────────────────────────────
  { id:"commit-commands",    name:"Commit Commands",    marketplace:"official",     category:"Dev Workflow",  description:"Structured git commit workflows with conventional commits." },
  { id:"pr-review-toolkit",  name:"PR Review Toolkit",  marketplace:"official",     category:"Dev Workflow",  description:"Code review, simplification, type analysis, silent-failure hunting." },
  { id:"code-review",        name:"Code Review",        marketplace:"official",     category:"Dev Workflow",  description:"Expert code quality review with security focus." },
  { id:"code-simplifier",    name:"Code Simplifier",    marketplace:"official",     category:"Dev Workflow",  description:"Simplify and refine code for clarity and maintainability." },
  { id:"feature-dev",        name:"Feature Dev",        marketplace:"official",     category:"Dev Workflow",  description:"Feature development workflow: architect, explore, code, review." },
  { id:"plugin-dev",         name:"Plugin Dev",         marketplace:"official",     category:"Dev Workflow",  description:"Claude Code plugin development: create agents, validate plugins, review skills." },
  { id:"agent-sdk-dev",      name:"Agent SDK Dev",      marketplace:"official",     category:"Dev Workflow",  description:"Claude Agent SDK application development and verification." },
  { id:"mcp-server-dev",     name:"MCP Server Dev",     marketplace:"official",     category:"Dev Workflow",  description:"MCP server development and testing." },
  { id:"skill-creator",      name:"Skill Creator",      marketplace:"official",     category:"Dev Workflow",  description:"Create new agent skills following best practices." },
  { id:"remember",           name:"Remember",           marketplace:"official",     category:"Dev Workflow",  description:"Memory persistence: remember facts and recall them across sessions." },
  { id:"session-report",     name:"Session Report",     marketplace:"official",     category:"Dev Workflow",  description:"Generate session summaries and progress reports." },
  { id:"code-modernization", name:"Code Modernization", marketplace:"official",     category:"Dev Workflow",  description:"Legacy code analysis, business rule extraction, modernization." },
  { id:"atomic-agents",      name:"Atomic Agents",      marketplace:"official",     category:"Dev Workflow",  description:"Atomic agent patterns for composable AI workflows." },
  { id:"superpowers",        name:"Superpowers",        marketplace:"official",     category:"Dev Workflow",  skills:["brainstorming","tdd","debugging","code-architect"], description:"TDD, brainstorming, debugging, architecture skills by obra." },

  // ── Integrations ─────────────────────────────────────────────────────────
  { id:"github-plugin",      name:"GitHub Plugin",      marketplace:"official",     category:"Integration",  description:"GitHub integration: repos, issues, PRs, Actions, Copilot." },
  { id:"gitlab-plugin",      name:"GitLab Plugin",      marketplace:"official",     category:"Integration",  description:"GitLab integration: MRs, pipelines, issues." },
  { id:"firebase",           name:"Firebase",           marketplace:"official",     category:"Integration",  description:"Firebase: Firestore, Auth, Storage, Functions, Hosting." },
  { id:"supabase-plugin",    name:"Supabase Plugin",    marketplace:"official",     category:"Integration",  description:"Supabase: database, auth, storage, edge functions." },
  { id:"stripe-plugin",      name:"Stripe Plugin",      marketplace:"official",     category:"Integration",  description:"Stripe payments and billing integration." },
  { id:"atlassian",          name:"Atlassian",          marketplace:"official",     category:"Integration",  description:"Jira, Confluence, Bitbucket: issue tracking, docs, repos." },
  { id:"atlassian-forge-skills", name:"Atlassian Forge", marketplace:"official",   category:"Integration",  description:"Atlassian Forge app development and deployment." },
  { id:"vercel-plugin",      name:"Vercel Plugin",      marketplace:"official",     category:"Integration",  description:"Vercel deployment, CI/CD, analytics, edge config." },
  { id:"aws-dev-toolkit",    name:"AWS Dev Toolkit",    marketplace:"official",     category:"Integration",  description:"AWS architecture, serverless, cost optimization, Well-Architected review." },
  { id:"aws-serverless",     name:"AWS Serverless",     marketplace:"official",     category:"Integration",  description:"Lambda, API Gateway, SAM, Step Functions, EventBridge." },
  { id:"azure",              name:"Azure",              marketplace:"official",     category:"Integration",  description:"Full Azure platform: compute, storage, databases, AI, DevOps." },
  { id:"azure-cosmos-db-assistant", name:"Azure Cosmos DB", marketplace:"official", category:"Integration",  description:"Cosmos DB schema design, partitioning, query optimization." },
  { id:"cloudflare-plugin",  name:"Cloudflare Plugin",  marketplace:"official",     category:"Integration",  description:"Cloudflare Workers, Pages, R2, KV, D1, DNS management." },
  { id:"shopify-plugin",     name:"Shopify Plugin",     marketplace:"official",     category:"Integration",  description:"Shopify storefront, admin API, theme development, app integration." },
  { id:"sentry-plugin",      name:"Sentry Plugin",      marketplace:"official",     category:"Integration",  description:"Sentry error tracking and performance monitoring integration." },
  { id:"datadog-plugin",     name:"Datadog Plugin",     marketplace:"official",     category:"Integration",  description:"Datadog metrics, logs, APM, monitors, dashboards." },
  { id:"posthog",            name:"PostHog",            marketplace:"official",     category:"Integration",  description:"Product analytics: events, funnels, sessions, feature flags." },
  { id:"amplitude",          name:"Amplitude",          marketplace:"official",     category:"Integration",  description:"Amplitude behavioural analytics: charts, cohorts, journeys." },
  { id:"linear-plugin",      name:"Linear Plugin",      marketplace:"official",     category:"Integration",  description:"Linear engineering workflow: issues, cycles, roadmaps." },
  { id:"notion-plugin",      name:"Notion Plugin",      marketplace:"official",     category:"Integration",  description:"Notion workspace management: pages, databases, blocks." },
  { id:"cockroachdb",        name:"CockroachDB",        marketplace:"official",     category:"Integration",  description:"CockroachDB distributed SQL: developer, DBA, operator skills." },
  { id:"pinecone-plugin",    name:"Pinecone Plugin",    marketplace:"official",     category:"Integration",  description:"Pinecone vector database integration for semantic search." },
  { id:"neon",               name:"Neon",               marketplace:"official",     category:"Integration",  description:"Neon serverless PostgreSQL: branches, compute, storage." },
  { id:"sanity",             name:"Sanity",             marketplace:"official",     category:"Integration",  description:"Sanity CMS: content modelling, GROQ queries, studio customization." },
  { id:"box",                name:"Box",                marketplace:"official",     category:"Integration",  description:"Box cloud storage: files, folders, metadata, workflows." },

  // ── AI / ML ───────────────────────────────────────────────────────────────
  { id:"context7-plugin",    name:"Context7 Plugin",    marketplace:"official",     category:"AI/ML",        description:"Live documentation for 1000s of libraries via Context7." },
  { id:"playwright-plugin",  name:"Playwright Plugin",  marketplace:"official",     category:"AI/ML",        description:"Full Playwright browser automation with accessibility and screenshots." },
  { id:"chrome-devtools-mcp",name:"Chrome DevTools MCP",marketplace:"official",     category:"AI/ML",        description:"Chrome DevTools: element inspection, JS execution, performance, Lighthouse." },
  { id:"firecrawl-plugin",   name:"Firecrawl Plugin",   marketplace:"official",     category:"AI/ML",        description:"AI web crawling: extract structured data from any website." },
  { id:"exa-plugin",         name:"Exa Plugin",         marketplace:"official",     category:"AI/ML",        description:"Exa semantic web search for research tasks." },
  { id:"greptile",           name:"Greptile",           marketplace:"official",     category:"AI/ML",        description:"Semantic codebase search: understand any repo in natural language." },
  { id:"huggingface-skills", name:"Hugging Face",       marketplace:"official",     category:"AI/ML",        description:"Hugging Face model hub: inference, datasets, spaces." },
  { id:"pydantic-ai",        name:"Pydantic AI",        marketplace:"official",     category:"AI/ML",        description:"Pydantic AI framework integration for type-safe agent development." },
  { id:"logfire",            name:"Logfire",            marketplace:"official",     category:"AI/ML",        description:"Pydantic Logfire: structured logging and observability for AI apps." },

  // ── Memory ────────────────────────────────────────────────────────────────
  { id:"claude-mem",         name:"Claude Mem",         marketplace:"thedotmack",   category:"Memory",       description:"Cross-session persistent memory with semantic search and corpus building." },
  { id:"goodmem",            name:"GoodMem",            marketplace:"official",     category:"Memory",       description:"Enterprise memory management: spaces, embedders, LLMs, rerankers, OCR." },

  // ── Awesome Claude Code Plugins (agents) ─────────────────────────────────
  { id:"ultrathink",         name:"Ultrathink",         marketplace:"awesome-cc",   category:"Agent",        description:"9-step deep reasoning protocol for complex problems." },
  { id:"brand-guardian",     name:"Brand Guardian",     marketplace:"awesome-cc",   category:"Agent",        description:"Brand consistency enforcement across all content." },
  { id:"analytics-reporter", name:"Analytics Reporter", marketplace:"awesome-cc",   category:"Agent",        description:"Analytics data interpretation and reporting." },
  { id:"code-architect",     name:"Code Architect",     marketplace:"awesome-cc",   category:"Agent",        description:"Software architecture design and decision-making." },
  { id:"frontend-developer", name:"Frontend Developer", marketplace:"awesome-cc",   category:"Agent",        description:"Modern frontend development with React, Vue, Svelte." },
  { id:"backend-architect",  name:"Backend Architect",  marketplace:"awesome-cc",   category:"Agent",        description:"Backend system design, APIs, databases, microservices." },
  { id:"data-scientist",     name:"Data Scientist",     marketplace:"awesome-cc",   category:"Agent",        description:"Data analysis, SQL, BigQuery, statistical modelling." },
  { id:"devops-automator",   name:"DevOps Automator",   marketplace:"awesome-cc",   category:"Agent",        description:"CI/CD, infrastructure, deployment pipelines." },
  { id:"planning-prd-agent", name:"Planning PRD Agent", marketplace:"awesome-cc",   category:"Agent",        description:"Technical PRD generation, task decomposition, roadmapping." },
  { id:"rapid-prototyper",   name:"Rapid Prototyper",   marketplace:"awesome-cc",   category:"Agent",        description:"Fast MVP and prototype builder." },
  { id:"mobile-app-builder", name:"Mobile App Builder", marketplace:"awesome-cc",   category:"Agent",        description:"React Native, Flutter, Swift, Kotlin mobile development." },
  { id:"vision-specialist",  name:"Vision Specialist",  marketplace:"awesome-cc",   category:"Agent",        description:"Vision AI, OCR, image processing, barcode detection." },
  { id:"unit-test-generator",name:"Unit Test Generator",marketplace:"awesome-cc",   category:"Agent",        description:"Comprehensive unit and integration test generation." },
  { id:"test-writer-fixer",  name:"Test Writer & Fixer",marketplace:"awesome-cc",   category:"Agent",        description:"Test creation and bug fixing from failing tests." },
  { id:"codebase-documenter",name:"Codebase Documenter",marketplace:"awesome-cc",   category:"Agent",        description:"Auto-generate comprehensive codebase documentation." },
  { id:"growth-hacker",      name:"Growth Hacker",      marketplace:"awesome-cc",   category:"Agent",        description:"Growth strategy, A/B testing, funnel optimisation." },
  { id:"legal-advisor",      name:"Legal Advisor",      marketplace:"awesome-cc",   category:"Agent",        description:"Legal document review and risk assessment." },
  { id:"n8n-workflow-builder",name:"n8n Workflow Builder",marketplace:"awesome-cc", category:"Agent",        description:"n8n workflow design and automation implementation." },
  { id:"searchfit-seo",      name:"SearchFit SEO",      marketplace:"official",     category:"Agent",        description:"SEO auditing, content strategy, competitor analysis." },
  { id:"opsera-devsecops",   name:"Opsera DevSecOps",   marketplace:"official",     category:"Agent",        description:"DevSecOps pipeline design, security scanning, compliance." },
];

// ─── Native Claude Code Tools ─────────────────────────────────────────────────

export const NATIVE_CLAUDE_TOOLS = [
  "Read", "Write", "Edit", "MultiEdit", "Bash", "Glob", "Grep",
  "WebFetch", "WebSearch", "TodoWrite", "TodoRead",
  "Agent", "Task", "TaskOutput", "TaskStop",
  "LS", "NotebookRead", "NotebookEdit",
  "AskUserQuestion", "PushNotification",
  "CronCreate", "CronDelete", "CronList", "ScheduleWakeup",
  "EnterPlanMode", "ExitPlanMode", "EnterWorktree", "ExitWorktree",
  "Monitor", "LSP", "RemoteTrigger",
  "ListMcpResourcesTool", "ReadMcpResourceTool",
];

// ─── Agent Skills ─────────────────────────────────────────────────────────────

export const AGENT_SKILLS = [
  { id:"ARIA_PLUS",          name:"ARIA+ Web Builder",  command:"/build-site", description:"Full-stack web builder. Any framework, real code ownership, WCAG 2.1 AA, CMS at scale." },
  { id:"FRAMER_PLUS",        name:"FRAMER+ Designer",   command:"/design",     description:"Motion design & animation using framer-motion. Full code ownership, no vendor lock-in." },
  { id:"KLEO_PLUS",          name:"KLEO+ Marketer",     command:"/market",     description:"Real-time research, multi-platform execution, ready-to-publish campaigns." },
  { id:"BLAZE_PLUS",         name:"BLAZE+ Content",     command:"/content",    description:"Brand voice learning, 70+ content formats, transparent AI, no subscription." },
  { id:"JUNO_PLUS",          name:"JUNO+ Engagement",   command:"/engage",     description:"Gmail + Slack + Discord + real CRM + behavioural analytics." },
  { id:"OMNI_PLUS",          name:"OMNI+ Automator",    command:"/automate",   description:"Any system, real code execution, full API orchestration across 50+ MCP servers." },
  { id:"DEEP_RESEARCH",      name:"Deep Research",      command:"/research",   description:"Multi-source synthesis, academic + web + document research at PhD level." },
  { id:"FULLSTACK_ENGINEER", name:"Fullstack Engineer", command:"/plan",       description:"End-to-end software engineering: architecture, implementation, testing, deployment." },
  { id:"SECURITY_ANALYST",   name:"Security Analyst",   command:"/debug",      description:"Security review, penetration testing guidance, threat modelling, OWASP audit." },
  { id:"PRODUCT_MANAGER",    name:"Product Manager",    command:"/plan",       description:"Product strategy, PRDs, user stories, roadmaps, stakeholder management." },
  { id:"DATA_SCIENTIST",     name:"Data Scientist",     command:"/data",       description:"Statistical analysis, ML model selection, data visualisation, SQL/Python." },
  { id:"EXECUTIVE_ASSISTANT",name:"Executive Assistant",command:"/email",      description:"Calendar, email, scheduling, document preparation, executive communications." },
  { id:"DEVOPS_ENGINEER",    name:"DevOps Engineer",    command:"/deploy",     description:"CI/CD, infrastructure as code, container orchestration, observability." },
];

// ─── Plugin Manifest Summary ─────────────────────────────────────────────────

export const PLUGIN_MANIFEST_SUMMARY = {
  mcpServerCount:       MCP_SERVERS.length,
  alwaysOnServers:      MCP_SERVERS.filter(s => s.alwaysOn).length,
  apiKeyServers:        MCP_SERVERS.filter(s => !s.alwaysOn).length,
  pluginCount:          CLAUDE_PLUGINS.length,
  nativeToolCount:      NATIVE_CLAUDE_TOOLS.length,
  agentSkillCount:      AGENT_SKILLS.length,
  totalToolIds:         MCP_SERVERS.flatMap(s => s.tools).length,
} as const;

// ─── System Prompt Addition ───────────────────────────────────────────────────

export function buildPluginManifestPrompt(): string {
  const alwaysOn = MCP_SERVERS.filter(s => s.alwaysOn);
  const apiKey   = MCP_SERVERS.filter(s => !s.alwaysOn);

  const grouped = CLAUDE_PLUGINS.reduce<Record<string, ClaudePlugin[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  const pluginLines = Object.entries(grouped)
    .map(([cat, plugins]) => `  ${cat}: ${plugins.map(p => p.name).join(", ")}`)
    .join("\n");

  return `
FULL TOOL & PLUGIN MANIFEST (${PLUGIN_MANIFEST_SUMMARY.mcpServerCount} MCP servers · ${PLUGIN_MANIFEST_SUMMARY.pluginCount} plugins · ${PLUGIN_MANIFEST_SUMMARY.nativeToolCount} native tools):

━━━ ALWAYS-ON MCP SERVERS (${alwaysOn.length}) ━━━
${alwaysOn.map(s => `  ${s.name.padEnd(22)}: ${s.description.slice(0, 80)}`).join("\n")}

━━━ API-KEY MCP SERVERS (${apiKey.length} — configure in claude_desktop_config.json) ━━━
${apiKey.map(s => `  ${s.name.padEnd(22)}: ${s.description.slice(0, 80)}`).join("\n")}

━━━ CLAUDE PLUGINS BY CATEGORY ━━━
${pluginLines}

━━━ AGENT SKILLS (invoke with Skill tool) ━━━
${AGENT_SKILLS.map(s => `  ${s.command.padEnd(15)}: ${s.name} — ${s.description.slice(0, 60)}`).join("\n")}

━━━ NATIVE CLAUDE CODE TOOLS ━━━
  ${NATIVE_CLAUDE_TOOLS.join(", ")}

━━━ NATIVE CLAUDE AI CAPABILITIES ━━━
  Vision           : Analyse images, screenshots, diagrams, charts, PDFs visually
  Extended Thinking: Deep multi-step reasoning for complex problems (≥200 thinking tokens)
  Code Execution   : Run Python, JS, and other code in a sandboxed environment
  Long Context     : Process entire codebases, documents, and datasets (200k+ tokens)
  Tool Use         : Parallel and sequential tool calling with full structured output
  Multilingual     : Read and write in 40+ languages with native fluency
  Structured Output: JSON, XML, YAML, Markdown, CSV output on demand

When a task needs a tool, always choose the most specific MCP server or plugin available.
Prefer always-on servers for speed; use API-key servers when their specialised data is needed.
Use agent skills for complex multi-step work requiring a dedicated workflow.
`;
}

export const PLUGIN_MANIFEST_PROMPT = buildPluginManifestPrompt();
