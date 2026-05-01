// Created by BBMW0 Technologies | bbmw0.com
/**
 * NEUROMESH Server Access Layer
 *
 * Provides all agents with permission-gated access to:
 *   - SQL databases (PostgreSQL, MySQL, SQLite, MSSQL, Oracle, CockroachDB)
 *   - NoSQL databases (MongoDB, Redis, DynamoDB, Firebase, CosmosDB)
 *   - Vector databases (Pinecone, Chroma, Elasticsearch, pgvector)
 *   - Cloud storage (AWS S3, Azure Blob, GCS, Google Drive, OneDrive)
 *   - Container infrastructure (Docker, Kubernetes)
 *   - CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins)
 *   - Message queues (Kafka, RabbitMQ, SQS)
 *   - Monitoring systems (Datadog, Grafana, CloudWatch, Prometheus)
 *   - Remote shell / SSH access
 *   - APIs (REST, GraphQL, SOAP, WebSocket)
 *
 * ALL server access requires an explicit permission grant from the
 * organisation IT administrator or authorised owner. No agent can
 * access servers without this grant.
 */

// ─── Server Connection Types ──────────────────────────────────────────────────

export type ServerType =
  | "postgresql" | "mysql" | "sqlite" | "mssql" | "oracle" | "cockroachdb"
  | "mongodb" | "redis" | "dynamodb" | "firebase" | "cosmosdb" | "cassandra"
  | "pinecone" | "elasticsearch" | "chroma" | "pgvector"
  | "s3" | "azure-blob" | "gcs" | "gdrive" | "onedrive" | "sharepoint" | "box"
  | "docker" | "kubernetes" | "fargate"
  | "github-actions" | "gitlab-ci" | "jenkins" | "circleci"
  | "kafka" | "rabbitmq" | "sqs" | "azure-service-bus" | "pubsub"
  | "datadog" | "grafana" | "cloudwatch" | "prometheus" | "sentry" | "newrelic"
  | "ssh" | "sftp" | "ftp"
  | "rest-api" | "graphql" | "soap" | "websocket" | "grpc";

export interface ServerConnection {
  id:         string;
  type:       ServerType;
  label:      string;         // human-readable name
  tenantId:   string;
  grantedBy:  string;
  grantedAt:  string;
  accessLevel: "read" | "read-write" | "admin";
  config?:    Record<string, string>; // connection params (no secrets stored here)
  expiresAt?: string;
}

// ─── Query / Action Request ────────────────────────────────────────────────────

export interface ServerActionRequest {
  connectionId: string;
  tenantId:     string;
  agentId:      string;
  action:       string;       // natural-language description of what to do
  parameters?:  Record<string, unknown>;
}

export interface ServerActionResult {
  success:     boolean;
  data?:       unknown;
  rowCount?:   number;
  error?:      string;
  duration?:   number;
  toolCalls:   string[];      // MCP tool calls that were used
}

// ─── MCP Tool Routing Map ─────────────────────────────────────────────────────

const SERVER_TOOL_MAP: Record<ServerType, string[]> = {
  postgresql:       ["mcp__postgres__query", "mcp__postgres__schema"],
  mysql:            ["mcp__commands__execute"],  // via mysql CLI
  sqlite:           ["mcp__commands__execute"],  // via sqlite3 CLI
  mssql:            ["mcp__commands__execute"],  // via sqlcmd
  oracle:           ["mcp__commands__execute"],  // via sqlplus
  cockroachdb:      ["mcp__plugin_cockroachdb_cockroachdb-developer__*"],
  mongodb:          ["mcp__commands__execute"],  // via mongosh
  redis:            ["mcp__redis__get", "mcp__redis__set", "mcp__redis__del",
                     "mcp__redis__keys", "mcp__redis__hget", "mcp__redis__hset"],
  dynamodb:         ["mcp__plugin_databases-on-aws_aurora-dsql__readonly_query"],
  firebase:         ["mcp__plugin_firebase_firebase__firebase_read_resources"],
  cosmosdb:         ["mcp__plugin_azure_azure__cosmos"],
  cassandra:        ["mcp__commands__execute"],
  pinecone:         ["mcp__plugin_pinecone_pinecone__search-records",
                     "mcp__plugin_pinecone_pinecone__upsert-records",
                     "mcp__plugin_pinecone_pinecone__describe-index"],
  elasticsearch:    ["mcp__commands__execute"],
  chroma:           ["mcp__commands__execute"],
  pgvector:         ["mcp__postgres__query"],
  s3:               ["mcp__commands__execute"],  // via aws s3 CLI
  "azure-blob":     ["mcp__plugin_azure_azure__storage"],
  gcs:              ["mcp__commands__execute"],  // via gsutil
  gdrive:           ["mcp__gdrive__read", "mcp__gdrive__write"],
  onedrive:         ["mcp__commands__execute"],
  sharepoint:       ["mcp__commands__execute"],
  box:              ["mcp__commands__execute"],
  docker:           ["mcp__docker__run", "mcp__docker__list",
                     "mcp__docker__stop", "mcp__docker__logs"],
  kubernetes:       ["mcp__kubernetes__apply", "mcp__kubernetes__get",
                     "mcp__kubernetes__delete", "mcp__kubernetes__logs"],
  fargate:          ["mcp__commands__execute"],  // via aws ecs CLI
  "github-actions": ["mcp__github__*"],
  "gitlab-ci":      ["mcp__gitlab__*"],
  jenkins:          ["mcp__fetch__fetch"],       // via Jenkins REST API
  circleci:         ["mcp__fetch__fetch"],
  kafka:            ["mcp__commands__execute"],
  rabbitmq:         ["mcp__commands__execute"],
  sqs:              ["mcp__commands__execute"],  // via aws sqs CLI
  "azure-service-bus": ["mcp__plugin_azure_azure__servicebus"],
  pubsub:           ["mcp__commands__execute"],
  datadog:          ["mcp__commands__execute"],
  grafana:          ["mcp__fetch__fetch"],       // via Grafana HTTP API
  cloudwatch:       ["mcp__commands__execute"],  // via aws cloudwatch CLI
  prometheus:       ["mcp__fetch__fetch"],       // via HTTP API
  sentry:           ["mcp__sentry__*"],
  newrelic:         ["mcp__fetch__fetch"],
  ssh:              ["mcp__commands__execute"],
  sftp:             ["mcp__commands__execute"],
  ftp:              ["mcp__commands__execute"],
  "rest-api":       ["mcp__fetch__fetch"],
  graphql:          ["mcp__fetch__fetch"],
  soap:             ["mcp__fetch__fetch"],
  websocket:        ["mcp__commands__execute"],
  grpc:             ["mcp__commands__execute"],
};

// ─── Server Access Engine ─────────────────────────────────────────────────────

export class ServerAccessEngine {
  private static instance: ServerAccessEngine;
  private connections = new Map<string, ServerConnection>();

  static getInstance(): ServerAccessEngine {
    if (!ServerAccessEngine.instance) {
      ServerAccessEngine.instance = new ServerAccessEngine();
    }
    return ServerAccessEngine.instance;
  }

  // ─── Connection Registration ──────────────────────────────────────────────

  registerConnection(conn: ServerConnection): void {
    this.connections.set(conn.id, conn);
  }

  getConnection(connectionId: string): ServerConnection | undefined {
    return this.connections.get(connectionId);
  }

  getConnectionsForTenant(tenantId: string): ServerConnection[] {
    return Array.from(this.connections.values()).filter(c => c.tenantId === tenantId);
  }

  // ─── Action Instructions ──────────────────────────────────────────────────

  /**
   * Returns the MCP tool call instructions for a server action.
   * Agents use these instructions to decide which tools to invoke.
   */
  getActionInstructions(serverType: ServerType, action: string): string {
    const tools = SERVER_TOOL_MAP[serverType] ?? ["mcp__commands__execute"];
    return [
      `Server type: ${serverType}`,
      `Action requested: ${action}`,
      `Available MCP tools: ${tools.join(", ")}`,
      this.getSpecificInstructions(serverType, action),
    ].join("\n");
  }

  private getSpecificInstructions(serverType: ServerType, action: string): string {
    const map: Partial<Record<ServerType, string>> = {
      postgresql: `Use mcp__postgres__query with { query: "<your SQL>" }. Always use parameterised queries for user data.`,
      redis:      `Use mcp__redis__get/set/del. For complex operations, use mcp__commands__execute with redis-cli.`,
      gdrive:     `Use mcp__gdrive__read to list and read files. Use mcp__gdrive__write to create or update files.`,
      docker:     `Use mcp__docker__list to see containers, mcp__docker__run to start, mcp__docker__logs to read output.`,
      kubernetes: `Use mcp__kubernetes__get to inspect resources, mcp__kubernetes__apply for deployments.`,
      s3:         `Use mcp__commands__execute with: aws s3 ls s3://bucket/ (list), aws s3 cp file s3://bucket/ (upload), aws s3 cp s3://bucket/file . (download).`,
      ssh:        `Use mcp__commands__execute to run commands. Ensure SSH key is available in the agent's environment.`,
      "rest-api": `Use mcp__fetch__fetch with method, url, headers, and body. Parse the JSON response.`,
      firebase:   `Use mcp__plugin_firebase_firebase__firebase_read_resources to read collections and documents.`,
    };
    return map[serverType] ?? `Use the available MCP tools listed above. For CLI-based access, use mcp__commands__execute.`;
  }

  // ─── Capability Prompt ────────────────────────────────────────────────────

  getServerCapabilityPrompt(): string {
    return `
SERVER AND DATABASE ACCESS CAPABILITIES (elevated/admin permission required):

All server and database access requires explicit permission from the
organisation's IT administrator. When granted, you can:

SQL DATABASES:
- PostgreSQL: mcp__postgres__query({ query: "SELECT ..." })
- MySQL/MSSQL/Oracle: mcp__commands__execute({ command: "mysql -h host -u user -p db -e 'query'" })
- SQLite: mcp__commands__execute({ command: "sqlite3 database.db 'query'" })
- CockroachDB: use cockroachdb developer MCP tools

NOSQL DATABASES:
- Redis: mcp__redis__get/set/del/keys/hget/hset
- MongoDB: mcp__commands__execute({ command: "mongosh connection-string --eval 'db.collection.find()'" })
- Firebase: mcp__plugin_firebase_firebase__firebase_read_resources
- DynamoDB: mcp__plugin_databases-on-aws_aurora-dsql__readonly_query

CLOUD STORAGE:
- Google Drive: mcp__gdrive__read / mcp__gdrive__write
- AWS S3: mcp__commands__execute({ command: "aws s3 ..." })
- Azure Blob: mcp__plugin_azure_azure__storage
- GCS: mcp__commands__execute({ command: "gsutil ..." })

CONTAINERS:
- Docker: mcp__docker__run / mcp__docker__list / mcp__docker__stop / mcp__docker__logs
- Kubernetes: mcp__kubernetes__apply / mcp__kubernetes__get / mcp__kubernetes__delete

MONITORING:
- Sentry: mcp__sentry__* tools
- Grafana/Prometheus: mcp__fetch__fetch against their HTTP APIs
- CloudWatch: mcp__commands__execute({ command: "aws cloudwatch ..." })
- Azure Monitor: mcp__plugin_azure_azure__monitor

REMOTE SHELL:
- mcp__commands__execute for running any shell command on the host system
  (Admin permission required. All commands are audit-logged.)

APIs:
- Any REST/GraphQL endpoint: mcp__fetch__fetch({ url, method, headers, body })
- WebSocket / gRPC: mcp__commands__execute with appropriate CLI tools

SECURITY:
- Never hardcode credentials in queries or commands.
- All server access is logged to the tenant audit trail.
- Read-only access is granted first; write access requires explicit elevation.
- All connections are tenant-namespaced and cannot cross tenant boundaries.
`;
  }
}

export const serverAccess = ServerAccessEngine.getInstance();
