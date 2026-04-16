import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../jira-client.js";
import { textToAdf } from "../helpers.js";

/**
 * add_comment — Add a comment to a JIRA ticket.
 *
 * Accepts plain text; converts to ADF for API v3 (Cloud),
 * sends as plain string for API v2 (Server/DC).
 */
export function registerAddComment(server: McpServer, jira: JiraClient): void {
  server.tool(
    "add_comment",
    "Add a comment to a JIRA ticket.",
    {
      ticketId: z.string().describe("JIRA ticket ID, e.g. PROJ-123"),
      comment: z.string().describe("Comment text to add to the ticket"),
    },
    async ({ ticketId, comment }) => {
      try {
        const body = jira.apiVersion === "3" ? textToAdf(comment) : comment;
        const result = await jira.addComment(ticketId, body);
        return {
          content: [
            {
              type: "text",
              text: `Comment added successfully to ${ticketId} (comment ID: ${result.id}).`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to add comment to ${ticketId}: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
