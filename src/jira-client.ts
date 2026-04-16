export type ApiVersion = "2" | "3";

export interface JiraConfig {
  baseUrl: string;
  apiToken: string;
  apiVersion: ApiVersion;
  /** Required for v3 (Cloud) Basic Auth. Not used for v2 (Bearer token). */
  email?: string;
}

export class JiraClient {
  private baseUrl: string;
  private authHeader: string;
  readonly apiVersion: ApiVersion;

  constructor(config: JiraConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiVersion = config.apiVersion;

    if (this.apiVersion === "3") {
      if (!config.email) {
        throw new Error("JIRA_EMAIL is required for API v3 (Cloud)");
      }
      this.authHeader =
        "Basic " +
        Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");
    } else {
      // v2: Bearer token (Personal Access Token)
      this.authHeader = `Bearer ${config.apiToken}`;
    }
  }

  private api(path: string): string {
    return `/rest/api/${this.apiVersion}${path}`;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorBody = (await response.json()) as {
          errorMessages?: string[];
          errors?: Record<string, string>;
        };
        errorMessage =
          errorBody.errorMessages?.join(", ") ||
          JSON.stringify(errorBody.errors) ||
          response.statusText;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(`JIRA API error (${response.status}): ${errorMessage}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.request<JiraIssue>(
      "GET",
      this.api(`/issue/${encodeURIComponent(issueKey)}`),
    );
  }

  async addComment(issueKey: string, body: string | AdfDocument): Promise<JiraComment> {
    return this.request<JiraComment>(
      "POST",
      this.api(`/issue/${encodeURIComponent(issueKey)}/comment`),
      { body },
    );
  }

  async assignIssue(issueKey: string, userIdentifier: string): Promise<void> {
    const payload =
      this.apiVersion === "2"
        ? { name: userIdentifier }
        : { accountId: userIdentifier };
    await this.request<void>(
      "PUT",
      this.api(`/issue/${encodeURIComponent(issueKey)}/assignee`),
      payload,
    );
  }

  async findUser(query: string): Promise<JiraUser[]> {
    const param = this.apiVersion === "2" ? "username" : "query";
    return this.request<JiraUser[]>(
      "GET",
      this.api(`/user/search?${param}=${encodeURIComponent(query)}`),
    );
  }

  async getTransitions(issueKey: string): Promise<JiraTransitionsResponse> {
    return this.request<JiraTransitionsResponse>(
      "GET",
      this.api(`/issue/${encodeURIComponent(issueKey)}/transitions`),
    );
  }

  async transitionIssue(
    issueKey: string,
    transitionId: string,
  ): Promise<void> {
    await this.request<void>(
      "POST",
      this.api(`/issue/${encodeURIComponent(issueKey)}/transitions`),
      { transition: { id: transitionId } },
    );
  }

  async getComments(issueKey: string): Promise<JiraCommentsResponse> {
    const orderParam = this.apiVersion === "3" ? "?orderBy=-created" : "";
    return this.request<JiraCommentsResponse>(
      "GET",
      this.api(`/issue/${encodeURIComponent(issueKey)}/comment${orderParam}`),
    );
  }

  async createIssue(fields: Record<string, unknown>): Promise<JiraCreatedIssue> {
    return this.request<JiraCreatedIssue>(
      "POST",
      this.api("/issue"),
      { fields },
    );
  }
}

// --- Types ---

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    /** ADF in v3, plain string in v2 */
    description: AdfDocument | string | null;
    status: { name: string; statusCategory?: { name: string } };
    priority?: { name: string };
    assignee?: JiraUser | null;
    reporter?: JiraUser | null;
    created: string;
    updated: string;
    duedate?: string | null;
    labels?: string[];
    components?: { name: string }[];
    issuetype: { name: string };
    project: { key: string; name: string };
    [key: string]: unknown;
  };
}

export interface JiraUser {
  accountId: string;
  /** v2 Server/DC username */
  name?: string;
  displayName: string;
  emailAddress?: string;
  active?: boolean;
}

export interface JiraComment {
  id: string;
  self: string;
  /** ADF in v3, plain string in v2 */
  body: AdfDocument | string;
  created: string;
  author: { displayName: string };
}

export interface JiraTransition {
  id: string;
  name: string;
  to: { name: string; id: string };
}

export interface JiraCommentsResponse {
  startAt: number;
  maxResults: number;
  total: number;
  comments: JiraComment[];
}

export interface JiraTransitionsResponse {
  transitions: JiraTransition[];
}

export interface JiraCreatedIssue {
  id: string;
  key: string;
  self: string;
}

// Atlassian Document Format types
export interface AdfDocument {
  version: number;
  type: "doc";
  content: AdfNode[];
}

export interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
  marks?: { type: string }[];
}
