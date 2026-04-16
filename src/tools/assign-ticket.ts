import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../jira-client.js";

/**
 * assign_ticket — Assign a JIRA ticket to a user.
 *
 * Searches for the user by name or email, then assigns the ticket.
 * Uses `name` for API v2 (Server/DC) and `accountId` for API v3 (Cloud).
 */
export function registerAssignTicket(server: McpServer, jira: JiraClient): void {
  server.tool(
    "assign_ticket",
    "Assign a JIRA ticket to a user. Searches for the user by name or email, then assigns the ticket.",
    {
      ticketId: z.string().describe("JIRA ticket ID, e.g. PROJ-123"),
      username: z
        .string()
        .describe("Display name or email of the user to assign the ticket to"),
    },
    async ({ ticketId, username }) => {
      try {
        const users = await jira.findUser(username);

        if (users.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No users found matching "${username}". Please check the name or email and try again.`,
              },
            ],
            isError: true,
          };
        }

        if (users.length > 1) {
          const userList = users
            .slice(0, 10)
            .map(
              (u) =>
                `• ${u.displayName} (${u.emailAddress ?? "no email"})`,
            )
            .join("\n");
          return {
            content: [
              {
                type: "text",
                text: `Multiple users found matching "${username}". Please be more specific:\n\n${userList}`,
              },
            ],
          };
        }

        const user = users[0];
        const identifier =
          jira.apiVersion === "2"
            ? (user.name ?? user.displayName)
            : user.accountId;
        await jira.assignIssue(ticketId, identifier);
        return {
          content: [
            {
              type: "text",
              text: `Ticket ${ticketId} assigned to ${user.displayName} (${user.emailAddress ?? user.accountId}).`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to assign ${ticketId}: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
