Below is a **single `parallel.pyi`** “API footprint” stub that exposes the public surface area an LLM/user would care about: the top-level client(s), resources, core models/types, beta resources/types, streaming helpers, request options, and common errors.

Notes (important):
- This is a **summary stub**: it does not attempt to mirror every internal helper or every generated type file; it focuses on what’s importable/usable from `parallel` and `parallel.types` and resource entry points.
- I **only copied docstrings that are present in the snippets you provided** and copied them **verbatim**. Many classes/methods have docstrings in your codebase, but the request said “Include doc-comments if available, copying them over 1:1 without changing.” I can only copy 1:1 what I can see. If you want *all* docstrings, paste the missing files or allow me to read the full repo contents.
- A `.pyi` normally uses `"""docstring"""` as a doc-comment; that’s what I used.

---

```pyi
# parallel.pyi
# Footprint summary for the `parallel` SDK (Python).
# This is a consolidated stub to help an LLM understand the API surface.
# Generated manually from the provided repository snapshot.

from __future__ import annotations

from datetime import date, datetime
from typing import (
    Any,
    AsyncIterable,
    AsyncIterator,
    Awaitable,
    Callable,
    Dict,
    Generic,
    Iterable,
    Iterator,
    List,
    Mapping,
    Optional,
    Sequence,
    Tuple,
    Type,
    TypeVar,
    Union,
    overload,
)
from typing_extensions import (
    Annotated,
    Literal,
    Protocol,
    TypeAlias,
    TypedDict,
)

import httpx
import pydantic

# ---------------------------------------------------------------------------
# Package metadata
# ---------------------------------------------------------------------------

__title__: str
__version__: str

# ---------------------------------------------------------------------------
# Sentinels / core SDK helper types (exported from parallel.__init__)
# ---------------------------------------------------------------------------

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

Transport = httpx.BaseTransport
Timeout = httpx.Timeout

URL = httpx.URL
Proxy = httpx.Proxy

ProxiesDict: TypeAlias = Dict[Union[str, URL], Union[None, str, URL, Proxy]]
ProxiesTypes: TypeAlias = Union[str, Proxy, ProxiesDict]

# File upload helpers (exported)
FileContent: TypeAlias = Union[bytes, Any]  # summarized
FileTypes: TypeAlias = Any

def file_from_path(path: str) -> FileTypes: ...

# ---------------------------------------------------------------------------
# Exceptions (exported from parallel.__init__)
# ---------------------------------------------------------------------------

class ParallelError(Exception): ...
class APIError(ParallelError):
    message: str
    request: httpx.Request
    body: object | None
    def __init__(self, message: str, request: httpx.Request, *, body: object | None) -> None: ...

class APIResponseValidationError(APIError):
    response: httpx.Response
    status_code: int
    def __init__(self, response: httpx.Response, body: object | None, *, message: str | None = None) -> None: ...

class APIStatusError(APIError):
    """Raised when an API response has a status code of 4xx or 5xx."""
    response: httpx.Response
    status_code: int
    def __init__(self, message: str, *, response: httpx.Response, body: object | None) -> None: ...

class APIConnectionError(APIError):
    def __init__(self, *, message: str = "Connection error.", request: httpx.Request) -> None: ...

class APITimeoutError(APIConnectionError):
    def __init__(self, request: httpx.Request) -> None: ...

class BadRequestError(APIStatusError):
    status_code: Literal[400]
class AuthenticationError(APIStatusError):
    status_code: Literal[401]
class PermissionDeniedError(APIStatusError):
    status_code: Literal[403]
class NotFoundError(APIStatusError):
    status_code: Literal[404]
class ConflictError(APIStatusError):
    status_code: Literal[409]
class UnprocessableEntityError(APIStatusError):
    status_code: Literal[422]
class RateLimitError(APIStatusError):
    status_code: Literal[429]
class InternalServerError(APIStatusError): ...

# ---------------------------------------------------------------------------
# BaseModel export (Parallel SDK BaseModel)
# ---------------------------------------------------------------------------

class BaseModel(pydantic.BaseModel):
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

# ---------------------------------------------------------------------------
# Streaming helpers (SSE)
# ---------------------------------------------------------------------------

_T = TypeVar("_T")

class Stream(Generic[_T]):
    """Provides the core interface to iterate over a synchronous stream response."""
    response: httpx.Response
    def __iter__(self) -> Iterator[_T]: ...
    def __next__(self) -> _T: ...
    def close(self) -> None: ...
    def __enter__(self) -> Stream[_T]: ...
    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        exc_tb: Any,
    ) -> None: ...

class AsyncStream(Generic[_T]):
    """Provides the core interface to iterate over an asynchronous stream response."""
    response: httpx.Response
    def __aiter__(self) -> AsyncIterator[_T]: ...
    async def __anext__(self) -> _T: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> AsyncStream[_T]: ...
    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        exc_tb: Any,
    ) -> None: ...

# ---------------------------------------------------------------------------
# Low-level request options typing (exported as RequestOptions)
# ---------------------------------------------------------------------------

Headers: TypeAlias = Mapping[str, Union[str, Omit]]
Query: TypeAlias = Mapping[str, object]
Body: TypeAlias = object
AnyMapping: TypeAlias = Mapping[str, object]

class RequestOptions(TypedDict, total=False):
    headers: Headers
    max_retries: int
    timeout: float | Timeout | None
    params: Query
    extra_json: AnyMapping
    idempotency_key: str
    follow_redirects: bool

# ---------------------------------------------------------------------------
# Public Clients
# ---------------------------------------------------------------------------

class Client: ...
class AsyncClient: ...

class Parallel:
    """
    Construct a new synchronous Parallel client instance.

    This automatically infers the `api_key` argument from the `PARALLEL_API_KEY` environment variable if it is not provided.
    """
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

    # Resources
    @property
    def task_run(self) -> TaskRunResource: ...
    @property
    def beta(self) -> BetaResource: ...

    # Response wrappers
    @property
    def with_raw_response(self) -> ParallelWithRawResponse: ...
    @property
    def with_streaming_response(self) -> ParallelWithStreamedResponse: ...

    # Copy / options
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
    ) -> Parallel: ...

    with_options: Callable[..., Parallel]

class AsyncParallel:
    """
    Construct a new async AsyncParallel client instance.

    This automatically infers the `api_key` argument from the `PARALLEL_API_KEY` environment variable if it is not provided.
    """
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
    def task_run(self) -> AsyncTaskRunResource: ...
    @property
    def beta(self) -> AsyncBetaResource: ...

    @property
    def with_raw_response(self) -> AsyncParallelWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncParallelWithStreamedResponse: ...

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
    ) -> AsyncParallel: ...

    with_options: Callable[..., AsyncParallel]

Client = Parallel
AsyncClient = AsyncParallel

# ---------------------------------------------------------------------------
# Raw/streaming response client wrappers
# ---------------------------------------------------------------------------

class ParallelWithRawResponse:
    @property
    def task_run(self) -> TaskRunResourceWithRawResponse: ...
    @property
    def beta(self) -> BetaResourceWithRawResponse: ...

class AsyncParallelWithRawResponse:
    @property
    def task_run(self) -> AsyncTaskRunResourceWithRawResponse: ...
    @property
    def beta(self) -> AsyncBetaResourceWithRawResponse: ...

class ParallelWithStreamedResponse:
    @property
    def task_run(self) -> TaskRunResourceWithStreamingResponse: ...
    @property
    def beta(self) -> BetaResourceWithStreamingResponse: ...

class AsyncParallelWithStreamedResponse:
    @property
    def task_run(self) -> AsyncTaskRunResourceWithStreamingResponse: ...
    @property
    def beta(self) -> AsyncBetaResourceWithStreamingResponse: ...

# ---------------------------------------------------------------------------
# Core Types (parallel.types.*) - summarized, but with visible docstrings preserved
# ---------------------------------------------------------------------------

class Warning(BaseModel):
    """Human-readable message for a task."""
    message: str
    type: Literal["spec_validation_warning", "input_validation_warning", "warning"]
    detail: Optional[Dict[str, object]] = ...

class ErrorObject(BaseModel):
    """An error message."""
    message: str
    ref_id: str
    detail: Optional[Dict[str, object]] = ...

class ErrorResponse(BaseModel):
    """Response object used for non-200 status codes."""
    error: ErrorObject
    type: Literal["error"]

class SourcePolicy(BaseModel):
    """
    Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    after_date: Optional[date] = ...
    exclude_domains: Optional[List[str]] = ...
    include_domains: Optional[List[str]] = ...

class AutoSchema(BaseModel):
    """Auto schema for a task input or output."""
    type: Optional[Literal["auto"]] = ...

class TextSchema(BaseModel):
    """Text description for a task input or output."""
    description: Optional[str] = ...
    type: Optional[Literal["text"]] = ...

class JsonSchema(BaseModel):
    """JSON schema for a task input or output."""
    json_schema: Dict[str, object]
    type: Optional[Literal["json"]] = ...

class Citation(BaseModel):
    """A citation for a task output."""
    url: str
    excerpts: Optional[List[str]] = ...
    title: Optional[str] = ...

class FieldBasis(BaseModel):
    """Citations and reasoning supporting one field of a task output."""
    field: str
    reasoning: str
    citations: Optional[List[Citation]] = ...
    confidence: Optional[str] = ...

# Task spec type aliases
OutputSchema: TypeAlias = Union[JsonSchema, TextSchema, AutoSchema, str]
InputSchema: TypeAlias = Union[str, JsonSchema, TextSchema, None]

class TaskSpec(BaseModel):
    """
    Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`. Not
    specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    output_schema: OutputSchema
    input_schema: Optional[InputSchema] = ...

class TaskRun(BaseModel):
    """Status of a task run."""
    created_at: Optional[str] = ...
    is_active: bool
    modified_at: Optional[str] = ...
    processor: str
    run_id: str
    status: Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]
    error: Optional[ErrorObject] = ...
    metadata: Optional[Dict[str, Union[str, float, bool]]] = ...
    task_group_id: Optional[str] = ...
    warnings: Optional[List[Warning]] = ...

class TaskRunTextOutput(BaseModel):
    """Output from a task that returns text."""
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
    beta_fields: Optional[Dict[str, object]] = ...

class TaskRunJsonOutput(BaseModel):
    """Output from a task that returns JSON."""
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: Literal["json"]
    beta_fields: Optional[Dict[str, object]] = ...
    output_schema: Optional[Dict[str, object]] = ...

TaskRunResultOutput: TypeAlias = Annotated[Union[TaskRunTextOutput, TaskRunJsonOutput], Any]

class TaskRunResult(BaseModel):
    """Result of a task run."""
    output: TaskRunResultOutput
    run: TaskRun

# Parsed result generic
ContentType = TypeVar("ContentType", bound=pydantic.BaseModel)

class ParsedTaskRunTextOutput(TaskRunTextOutput, Generic[ContentType]):
    """The parsed output from the task run."""
    parsed: None

class ParsedTaskRunJsonOutput(TaskRunJsonOutput, Generic[ContentType]):
    """The parsed output from the task run."""
    parsed: Optional[ContentType] = ...

class ParsedTaskRunResult(TaskRunResult, Generic[ContentType]):
    """The parsed output from the task run."""
    output: Union[ParsedTaskRunTextOutput[ContentType], ParsedTaskRunJsonOutput[ContentType]]

# ---------------------------------------------------------------------------
# Param TypedDicts (selected; core ones)
# ---------------------------------------------------------------------------

class TaskRunResultParams(TypedDict, total=False):
    api_timeout: Annotated[int, Any]

class TaskRunCreateParams(TypedDict, total=False):
    """(Core) create params for task runs."""
    input: Union[str, Dict[str, object]]
    processor: str
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional["types.shared_params.SourcePolicy"]
    task_spec: Optional["TaskSpecParam"]

# TaskSpecParam / schema params
class AutoSchemaParam(TypedDict, total=False):
    """Auto schema for a task input or output."""
    type: Literal["auto"]

class TextSchemaParam(TypedDict, total=False):
    """Text description for a task input or output."""
    description: Optional[str]
    type: Literal["text"]

class JsonSchemaParam(TypedDict, total=False):
    """JSON schema for a task input or output."""
    json_schema: Dict[str, object]
    type: Literal["json"]

OutputSchemaParam: TypeAlias = Union[JsonSchemaParam, TextSchemaParam, AutoSchemaParam, str]
InputSchemaParam: TypeAlias = Union[str, JsonSchemaParam, TextSchemaParam]

OutputT = TypeVar("OutputT", bound=pydantic.BaseModel)

class TaskSpecParam(TypedDict, total=False):
    """
    Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`. Not
    specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    output_schema: OutputSchemaParam
    input_schema: Optional[InputSchemaParam]

# ---------------------------------------------------------------------------
# Resources: core TaskRun
# ---------------------------------------------------------------------------

class TaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        source_policy: Optional["types.shared_params.SourcePolicy"] | Omit = ...,
        task_spec: Optional[TaskSpecParam] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRun: ...

    def retrieve(
        self,
        run_id: str,
        *,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRun: ...

    def result(
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
    ) -> Union[TaskRunResult, ParsedTaskRunResult[OutputT]]: ...

    @property
    def with_raw_response(self) -> TaskRunResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> TaskRunResourceWithStreamingResponse: ...

class AsyncTaskRunResource:
    async def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        source_policy: Optional["types.shared_params.SourcePolicy"] | Omit = ...,
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

    @property
    def with_raw_response(self) -> AsyncTaskRunResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncTaskRunResourceWithStreamingResponse: ...

class TaskRunResourceWithRawResponse:
    create: Callable[..., APIResponse[TaskRun]]
    retrieve: Callable[..., APIResponse[TaskRun]]
    result: Callable[..., APIResponse[TaskRunResult]]

class AsyncTaskRunResourceWithRawResponse:
    create: Callable[..., Awaitable[AsyncAPIResponse[TaskRun]]]
    retrieve: Callable[..., Awaitable[AsyncAPIResponse[TaskRun]]]
    result: Callable[..., Awaitable[AsyncAPIResponse[TaskRunResult]]]

class TaskRunResourceWithStreamingResponse:
    create: Callable[..., Any]
    retrieve: Callable[..., Any]
    result: Callable[..., Any]

class AsyncTaskRunResourceWithStreamingResponse:
    create: Callable[..., Any]
    retrieve: Callable[..., Any]
    result: Callable[..., Any]

# ---------------------------------------------------------------------------
# Beta API surface (resources + main beta types)
# ---------------------------------------------------------------------------

ParallelBetaParam: TypeAlias = Union[
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

class Webhook(BaseModel):
    """Webhooks for Task Runs."""
    url: str
    event_types: Optional[List[Literal["task_run.status"]]] = ...

class WebhookParam(TypedDict, total=False):
    """Webhooks for Task Runs."""
    url: str
    event_types: List[Literal["task_run.status"]]

class McpServer(BaseModel):
    """MCP server configuration."""
    name: str
    url: str
    allowed_tools: Optional[List[str]] = ...
    headers: Optional[Dict[str, str]] = ...
    type: Optional[Literal["url"]] = ...

class McpServerParam(TypedDict, total=False):
    """MCP server configuration."""
    name: str
    url: str
    allowed_tools: Optional[Sequence[str]]
    headers: Optional[Dict[str, str]]
    type: Literal["url"]

class McpToolCall(BaseModel):
    """Result of an MCP tool call."""
    arguments: str
    server_name: str
    tool_call_id: str
    tool_name: str
    content: Optional[str] = ...
    error: Optional[str] = ...

class BetaRunInput(BaseModel):
    """Task run input with additional beta fields."""
    input: Union[str, Dict[str, object]]
    processor: str
    enable_events: Optional[bool] = ...
    mcp_servers: Optional[List[McpServer]] = ...
    metadata: Optional[Dict[str, Union[str, float, bool]]] = ...
    source_policy: Optional[SourcePolicy] = ...
    task_spec: Optional[TaskSpec] = ...
    webhook: Optional[Webhook] = ...

class BetaRunInputParam(TypedDict, total=False):
    """Task run input with additional beta fields."""
    input: Union[str, Dict[str, object]]
    processor: str
    enable_events: Optional[bool]
    mcp_servers: Optional[Iterable[McpServerParam]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional["types.shared_params.SourcePolicy"]
    task_spec: Optional[TaskSpecParam]
    webhook: Optional[WebhookParam]

# Beta task run result
class BetaTaskRunTextOutput(BaseModel):
    """Output from a task that returns text."""
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
    beta_fields: Optional[Dict[str, object]] = ...
    mcp_tool_calls: Optional[List[McpToolCall]] = ...

class BetaTaskRunJsonOutput(BaseModel):
    """Output from a task that returns JSON."""
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: Literal["json"]
    beta_fields: Optional[Dict[str, object]] = ...
    mcp_tool_calls: Optional[List[McpToolCall]] = ...
    output_schema: Optional[Dict[str, object]] = ...

BetaTaskRunResultOutput: TypeAlias = Annotated[Union[BetaTaskRunTextOutput, BetaTaskRunJsonOutput], Any]

class BetaTaskRunResult(BaseModel):
    """Result of a beta task run. Available only if beta headers are specified."""
    output: BetaTaskRunResultOutput
    run: TaskRun

# Beta events for task runs
class TaskRunProgressStatsEventSourceStats(BaseModel):
    """Source stats describing progress so far."""
    num_sources_considered: Optional[int] = ...
    num_sources_read: Optional[int] = ...
    sources_read_sample: Optional[List[str]] = ...

class TaskRunProgressStatsEvent(BaseModel):
    """A progress update for a task run."""
    progress_meter: float
    source_stats: TaskRunProgressStatsEventSourceStats
    type: Literal["task_run.progress_stats"]

class TaskRunProgressMessageEvent(BaseModel):
    """A message for a task run progress update."""
    message: str
    timestamp: Optional[str] = ...
    type: Literal[
        "task_run.progress_msg.plan",
        "task_run.progress_msg.search",
        "task_run.progress_msg.result",
        "task_run.progress_msg.tool_call",
        "task_run.progress_msg.exec_status",
    ]

class ErrorEvent(BaseModel):
    """Event indicating an error."""
    error: ErrorObject
    type: Literal["error"]

class BetaTaskRunEvent(BaseModel):
    """
    Event when a task run transitions to a non-active status.

    May indicate completion, cancellation, or failure.
    """
    event_id: Optional[str] = ...
    run: TaskRun
    type: Literal["task_run.state"]
    input: Optional[BetaRunInput] = ...
    output: Optional[Union[TaskRunTextOutput, TaskRunJsonOutput, None]] = ...

TaskRunEventsResponse: TypeAlias = Annotated[
    Union[TaskRunProgressStatsEvent, TaskRunProgressMessageEvent, BetaTaskRunEvent, ErrorEvent],
    Any,
]

# Beta search/extract
class WebSearchResult(BaseModel):
    """A single search result from the web search API."""
    url: str
    excerpts: Optional[List[str]] = ...
    publish_date: Optional[str] = ...
    title: Optional[str] = ...

class SearchResult(BaseModel):
    """Output for the Search API."""
    results: List[WebSearchResult]
    search_id: str
    usage: Optional[List[UsageItem]] = ...
    warnings: Optional[List[Warning]] = ...

class ExtractError(BaseModel):
    """Extract error details."""
    content: Optional[str] = ...
    error_type: str
    http_status_code: Optional[int] = ...
    url: str

class ExtractResult(BaseModel):
    """Extract result for a single URL."""
    url: str
    excerpts: Optional[List[str]] = ...
    full_content: Optional[str] = ...
    publish_date: Optional[str] = ...
    title: Optional[str] = ...

class ExtractResponse(BaseModel):
    """Fetch result."""
    errors: List[ExtractError]
    extract_id: str
    results: List[ExtractResult]
    usage: Optional[List[UsageItem]] = ...
    warnings: Optional[List[Warning]] = ...

# ---------------------------------------------------------------------------
# Beta resources: Beta, Beta.TaskRun, Beta.TaskGroup, Beta.FindAll (signatures only)
# ---------------------------------------------------------------------------

class BetaResource:
    @property
    def task_run(self) -> BetaTaskRunResource: ...
    @property
    def task_group(self) -> TaskGroupResource: ...
    @property
    def findall(self) -> FindAllResource: ...

    def search(
        self,
        *,
        excerpts: Any = ...,
        fetch_policy: Any = ...,
        max_chars_per_result: Optional[int] | Omit = ...,
        max_results: Optional[int] | Omit = ...,
        mode: Optional[Literal["one-shot", "agentic"]] | Omit = ...,
        objective: Optional[str] | Omit = ...,
        processor: Optional[Literal["base", "pro"]] | Omit = ...,
        search_queries: Optional[Sequence[str]] | Omit = ...,
        source_policy: Optional["types.shared_params.SourcePolicy"] | Omit = ...,
        betas: List[ParallelBetaParam] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> SearchResult: ...

    def extract(
        self,
        *,
        urls: Sequence[str],
        excerpts: Any = ...,
        fetch_policy: Any = ...,
        full_content: Any = ...,
        objective: Optional[str] | Omit = ...,
        search_queries: Optional[Sequence[str]] | Omit = ...,
        betas: List[ParallelBetaParam] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ExtractResponse: ...

    @property
    def with_raw_response(self) -> BetaResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> BetaResourceWithStreamingResponse: ...

class AsyncBetaResource:
    @property
    def task_run(self) -> AsyncBetaTaskRunResource: ...
    @property
    def task_group(self) -> AsyncTaskGroupResource: ...
    @property
    def findall(self) -> AsyncFindAllResource: ...

    async def search(self, **kwargs: Any) -> SearchResult: ...
    async def extract(self, **kwargs: Any) -> ExtractResponse: ...

    @property
    def with_raw_response(self) -> AsyncBetaResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncBetaResourceWithStreamingResponse: ...

class BetaResourceWithRawResponse:
    search: Callable[..., Any]
    extract: Callable[..., Any]
    @property
    def task_run(self) -> BetaTaskRunResourceWithRawResponse: ...
    @property
    def task_group(self) -> TaskGroupResourceWithRawResponse: ...
    @property
    def findall(self) -> FindAllResourceWithRawResponse: ...

class AsyncBetaResourceWithRawResponse:
    search: Callable[..., Any]
    extract: Callable[..., Any]
    @property
    def task_run(self) -> AsyncBetaTaskRunResourceWithRawResponse: ...
    @property
    def task_group(self) -> AsyncTaskGroupResourceWithRawResponse: ...
    @property
    def findall(self) -> AsyncFindAllResourceWithRawResponse: ...

class BetaResourceWithStreamingResponse:
    search: Callable[..., Any]
    extract: Callable[..., Any]
    @property
    def task_run(self) -> BetaTaskRunResourceWithStreamingResponse: ...
    @property
    def task_group(self) -> TaskGroupResourceWithStreamingResponse: ...
    @property
    def findall(self) -> FindAllResourceWithStreamingResponse: ...

class AsyncBetaResourceWithStreamingResponse:
    search: Callable[..., Any]
    extract: Callable[..., Any]
    @property
    def task_run(self) -> AsyncBetaTaskRunResourceWithStreamingResponse: ...
    @property
    def task_group(self) -> AsyncTaskGroupResourceWithStreamingResponse: ...
    @property
    def findall(self) -> AsyncFindAllResourceWithStreamingResponse: ...

# Beta task_run resource (create/events/result)
class BetaTaskRunResource:
    def create(self, **kwargs: Any) -> TaskRun: ...
    def events(
        self,
        run_id: str,
        *,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> Stream[TaskRunEventsResponse]: ...
    def result(self, run_id: str, **kwargs: Any) -> BetaTaskRunResult: ...

    @property
    def with_raw_response(self) -> BetaTaskRunResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> BetaTaskRunResourceWithStreamingResponse: ...

class AsyncBetaTaskRunResource:
    async def create(self, **kwargs: Any) -> TaskRun: ...
    async def events(self, run_id: str, **kwargs: Any) -> AsyncStream[TaskRunEventsResponse]: ...
    async def result(self, run_id: str, **kwargs: Any) -> BetaTaskRunResult: ...

    @property
    def with_raw_response(self) -> AsyncBetaTaskRunResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncBetaTaskRunResourceWithStreamingResponse: ...

class BetaTaskRunResourceWithRawResponse: ...
class AsyncBetaTaskRunResourceWithRawResponse: ...
class BetaTaskRunResourceWithStreamingResponse: ...
class AsyncBetaTaskRunResourceWithStreamingResponse: ...

# TaskGroup / FindAll resources are substantial; included as opaque entry points.
class TaskGroupResource: ...
class TaskGroupResourceWithRawResponse: ...
class TaskGroupResourceWithStreamingResponse: ...
class AsyncTaskGroupResource: ...
class AsyncTaskGroupResourceWithRawResponse: ...
class AsyncTaskGroupResourceWithStreamingResponse: ...

class FindAllResource: ...
class FindAllResourceWithRawResponse: ...
class FindAllResourceWithStreamingResponse: ...
class AsyncFindAllResource: ...
class AsyncFindAllResourceWithRawResponse: ...
class AsyncFindAllResourceWithStreamingResponse: ...

# ---------------------------------------------------------------------------
# `parallel.types` module proxy (exposed by `parallel` as `types`)
# ---------------------------------------------------------------------------

class types:
    Warning = Warning
    ErrorObject = ErrorObject
    SourcePolicy = SourcePolicy
    ErrorResponse = ErrorResponse
    Citation = Citation
    TaskRun = TaskRun
    TaskSpec = TaskSpec
    AutoSchema = AutoSchema
    FieldBasis = FieldBasis
    JsonSchema = JsonSchema
    TextSchema = TextSchema
    TaskRunResult = TaskRunResult
    TaskSpecParam = TaskSpecParam
    AutoSchemaParam = AutoSchemaParam
    JsonSchemaParam = JsonSchemaParam
    TextSchemaParam = TextSchemaParam
    TaskRunJsonOutput = TaskRunJsonOutput
    TaskRunTextOutput = TaskRunTextOutput
    ParsedTaskRunResult = ParsedTaskRunResult
    TaskRunCreateParams = TaskRunCreateParams
    TaskRunResultParams = TaskRunResultParams

# ---------------------------------------------------------------------------
# Defaults exported by parallel.__init__
# ---------------------------------------------------------------------------

DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits

class DefaultHttpxClient(httpx.Client): ...
class DefaultAsyncHttpxClient(httpx.AsyncClient): ...
class DefaultAioHttpClient(httpx.AsyncClient): ...
```

---

If you want me to **make this truly “entire footprint”** (every model/param/event in `types/` and `types/beta/`, plus every resource method signature in `resources/` and `resources/beta/`, with all docstrings copied), tell me one of these:
1) paste the remaining files (or at least the ones with public docstrings), or  
2) give me permission to assume I can “read all files” and send the remainder in chunks (because a single reply might exceed message limits).