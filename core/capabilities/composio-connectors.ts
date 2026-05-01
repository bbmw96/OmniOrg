// Created by BBMW0 Technologies | bbmw0.com
/**
 * NEUROMESH Composio Connectors
 *
 * Composio MCP gives every NEUROMESH agent access to 500+ app connectors.
 * The server is registered at: https://connect.composio.dev/mcp
 * API key header: x-consumer-api-key: ck_4QgMHGt4I8Xb6X9shONe
 * Workspace: bbmw0_workspace
 *
 * Tool naming pattern: APPNAME_ACTION_NAME
 * Examples:
 *   GMAIL_SEND_EMAIL          SLACK_SEND_MESSAGE
 *   NOTION_CREATE_PAGE        GITHUB_CREATE_ISSUE
 *   HUBSPOT_CREATE_CONTACT    SALESFORCE_QUERY_RECORDS
 *
 * BLAZE AI Content Connectors (embedded via Composio):
 *   Content generation, brand voice, repurposing, social scheduling.
 *
 * Created by BBMW0 Technologies | bbmw0.com
 */

// ─── Composio App Categories ─────────────────────────────────────────────────

export interface ComposioApp {
  id:          string;
  name:        string;
  category:    ComposioCategory;
  toolPattern: string;          // prefix used in Composio tool names
  keyActions:  string[];        // most useful actions for NEUROMESH agents
  description: string;
}

export type ComposioCategory =
  | "content-creation"
  | "social-media"
  | "email-marketing"
  | "crm"
  | "project-management"
  | "communication"
  | "developer"
  | "data"
  | "cloud-storage"
  | "e-commerce"
  | "finance"
  | "hr"
  | "analytics"
  | "ai-ml"
  | "productivity";

// ─── BLAZE AI Content & Marketing Connectors ─────────────────────────────────
// These are the connectors that power BLAZE+ content generation capabilities.
// Every NEUROMESH agent with content, marketing, or communication tasks
// should reach for these tools first.

export const BLAZE_CONTENT_CONNECTORS: ComposioApp[] = [
  // Content Creation & Brand Voice
  {
    id:          "notion",
    name:        "Notion",
    category:    "productivity",
    toolPattern: "NOTION",
    keyActions:  [
      "NOTION_CREATE_PAGE",
      "NOTION_UPDATE_PAGE",
      "NOTION_QUERY_DATABASE",
      "NOTION_CREATE_DATABASE_ROW",
      "NOTION_SEARCH",
    ],
    description: "Content hub: create and publish long-form content, brand guidelines, campaign briefs, and editorial calendars.",
  },
  {
    id:          "wordpress",
    name:        "WordPress",
    category:    "content-creation",
    toolPattern: "WORDPRESS",
    keyActions:  [
      "WORDPRESS_CREATE_POST",
      "WORDPRESS_UPDATE_POST",
      "WORDPRESS_CREATE_PAGE",
      "WORDPRESS_UPLOAD_MEDIA",
      "WORDPRESS_LIST_POSTS",
    ],
    description: "Publish blog posts, landing pages, and SEO content directly to WordPress sites.",
  },
  {
    id:          "webflow",
    name:        "Webflow",
    category:    "content-creation",
    toolPattern: "WEBFLOW",
    keyActions:  [
      "WEBFLOW_CREATE_ITEM",
      "WEBFLOW_UPDATE_ITEM",
      "WEBFLOW_LIST_COLLECTIONS",
      "WEBFLOW_PUBLISH_SITE",
    ],
    description: "Publish content to Webflow CMS collections and trigger site publishes.",
  },

  // Social Media Publishing & Scheduling
  {
    id:          "twitter",
    name:        "X / Twitter",
    category:    "social-media",
    toolPattern: "TWITTER",
    keyActions:  [
      "TWITTER_CREATE_TWEET",
      "TWITTER_REPLY_TO_TWEET",
      "TWITTER_CREATE_THREAD",
      "TWITTER_SEARCH_TWEETS",
      "TWITTER_GET_USER_TIMELINE",
    ],
    description: "Post tweets, threads, and replies. Monitor brand mentions and engagement.",
  },
  {
    id:          "linkedin",
    name:        "LinkedIn",
    category:    "social-media",
    toolPattern: "LINKEDIN",
    keyActions:  [
      "LINKEDIN_CREATE_POST",
      "LINKEDIN_CREATE_ARTICLE",
      "LINKEDIN_SEND_MESSAGE",
      "LINKEDIN_GET_PROFILE",
      "LINKEDIN_GET_FEED",
    ],
    description: "Publish professional content, articles, and thought leadership posts on LinkedIn.",
  },
  {
    id:          "instagram",
    name:        "Instagram",
    category:    "social-media",
    toolPattern: "INSTAGRAM",
    keyActions:  [
      "INSTAGRAM_CREATE_POST",
      "INSTAGRAM_GET_MEDIA",
      "INSTAGRAM_GET_INSIGHTS",
    ],
    description: "Publish Instagram posts and monitor content performance.",
  },
  {
    id:          "facebook",
    name:        "Facebook",
    category:    "social-media",
    toolPattern: "FACEBOOK",
    keyActions:  [
      "FACEBOOK_CREATE_POST",
      "FACEBOOK_PUBLISH_PAGE_POST",
      "FACEBOOK_GET_PAGE_INSIGHTS",
      "FACEBOOK_CREATE_AD",
    ],
    description: "Publish to Facebook pages, run ads, and analyse reach.",
  },
  {
    id:          "youtube",
    name:        "YouTube",
    category:    "social-media",
    toolPattern: "YOUTUBE",
    keyActions:  [
      "YOUTUBE_UPLOAD_VIDEO",
      "YOUTUBE_UPDATE_VIDEO",
      "YOUTUBE_CREATE_PLAYLIST",
      "YOUTUBE_GET_VIDEO_ANALYTICS",
      "YOUTUBE_ADD_CAPTION",
    ],
    description: "Upload videos, manage playlists, add captions, and analyse performance.",
  },
  {
    id:          "tiktok",
    name:        "TikTok",
    category:    "social-media",
    toolPattern: "TIKTOK",
    keyActions:  [
      "TIKTOK_UPLOAD_VIDEO",
      "TIKTOK_GET_VIDEO_LIST",
      "TIKTOK_GET_USER_INFO",
    ],
    description: "Upload and manage TikTok video content.",
  },

  // Email Marketing
  {
    id:          "mailchimp",
    name:        "Mailchimp",
    category:    "email-marketing",
    toolPattern: "MAILCHIMP",
    keyActions:  [
      "MAILCHIMP_CREATE_CAMPAIGN",
      "MAILCHIMP_SEND_CAMPAIGN",
      "MAILCHIMP_ADD_MEMBER",
      "MAILCHIMP_CREATE_LIST",
      "MAILCHIMP_GET_CAMPAIGN_REPORT",
    ],
    description: "Create and send email campaigns, manage subscriber lists, analyse open and click rates.",
  },
  {
    id:          "klaviyo",
    name:        "Klaviyo",
    category:    "email-marketing",
    toolPattern: "KLAVIYO",
    keyActions:  [
      "KLAVIYO_CREATE_CAMPAIGN",
      "KLAVIYO_SEND_CAMPAIGN",
      "KLAVIYO_CREATE_PROFILE",
      "KLAVIYO_GET_METRICS",
      "KLAVIYO_CREATE_FLOW",
    ],
    description: "E-commerce email and SMS marketing: campaigns, flows, segmentation, revenue attribution.",
  },
  {
    id:          "sendgrid",
    name:        "SendGrid",
    category:    "email-marketing",
    toolPattern: "SENDGRID",
    keyActions:  [
      "SENDGRID_SEND_EMAIL",
      "SENDGRID_CREATE_TEMPLATE",
      "SENDGRID_CREATE_CONTACT",
      "SENDGRID_GET_STATS",
    ],
    description: "Transactional and marketing emails via SendGrid API.",
  },

  // CRM & Sales
  {
    id:          "hubspot",
    name:        "HubSpot",
    category:    "crm",
    toolPattern: "HUBSPOT",
    keyActions:  [
      "HUBSPOT_CREATE_CONTACT",
      "HUBSPOT_CREATE_DEAL",
      "HUBSPOT_CREATE_COMPANY",
      "HUBSPOT_SEND_EMAIL",
      "HUBSPOT_CREATE_NOTE",
      "HUBSPOT_GET_ANALYTICS",
    ],
    description: "HubSpot CRM, marketing automation, email sequences, deal pipeline, and analytics.",
  },
  {
    id:          "salesforce",
    name:        "Salesforce",
    category:    "crm",
    toolPattern: "SALESFORCE",
    keyActions:  [
      "SALESFORCE_CREATE_LEAD",
      "SALESFORCE_CREATE_OPPORTUNITY",
      "SALESFORCE_QUERY_RECORDS",
      "SALESFORCE_UPDATE_RECORD",
      "SALESFORCE_CREATE_TASK",
    ],
    description: "Salesforce CRM: leads, opportunities, accounts, contacts, SOQL queries.",
  },
];

// ─── All Composio App Connectors (500+) ──────────────────────────────────────

export const COMPOSIO_PRODUCTIVITY_APPS: ComposioApp[] = [
  {
    id: "gmail",           name: "Gmail",           category: "communication",
    toolPattern: "GMAIL",
    keyActions: ["GMAIL_SEND_EMAIL","GMAIL_CREATE_DRAFT","GMAIL_FETCH_EMAILS","GMAIL_REPLY_TO_THREAD","GMAIL_ADD_LABEL"],
    description: "Full Gmail integration: send, read, draft, label, search emails.",
  },
  {
    id: "slack",           name: "Slack",           category: "communication",
    toolPattern: "SLACK",
    keyActions: ["SLACK_SEND_MESSAGE","SLACK_CREATE_CHANNEL","SLACK_GET_MESSAGES","SLACK_UPLOAD_FILE","SLACK_LIST_CHANNELS"],
    description: "Slack messaging: send to channels/DMs, create channels, read history, upload files.",
  },
  {
    id: "microsoft-teams", name: "Microsoft Teams", category: "communication",
    toolPattern: "MICROSOFT_TEAMS",
    keyActions: ["MICROSOFT_TEAMS_SEND_MESSAGE","MICROSOFT_TEAMS_CREATE_CHANNEL","MICROSOFT_TEAMS_GET_MESSAGES"],
    description: "Microsoft Teams: messages, channels, meetings, files.",
  },
  {
    id: "discord",         name: "Discord",         category: "communication",
    toolPattern: "DISCORD",
    keyActions: ["DISCORD_SEND_MESSAGE","DISCORD_CREATE_CHANNEL","DISCORD_GET_MESSAGES","DISCORD_CREATE_WEBHOOK"],
    description: "Discord: messages, channels, webhooks, server management.",
  },
  {
    id: "jira",            name: "Jira",            category: "project-management",
    toolPattern: "JIRA",
    keyActions: ["JIRA_CREATE_ISSUE","JIRA_UPDATE_ISSUE","JIRA_GET_ISSUE","JIRA_LIST_ISSUES","JIRA_ADD_COMMENT"],
    description: "Jira issue tracking: create, update, comment, transition, search.",
  },
  {
    id: "asana",           name: "Asana",           category: "project-management",
    toolPattern: "ASANA",
    keyActions: ["ASANA_CREATE_TASK","ASANA_UPDATE_TASK","ASANA_CREATE_PROJECT","ASANA_LIST_TASKS","ASANA_ADD_COMMENT"],
    description: "Asana task and project management.",
  },
  {
    id: "trello",          name: "Trello",          category: "project-management",
    toolPattern: "TRELLO",
    keyActions: ["TRELLO_CREATE_CARD","TRELLO_UPDATE_CARD","TRELLO_MOVE_CARD","TRELLO_LIST_CARDS","TRELLO_CREATE_BOARD"],
    description: "Trello boards, lists, and cards.",
  },
  {
    id: "linear",          name: "Linear",          category: "project-management",
    toolPattern: "LINEAR",
    keyActions: ["LINEAR_CREATE_ISSUE","LINEAR_UPDATE_ISSUE","LINEAR_LIST_ISSUES","LINEAR_CREATE_COMMENT"],
    description: "Linear engineering issue tracking: issues, cycles, roadmaps.",
  },
  {
    id: "google-drive",    name: "Google Drive",    category: "cloud-storage",
    toolPattern: "GOOGLEDRIVE",
    keyActions: ["GOOGLEDRIVE_CREATE_FILE","GOOGLEDRIVE_UPLOAD_FILE","GOOGLEDRIVE_LIST_FILES","GOOGLEDRIVE_SHARE_FILE"],
    description: "Google Drive: file creation, upload, sharing, listing.",
  },
  {
    id: "google-sheets",   name: "Google Sheets",   category: "data",
    toolPattern: "GOOGLESHEETS",
    keyActions: ["GOOGLESHEETS_CREATE_SPREADSHEET","GOOGLESHEETS_UPDATE_VALUES","GOOGLESHEETS_GET_VALUES","GOOGLESHEETS_APPEND_VALUES"],
    description: "Google Sheets: read and write spreadsheet data.",
  },
  {
    id: "google-docs",     name: "Google Docs",     category: "content-creation",
    toolPattern: "GOOGLEDOCS",
    keyActions: ["GOOGLEDOCS_CREATE_DOCUMENT","GOOGLEDOCS_UPDATE_DOCUMENT","GOOGLEDOCS_GET_DOCUMENT","GOOGLEDOCS_BATCH_UPDATE"],
    description: "Google Docs: create, edit, and format documents.",
  },
  {
    id: "airtable",        name: "Airtable",        category: "data",
    toolPattern: "AIRTABLE",
    keyActions: ["AIRTABLE_CREATE_RECORD","AIRTABLE_UPDATE_RECORD","AIRTABLE_LIST_RECORDS","AIRTABLE_DELETE_RECORD"],
    description: "Airtable: bases, tables, records, views.",
  },
  {
    id: "shopify",         name: "Shopify",         category: "e-commerce",
    toolPattern: "SHOPIFY",
    keyActions: ["SHOPIFY_CREATE_PRODUCT","SHOPIFY_UPDATE_PRODUCT","SHOPIFY_LIST_ORDERS","SHOPIFY_CREATE_DISCOUNT"],
    description: "Shopify: products, orders, customers, discounts.",
  },
  {
    id: "stripe",          name: "Stripe",          category: "finance",
    toolPattern: "STRIPE",
    keyActions: ["STRIPE_CREATE_CUSTOMER","STRIPE_CREATE_PAYMENT_INTENT","STRIPE_LIST_SUBSCRIPTIONS","STRIPE_CREATE_INVOICE"],
    description: "Stripe: payments, customers, subscriptions, invoices.",
  },
  {
    id: "github",          name: "GitHub",          category: "developer",
    toolPattern: "GITHUB",
    keyActions: ["GITHUB_CREATE_ISSUE","GITHUB_CREATE_PR","GITHUB_COMMIT_FILE","GITHUB_LIST_REPOS","GITHUB_CREATE_REPO"],
    description: "GitHub: repositories, issues, PRs, files, Actions.",
  },
  {
    id: "zendesk",         name: "Zendesk",         category: "crm",
    toolPattern: "ZENDESK",
    keyActions: ["ZENDESK_CREATE_TICKET","ZENDESK_UPDATE_TICKET","ZENDESK_LIST_TICKETS","ZENDESK_ADD_COMMENT"],
    description: "Zendesk: support tickets, users, organisations.",
  },
  {
    id: "intercom",        name: "Intercom",        category: "crm",
    toolPattern: "INTERCOM",
    keyActions: ["INTERCOM_CREATE_CONVERSATION","INTERCOM_REPLY_CONVERSATION","INTERCOM_CREATE_CONTACT","INTERCOM_LIST_CONVERSATIONS"],
    description: "Intercom: customer conversations, contacts, help articles.",
  },
  {
    id: "calendly",        name: "Calendly",        category: "productivity",
    toolPattern: "CALENDLY",
    keyActions: ["CALENDLY_LIST_EVENT_TYPES","CALENDLY_LIST_EVENTS","CALENDLY_CANCEL_EVENT"],
    description: "Calendly: event types, scheduled events, cancellations.",
  },
  {
    id: "zoom",            name: "Zoom",            category: "communication",
    toolPattern: "ZOOM",
    keyActions: ["ZOOM_CREATE_MEETING","ZOOM_LIST_MEETINGS","ZOOM_DELETE_MEETING","ZOOM_GET_RECORDING"],
    description: "Zoom: meetings, webinars, recordings, participants.",
  },
];

// ─── Combined Connector Registry ─────────────────────────────────────────────

export const ALL_COMPOSIO_CONNECTORS: ComposioApp[] = [
  ...BLAZE_CONTENT_CONNECTORS,
  ...COMPOSIO_PRODUCTIVITY_APPS,
];

// ─── Composio System Prompt Injection ────────────────────────────────────────

export function buildComposioPrompt(): string {
  const contentApps = BLAZE_CONTENT_CONNECTORS.map(a =>
    `  ${a.name.padEnd(22)}: ${a.description.slice(0, 80)}`,
  ).join("\n");

  const productivityApps = COMPOSIO_PRODUCTIVITY_APPS.map(a =>
    `  ${a.name.padEnd(22)}: ${a.description.slice(0, 80)}`,
  ).join("\n");

  return `
━━━ COMPOSIO MCP (500+ APP CONNECTORS) ━━━
Server: https://connect.composio.dev/mcp
Workspace: bbmw0_workspace
Tool pattern: APPNAME_ACTION_NAME (e.g. GMAIL_SEND_EMAIL, SLACK_SEND_MESSAGE)

To find available tools for any app, use the Composio MCP list_tools action.
To execute any connector action, call the matching Composio tool directly.

BLAZE+ CONTENT & MARKETING CONNECTORS:
${contentApps}

PRODUCTIVITY & COMMUNICATION CONNECTORS:
${productivityApps}

COMPOSIO USAGE RULES:
  1. For content tasks: prefer NOTION, WORDPRESS, WEBFLOW for publishing;
     TWITTER, LINKEDIN, INSTAGRAM for social; MAILCHIMP, KLAVIYO for email.
  2. For CRM tasks: use HUBSPOT (SME/startup) or SALESFORCE (enterprise).
  3. For team tasks: use SLACK (async), ZOOM (meetings), JIRA/LINEAR (issues).
  4. If an app is not listed above, check Composio MCP tool list: 500+ apps available.
  5. Always confirm the action succeeded and report the result back.
`;
}

export const COMPOSIO_PROMPT = buildComposioPrompt();
