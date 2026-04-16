#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { JiraClient, type ApiVersion } from "./jira-client.js";
import { registerGetTicket } from "./tools/get-ticket.js";
import { registerAddComment } from "./tools/add-comment.js";
import { registerAssignTicket } from "./tools/assign-ticket.js";
import { registerTransitionTicket } from "./tools/transition-ticket.js";
import { registerGetComments } from "./tools/get-comments.js";
import { registerCreateSubtask } from "./tools/create-subtask.js";

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const JIRA_BASE_URL = requiredEnv("JIRA_BASE_URL");
const JIRA_API_TOKEN = requiredEnv("JIRA_API_TOKEN");
const JIRA_API_VERSION = (process.env["JIRA_API_VERSION"] || "2") as ApiVersion;
if (JIRA_API_VERSION !== "2" && JIRA_API_VERSION !== "3") {
  console.error(`JIRA_API_VERSION must be "2" or "3", got "${JIRA_API_VERSION}"`);
  process.exit(1);
}
const JIRA_EMAIL = JIRA_API_VERSION === "3" ? requiredEnv("JIRA_EMAIL") : process.env["JIRA_EMAIL"];

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const jira = new JiraClient({
  baseUrl: JIRA_BASE_URL,
  apiToken: JIRA_API_TOKEN,
  apiVersion: JIRA_API_VERSION,
  email: JIRA_EMAIL,
});

const server = new McpServer({
  name: "jira",
  version: "1.0.0",
});

// Register tools
registerGetTicket(server, jira);
registerAddComment(server, jira);
registerAssignTicket(server, jira);
registerTransitionTicket(server, jira);
registerGetComments(server, jira);
registerCreateSubtask(server, jira);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
