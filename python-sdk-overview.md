Yes—but I’ll need one clarification before I can produce a *single* correct, complete `.pyi` that “summarizes the entire footprint”:

**Do you want the `.pyi` to expose only the public surface that users import and call** (recommended for an LLM to understand usage), **or literally every module/class/TypedDict in the tree** (huge, noisy, and not very “how to use”)?

While you answer, here’s what I can generate immediately from what you pasted: a **single-file “public API surface”** stub that covers:
- `parallel.__init__` exports
- `parallel.Parallel` / `parallel.AsyncParallel` client construction + `copy/with_options`
- `client.task_run.*` core endpoints including `execute()` overloads
- `client.beta.*` endpoints (search/extract/task_run/task_group/findall)
- key public models and parameter TypedDicts that those methods reference

Below is a **ready-to-save** `parallel_api.pyi` that copies docstrings **1:1 where they are present in the snippets** (notably: `resources/task_run.py` and `resources/beta/*` methods).  
If you confirm you want the “everything including internals” version, I can expand it further (but it will be very large).

---

```pyi
# parallel_api.pyi
# This is a single-file stub summarizing the public API footprint of the `parallel` package.
# Docstrings are copied 1:1 from the source where available.

from __future__ import annotations

from typing import (
    Any,
    Dict,
    Iterable,
    Iterator,
    AsyncIterator,
    List,
    Mapping,
    Optional,
    Sequence,
    Tuple,
    Type,
    TypeVar,
    Union,
    overload,
    Literal,
    Generic,
)
import httpx
import datetime

# -------------------------
# Package metadata
# -------------------------

__title__: str
__version__: str

# -------------------------
# Sentinels / helper types (public exports)
# -------------------------

class NotGiven:
    """
    For parameters with a meaningful None value, we need to distinguish between
    the user explicitly passing None, and the user not passing the parameter at
    all.

    User code shouldn't need to use not_given directly.

    For example:

    ```py
    def create(timeout: Timeout | None | NotGiven = not_given): ...


    create(timeout=1)  # 1s timeout
    create(timeout=None)  # No timeout
    create()  # Default timeout behavior
    ```
    """
    def __bool__(self) -> Literal[False]: ...
    def __repr__(self) -> str: ...

not_given: NotGiven
NOT_GIVEN: NotGiven

class Omit:
    """
    To explicitly omit something from being sent in a request, use `omit`.

    ```py
    # as the default `Content-Type` header is `application/json` that will be sent
    client.post("/upload/files", files={"file": b"my raw file content"})

    # you can't explicitly override the header as it has to be dynamically generated
    # to look something like: 'multipart/form-data; boundary=0d8382fcf5f8c3be01ca2e11002d2983'
    client.post(..., headers={"Content-Type": "multipart/form-data"})

    # instead you can remove the default `application/json` header by passing omit
    client.post(..., headers={"Content-Type": omit})
    ```
    """
    def __bool__(self) -> Literal[False]: ...

omit: Omit

NoneType: Type[None]

Timeout = httpx.Timeout
Transport = httpx.BaseTransport
ProxiesTypes = Union[str, httpx.Proxy, Dict[Union[str, httpx.URL], Union[None, str, httpx.URL, httpx.Proxy]]]

Headers = Mapping[str, Union[str, Omit]]
Query = Mapping[str, object]
Body = object

class RequestOptions(TypedDict, total=False):
    headers: Headers
    max_retries: int
    timeout: float | Timeout | None
    params: Query
    extra_json: Mapping[str, object]
    idempotency_key: str
    follow_redirects: bool

# -------------------------
# Exceptions (public exports)
# -------------------------

class ParallelError(Exception): ...
class APIError(ParallelError):
    message: str
    request: httpx.Request
    body: object | None

class APIResponseValidationError(APIError):
    response: httpx.Response
    status_code: int

class APIStatusError(APIError):
    """Raised when an API response has a status code of 4xx or 5xx."""
    response: httpx.Response
    status_code: int

class APIConnectionError(APIError): ...
class APITimeoutError(APIConnectionError): ...

class BadRequestError(APIStatusError): status_code: Literal[400]
class AuthenticationError(APIStatusError): status_code: Literal[401]
class PermissionDeniedError(APIStatusError): status_code: Literal[403]
class NotFoundError(APIStatusError): status_code: Literal[404]
class ConflictError(APIStatusError): status_code: Literal[409]
class UnprocessableEntityError(APIStatusError): status_code: Literal[422]
class RateLimitError(APIStatusError): status_code: Literal[429]
class InternalServerError(APIStatusError): ...

# -------------------------
# Base model (public export)
# -------------------------

class BaseModel:  # real impl subclasses pydantic.BaseModel
    def to_dict(
        self,
        *,
        mode: Literal["json", "python"] = "python",
        use_api_names: bool = True,
        exclude_unset: bool = True,
        exclude_defaults: bool = False,
        exclude_none: bool = False,
        warnings: bool = True,
    ) -> Dict[str, object]: ...
    def to_json(
        self,
        *,
        indent: int | None = 2,
        use_api_names: bool = True,
        exclude_unset: bool = True,
        exclude_defaults: bool = False,
        exclude_none: bool = False,
        warnings: bool = True,
    ) -> str: ...

# -------------------------
# Core Types / Models (publicly used)
# -------------------------

class Citation(BaseModel):
    """A citation for a task output."""
    url: str
    excerpts: Optional[List[str]]
    title: Optional[str]

class FieldBasis(BaseModel):
    """Citations and reasoning supporting one field of a task output."""
    field: str
    reasoning: str
    citations: Optional[List[Citation]]
    confidence: Optional[str]

class Warning(BaseModel):
    """Human-readable message for a task."""
    message: str
    type: Literal["spec_validation_warning", "input_validation_warning", "warning"]
    detail: Optional[Dict[str, object]]

class ErrorObject(BaseModel):
    """An error message."""
    message: str
    ref_id: str
    detail: Optional[Dict[str, object]]

class ErrorResponse(BaseModel):
    """Response object used for non-200 status codes."""
    error: ErrorObject
    type: Literal["error"]

class AutoSchema(BaseModel):
    """Auto schema for a task input or output."""
    type: Optional[Literal["auto"]]

class TextSchema(BaseModel):
    """Text description for a task input or output."""
    description: Optional[str]
    type: Optional[Literal["text"]]

class JsonSchema(BaseModel):
    """JSON schema for a task input or output."""
    json_schema: Dict[str, object]
    type: Optional[Literal["json"]]

OutputSchema = Union[JsonSchema, TextSchema, AutoSchema, str]
InputSchema = Union[str, JsonSchema, TextSchema, None]

class TaskSpec(BaseModel):
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`. Not
    specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    output_schema: OutputSchema
    input_schema: Optional[InputSchema]

class TaskRun(BaseModel):
    """Status of a task run."""
    created_at: Optional[str]
    is_active: bool
    modified_at: Optional[str]
    processor: str
    run_id: str
    status: Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]
    error: Optional[ErrorObject]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    task_group_id: Optional[str]
    warnings: Optional[List[Warning]]

class TaskRunTextOutput(BaseModel):
    """Output from a task that returns text."""
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
    beta_fields: Optional[Dict[str, object]]

class TaskRunJsonOutput(BaseModel):
    """Output from a task that returns JSON."""
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: Literal["json"]
    beta_fields: Optional[Dict[str, object]]
    output_schema: Optional[Dict[str, object]]

TaskRunResultOutput = Union[TaskRunTextOutput, TaskRunJsonOutput]

class TaskRunResult(BaseModel):
    """Result of a task run."""
    output: TaskRunResultOutput
    run: TaskRun

# Parsed result generics (used by TaskRun.execute overload)
OutputT = TypeVar("OutputT")  # actual bound is pydantic.BaseModel in impl

class ParsedTaskRunTextOutput(TaskRunTextOutput, Generic[OutputT]):
    parsed: None

class ParsedTaskRunJsonOutput(TaskRunJsonOutput, Generic[OutputT]):
    parsed: Optional[OutputT]

class ParsedTaskRunResult(TaskRunResult, Generic[OutputT]):
    output: Union[ParsedTaskRunTextOutput[OutputT], ParsedTaskRunJsonOutput[OutputT]]

# -------------------------
# Param TypedDicts (publicly used)
# -------------------------

class SourcePolicy(TypedDict, total=False):
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    after_date: Union[str, datetime.date, None]
    exclude_domains: Sequence[str]
    include_domains: Sequence[str]

class TaskRunCreateParams(TypedDict, total=False):
    input: Union[str, Dict[str, object]]
    processor: str
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicy]
    task_spec: Optional["TaskSpecParam"]

class TaskSpecParam(TypedDict, total=False):
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`. Not
    specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    output_schema: Union[Dict[str, object], str]
    input_schema: Optional[Union[Dict[str, object], str]]

class TaskRunResultParams(TypedDict, total=False):
    api_timeout: int  # alias "timeout" in actual requests

# -------------------------
# Streaming types (public exports)
# -------------------------

TChunk = TypeVar("TChunk")

class Stream(Generic[TChunk]):
    def __iter__(self) -> Iterator[TChunk]: ...
    def __next__(self) -> TChunk: ...
    def close(self) -> None: ...
    def __enter__(self) -> "Stream[TChunk]": ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

class AsyncStream(Generic[TChunk]):
    def __aiter__(self) -> AsyncIterator[TChunk]: ...
    async def __anext__(self) -> TChunk: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> "AsyncStream[TChunk]": ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

# APIResponse wrappers (exported)
R = TypeVar("R")
class APIResponse(Generic[R]):
    http_response: httpx.Response
    status_code: int
    headers: httpx.Headers
    def parse(self, *, to: Type[Any] | None = None) -> Any: ...
    def read(self) -> bytes: ...
    def text(self) -> str: ...
    def json(self) -> object: ...
    def close(self) -> None: ...

class AsyncAPIResponse(Generic[R]):
    http_response: httpx.Response
    status_code: int
    headers: httpx.Headers
    async def parse(self, *, to: Type[Any] | None = None) -> Any: ...
    async def read(self) -> bytes: ...
    async def text(self) -> str: ...
    async def json(self) -> object: ...
    async def close(self) -> None: ...

# -------------------------
# Main Client classes (public exports)
# -------------------------

DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits

class Parallel:
    api_key: str

    def __init__(
        self,
        *,
        api_key: str | None = ...,
        base_url: str | httpx.URL | None = ...,
        timeout: float | Timeout | None | NotGiven = ...,
        max_retries: int = ...,
        default_headers: Mapping[str, str] | None = ...,
        default_query: Mapping[str, object] | None = ...,
        http_client: httpx.Client | None = ...,
        _strict_response_validation: bool = ...,
    ) -> None: ...

    @property
    def task_run(self) -> "TaskRunResource": ...

    @property
    def beta(self) -> "BetaResource": ...

    def copy(
        self,
        *,
        api_key: str | None = ...,
        base_url: str | httpx.URL | None = ...,
        timeout: float | Timeout | None | NotGiven = ...,
        http_client: httpx.Client | None = ...,
        max_retries: int | NotGiven = ...,
        default_headers: Mapping[str, str] | None = ...,
        set_default_headers: Mapping[str, str] | None = ...,
        default_query: Mapping[str, object] | None = ...,
        set_default_query: Mapping[str, object] | None = ...,
        _extra_kwargs: Mapping[str, Any] = ...,
    ) -> "Parallel": ...

    with_options: Any

    @property
    def with_raw_response(self) -> "ParallelWithRawResponse": ...

    @property
    def with_streaming_response(self) -> "ParallelWithStreamedResponse": ...

class AsyncParallel:
    api_key: str

    def __init__(
        self,
        *,
        api_key: str | None = ...,
        base_url: str | httpx.URL | None = ...,
        timeout: float | Timeout | None | NotGiven = ...,
        max_retries: int = ...,
        default_headers: Mapping[str, str] | None = ...,
        default_query: Mapping[str, object] | None = ...,
        http_client: httpx.AsyncClient | None = ...,
        _strict_response_validation: bool = ...,
    ) -> None: ...

    @property
    def task_run(self) -> "AsyncTaskRunResource": ...

    @property
    def beta(self) -> "AsyncBetaResource": ...

    def copy(
        self,
        *,
        api_key: str | None = ...,
        base_url: str | httpx.URL | None = ...,
        timeout: float | Timeout | None | NotGiven = ...,
        http_client: httpx.AsyncClient | None = ...,
        max_retries: int | NotGiven = ...,
        default_headers: Mapping[str, str] | None = ...,
        set_default_headers: Mapping[str, str] | None = ...,
        default_query: Mapping[str, object] | None = ...,
        set_default_query: Mapping[str, object] | None = ...,
        _extra_kwargs: Mapping[str, Any] = ...,
    ) -> "AsyncParallel": ...

    with_options: Any

    @property
    def with_raw_response(self) -> "AsyncParallelWithRawResponse": ...

    @property
    def with_streaming_response(self) -> "AsyncParallelWithStreamedResponse": ...

Client = Parallel
AsyncClient = AsyncParallel

# -------------------------
# Core resource: TaskRun (stable)
# -------------------------

class TaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        source_policy: Optional[SourcePolicy] | Omit = ...,
        task_spec: Optional[TaskSpecParam] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRun:
        """
        Initiates a task run.

        Returns immediately with a run object in status 'queued'.

        Beta features can be enabled by setting the 'parallel-beta' header.

        Args:
          input: Input to the task, either text or a JSON object.

          processor: Processor to use for the task.

          metadata: User-provided metadata stored with the run. Keys and values must be strings with
              a maximum length of 16 and 512 characters respectively.

          source_policy: Source policy for web search results.

              This policy governs which sources are allowed/disallowed in results.

          task_spec: Specification for a task.

              Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
              Not specifying a TaskSpec is the same as setting an auto output schema.

              For convenience bare strings are also accepted as input or output schemas.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
        ...

    def retrieve(
        self,
        run_id: str,
        *,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRun:
        """
        Retrieves run status by run_id.

        The run result is available from the `/result` endpoint.

        Args:
          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
        ...

    def result(
        self,
        run_id: str,
        *,
        api_timeout: int | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRunResult:
        """
        Retrieves a run result by run_id, blocking until the run is completed.

        Args:
          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
        ...

    @overload
    def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        output: Optional[OutputSchema] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRunResult: ...
    @overload
    def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        output: Type[OutputT],
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ParsedTaskRunResult[OutputT]: ...
    def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        output: Optional[OutputSchema] | Type[OutputT] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> Union[TaskRunResult, ParsedTaskRunResult[OutputT]]:
        """
        Convenience method to create and execute a task run in a single call.

        Awaits run completion. If the run is successful, a `ParsedTaskRunResult`
        is returned when a pydantic was specified in `output`. Otherwise, a
        `TaskRunResult` is returned.

        Possible errors:
        - `TimeoutError`: If the run does not finish within the specified timeout.
        - `APIStatusError`: If the API returns a non-200-range status code.
        - `APIConnectionError`: If the connection to the API fails.

        Args:
          input: Input to the task, either text or a JSON object.

          processor: Processor to use for the task.

          metadata: User-provided metadata stored with the run. Keys and values must be strings with
            a maximum length of 16 and 512 characters respectively.

          output: Optional output schema or pydantic type. If pydantic is provided,
            the response will have a parsed field.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds.
            If the result is not available within the timeout, a `TimeoutError` is raised.
        """
        ...

class AsyncTaskRunResource:
    async def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        source_policy: Optional[SourcePolicy] | Omit = ...,
        task_spec: Optional[TaskSpecParam] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRun: ...
    async def retrieve(
        self,
        run_id: str,
        *,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRun: ...
    async def result(
        self,
        run_id: str,
        *,
        api_timeout: int | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRunResult: ...
    @overload
    async def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        output: Optional[OutputSchema] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRunResult: ...
    @overload
    async def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        output: Type[OutputT],
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ParsedTaskRunResult[OutputT]: ...
    async def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        output: Optional[OutputSchema] | Type[OutputT] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> Union[TaskRunResult, ParsedTaskRunResult[OutputT]]: ...

# -------------------------
# Beta API surface (client.beta.*)
# -------------------------

ParallelBetaParam = Union[
    Literal[
        "mcp-server-2025-07-17",
        "events-sse-2025-07-24",
        "webhook-2025-08-12",
        "findall-2025-09-15",
        "search-extract-2025-10-10",
        "field-basis-2025-11-25",
    ],
    str,
]

class UsageItem(BaseModel):
    """Usage item for a single operation."""
    count: int
    name: str

class WebSearchResult(BaseModel):
    """A single search result from the web search API."""
    url: str
    excerpts: Optional[List[str]]
    publish_date: Optional[str]
    title: Optional[str]

class SearchResult(BaseModel):
    """Output for the Search API."""
    results: List[WebSearchResult]
    search_id: str
    usage: Optional[List[UsageItem]]
    warnings: Optional[List[Warning]]

class ExtractError(BaseModel):
    """Extract error details."""
    content: Optional[str]
    error_type: str
    http_status_code: Optional[int]
    url: str

class ExtractResult(BaseModel):
    """Extract result for a single URL."""
    url: str
    excerpts: Optional[List[str]]
    full_content: Optional[str]
    publish_date: Optional[str]
    title: Optional[str]

class ExtractResponse(BaseModel):
    """Fetch result."""
    errors: List[ExtractError]
    extract_id: str
    results: List[ExtractResult]
    usage: Optional[List[UsageItem]]
    warnings: Optional[List[Warning]]

class Webhook(BaseModel):
    """Webhooks for Task Runs."""
    url: str
    event_types: Optional[List[Literal["task_run.status"]]]

class McpServer(BaseModel):
    """MCP server configuration."""
    name: str
    url: str
    allowed_tools: Optional[List[str]]
    headers: Optional[Dict[str, str]]
    type: Optional[Literal["url"]]

class McpToolCall(BaseModel):
    """Result of an MCP tool call."""
    arguments: str
    server_name: str
    tool_call_id: str
    tool_name: str
    content: Optional[str]
    error: Optional[str]

class BetaTaskRunJsonOutput(BaseModel):
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: Literal["json"]
    beta_fields: Optional[Dict[str, object]]
    mcp_tool_calls: Optional[List[McpToolCall]]
    output_schema: Optional[Dict[str, object]]

class BetaTaskRunTextOutput(BaseModel):
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
    beta_fields: Optional[Dict[str, object]]
    mcp_tool_calls: Optional[List[McpToolCall]]

BetaTaskRunOutput = Union[BetaTaskRunTextOutput, BetaTaskRunJsonOutput]

class BetaTaskRunResult(BaseModel):
    """Result of a beta task run. Available only if beta headers are specified."""
    output: BetaTaskRunOutput
    run: TaskRun

# Task run events beta stream union (simplified to Any for summary)
TaskRunEventsResponse = Any

class TaskGroupStatus(BaseModel):
    """Status of a task group."""
    is_active: bool
    modified_at: Optional[str]
    num_task_runs: int
    status_message: Optional[str]
    task_run_status_counts: Dict[str, int]

class TaskGroup(BaseModel):
    """Response object for a task group, including its status and metadata."""
    created_at: Optional[str]
    status: TaskGroupStatus
    task_group_id: str
    metadata: Optional[Dict[str, Union[str, float, bool]]]

TaskGroupEventsResponse = Any
TaskGroupGetRunsResponse = Any

FindAllEventsResponse = Any

class FindAllRun(BaseModel):
    """FindAll run object with status and metadata."""
    findall_id: str
    generator: Literal["base", "core", "pro", "preview"]
    status: Any
    created_at: Optional[str]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    modified_at: Optional[str]

class FindAllSchema(BaseModel):
    """Response model for FindAll ingest."""
    entity_type: str
    match_conditions: List[Any]
    objective: str
    enrichments: Optional[List[Any]]
    generator: Optional[Literal["base", "core", "pro", "preview"]]
    match_limit: Optional[int]

class FindAllRunResult(BaseModel):
    """Complete FindAll search results.

    Represents a snapshot of a FindAll run, including run metadata and a list of
    candidate entities with their match status and details at the time the snapshot was
    taken.
    """
    candidates: List[Any]
    run: FindAllRun
    last_event_id: Optional[str]

class BetaTaskRunResource:
    def create(self, *args: Any, **kwargs: Any) -> TaskRun: ...
    def events(self, run_id: str, *, extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> Stream[TaskRunEventsResponse]:
        """
        Streams events for a task run.

        Returns a stream of events showing progress updates and state changes for the
        task run.

        For task runs that did not have enable_events set to true during creation, the
        frequency of events will be reduced.

        Args:
          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
        ...
    def result(self, run_id: str, *, api_timeout: int | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> BetaTaskRunResult:
        """
        Retrieves a run result by run_id, blocking until the run is completed.

        Args:
          betas: Optional header to specify the beta version(s) to enable.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
        ...

class AsyncBetaTaskRunResource:
    async def create(self, *args: Any, **kwargs: Any) -> TaskRun: ...
    async def events(self, run_id: str, *, extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> AsyncStream[TaskRunEventsResponse]: ...
    async def result(self, run_id: str, *, api_timeout: int | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> BetaTaskRunResult: ...

class BetaTaskGroupResource:
    def create(self, *args: Any, **kwargs: Any) -> TaskGroup: ...
    def retrieve(self, task_group_id: str, *args: Any, **kwargs: Any) -> TaskGroup: ...
    def add_runs(self, task_group_id: str, *args: Any, **kwargs: Any) -> Any: ...
    def events(self, task_group_id: str, *args: Any, **kwargs: Any) -> Stream[TaskGroupEventsResponse]:
        """
        Streams events from a TaskGroup: status updates and run completions.

        The connection will remain open for up to an hour as long as at least one run in
        the group is still active.

        Args:
          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
        ...
    def get_runs(self, task_group_id: str, *args: Any, **kwargs: Any) -> Stream[TaskGroupGetRunsResponse]:
        """
        Retrieves task runs in a TaskGroup and optionally their inputs and outputs.

        All runs within a TaskGroup are returned as a stream. To get the inputs and/or
        outputs back in the stream, set the corresponding `include_input` and
        `include_output` parameters to `true`.

        The stream is resumable using the `event_id` as the cursor. To resume a stream,
        specify the `last_event_id` parameter with the `event_id` of the last event in
        the stream. The stream will resume from the next event after the
        `last_event_id`.
        """
        ...

class AsyncBetaTaskGroupResource:
    async def create(self, *args: Any, **kwargs: Any) -> TaskGroup: ...
    async def retrieve(self, task_group_id: str, *args: Any, **kwargs: Any) -> TaskGroup: ...
    async def add_runs(self, task_group_id: str, *args: Any, **kwargs: Any) -> Any: ...
    async def events(self, task_group_id: str, *args: Any, **kwargs: Any) -> AsyncStream[TaskGroupEventsResponse]: ...
    async def get_runs(self, task_group_id: str, *args: Any, **kwargs: Any) -> AsyncStream[TaskGroupGetRunsResponse]: ...

class BetaFindAllResource:
    def create(self, *args: Any, **kwargs: Any) -> FindAllRun:
        """
        Starts a FindAll run.

        This endpoint immediately returns a FindAll run object with status set to
        'queued'. You can get the run result snapshot using the GET
        /v1beta/findall/runs/{findall_id}/result endpoint. You can track the progress of
        the run by:

        - Polling the status using the GET /v1beta/findall/runs/{findall_id} endpoint,
        - Subscribing to real-time updates via the
          /v1beta/findall/runs/{findall_id}/events endpoint,
        - Or specifying a webhook with relevant event types during run creation to
          receive notifications.
        """
        ...
    def retrieve(self, findall_id: str, *args: Any, **kwargs: Any) -> FindAllRun: ...
    def cancel(self, findall_id: str, *args: Any, **kwargs: Any) -> object: ...
    def enrich(self, findall_id: str, *args: Any, **kwargs: Any) -> FindAllSchema: ...
    def events(self, findall_id: str, *args: Any, **kwargs: Any) -> Stream[FindAllEventsResponse]: ...
    def extend(self, findall_id: str, *args: Any, **kwargs: Any) -> FindAllSchema: ...
    def ingest(self, *args: Any, **kwargs: Any) -> FindAllSchema:
        """
        Transforms a natural language search objective into a structured FindAll spec.

        Note: Access to this endpoint requires the parallel-beta header.

        The generated specification serves as a suggested starting point and can be
        further customized by the user.
        """
        ...
    def result(self, findall_id: str, *args: Any, **kwargs: Any) -> FindAllRunResult: ...
    def schema(self, findall_id: str, *args: Any, **kwargs: Any) -> FindAllSchema: ...

class AsyncBetaFindAllResource:
    async def create(self, *args: Any, **kwargs: Any) -> FindAllRun: ...
    async def retrieve(self, findall_id: str, *args: Any, **kwargs: Any) -> FindAllRun: ...
    async def cancel(self, findall_id: str, *args: Any, **kwargs: Any) -> object: ...
    async def enrich(self, findall_id: str, *args: Any, **kwargs: Any) -> FindAllSchema: ...
    async def events(self, findall_id: str, *args: Any, **kwargs: Any) -> AsyncStream[FindAllEventsResponse]: ...
    async def extend(self, findall_id: str, *args: Any, **kwargs: Any) -> FindAllSchema: ...
    async def ingest(self, *args: Any, **kwargs: Any) -> FindAllSchema: ...
    async def result(self, findall_id: str, *args: Any, **kwargs: Any) -> FindAllRunResult: ...
    async def schema(self, findall_id: str, *args: Any, **kwargs: Any) -> FindAllSchema: ...

class BetaResource:
    @property
    def task_run(self) -> BetaTaskRunResource: ...
    @property
    def task_group(self) -> BetaTaskGroupResource: ...
    @property
    def findall(self) -> BetaFindAllResource: ...

    def extract(
        self,
        *,
        urls: Sequence[str],
        betas: List[ParallelBetaParam],
        excerpts: object | Omit = ...,
        fetch_policy: object | Omit = ...,
        full_content: object | Omit = ...,
        objective: Optional[str] | Omit = ...,
        search_queries: Optional[Sequence[str]] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ExtractResponse:
        """
        Extracts relevant content from specific web URLs.

        To access this endpoint, pass the `parallel-beta` header with the value
        `search-extract-2025-10-10`.

        Args:
          betas: Optional header to specify the beta version(s) to enable.

          excerpts: Include excerpts from each URL relevant to the search objective and queries.
              Note that if neither objective nor search_queries is provided, excerpts are
              redundant with full content.

          fetch_policy: Policy for live fetching web results.

          full_content: Include full content from each URL. Note that if neither objective nor
              search_queries is provided, excerpts are redundant with full content.

          objective: If provided, focuses extracted content on the specified search objective.

          search_queries: If provided, focuses extracted content on the specified keyword search queries.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
        ...

    def search(
        self,
        *,
        excerpts: object | Omit = ...,
        fetch_policy: object | Omit = ...,
        max_chars_per_result: Optional[int] | Omit = ...,
        max_results: Optional[int] | Omit = ...,
        mode: Optional[Literal["one-shot", "agentic"]] | Omit = ...,
        objective: Optional[str] | Omit = ...,
        processor: Optional[Literal["base", "pro"]] | Omit = ...,
        search_queries: Optional[Sequence[str]] | Omit = ...,
        source_policy: Optional[SourcePolicy] | Omit = ...,
        betas: List[ParallelBetaParam] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> SearchResult:
        """
        Searches the web.

        To access this endpoint, pass the `parallel-beta` header with the value
        `search-extract-2025-10-10`.

        Args:
          excerpts: Optional settings to configure excerpt generation.

          fetch_policy: Policy for live fetching web results.

          max_chars_per_result: DEPRECATED: Use `excerpts.max_chars_per_result` instead.

          max_results: Upper bound on the number of results to return. May be limited by the processor.
              Defaults to 10 if not provided.

          mode: Presets default values for parameters for different use cases. `one-shot`
              returns more comprehensive results and longer excerpts to answer questions from
              a single response, while `agentic` returns more concise, token-efficient results
              for use in an agentic loop.

          objective: Natural-language description of what the web search is trying to find. May
              include guidance about preferred sources or freshness. At least one of objective
              or search_queries must be provided.

          processor: DEPRECATED: use `mode` instead.

          search_queries: Optional list of traditional keyword search queries to guide the search. May
              contain search operators. At least one of objective or search_queries must be
              provided.

          source_policy: Source policy for web search results.

              This policy governs which sources are allowed/disallowed in results.

          betas: Optional header to specify the beta version(s) to enable.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
        ...

class AsyncBetaResource:
    @property
    def task_run(self) -> AsyncBetaTaskRunResource: ...
    @property
    def task_group(self) -> AsyncBetaTaskGroupResource: ...
    @property
    def findall(self) -> AsyncBetaFindAllResource: ...
    async def extract(self, *args: Any, **kwargs: Any) -> ExtractResponse: ...
    async def search(self, *args: Any, **kwargs: Any) -> SearchResult: ...

# -------------------------
# Top-level module re-exports
# -------------------------

# parallel.types is a module in the real package; for LLM-facing footprint, this is enough:
class types: ...
```

---

### What I need from you to finish the “entire footprint” version
If you want a truly complete single `.pyi` that includes *all* modules/classes/TypedDicts/unions (including internal helpers), please answer:

1) **Scope**: Public-only or literally everything under `src/parallel/**`?  
2) **Do you want to include the `parallel.resources` lazy proxy and the `with_raw_response` / `with_streaming_response` wrapper types fully?**  
3) **Should I keep internal modules like `_base_client.py`, `_response.py`, `_models.py`**, etc. in the stub? (These dominate the file.)

Reply with e.g. **“public-only”** or **“everything”**, and I’ll produce the final `.pyi` accordingly.