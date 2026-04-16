import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../jira-client.js";

/**
 * transition_ticket — Change the status of a JIRA ticket.
 *
 * Fetches available transitions, matches the requested status
 * (exact then partial, case-insensitive), and executes the transition.
 * Lists available transitions if no match is found.
 */
export function registerTransitionTicket(server: McpServer, jira: JiraClient): void {
  server.tool(
    "transition_ticket",
    "Change the status of a JIRA ticket (e.g. To Do → In Progress → Done). Lists available transitions if the requested status doesn't match.",
    {
      ticketId: z.string().describe("JIRA ticket ID, e.g. PROJ-123"),
      status: z
        .string()
        .describe(
          'Target status name, e.g. "In Progress", "Done", "To Do"',
        ),
    },
    async ({ ticketId, status }) => {
      try {
        const { transitions } = await jira.getTransitions(ticketId);

        if (transitions.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No transitions available for ${ticketId}. The ticket may be in a final state or you may lack permission.`,
              },
            ],
            isError: true,
          };
        }

        const statusLower = status.toLowerCase();
        const match = transitions.find(
          (t) =>
            t.name.toLowerCase() === statusLower ||
            t.to.name.toLowerCase() === statusLower,
        );

        if (!match) {
          const partial = transitions.find(
            (t) =>
              t.name.toLowerCase().includes(statusLower) ||
              t.to.name.toLowerCase().includes(statusLower),
          );

          if (partial) {
            await jira.transitionIssue(ticketId, partial.id);
            return {
              content: [
                {
                  type: "text",
                  text: `Ticket ${ticketId} transitioned to "${partial.to.name}".`,
                },
              ],
            };
          }

          const available = transitions
            .map((t) => `• ${t.name} → ${t.to.name}`)
            .join("\n");
          return {
            content: [
              {
                type: "text",
                text: `No transition matching "${status}" found for ${ticketId}. Available transitions:\n\n${available}`,
              },
            ],
          };
        }

        await jira.transitionIssue(ticketId, match.id);
        return {
          content: [
            {
              type: "text",
              text: `Ticket ${ticketId} transitioned to "${match.to.name}".`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to transition ${ticketId}: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
