import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../jira-client.js";
import { descriptionToText, formatDate } from "../helpers.js";

/**
 * get_ticket — Fetch JIRA ticket details.
 *
 * Returns summary, description, status, priority, assignee, reporter,
 * labels, components, and dates for the given ticket ID.
 */
export function registerGetTicket(server: McpServer, jira: JiraClient): void {
  server.tool(
    "get_ticket",
    "Fetch JIRA ticket details including summary, description, status, priority, assignee, and more.",
    { ticketId: z.string().describe("JIRA ticket ID, e.g. PROJ-123") },
    async ({ ticketId }) => {
      try {
        const issue = await jira.getIssue(ticketId);
        const f = issue.fields;

        const description = descriptionToText(f.description);
        const labels = f.labels?.length ? f.labels.join(", ") : "None";
        const components = f.components?.length
          ? f.components.map((c) => c.name).join(", ")
          : "None";

        const text = [
          `# ${issue.key}: ${f.summary}`,
          "",
          `**Type:** ${f.issuetype.name}`,
          `**Status:** ${f.status.name}`,
          `**Priority:** ${f.priority?.name ?? "None"}`,
          `**Project:** ${f.project.name} (${f.project.key})`,
          `**Assignee:** ${f.assignee?.displayName ?? "Unassigned"}`,
          `**Reporter:** ${f.reporter?.displayName ?? "Unknown"}`,
          `**Labels:** ${labels}`,
          `**Components:** ${components}`,
          `**Created:** ${formatDate(f.created)}`,
          `**Updated:** ${formatDate(f.updated)}`,
          `**Due Date:** ${formatDate(f.duedate)}`,
          "",
          "## Description",
          "",
          description || "_No description provided._",
        ].join("\n");

        return { content: [{ type: "text", text }] };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch ticket ${ticketId}: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
