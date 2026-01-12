```ts
// parallel-sdk.d.ts
// Summarized public API surface for the provided SDK source tree.
//
// Notes:
// - This file is intended as a compact "footprint" for an LLM.
// - Doc-comments are copied 1:1 where they exist in the source you provided.
// - Internal modules are not included (they are not importable outside the package).
// - Deprecated top-level re-exports are included with their original doc-comments.
//
// Module structure mirrors the package entrypoints.

declare module 'parallel-sdk' {
  export { Parallel as default } from 'parallel-sdk/client';

  export { type Uploadable, toFile, type ToFileInput } from 'parallel-sdk/core/uploads';
  export { APIPromise } from 'parallel-sdk/core/api-promise';

  export { Parallel, type ClientOptions } from 'parallel-sdk/client';

  export {
    ParallelError,
    APIError,
    APIConnectionError,
    APIConnectionTimeoutError,
    APIUserAbortError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    BadRequestError,
    AuthenticationError,
    InternalServerError,
    PermissionDeniedError,
    UnprocessableEntityError,
  } from 'parallel-sdk/core/error';

  export * from 'parallel-sdk/resources';
}

declare module 'parallel-sdk/version' {
  export const VERSION: '0.2.4';
}

declare module 'parallel-sdk/resources' {
  export * from 'parallel-sdk/resources/index';
}

/** @deprecated Import from ./core/error instead */
declare module 'parallel-sdk/error' {
  export * from 'parallel-sdk/core/error';
}

/** @deprecated Import from ./core/uploads instead */
declare module 'parallel-sdk/uploads' {
  export * from 'parallel-sdk/core/uploads';
}

/** @deprecated Import from ./core/resource instead */
declare module 'parallel-sdk/resource' {
  export * from 'parallel-sdk/core/resource';
}

/** @deprecated Import from ./core/streaming instead */
declare module 'parallel-sdk/streaming' {
  export * from 'parallel-sdk/core/streaming';
}

/** @deprecated Import from ./core/api-promise instead */
declare module 'parallel-sdk/api-promise' {
  export * from 'parallel-sdk/core/api-promise';
}

// -------------------------
// core
// -------------------------

declare module 'parallel-sdk/core/resource' {
  import type { Parallel } from 'parallel-sdk/client';

  export abstract class APIResource {
    protected _client: Parallel;
    constructor(client: Parallel);
  }
}

declare module 'parallel-sdk/core/error' {
  export class ParallelError extends Error {}

  export class APIError<
    TStatus extends number | undefined = number | undefined,
    THeaders extends Headers | undefined = Headers | undefined,
    TError extends Object | undefined = Object | undefined,
  > extends ParallelError {
    /** HTTP status for the response that caused the error */
    readonly status: TStatus;
    /** HTTP headers for the response that caused the error */
    readonly headers: THeaders;
    /** JSON body of the response that caused the error */
    readonly error: TError;

    constructor(status: TStatus, error: TError, message: string | undefined, headers: THeaders);

    static generate(
      status: number | undefined,
      errorResponse: Object | undefined,
      message: string | undefined,
      headers: Headers | undefined,
    ): APIError;
  }

  export class APIUserAbortError extends APIError<undefined, undefined, undefined> {
    constructor({ message }?: { message?: string });
  }

  export class APIConnectionError extends APIError<undefined, undefined, undefined> {
    constructor({ message, cause }: { message?: string | undefined; cause?: Error | undefined });
  }

  export class APIConnectionTimeoutError extends APIConnectionError {
    constructor({ message }?: { message?: string });
  }

  export class BadRequestError extends APIError<400, Headers> {}
  export class AuthenticationError extends APIError<401, Headers> {}
  export class PermissionDeniedError extends APIError<403, Headers> {}
  export class NotFoundError extends APIError<404, Headers> {}
  export class ConflictError extends APIError<409, Headers> {}
  export class UnprocessableEntityError extends APIError<422, Headers> {}
  export class RateLimitError extends APIError<429, Headers> {}
  export class InternalServerError extends APIError<number, Headers> {}
}

declare module 'parallel-sdk/core/api-promise' {
  import type { Parallel } from 'parallel-sdk/client';

  /**
   * A subclass of `Promise` providing additional helper methods
   * for interacting with the SDK.
   */
  export class APIPromise<T> extends Promise<T> {
    /**
     * Gets the raw `Response` instance instead of parsing the response
     * data.
     *
     * If you want to parse the response body but still get the `Response`
     * instance, you can use {@link withResponse()}.
     *
     * 👋 Getting the wrong TypeScript type for `Response`?
     * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
     * to your `tsconfig.json`.
     */
    asResponse(): Promise<Response>;

    /**
     * Gets the parsed response data and the raw `Response` instance.
     *
     * If you just want to get the raw `Response` instance without parsing it,
     * you can use {@link asResponse()}.
     *
     * 👋 Getting the wrong TypeScript type for `Response`?
     * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
     * to your `tsconfig.json`.
     */
    withResponse(): Promise<{ data: T; response: Response }>;
  }
}

declare module 'parallel-sdk/core/streaming' {
  import type { Parallel } from 'parallel-sdk/client';

  export type ServerSentEvent = {
    event: string | null;
    data: string;
    raw: string[];
  };

  export class Stream<Item> implements AsyncIterable<Item> {
    controller: AbortController;

    constructor(iterator: () => AsyncIterator<Item>, controller: AbortController, client?: Parallel);

    static fromSSEResponse<Item>(response: Response, controller: AbortController, client?: Parallel): Stream<Item>;

    /**
     * Generates a Stream from a newline-separated ReadableStream
     * where each item is a JSON value.
     */
    static fromReadableStream<Item>(
      readableStream: ReadableStream,
      controller: AbortController,
      client?: Parallel,
    ): Stream<Item>;

    [Symbol.asyncIterator](): AsyncIterator<Item>;

    /**
     * Splits the stream into two streams which can be
     * independently read from at different speeds.
     */
    tee(): [Stream<Item>, Stream<Item>];

    /**
     * Converts this stream to a newline-separated ReadableStream of
     * JSON stringified values in the stream
     * which can be turned back into a Stream with `Stream.fromReadableStream()`.
     */
    toReadableStream(): ReadableStream;
  }

  export function _iterSSEMessages(
    response: Response,
    controller: AbortController,
  ): AsyncGenerator<ServerSentEvent, void, unknown>;
}

declare module 'parallel-sdk/core/uploads' {
  export { type Uploadable } from 'parallel-sdk/internal/uploads';
  export { toFile, type ToFileInput } from 'parallel-sdk/internal/to-file';
}

// -------------------------
// client
// -------------------------

declare module 'parallel-sdk/client' {
  import type { MergedRequestInit } from 'parallel-sdk/internal/types';
  import type { Fetch } from 'parallel-sdk/internal/builtin-types';
  import type { HeadersLike } from 'parallel-sdk/internal/headers';
  import * as Opts from 'parallel-sdk/internal/request-options';

  import * as Errors from 'parallel-sdk/core/error';
  import * as Uploads from 'parallel-sdk/core/uploads';

  import * as API from 'parallel-sdk/resources/index';

  import type {
    AutoSchema,
    Citation,
    FieldBasis,
    JsonSchema,
    RunInput,
    TaskRun,
    TaskRunCreateParams,
    TaskRunJsonOutput,
    TaskRunResult,
    TaskRunResultParams,
    TaskRunTextOutput,
    TaskSpec,
    TextSchema,
  } from 'parallel-sdk/resources/task-run';

  import { Beta } from 'parallel-sdk/resources/beta/beta';

  export type { Logger, LogLevel } from 'parallel-sdk/internal/utils/log';

  export interface ClientOptions {
    /**
     * Defaults to process.env['PARALLEL_API_KEY'].
     */
    apiKey?: string | undefined;

    /**
     * Override the default base URL for the API, e.g., "https://api.example.com/v2/"
     *
     * Defaults to process.env['PARALLEL_BASE_URL'].
     */
    baseURL?: string | null | undefined;

    /**
     * The maximum amount of time (in milliseconds) that the client should wait for a response
     * from the server before timing out a single request.
     *
     * Note that request timeouts are retried by default, so in a worst-case scenario you may wait
     * much longer than this timeout before the promise succeeds or fails.
     *
     * @unit milliseconds
     */
    timeout?: number | undefined;

    /**
     * Additional `RequestInit` options to be passed to `fetch` calls.
     * Properties will be overridden by per-request `fetchOptions`.
     */
    fetchOptions?: MergedRequestInit | undefined;

    /**
     * Specify a custom `fetch` function implementation.
     *
     * If not provided, we expect that `fetch` is defined globally.
     */
    fetch?: Fetch | undefined;

    /**
     * The maximum number of times that the client will retry a request in case of a
     * temporary failure, like a network error or a 5XX error from the server.
     *
     * @default 2
     */
    maxRetries?: number | undefined;

    /**
     * Default headers to include with every request to the API.
     *
     * These can be removed in individual requests by explicitly setting the
     * header to `null` in request options.
     */
    defaultHeaders?: HeadersLike | undefined;

    /**
     * Default query parameters to include with every request to the API.
     *
     * These can be removed in individual requests by explicitly setting the
     * param to `undefined` in request options.
     */
    defaultQuery?: Record<string, string | undefined> | undefined;

    /**
     * Set the log level.
     *
     * Defaults to process.env['PARALLEL_LOG'] or 'warn' if it isn't set.
     */
    logLevel?: import('parallel-sdk/internal/utils/log').LogLevel | undefined;

    /**
     * Set the logger.
     *
     * Defaults to globalThis.console.
     */
    logger?: import('parallel-sdk/internal/utils/log').Logger | undefined;
  }

  /**
   * API Client for interfacing with the Parallel API.
   */
  export class Parallel {
    apiKey: string;
    baseURL: string;
    maxRetries: number;
    timeout: number;
    logger: import('parallel-sdk/internal/utils/log').Logger | undefined;
    logLevel: import('parallel-sdk/internal/utils/log').LogLevel | undefined;
    fetchOptions: MergedRequestInit | undefined;

    /**
     * API Client for interfacing with the Parallel API.
     *
     * @param {string | undefined} [opts.apiKey=process.env['PARALLEL_API_KEY'] ?? undefined]
     * @param {string} [opts.baseURL=process.env['PARALLEL_BASE_URL'] ?? https://api.parallel.ai] - Override the default base URL for the API.
     * @param {number} [opts.timeout=1 minute] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
     * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
     * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
     * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
     * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
     * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
     */
    constructor(opts?: ClientOptions);

    /**
     * Create a new client instance re-using the same options given to the current client with optional overriding.
     */
    withOptions(options: Partial<ClientOptions>): this;

    get<Rsp>(path: string, opts?: Opts.RequestOptions | Promise<Opts.RequestOptions>): import('parallel-sdk/core/api-promise').APIPromise<Rsp>;
    post<Rsp>(path: string, opts?: Opts.RequestOptions | Promise<Opts.RequestOptions>): import('parallel-sdk/core/api-promise').APIPromise<Rsp>;
    patch<Rsp>(path: string, opts?: Opts.RequestOptions | Promise<Opts.RequestOptions>): import('parallel-sdk/core/api-promise').APIPromise<Rsp>;
    put<Rsp>(path: string, opts?: Opts.RequestOptions | Promise<Opts.RequestOptions>): import('parallel-sdk/core/api-promise').APIPromise<Rsp>;
    delete<Rsp>(path: string, opts?: Opts.RequestOptions | Promise<Opts.RequestOptions>): import('parallel-sdk/core/api-promise').APIPromise<Rsp>;

    request<Rsp>(
      options: Opts.FinalRequestOptions | Promise<Opts.FinalRequestOptions>,
      remainingRetries?: number | null,
    ): import('parallel-sdk/core/api-promise').APIPromise<Rsp>;

    static Parallel: typeof Parallel;
    static DEFAULT_TIMEOUT: number;

    static ParallelError: typeof Errors.ParallelError;
    static APIError: typeof Errors.APIError;
    static APIConnectionError: typeof Errors.APIConnectionError;
    static APIConnectionTimeoutError: typeof Errors.APIConnectionTimeoutError;
    static APIUserAbortError: typeof Errors.APIUserAbortError;
    static NotFoundError: typeof Errors.NotFoundError;
    static ConflictError: typeof Errors.ConflictError;
    static RateLimitError: typeof Errors.RateLimitError;
    static BadRequestError: typeof Errors.BadRequestError;
    static AuthenticationError: typeof Errors.AuthenticationError;
    static InternalServerError: typeof Errors.InternalServerError;
    static PermissionDeniedError: typeof Errors.PermissionDeniedError;
    static UnprocessableEntityError: typeof Errors.UnprocessableEntityError;

    static toFile: typeof Uploads.toFile;

    taskRun: API.TaskRun;
    beta: API.Beta;
  }

  export declare namespace Parallel {
    export type RequestOptions = Opts.RequestOptions;

    export {
      type TaskRun,
      type AutoSchema,
      type Citation,
      type FieldBasis,
      type JsonSchema,
      type RunInput,
      type TaskRunJsonOutput,
      type TaskRunResult,
      type TaskRunTextOutput,
      type TaskSpec,
      type TextSchema,
      type TaskRunCreateParams,
      type TaskRunResultParams,
    };

    export { Beta };

    export type ErrorObject = API.ErrorObject;
    export type ErrorResponse = API.ErrorResponse;
    export type SourcePolicy = API.SourcePolicy;
    export type Warning = API.Warning;
  }

  export namespace Parallel {
    export import Beta = Beta;
  }
}

// -------------------------
// request options / helpers (publicly referenced types)
// -------------------------

declare module 'parallel-sdk/internal/request-options' {
  import type { Stream } from 'parallel-sdk/core/streaming';
  import type { HeadersLike } from 'parallel-sdk/internal/headers';
  import type { HTTPMethod, MergedRequestInit } from 'parallel-sdk/internal/types';

  export type FinalRequestOptions = RequestOptions & { method: HTTPMethod; path: string };

  export type RequestOptions = {
    /**
     * The HTTP method for the request (e.g., 'get', 'post', 'put', 'delete').
     */
    method?: HTTPMethod;

    /**
     * The URL path for the request.
     *
     * @example "/v1/foo"
     */
    path?: string;

    /**
     * Query parameters to include in the request URL.
     */
    query?: object | undefined | null;

    /**
     * The request body. Can be a string, JSON object, FormData, or other supported types.
     */
    body?: unknown;

    /**
     * HTTP headers to include with the request. Can be a Headers object, plain object, or array of tuples.
     */
    headers?: HeadersLike;

    /**
     * The maximum number of times that the client will retry a request in case of a
     * temporary failure, like a network error or a 5XX error from the server.
     *
     * @default 2
     */
    maxRetries?: number;

    stream?: boolean | undefined;

    /**
     * The maximum amount of time (in milliseconds) that the client should wait for a response
     * from the server before timing out a single request.
     *
     * @unit milliseconds
     */
    timeout?: number;

    /**
     * Additional `RequestInit` options to be passed to the underlying `fetch` call.
     * These options will be merged with the client's default fetch options.
     */
    fetchOptions?: MergedRequestInit;

    /**
     * An AbortSignal that can be used to cancel the request.
     */
    signal?: AbortSignal | undefined | null;

    /**
     * A unique key for this request to enable idempotency.
     */
    idempotencyKey?: string;

    /**
     * Override the default base URL for this specific request.
     */
    defaultBaseURL?: string | undefined;

    __binaryResponse?: boolean | undefined;
    __streamClass?: typeof Stream;
  };
}

declare module 'parallel-sdk/internal/headers' {
  type HeaderValue = string | undefined | null;

  export type HeadersLike =
    | Headers
    | readonly HeaderValue[][]
    | Record<string, HeaderValue | readonly HeaderValue[]>
    | undefined
    | null
    | NullableHeaders;

  /**
   * @internal
   * Users can pass explicit nulls to unset default headers. When we parse them
   * into a standard headers type we need to preserve that information.
   */
  export type NullableHeaders = {
    /** Brand check, prevent users from creating a NullableHeaders. */
    readonly [brand_privateNullableHeaders]: true;
    /** Parsed headers. */
    values: Headers;
    /** Set of lowercase header names explicitly set to null. */
    nulls: Set<string>;
  };

  const brand_privateNullableHeaders: unique symbol;

  export const buildHeaders: (newHeaders: HeadersLike[]) => NullableHeaders;
  export const isEmptyHeaders: (headers: HeadersLike) => boolean;
}

declare module 'parallel-sdk/internal/types' {
  export type PromiseOrValue<T> = T | Promise<T>;
  export type HTTPMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

  export type KeysEnum<T> = { [P in keyof Required<T>]: true };

  export type FinalizedRequestInit = RequestInit & { headers: Headers };

  /**
   * This type contains `RequestInit` options that may be available on the current runtime,
   * including per-platform extensions like `dispatcher`, `agent`, `client`, etc.
   */
  export type MergedRequestInit = any;
}

declare module 'parallel-sdk/internal/builtin-types' {
  export type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

  export type RequestInit = globalThis.RequestInit;
  export type RequestInfo = globalThis.RequestInfo;
  export type Response = globalThis.Response;
  export type BodyInit = globalThis.RequestInit['body'];

  export interface BlobPropertyBag {
    endings?: 'native' | 'transparent';
    type?: string;
  }

  export interface FilePropertyBag extends BlobPropertyBag {
    lastModified?: number;
  }
}

declare module 'parallel-sdk/internal/utils/log' {
  type LogFn = (message: string, ...rest: unknown[]) => void;

  export type Logger = {
    error: LogFn;
    warn: LogFn;
    info: LogFn;
    debug: LogFn;
  };

  export type LogLevel = 'off' | 'error' | 'warn' | 'info' | 'debug';
}

// -------------------------
// uploads helpers (public types via core/uploads)
// -------------------------

declare module 'parallel-sdk/internal/uploads' {
  export type BlobPart = string | ArrayBuffer | ArrayBufferView | Blob | DataView;

  /**
   * Typically, this is a native "File" class.
   *
   * We provide the {@link toFile} utility to convert a variety of objects
   * into the File class.
   *
   * For convenience, you can also pass a fetch Response, or in Node,
   * the result of fs.createReadStream().
   */
  export type Uploadable = File | Response | (AsyncIterable<Uint8Array> & { path: string | { toString(): string } }) | (Blob & { readonly name?: string | undefined });

  export const checkFileSupport: () => void;

  export function makeFile(fileBits: BlobPart[], fileName: string | undefined, options?: import('parallel-sdk/internal/builtin-types').FilePropertyBag): File;
  export function getName(value: any): string | undefined;
}

declare module 'parallel-sdk/internal/to-file' {
  import type { FilePropertyBag } from 'parallel-sdk/internal/builtin-types';

  /**
   * Intended to match DOM Response, node-fetch Response, undici Response, etc.
   */
  export interface ResponseLike {
    url: string;
    blob(): Promise<any>;
  }

  export type ToFileInput =
    | (Blob & { readonly name?: string | undefined; readonly lastModified?: number; arrayBuffer?(): Promise<ArrayBuffer> })
    | ResponseLike
    | Exclude<string | ArrayBuffer | ArrayBufferView | Blob | DataView, string>
    | AsyncIterable<string | ArrayBuffer | ArrayBufferView | Blob | DataView>;

  /**
   * Helper for creating a {@link File} to pass to an SDK upload method from a variety of different data formats
   * @param value the raw content of the file. Can be an {@link Uploadable}, BlobLikePart, or AsyncIterable of BlobLikeParts
   * @param {string=} name the name of the file. If omitted, toFile will try to determine a file name from bits if possible
   * @param {Object=} options additional properties
   * @param {string=} options.type the MIME type of the content
   * @param {number=} options.lastModified the last modified timestamp
   * @returns a {@link File} with the given properties
   */
  export function toFile(
    value: ToFileInput | PromiseLike<ToFileInput>,
    name?: string | null | undefined,
    options?: FilePropertyBag | undefined,
  ): Promise<File>;
}

// -------------------------
// resources (public API endpoints + data models)
// -------------------------

declare module 'parallel-sdk/resources/index' {
  export * from 'parallel-sdk/resources/shared';
  export { Beta } from 'parallel-sdk/resources/beta/beta';

  export {
    TaskRun,
    type AutoSchema,
    type Citation,
    type FieldBasis,
    type JsonSchema,
    type RunInput,
    type TaskRunJsonOutput,
    type TaskRunResult,
    type TaskRunTextOutput,
    type TaskSpec,
    type TextSchema,
    type TaskRunCreateParams,
    type TaskRunResultParams,
  } from 'parallel-sdk/resources/task-run';
}

declare module 'parallel-sdk/resources/shared' {
  /**
   * An error message.
   */
  export interface ErrorObject {
    /**
     * Human-readable message.
     */
    message: string;

    /**
     * Reference ID for the error.
     */
    ref_id: string;

    /**
     * Optional detail supporting the error.
     */
    detail?: { [key: string]: unknown } | null;
  }

  /**
   * Response object used for non-200 status codes.
   */
  export interface ErrorResponse {
    /**
     * An error message.
     */
    error: ErrorObject;

    /**
     * Always 'error'.
     */
    type: 'error';
  }

  /**
   * Source policy for web search results.
   *
   * This policy governs which sources are allowed/disallowed in results.
   */
  export interface SourcePolicy {
    /**
     * List of domains to exclude from results. If specified, sources from these
     * domains will be excluded. Accepts plain domains (e.g., example.com,
     * subdomain.example.gov) or bare domain extension starting with a period (e.g.,
     * .gov, .edu, .co.uk).
     */
    exclude_domains?: Array<string>;

    /**
     * List of domains to restrict the results to. If specified, only sources from
     * these domains will be included. Accepts plain domains (e.g., example.com,
     * subdomain.example.gov) or bare domain extension starting with a period (e.g.,
     * .gov, .edu, .co.uk).
     */
    include_domains?: Array<string>;
  }

  /**
   * Human-readable message for a task.
   */
  export interface Warning {
    /**
     * Human-readable message.
     */
    message: string;

    /**
     * Type of warning. Note that adding new warning types is considered a
     * backward-compatible change.
     */
    type: 'spec_validation_warning' | 'input_validation_warning' | 'warning';

    /**
     * Optional detail supporting the warning.
     */
    detail?: { [key: string]: unknown } | null;
  }
}

declare module 'parallel-sdk/resources/task-run' {
  import type { APIResource } from 'parallel-sdk/core/resource';
  import type * as Shared from 'parallel-sdk/resources/shared';
  import type { APIPromise } from 'parallel-sdk/core/api-promise';
  import type { RequestOptions } from 'parallel-sdk/internal/request-options';

  export class TaskRun extends (APIResource as { new (...args: any[]): any }) {
    /**
     * Initiates a task run.
     *
     * Returns immediately with a run object in status 'queued'.
     *
     * Beta features can be enabled by setting the 'parallel-beta' header.
     */
    create(body: TaskRunCreateParams, options?: RequestOptions): APIPromise<TaskRun>;

    /**
     * Retrieves run status by run_id.
     *
     * The run result is available from the `/result` endpoint.
     */
    retrieve(runID: string, options?: RequestOptions): APIPromise<TaskRun>;

    /**
     * Retrieves a run result by run_id, blocking until the run is completed.
     */
    result(
      runID: string,
      query?: TaskRunResultParams | null | undefined,
      options?: RequestOptions,
    ): APIPromise<TaskRunResult>;
  }

  /**
   * Auto schema for a task input or output.
   */
  export interface AutoSchema {
    /**
     * The type of schema being defined. Always `auto`.
     */
    type?: 'auto';
  }

  /**
   * A citation for a task output.
   */
  export interface Citation {
    /**
     * URL of the citation.
     */
    url: string;

    /**
     * Excerpts from the citation supporting the output. Only certain processors
     * provide excerpts.
     */
    excerpts?: Array<string> | null;

    /**
     * Title of the citation.
     */
    title?: string | null;
  }

  /**
   * Citations and reasoning supporting one field of a task output.
   */
  export interface FieldBasis {
    /**
     * Name of the output field.
     */
    field: string;

    /**
     * Reasoning for the output field.
     */
    reasoning: string;

    /**
     * List of citations supporting the output field.
     */
    citations?: Array<Citation>;

    /**
     * Confidence level for the output field. Only certain processors provide
     * confidence levels.
     */
    confidence?: string | null;
  }

  /**
   * JSON schema for a task input or output.
   */
  export interface JsonSchema {
    /**
     * A JSON Schema object. Only a subset of JSON Schema is supported.
     */
    json_schema: { [key: string]: unknown };

    /**
     * The type of schema being defined. Always `json`.
     */
    type?: 'json';
  }

  /**
   * Request to run a task.
   */
  export interface RunInput {
    /**
     * Input to the task, either text or a JSON object.
     */
    input: string | { [key: string]: unknown };

    /**
     * Processor to use for the task.
     */
    processor: string;

    /**
     * User-provided metadata stored with the run. Keys and values must be strings with
     * a maximum length of 16 and 512 characters respectively.
     */
    metadata?: { [key: string]: string | number | boolean } | null;

    /**
     * Source policy for web search results.
     *
     * This policy governs which sources are allowed/disallowed in results.
     */
    source_policy?: Shared.SourcePolicy | null;

    /**
     * Specification for a task.
     *
     * Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
     * Not specifying a TaskSpec is the same as setting an auto output schema.
     *
     * For convenience bare strings are also accepted as input or output schemas.
     */
    task_spec?: TaskSpec | null;
  }

  /**
   * Status of a task run.
   */
  export interface TaskRun {
    /**
     * Timestamp of the creation of the task, as an RFC 3339 string.
     */
    created_at: string | null;

    /**
     * Whether the run is currently active, i.e. status is one of {'cancelling',
     * 'queued', 'running'}.
     */
    is_active: boolean;

    /**
     * Timestamp of the last modification to the task, as an RFC 3339 string.
     */
    modified_at: string | null;

    /**
     * Processor used for the run.
     */
    processor: string;

    /**
     * ID of the task run.
     */
    run_id: string;

    /**
     * Status of the run.
     */
    status: 'queued' | 'action_required' | 'running' | 'completed' | 'failed' | 'cancelling' | 'cancelled';

    /**
     * An error message.
     */
    error?: Shared.ErrorObject | null;

    /**
     * User-provided metadata stored with the run.
     */
    metadata?: { [key: string]: string | number | boolean } | null;

    /**
     * ID of the taskgroup to which the run belongs.
     */
    taskgroup_id?: string | null;

    /**
     * Warnings for the run, if any.
     */
    warnings?: Array<Shared.Warning> | null;
  }

  /**
   * Output from a task that returns JSON.
   */
  export interface TaskRunJsonOutput {
    /**
     * Basis for each top-level field in the JSON output.
     */
    basis: Array<FieldBasis>;

    /**
     * Output from the task as a native JSON object, as determined by the output schema
     * of the task spec.
     */
    content: { [key: string]: unknown };

    /**
     * The type of output being returned, as determined by the output schema of the
     * task spec.
     */
    type: 'json';

    /**
     * Additional fields from beta features used in this task run. When beta features
     * are specified during both task run creation and result retrieval, this field
     * will be empty and instead the relevant beta attributes will be directly included
     * in the `BetaTaskRunJsonOutput` or corresponding output type. However, if beta
     * features were specified during task run creation but not during result
     * retrieval, this field will contain the dump of fields from those beta features.
     * Each key represents the beta feature version (one amongst parallel-beta headers)
     * and the values correspond to the beta feature attributes, if any. For now, only
     * MCP server beta features have attributes. For example,
     * `{mcp-server-2025-07-17: [{'server_name':'mcp_server', 'tool_call_id': 'tc_123', ...}]}}`
     */
    beta_fields?: { [key: string]: unknown } | null;

    /**
     * Output schema for the Task Run. Populated only if the task was executed with an
     * auto schema.
     */
    output_schema?: { [key: string]: unknown } | null;
  }

  /**
   * Result of a task run.
   */
  export interface TaskRunResult {
    /**
     * Output from the task conforming to the output schema.
     */
    output: TaskRunTextOutput | TaskRunJsonOutput;

    /**
     * Status of a task run.
     */
    run: TaskRun;
  }

  /**
   * Output from a task that returns text.
   */
  export interface TaskRunTextOutput {
    /**
     * Basis for the output. The basis has a single field 'output'.
     */
    basis: Array<FieldBasis>;

    /**
     * Text output from the task.
     */
    content: string;

    /**
     * The type of output being returned, as determined by the output schema of the
     * task spec.
     */
    type: 'text';

    /**
     * Additional fields from beta features used in this task run. When beta features
     * are specified during both task run creation and result retrieval, this field
     * will be empty and instead the relevant beta attributes will be directly included
     * in the `BetaTaskRunJsonOutput` or corresponding output type. However, if beta
     * features were specified during task run creation but not during result
     * retrieval, this field will contain the dump of fields from those beta features.
     * Each key represents the beta feature version (one amongst parallel-beta headers)
     * and the values correspond to the beta feature attributes, if any. For now, only
     * MCP server beta features have attributes. For example,
     * `{mcp-server-2025-07-17: [{'server_name':'mcp_server', 'tool_call_id': 'tc_123', ...}]}}`
     */
    beta_fields?: { [key: string]: unknown } | null;
  }

  /**
   * Specification for a task.
   *
   * Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
   * Not specifying a TaskSpec is the same as setting an auto output schema.
   *
   * For convenience bare strings are also accepted as input or output schemas.
   */
  export interface TaskSpec {
    /**
     * JSON schema or text fully describing the desired output from the task.
     * Descriptions of output fields will determine the form and content of the
     * response. A bare string is equivalent to a text schema with the same
     * description.
     */
    output_schema: JsonSchema | TextSchema | AutoSchema | string;

    /**
     * Optional JSON schema or text description of expected input to the task. A bare
     * string is equivalent to a text schema with the same description.
     */
    input_schema?: string | JsonSchema | TextSchema | null;
  }

  /**
   * Text description for a task input or output.
   */
  export interface TextSchema {
    /**
     * A text description of the desired output from the task.
     */
    description?: string | null;

    /**
     * The type of schema being defined. Always `text`.
     */
    type?: 'text';
  }

  export interface TaskRunCreateParams {
    /**
     * Input to the task, either text or a JSON object.
     */
    input: string | { [key: string]: unknown };

    /**
     * Processor to use for the task.
     */
    processor: string;

    /**
     * User-provided metadata stored with the run. Keys and values must be strings with
     * a maximum length of 16 and 512 characters respectively.
     */
    metadata?: { [key: string]: string | number | boolean } | null;

    /**
     * Source policy for web search results.
     *
     * This policy governs which sources are allowed/disallowed in results.
     */
    source_policy?: Shared.SourcePolicy | null;

    /**
     * Specification for a task.
     *
     * Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
     * Not specifying a TaskSpec is the same as setting an auto output schema.
     *
     * For convenience bare strings are also accepted as input or output schemas.
     */
    task_spec?: TaskSpec | null;
  }

  export interface TaskRunResultParams {
    timeout?: number;
  }
}

declare module 'parallel-sdk/resources/beta/beta' {
  import type { APIResource } from 'parallel-sdk/core/resource';
  import type * as Shared from 'parallel-sdk/resources/shared';
  import type { APIPromise } from 'parallel-sdk/core/api-promise';
  import type { RequestOptions } from 'parallel-sdk/internal/request-options';

  import * as FindallAPI from 'parallel-sdk/resources/beta/findall';
  import * as TaskGroupAPI from 'parallel-sdk/resources/beta/task-group';
  import * as TaskRunAPI from 'parallel-sdk/resources/beta/task-run';

  export class Beta extends (APIResource as { new (...args: any[]): any }) {
    taskRun: TaskRunAPI.TaskRun;
    taskGroup: TaskGroupAPI.TaskGroup;
    findall: FindallAPI.Findall;

    /**
     * Extracts relevant content from specific web URLs.
     *
     * To access this endpoint, pass the `parallel-beta` header with the value
     * `search-extract-2025-10-10`.
     */
    extract(params: BetaExtractParams, options?: RequestOptions): APIPromise<ExtractResponse>;

    /**
     * Searches the web.
     *
     * To access this endpoint, pass the `parallel-beta` header with the value
     * `search-extract-2025-10-10`.
     */
    search(params: BetaSearchParams, options?: RequestOptions): APIPromise<SearchResult>;
  }

  /**
   * Optional settings for returning relevant excerpts.
   */
  export interface ExcerptSettings {
    /**
     * Optional upper bound on the total number of characters to include per url.
     * Excerpts may contain fewer characters than this limit to maximize relevance and
     * token efficiency.
     */
    max_chars_per_result?: number | null;
  }

  /**
   * Extract error details.
   */
  export interface ExtractError {
    /**
     * Content returned for http client or server errors, if any.
     */
    content: string | null;

    /**
     * Error type.
     */
    error_type: string;

    /**
     * HTTP status code, if available.
     */
    http_status_code: number | null;

    url: string;
  }

  /**
   * Fetch result.
   */
  export interface ExtractResponse {
    /**
     * Extract errors: requested URLs not in the results.
     */
    errors: Array<ExtractError>;

    /**
     * Extract request ID, e.g. `extract_cad0a6d2dec046bd95ae900527d880e7`
     */
    extract_id: string;

    /**
     * Successful extract results.
     */
    results: Array<ExtractResult>;

    /**
     * Usage metrics for the extract request.
     */
    usage?: Array<UsageItem> | null;

    /**
     * Warnings for the extract request, if any.
     */
    warnings?: Array<Shared.Warning> | null;
  }

  /**
   * Extract result for a single URL.
   */
  export interface ExtractResult {
    /**
     * URL associated with the search result.
     */
    url: string;

    /**
     * Relevant excerpted content from the URL, formatted as markdown.
     */
    excerpts?: Array<string> | null;

    /**
     * Full content from the URL formatted as markdown, if requested.
     */
    full_content?: string | null;

    /**
     * Publish date of the webpage in YYYY-MM-DD format, if available.
     */
    publish_date?: string | null;

    /**
     * Title of the webpage, if available.
     */
    title?: string | null;
  }

  /**
   * Policy for live fetching web results.
   */
  export interface FetchPolicy {
    /**
     * If false, fallback to cached content older than max-age if live fetch fails or
     * times out. If true, returns an error instead.
     */
    disable_cache_fallback?: boolean;

    /**
     * Maximum age of cached content in seconds to trigger a live fetch. Minimum value
     * 600 seconds (10 minutes).
     */
    max_age_seconds?: number | null;

    /**
     * Timeout in seconds for fetching live content if unavailable in cache.
     */
    timeout_seconds?: number | null;
  }

  /**
   * Output for the Search API.
   */
  export interface SearchResult {
    /**
     * A list of WebSearchResult objects, ordered by decreasing relevance.
     */
    results: Array<WebSearchResult>;

    /**
     * Search ID. Example: `search_cad0a6d2dec046bd95ae900527d880e7`
     */
    search_id: string;

    /**
     * Usage metrics for the search request.
     */
    usage?: Array<UsageItem> | null;

    /**
     * Warnings for the search request, if any.
     */
    warnings?: Array<Shared.Warning> | null;
  }

  /**
   * Usage item for a single operation.
   */
  export interface UsageItem {
    /**
     * Count of the SKU.
     */
    count: number;

    /**
     * Name of the SKU.
     */
    name: string;
  }

  /**
   * A single search result from the web search API.
   */
  export interface WebSearchResult {
    /**
     * URL associated with the search result.
     */
    url: string;

    /**
     * Relevant excerpted content from the URL, formatted as markdown.
     */
    excerpts?: Array<string> | null;

    /**
     * Publish date of the webpage in YYYY-MM-DD format, if available.
     */
    publish_date?: string | null;

    /**
     * Title of the webpage, if available.
     */
    title?: string | null;
  }

  export interface BetaExtractParams {
    /**
     * Body param:
     */
    urls: Array<string>;

    /**
     * Body param: Include excerpts from each URL relevant to the search objective and
     * queries. Note that if neither objective nor search_queries is provided, excerpts
     * are redundant with full content.
     */
    excerpts?: boolean | ExcerptSettings;

    /**
     * Body param: Policy for live fetching web results.
     */
    fetch_policy?: FetchPolicy | null;

    /**
     * Body param: Include full content from each URL. Note that if neither objective
     * nor search_queries is provided, excerpts are redundant with full content.
     */
    full_content?: boolean | BetaExtractParams.FullContentSettings;

    /**
     * Body param: If provided, focuses extracted content on the specified search
     * objective.
     */
    objective?: string | null;

    /**
     * Body param: If provided, focuses extracted content on the specified keyword
     * search queries.
     */
    search_queries?: Array<string> | null;

    /**
     * Header param: Optional header to specify the beta version(s) to enable.
     */
    betas?: Array<import('parallel-sdk/resources/beta/task-run').ParallelBeta>;
  }

  export namespace BetaExtractParams {
    /**
     * Optional settings for returning full content.
     */
    export interface FullContentSettings {
      /**
       * Optional limit on the number of characters to include in the full content for
       * each url. Full content always starts at the beginning of the page and is
       * truncated at the limit if necessary.
       */
      max_chars_per_result?: number | null;
    }
  }

  export interface BetaSearchParams {
    /**
     * Body param: Optional settings for returning relevant excerpts.
     */
    excerpts?: ExcerptSettings;

    /**
     * Body param: Policy for live fetching web results.
     */
    fetch_policy?: FetchPolicy | null;

    /**
     * @deprecated Body param: DEPRECATED: Use `excerpts.max_chars_per_result` instead.
     */
    max_chars_per_result?: number | null;

    /**
     * Body param: Upper bound on the number of results to return. May be limited by
     * the processor. Defaults to 10 if not provided.
     */
    max_results?: number | null;

    /**
     * Body param: Presets default values for parameters for different use cases.
     * `one-shot` returns more comprehensive results and longer excerpts to answer
     * questions from a single response, while `agentic` returns more concise,
     * token-efficient results for use in an agentic loop.
     */
    mode?: 'one-shot' | 'agentic' | null;

    /**
     * Body param: Natural-language description of what the web search is trying to
     * find. May include guidance about preferred sources or freshness. At least one of
     * objective or search_queries must be provided.
     */
    objective?: string | null;

    /**
     * @deprecated Body param: DEPRECATED: use `mode` instead.
     */
    processor?: 'base' | 'pro' | null;

    /**
     * Body param: Optional list of traditional keyword search queries to guide the
     * search. May contain search operators. At least one of objective or
     * search_queries must be provided.
     */
    search_queries?: Array<string> | null;

    /**
     * Body param: Source policy for web search results.
     *
     * This policy governs which sources are allowed/disallowed in results.
     */
    source_policy?: Shared.SourcePolicy | null;

    /**
     * Header param: Optional header to specify the beta version(s) to enable.
     */
    betas?: Array<import('parallel-sdk/resources/beta/task-run').ParallelBeta>;
  }
}

declare module 'parallel-sdk/resources/beta/task-run' {
  import type { APIResource } from 'parallel-sdk/core/resource';
  import type * as Shared from 'parallel-sdk/resources/shared';
  import type * as TaskRunAPI from 'parallel-sdk/resources/task-run';
  import type { APIPromise } from 'parallel-sdk/core/api-promise';
  import type { Stream } from 'parallel-sdk/core/streaming';
  import type { RequestOptions } from 'parallel-sdk/internal/request-options';

  export class TaskRun extends (APIResource as { new (...args: any[]): any }) {
    /**
     * Initiates a task run.
     *
     * Returns immediately with a run object in status 'queued'.
     *
     * Beta features can be enabled by setting the 'parallel-beta' header.
     */
    create(params: TaskRunCreateParams, options?: RequestOptions): APIPromise<TaskRunAPI.TaskRun>;

    /**
     * Streams events for a task run.
     *
     * Returns a stream of events showing progress updates and state changes for the
     * task run.
     *
     * For task runs that did not have enable_events set to true during creation, the
     * frequency of events will be reduced.
     */
    events(runID: string, options?: RequestOptions): APIPromise<Stream<TaskRunEventsResponse>>;

    /**
     * Retrieves a run result by run_id, blocking until the run is completed.
     */
    result(
      runID: string,
      params?: TaskRunResultParams | null | undefined,
      options?: RequestOptions,
    ): APIPromise<BetaTaskRunResult>;
  }

  /**
   * Task run input with additional beta fields.
   */
  export interface BetaRunInput {
    /**
     * Input to the task, either text or a JSON object.
     */
    input: string | { [key: string]: unknown };

    /**
     * Processor to use for the task.
     */
    processor: string;

    /**
     * Controls tracking of task run execution progress. When set to true, progress
     * events are recorded and can be accessed via the
     * [Task Run events](https://platform.parallel.ai/api-reference) endpoint. When
     * false, no progress events are tracked. Note that progress tracking cannot be
     * enabled after a run has been created. The flag is set to true by default for
     * premium processors (pro and above). To enable this feature in your requests,
     * specify `events-sse-2025-07-24` as one of the values in `parallel-beta` header
     * (for API calls) or `betas` param (for the SDKs).
     */
    enable_events?: boolean | null;

    /**
     * Optional list of MCP servers to use for the run. To enable this feature in your
     * requests, specify `mcp-server-2025-07-17` as one of the values in
     * `parallel-beta` header (for API calls) or `betas` param (for the SDKs).
     */
    mcp_servers?: Array<McpServer> | null;

    /**
     * User-provided metadata stored with the run. Keys and values must be strings with
     * a maximum length of 16 and 512 characters respectively.
     */
    metadata?: { [key: string]: string | number | boolean } | null;

    /**
     * Source policy for web search results.
     *
     * This policy governs which sources are allowed/disallowed in results.
     */
    source_policy?: Shared.SourcePolicy | null;

    /**
     * Specification for a task.
     *
     * Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
     * Not specifying a TaskSpec is the same as setting an auto output schema.
     *
     * For convenience bare strings are also accepted as input or output schemas.
     */
    task_spec?: TaskRunAPI.TaskSpec | null;

    /**
     * Webhooks for Task Runs.
     */
    webhook?: Webhook | null;
  }

  /**
   * Result of a beta task run. Available only if beta headers are specified.
   */
  export interface BetaTaskRunResult {
    /**
     * Output from the task conforming to the output schema.
     */
    output: BetaTaskRunResult.BetaTaskRunTextOutput | BetaTaskRunResult.BetaTaskRunJsonOutput;

    /**
     * Status of a task run.
     */
    run: TaskRunAPI.TaskRun;
  }

  export namespace BetaTaskRunResult {
    /**
     * Output from a task that returns text.
     */
    export interface BetaTaskRunTextOutput {
      /**
       * Basis for the output.
       */
      basis: Array<TaskRunAPI.FieldBasis>;

      /**
       * Text output from the task.
       */
      content: string;

      /**
       * The type of output being returned, as determined by the output schema of the
       * task spec.
       */
      type: 'text';

      /**
       * Always None.
       */
      beta_fields?: { [key: string]: unknown } | null;

      /**
       * MCP tool calls made by the task.
       */
      mcp_tool_calls?: Array<McpToolCall> | null;
    }

    /**
     * Output from a task that returns JSON.
     */
    export interface BetaTaskRunJsonOutput {
      /**
       * Basis for the output.
       */
      basis: Array<TaskRunAPI.FieldBasis>;

      /**
       * Output from the task as a native JSON object, as determined by the output schema
       * of the task spec.
       */
      content: { [key: string]: unknown };

      /**
       * The type of output being returned, as determined by the output schema of the
       * task spec.
       */
      type: 'json';

      /**
       * Always None.
       */
      beta_fields?: { [key: string]: unknown } | null;

      /**
       * MCP tool calls made by the task.
       */
      mcp_tool_calls?: Array<McpToolCall> | null;

      /**
       * Output schema for the Task Run. Populated only if the task was executed with an
       * auto schema.
       */
      output_schema?: { [key: string]: unknown } | null;
    }
  }

  /**
   * Event indicating an error.
   */
  export interface ErrorEvent {
    /**
     * An error message.
     */
    error: Shared.ErrorObject;

    /**
     * Event type; always 'error'.
     */
    type: 'error';
  }

  /**
   * MCP server configuration.
   */
  export interface McpServer {
    /**
     * Name of the MCP server.
     */
    name: string;

    /**
     * URL of the MCP server.
     */
    url: string;

    /**
     * List of allowed tools for the MCP server.
     */
    allowed_tools?: Array<string> | null;

    /**
     * Headers for the MCP server.
     */
    headers?: { [key: string]: string } | null;

    /**
     * Type of MCP server being configured. Always `url`.
     */
    type?: 'url';
  }

  /**
   * Result of an MCP tool call.
   */
  export interface McpToolCall {
    /**
     * Arguments used to call the MCP tool.
     */
    arguments: string;

    /**
     * Name of the MCP server.
     */
    server_name: string;

    /**
     * Identifier for the tool call.
     */
    tool_call_id: string;

    /**
     * Name of the tool being called.
     */
    tool_name: string;

    /**
     * Output received from the tool call, if successful.
     */
    content?: string | null;

    /**
     * Error message if the tool call failed.
     */
    error?: string | null;
  }

  /**
   * Model for the parallel-beta header.
   */
  export type ParallelBeta =
    | 'mcp-server-2025-07-17'
    | 'events-sse-2025-07-24'
    | 'webhook-2025-08-12'
    | 'findall-2025-09-15'
    | 'search-extract-2025-10-10'
    | (string & {});

  /**
   * Event when a task run transitions to a non-active status.
   *
   * May indicate completion, cancellation, or failure.
   */
  export interface TaskRunEvent {
    /**
     * Cursor to resume the event stream. Always empty for non Task Group runs.
     */
    event_id: string | null;

    /**
     * Status of a task run.
     */
    run: TaskRunAPI.TaskRun;

    /**
     * Event type; always 'task_run.state'.
     */
    type: 'task_run.state';

    /**
     * Task run input with additional beta fields.
     */
    input?: BetaRunInput | null;

    /**
     * Output from the run; included only if requested and if status == `completed`.
     */
    output?: TaskRunAPI.TaskRunTextOutput | TaskRunAPI.TaskRunJsonOutput | null;
  }

  /**
   * Webhooks for Task Runs.
   */
  export interface Webhook {
    /**
     * URL for the webhook.
     */
    url: string;

    /**
     * Event types to send the webhook notifications for.
     */
    event_types?: Array<'task_run.status'>;
  }

  /**
   * A progress update for a task run.
   */
  export type TaskRunEventsResponse =
    | TaskRunEventsResponse.TaskRunProgressStatsEvent
    | TaskRunEventsResponse.TaskRunProgressMessageEvent
    | TaskRunEvent
    | ErrorEvent;

  export namespace TaskRunEventsResponse {
    /**
     * A progress update for a task run.
     */
    export interface TaskRunProgressStatsEvent {
      /**
       * Completion percentage of the task run. Ranges from 0 to 100 where 0 indicates no
       * progress and 100 indicates completion.
       */
      progress_meter: number;

      /**
       * Source stats for a task run.
       */
      source_stats: TaskRunProgressStatsEvent.SourceStats;

      /**
       * Event type; always 'task_run.progress_stats'.
       */
      type: 'task_run.progress_stats';
    }

    export namespace TaskRunProgressStatsEvent {
      /**
       * Source stats for a task run.
       */
      export interface SourceStats {
        /**
         * Number of sources considered in processing the task.
         */
        num_sources_considered: number | null;

        /**
         * Number of sources read in processing the task.
         */
        num_sources_read: number | null;

        /**
         * A sample of URLs of sources read in processing the task.
         */
        sources_read_sample: Array<string> | null;
      }
    }

    /**
     * A message for a task run progress update.
     */
    export interface TaskRunProgressMessageEvent {
      /**
       * Progress update message.
       */
      message: string;

      /**
       * Timestamp of the message.
       */
      timestamp: string | null;

      /**
       * Event type; always starts with 'task_run.progress_msg'.
       */
      type:
        | 'task_run.progress_msg.plan'
        | 'task_run.progress_msg.search'
        | 'task_run.progress_msg.result'
        | 'task_run.progress_msg.tool_call'
        | 'task_run.progress_msg.exec_status';
    }
  }

  export interface TaskRunCreateParams {
    /**
     * Body param: Input to the task, either text or a JSON object.
     */
    input: string | { [key: string]: unknown };

    /**
     * Body param: Processor to use for the task.
     */
    processor: string;

    /**
     * Body param: Controls tracking of task run execution progress. When set to true,
     * progress events are recorded and can be accessed via the
     * [Task Run events](https://platform.parallel.ai/api-reference) endpoint. When
     * false, no progress events are tracked. Note that progress tracking cannot be
     * enabled after a run has been created. The flag is set to true by default for
     * premium processors (pro and above). To enable this feature in your requests,
     * specify `events-sse-2025-07-24` as one of the values in `parallel-beta` header
     * (for API calls) or `betas` param (for the SDKs).
     */
    enable_events?: boolean | null;

    /**
     * Body param: Optional list of MCP servers to use for the run. To enable this
     * feature in your requests, specify `mcp-server-2025-07-17` as one of the values
     * in `parallel-beta` header (for API calls) or `betas` param (for the SDKs).
     */
    mcp_servers?: Array<McpServer> | null;

    /**
     * Body param: User-provided metadata stored with the run. Keys and values must be
     * strings with a maximum length of 16 and 512 characters respectively.
     */
    metadata?: { [key: string]: string | number | boolean } | null;

    /**
     * Body param: Source policy for web search results.
     *
     * This policy governs which sources are allowed/disallowed in results.
     */
    source_policy?: Shared.SourcePolicy | null;

    /**
     * Body param: Specification for a task.
     *
     * Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
     * Not specifying a TaskSpec is the same as setting an auto output schema.
     *
     * For convenience bare strings are also accepted as input or output schemas.
     */
    task_spec?: TaskRunAPI.TaskSpec | null;

    /**
     * Body param: Webhooks for Task Runs.
     */
    webhook?: Webhook | null;

    /**
     * Header param: Optional header to specify the beta version(s) to enable.
     */
    betas?: Array<ParallelBeta>;
  }

  export interface TaskRunResultParams {
    /**
     * Query param:
     */
    timeout?: number;

    /**
     * Header param: Optional header to specify the beta version(s) to enable.
     */
    betas?: Array<ParallelBeta>;
  }
}

declare module 'parallel-sdk/resources/beta/task-group' {
  import type { APIResource } from 'parallel-sdk/core/resource';
  import type * as TaskRunAPI from 'parallel-sdk/resources/task-run';
  import type * as BetaTaskRunAPI from 'parallel-sdk/resources/beta/task-run';
  import type { APIPromise } from 'parallel-sdk/core/api-promise';
  import type { Stream } from 'parallel-sdk/core/streaming';
  import type { RequestOptions } from 'parallel-sdk/internal/request-options';

  export class TaskGroup extends (APIResource as { new (...args: any[]): any }) {
    /**
     * Initiates a TaskGroup to group and track multiple runs.
     */
    create(body: TaskGroupCreateParams, options?: RequestOptions): APIPromise<TaskGroup>;

    /**
     * Retrieves aggregated status across runs in a TaskGroup.
     */
    retrieve(taskGroupID: string, options?: RequestOptions): APIPromise<TaskGroup>;

    /**
     * Initiates multiple task runs within a TaskGroup.
     */
    addRuns(
      taskGroupID: string,
      params: TaskGroupAddRunsParams,
      options?: RequestOptions,
    ): APIPromise<TaskGroupRunResponse>;

    /**
     * Streams events from a TaskGroup: status updates and run completions.
     *
     * The connection will remain open for up to an hour as long as at least one run in
     * the group is still active.
     */
    events(
      taskGroupID: string,
      query?: TaskGroupEventsParams | undefined,
      options?: RequestOptions,
    ): APIPromise<Stream<TaskGroupEventsResponse>>;

    /**
     * Retrieves task runs in a TaskGroup and optionally their inputs and outputs.
     *
     * All runs within a TaskGroup are returned as a stream. To get the inputs and/or
     * outputs back in the stream, set the corresponding `include_input` and
     * `include_output` parameters to `true`.
     *
     * The stream is resumable using the `event_id` as the cursor. To resume a stream,
     * specify the `last_event_id` parameter with the `event_id` of the last event in
     * the stream. The stream will resume from the next event after the
     * `last_event_id`.
     */
    getRuns(
      taskGroupID: string,
      query?: TaskGroupGetRunsParams | undefined,
      options?: RequestOptions,
    ): APIPromise<Stream<TaskGroupGetRunsResponse>>;
  }

  /**
   * Response object for a task group, including its status and metadata.
   */
  export interface TaskGroup {
    /**
     * Timestamp of the creation of the group, as an RFC 3339 string.
     */
    created_at: string | null;

    /**
     * Status of a task group.
     */
    status: TaskGroupStatus;

    /**
     * ID of the group.
     */
    taskgroup_id: string;

    /**
     * User-provided metadata stored with the group.
     */
    metadata?: { [key: string]: string | number | boolean } | null;
  }

  /**
   * Response from adding new task runs to a task group.
   */
  export interface TaskGroupRunResponse {
    /**
     * Cursor for these runs in the event stream at
     * taskgroup/events?last_event_id=<event_cursor>. Empty for the first runs in the
     * group.
     */
    event_cursor: string | null;

    /**
     * Cursor for these runs in the run stream at
     * taskgroup/runs?last_event_id=<run_cursor>. Empty for the first runs in the
     * group.
     */
    run_cursor: string | null;

    /**
     * IDs of the newly created runs.
     */
    run_ids: Array<string>;

    /**
     * Status of a task group.
     */
    status: TaskGroupStatus;
  }

  /**
   * Status of a task group.
   */
  export interface TaskGroupStatus {
    /**
     * True if at least one run in the group is currently active, i.e. status is one of
     * {'cancelling', 'queued', 'running'}.
     */
    is_active: boolean;

    /**
     * Timestamp of the last status update to the group, as an RFC 3339 string.
     */
    modified_at: string | null;

    /**
     * Number of task runs in the group.
     */
    num_task_runs: number;

    /**
     * Human-readable status message for the group.
     */
    status_message: string | null;

    /**
     * Number of task runs with each status.
     */
    task_run_status_counts: { [key: string]: number };
  }

  /**
   * Event indicating an update to group status.
   */
  export type TaskGroupEventsResponse =
    | TaskGroupEventsResponse.TaskGroupStatusEvent
    | BetaTaskRunAPI.TaskRunEvent
    | BetaTaskRunAPI.ErrorEvent;

  export namespace TaskGroupEventsResponse {
    /**
     * Event indicating an update to group status.
     */
    export interface TaskGroupStatusEvent {
      /**
       * Cursor to resume the event stream.
       */
      event_id: string;

      /**
       * Status of a task group.
       */
      status: TaskGroupStatus;

      /**
       * Event type; always 'task_group_status'.
       */
      type: 'task_group_status';
    }
  }

  /**
   * Event when a task run transitions to a non-active status.
   *
   * May indicate completion, cancellation, or failure.
   */
  export type TaskGroupGetRunsResponse = BetaTaskRunAPI.TaskRunEvent | BetaTaskRunAPI.ErrorEvent;

  export interface TaskGroupCreateParams {
    /**
     * User-provided metadata stored with the task group.
     */
    metadata?: { [key: string]: string | number | boolean } | null;
  }

  export interface TaskGroupAddRunsParams {
    /**
     * Body param: List of task runs to execute.
     */
    inputs: Array<BetaTaskRunAPI.BetaRunInput>;

    /**
     * Body param: Specification for a task.
     *
     * Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
     * Not specifying a TaskSpec is the same as setting an auto output schema.
     *
     * For convenience bare strings are also accepted as input or output schemas.
     */
    default_task_spec?: TaskRunAPI.TaskSpec | null;

    /**
     * Header param: Optional header to specify the beta version(s) to enable.
     */
    betas?: Array<BetaTaskRunAPI.ParallelBeta>;
  }

  export interface TaskGroupEventsParams {
    last_event_id?: string | null;
    timeout?: number | null;
  }

  export interface TaskGroupGetRunsParams {
    include_input?: boolean;
    include_output?: boolean;
    last_event_id?: string | null;
    status?:
      | 'queued'
      | 'action_required'
      | 'running'
      | 'completed'
      | 'failed'
      | 'cancelling'
      | 'cancelled'
      | null;
  }
}

declare module 'parallel-sdk/resources/beta/findall' {
  import type { APIResource } from 'parallel-sdk/core/resource';
  import type * as TaskRunAPI from 'parallel-sdk/resources/task-run';
  import type * as BetaTaskRunAPI from 'parallel-sdk/resources/beta/task-run';
  import type { APIPromise } from 'parallel-sdk/core/api-promise';
  import type { Stream } from 'parallel-sdk/core/streaming';
  import type { RequestOptions } from 'parallel-sdk/internal/request-options';

  export class Findall extends (APIResource as { new (...args: any[]): any }) {
    /**
     * Starts a FindAll run.
     *
     * This endpoint immediately returns a FindAll run object with status set to
     * 'queued'. You can get the run result snapshot using the GET
     * /v1beta/findall/runs/{findall_id}/result endpoint. You can track the progress of
     * the run by:
     *
     * - Polling the status using the GET /v1beta/findall/runs/{findall_id} endpoint,
     * - Subscribing to real-time updates via the
     *   /v1beta/findall/runs/{findall_id}/events endpoint,
     * - Or specifying a webhook with relevant event types during run creation to
     *   receive notifications.
     */
    create(params: FindallCreateParams, options?: RequestOptions): APIPromise<FindallRun>;

    /**
     * Retrieve a FindAll run.
     */
    retrieve(
      findallID: string,
      params?: FindallRetrieveParams | null | undefined,
      options?: RequestOptions,
    ): APIPromise<FindallRetrieveResponse>;

    /**
     * Cancel a FindAll run.
     */
    cancel(findallID: string, params?: FindallCancelParams | null | undefined, options?: RequestOptions): APIPromise<unknown>;

    /**
     * Add an enrichment to a FindAll run.
     */
    enrich(findallID: string, params: FindallEnrichParams, options?: RequestOptions): APIPromise<FindallSchema>;

    /**
     * Stream events from a FindAll run.
     *
     * Args: request: The Shapi request findall_id: The FindAll run ID last_event_id:
     * Optional event ID to resume from. timeout: Optional timeout in seconds. If None,
     * keep connection alive as long as the run is going. If set, stop after specified
     * duration.
     */
    events(
      findallID: string,
      params?: FindallEventsParams | undefined,
      options?: RequestOptions,
    ): APIPromise<Stream<FindallEventsResponse>>;

    /**
     * Extend a FindAll run by adding additional matches to the current match limit.
     */
    extend(findallID: string, params: FindallExtendParams, options?: RequestOptions): APIPromise<FindallSchema>;

    /**
     * Transforms a natural language search objective into a structured FindAll spec.
     *
     * Note: Access to this endpoint requires the parallel-beta header.
     *
     * The generated specification serves as a suggested starting point and can be
     * further customized by the user.
     */
    ingest(params: FindallIngestParams, options?: RequestOptions): APIPromise<FindallSchema>;

    /**
     * Retrieve the FindAll run result at the time of the request.
     */
    result(findallID: string, params?: FindallResultParams | null | undefined, options?: RequestOptions): APIPromise<FindallRunResult>;

    /**
     * Get FindAll Run Schema
     */
    schema(findallID: string, params?: FindallSchemaParams | null | undefined, options?: RequestOptions): APIPromise<FindallSchema>;
  }

  // (Types are extensive; included verbatim from the provided source where present.)

  export interface FindallCandidateMatchStatusEvent {
    data: FindallCandidateMatchStatusEvent.Data;
    event_id: string;
    timestamp: string;
    type:
      | 'findall.candidate.generated'
      | 'findall.candidate.matched'
      | 'findall.candidate.unmatched'
      | 'findall.candidate.discarded'
      | 'findall.candidate.enriched';
  }
  export namespace FindallCandidateMatchStatusEvent {
    export interface Data {
      candidate_id: string;
      match_status: 'generated' | 'matched' | 'unmatched' | 'discarded';
      name: string;
      url: string;
      basis?: Array<TaskRunAPI.FieldBasis> | null;
      description?: string | null;
      output?: { [key: string]: unknown } | null;
    }
  }

  export interface FindallEnrichInput {
    output_schema: TaskRunAPI.JsonSchema;
    mcp_servers?: Array<BetaTaskRunAPI.McpServer> | null;
    processor?: string;
  }

  export interface FindallExtendInput {
    additional_match_limit: number;
  }

  export interface FindallRun {
    findall_id: string;
    generator: 'base' | 'core' | 'pro' | 'preview';
    status: FindallRun.Status;
    created_at?: string | null;
    metadata?: { [key: string]: string | number | boolean } | null;
    modified_at?: string | null;
  }
  export namespace FindallRun {
    export interface Status {
      is_active: boolean;
      metrics: Status.Metrics;
      status: 'queued' | 'action_required' | 'running' | 'completed' | 'failed' | 'cancelling' | 'cancelled';
      termination_reason?: string | null;
    }
    export namespace Status {
      export interface Metrics {
        generated_candidates_count?: number;
        matched_candidates_count?: number;
      }
    }
  }

  export interface FindallRunInput {
    entity_type: string;
    generator: 'base' | 'core' | 'pro' | 'preview';
    match_conditions: Array<FindallRunInput.MatchCondition>;
    match_limit: number;
    objective: string;
    exclude_list?: Array<FindallRunInput.ExcludeList> | null;
    metadata?: { [key: string]: string | number | boolean } | null;
    webhook?: BetaTaskRunAPI.Webhook | null;
  }
  export namespace FindallRunInput {
    export interface MatchCondition {
      description: string;
      name: string;
    }
    export interface ExcludeList {
      name: string;
      url: string;
    }
  }

  export interface FindallRunResult {
    candidates: Array<FindallRunResult.Candidate>;
    run: FindallRun;
    last_event_id?: string | null;
  }
  export namespace FindallRunResult {
    export interface Candidate {
      candidate_id: string;
      match_status: 'generated' | 'matched' | 'unmatched' | 'discarded';
      name: string;
      url: string;
      basis?: Array<TaskRunAPI.FieldBasis> | null;
      description?: string | null;
      output?: { [key: string]: unknown } | null;
    }
  }

  export interface FindallRunStatusEvent {
    data: FindallRun;
    event_id: string;
    timestamp: string;
    type: 'findall.status';
  }

  export interface FindallSchema {
    entity_type: string;
    match_conditions: Array<FindallSchema.MatchCondition>;
    objective: string;
    enrichments?: Array<FindallEnrichInput> | null;
    generator?: 'base' | 'core' | 'pro' | 'preview';
    match_limit?: number | null;
  }
  export namespace FindallSchema {
    export interface MatchCondition {
      description: string;
      name: string;
    }
  }

  export interface FindallSchemaUpdatedEvent {
    data: FindallSchema;
    event_id: string;
    timestamp: string;
    type: 'findall.schema.updated';
  }

  export interface IngestInput {
    objective: string;
  }

  export type FindallRetrieveResponse = FindallRun | FindallRetrieveResponse.FindAllPollResponse;
  export namespace FindallRetrieveResponse {
    export interface FindAllPollResponse {
      billing_metrics: FindAllPollResponse.BillingMetrics;
      candidates: Array<FindAllPollResponse.Candidate>;
      enrichments: Array<FindAllPollResponse.Enrichment>;
      filters: Array<FindAllPollResponse.Filter>;
      is_active: boolean;
      max_results: number;
      query: string;
      results: Array<FindAllPollResponse.Result>;
      spec: FindAllPollResponse.Spec;
      status: string;
      steps: Array<FindAllPollResponse.Step>;
      title: string;
      are_enrichments_active?: boolean;
      created_at?: string | null;
      enrichment_recommendations?: Array<FindAllPollResponse.EnrichmentRecommendation>;
      modified_at?: string | null;
      pages_considered?: number | null;
      pages_read?: number | null;
    }
    export namespace FindAllPollResponse {
      export interface BillingMetrics {
        enrichment_cells: number;
        rows_processed: number;
        cost_mode?: 'lite' | 'base' | 'pro' | 'preview';
      }
      export interface Candidate {
        entity_id: string;
        name: string;
      }
      export interface Enrichment {
        description: string;
        name: string;
        type: string;
        status?: string | null;
      }
      export interface Filter {
        description: string;
        name: string;
        type: string;
        status?: string | null;
      }
      export interface Result {
        entity_id: string;
        name: string;
        description?: string | null;
        enrichment_results?: Array<Result.EnrichmentResult>;
        filter_results?: Array<Result.FilterResult>;
        score?: number | null;
        url?: string | null;
      }
      export namespace Result {
        export interface EnrichmentResult {
          key: string;
          value: string;
          citations?: string | null;
          confidence?: string | null;
          enhanced_citations?: Array<EnrichmentResult.EnhancedCitation>;
          reasoning?: string | null;
        }
        export namespace EnrichmentResult {
          export interface EnhancedCitation {
            url: string;
            excerpts?: Array<string>;
            title?: string | null;
          }
        }
        export interface FilterResult {
          key: string;
          value: string;
          citations?: string | null;
          confidence?: string | null;
          enhanced_citations?: Array<FilterResult.EnhancedCitation>;
          reasoning?: string | null;
        }
        export namespace FilterResult {
          export interface EnhancedCitation {
            url: string;
            excerpts?: Array<string>;
            title?: string | null;
          }
        }
      }
      export interface Spec {
        columns: Array<Spec.Column>;
        name: string;
      }
      export namespace Spec {
        export interface Column {
          description: string;
          name: string;
          type: string;
          status?: string | null;
        }
      }
      export interface Step {
        description: string;
        name: string;
        status: string;
      }
      export interface EnrichmentRecommendation {
        column_name: string;
        description: string;
        recommendation_run_id: string;
        recommendation_task_id: string;
      }
    }
  }

  export type FindallCancelResponse = unknown;

  export type FindallEventsResponse =
    | FindallSchemaUpdatedEvent
    | FindallRunStatusEvent
    | FindallCandidateMatchStatusEvent
    | BetaTaskRunAPI.ErrorEvent;

  export interface FindallCreateParams {
    entity_type: string;
    generator: 'base' | 'core' | 'pro' | 'preview';
    match_conditions: Array<FindallCreateParams.MatchCondition>;
    match_limit: number;
    objective: string;
    exclude_list?: Array<FindallCreateParams.ExcludeList> | null;
    metadata?: { [key: string]: string | number | boolean } | null;
    webhook?: BetaTaskRunAPI.Webhook | null;
    betas?: Array<BetaTaskRunAPI.ParallelBeta>;
  }
  export namespace FindallCreateParams {
    export interface MatchCondition {
      description: string;
      name: string;
    }
    export interface ExcludeList {
      name: string;
      url: string;
    }
  }

  export interface FindallRetrieveParams {
    betas?: Array<BetaTaskRunAPI.ParallelBeta>;
  }
  export interface FindallCancelParams {
    betas?: Array<BetaTaskRunAPI.ParallelBeta>;
  }
  export interface FindallEnrichParams {
    output_schema: TaskRunAPI.JsonSchema;
    mcp_servers?: Array<BetaTaskRunAPI.McpServer> | null;
    processor?: string;
    betas?: Array<BetaTaskRunAPI.ParallelBeta>;
  }
  export interface FindallEventsParams {
    last_event_id?: string | null;
    timeout?: number | null;
    betas?: Array<BetaTaskRunAPI.ParallelBeta>;
  }
  export interface FindallExtendParams {
    additional_match_limit: number;
    betas?: Array<BetaTaskRunAPI.ParallelBeta>;
  }
  export interface FindallIngestParams {
    objective: string;
    betas?: Array<BetaTaskRunAPI.ParallelBeta>;
  }
  export interface FindallResultParams {
    betas?: Array<BetaTaskRunAPI.ParallelBeta>;
  }
  export interface FindallSchemaParams {
    betas?: Array<BetaTaskRunAPI.ParallelBeta>;
  }
}
```