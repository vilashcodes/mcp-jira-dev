# MCP JIRA Server (Vibe Coded)

A local MCP (Model Context Protocol) server that connects to JIRA (Cloud or Server/Data Center), enabling AI coding agents to read tickets, add comments, assign issues, and transition statuses.

Supports both **API v2** (Server/Data Center — Bearer token auth) and **API v3** (Cloud — Basic Auth with email + API token).

## Prerequisites

- **Node.js 18+** (uses native `fetch`)
- **JIRA** account with an API token or Personal Access Token (PAT)

## Setup

```bash
npm install
npm run build
```

## Authentication

### API v2 — JIRA Server / Data Center
- Uses **Bearer token** (Personal Access Token)
- Generate a PAT from your JIRA profile → Personal Access Tokens
- `JIRA_EMAIL` is **not required**

### API v3 — JIRA Cloud
- Uses **Basic Auth** (email + API token)
- Generate an API token from [Atlassian API Token Management](https://id.atlassian.com/manage-profile/security/api-tokens)
- `JIRA_EMAIL` is **required**

## VS Code Configuration

### Option 1: Workspace config (this project only)

This project ships with [.vscode/mcp.json](.vscode/mcp.json) that auto-configures the server when you open this folder in VS Code. It will prompt for your credentials on first use.

### Option 2: User settings (available in all workspaces)

1. Open VS Code **Settings** (`Cmd + ,` on Mac, `Ctrl + ,` on Windows/Linux)
2. Search for **"mcp"**
3. Click **"Edit in settings.json"** under **MCP > Servers**
4. Add a `"jira"` entry under `"mcp.servers"`:

```jsonc
// In your User settings.json
{
  "mcp": {
    "servers": {
      "jira": {
        "type": "stdio",
        "command": "node",
        "args": ["/absolute/path/to/MCP-Jira/dist/index.js"],
        "env": {
          "JIRA_BASE_URL": "https://jira.company.com",
          "JIRA_API_VERSION": "2",
          "JIRA_API_TOKEN": "your-personal-access-token"
        }
      }
    }
  }
}
```

### Option 3: Dedicated MCP config file in any workspace

Create a `.vscode/mcp.json` file in any project where you want the JIRA tools available:

```jsonc
// .vscode/mcp.json
{
  "servers": {
    "jira": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/MCP-Jira/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://jira.company.com",
        "JIRA_API_VERSION": "2",
        "JIRA_API_TOKEN": "your-personal-access-token"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_BASE_URL` | Yes | JIRA instance URL (e.g. `https://myorg.atlassian.net`) |
| `JIRA_API_VERSION` | No (default: `2`) | `2` for Server/DC, `3` for Cloud |
| `JIRA_EMAIL` | v3 only | Atlassian account email (Cloud) |
| `JIRA_API_TOKEN` | Yes | Personal Access Token (v2) or API token (v3) |

### Verifying the Server

1. After adding the config, open the **Command Palette** (`Cmd+Shift+P`)
2. Run **"MCP: List Servers"** — you should see **"jira"** listed
3. Click **Start** to launch the server
4. Open **Copilot Chat** and try: *"Fetch the details of PROJ-123"*

### Example Configs

```jsonc
// JIRA Server/Data Center (API v2 — Bearer token)
"env": {
  "JIRA_BASE_URL": "https://jira.company.com",
  "JIRA_API_VERSION": "2",
  "JIRA_API_TOKEN": "your-personal-access-token"
}
```

```jsonc
// JIRA Cloud (API v3 — Basic Auth)
"env": {
  "JIRA_BASE_URL": "https://myorg.atlassian.net",
  "JIRA_API_VERSION": "3",
  "JIRA_EMAIL": "you@example.com",
  "JIRA_API_TOKEN": "your-api-token"
}
```

## Available Tools

| Tool | Description | Inputs |
|------|-------------|--------|
| `get_ticket` | Fetch ticket details (summary, description, status, assignee, etc.) | `ticketId` (e.g. `PROJ-123`) |
| `add_comment` | Add a comment to a ticket | `ticketId`, `comment` |
| `assign_ticket` | Assign a ticket to a user (searches by name/email) | `ticketId`, `username` |
| `get_comments` | Fetch all comments on a ticket (most recent first) | `ticketId` (e.g. `PROJ-123`) |
| `transition_ticket` | Change ticket status (e.g. To Do → In Progress → Done) | `ticketId`, `status` |
| `create_subtask` | Create a sub-task under a User Story (rejected for Bugs/Defects/Tasks) | `ticketId`, `summary`, `description` (optional) |

## Usage Examples

In VS Code Copilot Chat (with the MCP server running):

- *"Fetch the details of PROJ-123"* → calls `get_ticket`
- *"Add a comment to PROJ-123: Started working on the fix"* → calls `add_comment`
- *"Assign PROJ-123 to John Smith"* → calls `assign_ticket`
- *"Show me the comments on PROJ-123"* → calls `get_comments`
- *"Move PROJ-123 to In Progress"* → calls `transition_ticket`
- *"Create a sub-task under PROJ-123: Implement API endpoint"* → calls `create_subtask`
