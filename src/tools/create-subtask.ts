import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../jira-client.js";
import { textToAdf } from "../helpers.js";

/** Issue type names that are considered "User Story". Case-insensitive. */
const ALLOWED_PARENT_TYPES = ["story", "user story"];

/**
 * create_subtask — Create a sub-task under a User Story ticket.
 *
 * Only works when the parent ticket is of type "Story" / "User Story".
 * Rejects requests for other issue types (Bug, Defect, Task, etc.).
 */
export function registerCreateSubtask(server: McpServer, jira: JiraClient): void {
  server.tool(
    "create_subtask",
    "Create a sub-task under a JIRA User Story. Only works for tickets of type Story / User Story — not for Bugs, Defects, or Tasks.",
    {
      ticketId: z.string().describe("Parent ticket ID (must be a User Story), e.g. PROJ-123"),
      summary: z.string().describe("Summary / title of the sub-task"),
      description: z
        .string()
        .optional()
        .describe("Optional description for the sub-task"),
    },
    async ({ ticketId, summary, description }) => {
      try {
        // Fetch parent to validate type
        const parent = await jira.getIssue(ticketId);
        const parentType = parent.fields.issuetype.name.toLowerCase();

        if (!ALLOWED_PARENT_TYPES.includes(parentType)) {
          return {
            content: [
              {
                type: "text",
                text: `Cannot create sub-task: ${ticketId} is of type "${parent.fields.issuetype.name}". Sub-tasks can only be created under User Story tickets.`,
              },
            ],
            isError: true,
          };
        }

        const fields: Record<string, unknown> = {
          project: { key: parent.fields.project.key },
          parent: { key: ticketId },
          summary,
          issuetype: { name: "Sub-task" },
        };

        if (description) {
          fields.description =
            jira.apiVersion === "3" ? textToAdf(description) : description;
        }

        const created = await jira.createIssue(fields);
        return {
          content: [
            {
              type: "text",
              text: `Sub-task created: ${created.key} — "${summary}" (under ${ticketId}).`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to create sub-task under ${ticketId}: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
