I can do that, but I can’t directly fetch that GitHub URL from here. If you paste either:

1) the contents of `src/` (zip it and paste key files), or  
2) the repo commit hash + the full file list + file contents (or just the public API entrypoints),

…I’ll generate a single consolidated `parallel-sdk.d.ts` that summarizes the exported API surface, preserving doc-comments **1:1** wherever they exist.

In the meantime, here’s the exact workflow and a ready-to-fill **single-file .d.ts template** I’ll output once I have the sources. If you can provide the files, I’ll replace the placeholders with the real declarations.

---

## What I need from you
Please paste:

- `src/index.ts` (or whatever the main entry is)
- any files that are re-exported from there (e.g. `src/client.ts`, `src/types.ts`, `src/resources/*`, etc.)
- if there are JSDoc comments on exports, include those lines (I will preserve them verbatim)

If it’s large, you can paste in multiple messages.

---

## Consolidated `.d.ts` template (I will fill in from your source)

```ts
// parallel-sdk.d.ts
// Auto-generated consolidated declarations for parallel-sdk-typescript.
// NOTE: Doc-comments will be copied 1:1 from source when provided.

export as namespace Parallel;

/* =====================================================================================
 * Top-level exports (from src/index.ts and re-exports)
 * ===================================================================================== */

/**
 * (Doc-comment will be copied 1:1 from source)
 */
export declare const VERSION: string;

/**
 * Main client / SDK entrypoint.
 * (Doc-comment will be copied 1:1 from source)
 */
export declare class ParallelClient {
  constructor(config?: ParallelClientConfig);

  /**
   * (Doc-comment will be copied 1:1 from source)
   */
  readonly agents: AgentsResource;

  /**
   * (Doc-comment will be copied 1:1 from source)
   */
  readonly threads: ThreadsResource;

  /**
   * (Doc-comment will be copied 1:1 from source)
   */
  readonly runs: RunsResource;

  /**
   * (Doc-comment will be copied 1:1 from source)
   */
  readonly files: FilesResource;

  /**
   * (Doc-comment will be copied 1:1 from source)
   */
  readonly tools: ToolsResource;

  /**
   * (Doc-comment will be copied 1:1 from source)
   */
  readonly models: ModelsResource;

  /**
   * (Doc-comment will be copied 1:1 from source)
   */
  close?(): Promise<void>;
}

/**
 * Client configuration.
 * (Doc-comment will be copied 1:1 from source)
 */
export interface ParallelClientConfig {
  /**
   * API key / token.
   * (Doc-comment will be copied 1:1 from source)
   */
  apiKey?: string;

  /**
   * Base URL for the Parallel API.
   * (Doc-comment will be copied 1:1 from source)
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds.
   * (Doc-comment will be copied 1:1 from source)
   */
  timeoutMs?: number;

  /**
   * Additional default headers.
   * (Doc-comment will be copied 1:1 from source)
   */
  headers?: Record<string, string>;

  /**
   * Fetch implementation override (for runtimes without global fetch).
   * (Doc-comment will be copied 1:1 from source)
   */
  fetch?: typeof fetch;
}

/* =====================================================================================
 * Resources (grouped API namespaces)
 * ===================================================================================== */

/**
 * Agents resource group.
 * (Doc-comment will be copied 1:1 from source)
 */
export interface AgentsResource {
  /**
   * Create an agent.
   * (Doc-comment will be copied 1:1 from source)
   */
  create(request: AgentCreateRequest, options?: RequestOptions): Promise<Agent>;

  /**
   * Retrieve an agent by id.
   * (Doc-comment will be copied 1:1 from source)
   */
  retrieve(agentId: string, options?: RequestOptions): Promise<Agent>;

  /**
   * List agents.
   * (Doc-comment will be copied 1:1 from source)
   */
  list(query?: AgentListQuery, options?: RequestOptions): Promise<Paginated<Agent>>;

  /**
   * Update an agent.
   * (Doc-comment will be copied 1:1 from source)
   */
  update(agentId: string, request: AgentUpdateRequest, options?: RequestOptions): Promise<Agent>;

  /**
   * Delete an agent.
   * (Doc-comment will be copied 1:1 from source)
   */
  delete(agentId: string, options?: RequestOptions): Promise<DeleteResult>;
}

/**
 * Threads resource group.
 * (Doc-comment will be copied 1:1 from source)
 */
export interface ThreadsResource {
  create(request?: ThreadCreateRequest, options?: RequestOptions): Promise<Thread>;
  retrieve(threadId: string, options?: RequestOptions): Promise<Thread>;
  list(query?: ThreadListQuery, options?: RequestOptions): Promise<Paginated<Thread>>;
  update(threadId: string, request: ThreadUpdateRequest, options?: RequestOptions): Promise<Thread>;
  delete(threadId: string, options?: RequestOptions): Promise<DeleteResult>;

  messages: ThreadMessagesResource;
}

/**
 * Thread messages subgroup.
 * (Doc-comment will be copied 1:1 from source)
 */
export interface ThreadMessagesResource {
  create(threadId: string, request: MessageCreateRequest, options?: RequestOptions): Promise<Message>;
  retrieve(threadId: string, messageId: string, options?: RequestOptions): Promise<Message>;
  list(threadId: string, query?: MessageListQuery, options?: RequestOptions): Promise<Paginated<Message>>;
  delete(threadId: string, messageId: string, options?: RequestOptions): Promise<DeleteResult>;
}

/**
 * Runs resource group.
 * (Doc-comment will be copied 1:1 from source)
 */
export interface RunsResource {
  create(threadId: string, request: RunCreateRequest, options?: RequestOptions): Promise<Run>;
  retrieve(threadId: string, runId: string, options?: RequestOptions): Promise<Run>;
  list(threadId: string, query?: RunListQuery, options?: RequestOptions): Promise<Paginated<Run>>;
  cancel(threadId: string, runId: string, options?: RequestOptions): Promise<Run>;

  steps: RunStepsResource;
}

/**
 * Run steps subgroup.
 * (Doc-comment will be copied 1:1 from source)
 */
export interface RunStepsResource {
  retrieve(threadId: string, runId: string, stepId: string, options?: RequestOptions): Promise<RunStep>;
  list(threadId: string, runId: string, query?: RunStepListQuery, options?: RequestOptions): Promise<Paginated<RunStep>>;
}

/**
 * Files resource group.
 * (Doc-comment will be copied 1:1 from source)
 */
export interface FilesResource {
  create(request: FileCreateRequest, options?: RequestOptions): Promise<FileObject>;
  retrieve(fileId: string, options?: RequestOptions): Promise<FileObject>;
  list(query?: FileListQuery, options?: RequestOptions): Promise<Paginated<FileObject>>;
  delete(fileId: string, options?: RequestOptions): Promise<DeleteResult>;
  content(fileId: string, options?: RequestOptions): Promise<Blob | ArrayBuffer | string>;
}

/**
 * Tools resource group.
 * (Doc-comment will be copied 1:1 from source)
 */
export interface ToolsResource {
  list(options?: RequestOptions): Promise<ToolDefinition[]>;
}

/**
 * Models resource group.
 * (Doc-comment will be copied 1:1 from source)
 */
export interface ModelsResource {
  list(options?: RequestOptions): Promise<Paginated<Model>>;
  retrieve(modelId: string, options?: RequestOptions): Promise<Model>;
}

/* =====================================================================================
 * Shared request/response plumbing
 * ===================================================================================== */

export interface RequestOptions {
  /**
   * Override headers for a single request.
   */
  headers?: Record<string, string>;

  /**
   * Abort signal.
   */
  signal?: AbortSignal;

  /**
   * Override timeout in milliseconds.
   */
  timeoutMs?: number;

  /**
   * Idempotency key (if supported).
   */
  idempotencyKey?: string;
}

export interface Paginated<T> {
  data: T[];
  has_more?: boolean;
  next_cursor?: string | null;
  prev_cursor?: string | null;
}

export interface DeleteResult {
  id?: string;
  deleted: boolean;
}

/* =====================================================================================
 * Core domain objects (these will be replaced with the exact shapes from src/)
 * ===================================================================================== */

export interface Agent {
  id: string;
  object?: "agent" | string;
  name?: string;
  description?: string;
  created_at?: number;
  updated_at?: number;
  metadata?: Record<string, unknown>;
  // ...filled from source
}

export interface Thread {
  id: string;
  object?: "thread" | string;
  created_at?: number;
  metadata?: Record<string, unknown>;
  // ...filled from source
}

export interface Message {
  id: string;
  object?: "message" | string;
  thread_id?: string;
  role: "user" | "assistant" | string;
  content: MessageContent;
  created_at?: number;
  metadata?: Record<string, unknown>;
  // ...filled from source
}

export type MessageContent =
  | string
  | Array<MessageContentPart>;

export type MessageContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: string; [k: string]: unknown };

export interface Run {
  id: string;
  object?: "run" | string;
  thread_id?: string;
  agent_id?: string;
  status?: "queued" | "in_progress" | "completed" | "failed" | "cancelled" | string;
  created_at?: number;
  started_at?: number | null;
  completed_at?: number | null;
  last_error?: { code?: string; message?: string } | null;
  // ...filled from source
}

export interface RunStep {
  id: string;
  object?: "run_step" | string;
  run_id?: string;
  thread_id?: string;
  type?: string;
  status?: string;
  created_at?: number;
  // ...filled from source
}

export interface FileObject {
  id: string;
  object?: "file" | string;
  filename?: string;
  bytes?: number;
  created_at?: number;
  purpose?: string;
  // ...filled from source
}

export interface ToolDefinition {
  name: string;
  description?: string;
  parameters?: unknown;
  // ...filled from source
}

export interface Model {
  id: string;
  object?: "model" | string;
  created?: number;
  owned_by?: string;
  // ...filled from source
}

/* =====================================================================================
 * Request DTOs / Query params (placeholders to be replaced exactly from src/)
 * ===================================================================================== */

export interface AgentCreateRequest {
  name?: string;
  description?: string;
  instructions?: string;
  model?: string;
  tools?: ToolDefinition[] | string[];
  metadata?: Record<string, unknown>;
  // ...filled from source
}

export interface AgentUpdateRequest extends Partial<AgentCreateRequest> {}

export interface AgentListQuery {
  limit?: number;
  cursor?: string;
}

export interface ThreadCreateRequest {
  metadata?: Record<string, unknown>;
  // ...filled from source
}

export interface ThreadUpdateRequest {
  metadata?: Record<string, unknown>;
  // ...filled from source
}

export interface ThreadListQuery {
  limit?: number;
  cursor?: string;
}

export interface MessageCreateRequest {
  role: "user" | "assistant" | string;
  content: MessageContent;
  metadata?: Record<string, unknown>;
  // ...filled from source
}

export interface MessageListQuery {
  limit?: number;
  cursor?: string;
}

export interface RunCreateRequest {
  agent_id?: string;
  model?: string;
  instructions?: string;
  metadata?: Record<string, unknown>;
  // ...filled from source
}

export interface RunListQuery {
  limit?: number;
  cursor?: string;
}

export interface RunStepListQuery {
  limit?: number;
  cursor?: string;
}

export interface FileCreateRequest {
  file: Blob | File | ArrayBuffer | Uint8Array;
  filename?: string;
  purpose?: string;
  // ...filled from source
}

export interface FileListQuery {
  limit?: number;
  cursor?: string;
  purpose?: string;
}

/* =====================================================================================
 * Errors (to be replaced exactly from src/)
 * ===================================================================================== */

export declare class ParallelError extends Error {
  name: "ParallelError";
  status?: number;
  code?: string;
  requestId?: string;
  details?: unknown;
}

export declare class ParallelAPIError extends ParallelError {
  name: "ParallelAPIError";
}

/* =====================================================================================
 * Convenience exports (if present in src/)
 * ===================================================================================== */

// export declare function createClient(config?: ParallelClientConfig): ParallelClient;
// export * from "./types"; // (flattened during generation)
```

---

## Next step
Paste the contents of `src/index.ts` first (and any re-exported modules it references). After I see the actual structure, I’ll produce the real single `.d.ts` with:

- the exact exported names
- exact method signatures
- exact request/response types
- exact literal unions
- doc-comments copied **verbatim** (1:1)

If you’d like, also tell me: do you want the `.d.ts` to reflect **only public exports** (recommended), or **everything in src** even if not exported?