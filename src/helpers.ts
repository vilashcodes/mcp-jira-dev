import type { AdfDocument, AdfNode } from "./jira-client.js";

/** Convert an ADF document to plain text. */
export function adfToPlainText(node: AdfNode | AdfDocument | null | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (!("content" in node) || !node.content) return "";

  const parts: string[] = [];
  for (const child of node.content) {
    const text = adfToPlainText(child);
    if (!text) continue;

    switch (child.type) {
      case "paragraph":
        parts.push(text + "\n");
        break;
      case "heading":
        parts.push(text + "\n");
        break;
      case "bulletList":
      case "orderedList":
        parts.push(text);
        break;
      case "listItem":
        parts.push("• " + text);
        break;
      case "codeBlock":
        parts.push("```\n" + text + "\n```\n");
        break;
      case "blockquote":
        parts.push(
          text
            .split("\n")
            .map((l) => "> " + l)
            .join("\n") + "\n",
        );
        break;
      default:
        parts.push(text);
    }
  }
  return parts.join("").trim();
}

/** Convert plain text to an ADF document. */
export function textToAdf(text: string): AdfDocument {
  return {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

/** Format a date string for display. */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Extract plain text from a description field (string in v2, ADF in v3). */
export function descriptionToText(desc: AdfDocument | string | null | undefined): string {
  if (!desc) return "";
  if (typeof desc === "string") return desc;
  return adfToPlainText(desc);
}

/** Extract plain text from a comment body (string in v2, ADF in v3). */
export function commentBodyToText(body: AdfDocument | string | null | undefined): string {
  if (!body) return "";
  if (typeof body === "string") return body;
  return adfToPlainText(body);
}
