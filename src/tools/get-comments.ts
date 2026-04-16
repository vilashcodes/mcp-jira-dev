import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../jira-client.js";
import { commentBodyToText, formatDate } from "../helpers.js";

/**
 * get_comments — Fetch all comments on a JIRA ticket.
 *
 * Returns comments ordered by most recent first (v3) or default order (v2).
 * Handles both plain text (v2) and ADF (v3) comment bodies.
 */
export function registerGetComments(server: McpServer, jira: JiraClient): void {
  server.tool(
    "get_comments",
    "Fetch all comments on a JIRA ticket, ordered by most recent first.",
    { ticketId: z.string().describe("JIRA ticket ID, e.g. PROJ-123") },
    async ({ ticketId }) => {
      try {
        const { comments, total } = await jira.getComments(ticketId);

        if (comments.length === 0) {
          return {
            content: [
              { type: "text", text: `No comments found on ${ticketId}.` },
            ],
          };
        }

        const lines = [
          `# Comments on ${ticketId} (${total} total)`,
          "",
        ];

        for (const c of comments) {
          const body = commentBodyToText(c.body);
          lines.push(
            `### ${c.author.displayName} — ${formatDate(c.created)}`,
            "",
            body || "_Empty comment_",
            "",
            "---",
            "",
          );
        }

        return { content: [{ type: "text", text: lines.join("\n").trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch comments for ${ticketId}: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
