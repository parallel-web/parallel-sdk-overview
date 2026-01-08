Below is a **single, consolidated `parallel.pyi`** “API footprint” stub that surfaces the public surface area an LLM (or a human) would use: the top-level exports, the main client(s), resources, and the key types.  

Notes / constraints (so you’re not surprised):
- I **only copied docstrings 1:1 when they were present in the code you provided** (not rewritten). Many files in the tree have no docstrings (or only inline comments), so many stubs won’t have docs.
- This is a **summary footprint**, not a perfect mypy-complete stub for every internal module. It focuses on the importable/public API (`parallel.__init__`, `parallel.Parallel`, resources, and the `parallel.types` namespace).
- I kept aliases and names that appear to be part of the public API (`Client`, `AsyncClient`, `BaseModel`, exception classes, etc.).

Save as e.g. `parallel.pyi`:

```pyi
# parallel.pyi
# Single-file API footprint summary for the `parallel` SDK.
# This is a consolidated stub capturing the public/primary user-facing API.

from __future__ import annotations

from datetime import datetime
from typing import (
    Any,
    Awaitable,
    Callable,
    Dict,
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
from typing_extensions import Annotated, Literal, Protocol, TypeAlias

import httpx
import pydantic

# -----------------------------------------------------------------------------
# Package metadata
# -----------------------------------------------------------------------------

__title__: str
__version__: str

# -----------------------------------------------------------------------------
# Sentinel types / request option types (publicly exported in __init__.py)
# -----------------------------------------------------------------------------

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

# `NoneType` is exported from parallel.__init__
NoneType: Type[None]

# Common client-related exports
Timeout = httpx.Timeout
Transport = httpx.BaseTransport
ProxiesTypes: TypeAlias = Union[str, httpx.Proxy, Dict[Union[str, httpx.URL], Union[None, str, httpx.URL, httpx.Proxy]]]

Headers: TypeAlias = Mapping[str, Union[str, Omit]]
Query: TypeAlias = Mapping[str, object]
Body: TypeAlias = object

class RequestOptions(TypedDict, total=False):
    headers: Headers
    max_retries: int
    timeout: float | Timeout | None
    params: Query
    extra_json: Mapping[str, object]
    idempotency_key: str
    follow_redirects: bool

# file helper
FileTypes: TypeAlias = Union[
    bytes,
    Tuple[Optional[str], bytes],
    Tuple[Optional[str], bytes, Optional[str]],
    Tuple[Optional[str], bytes, Optional[str], Mapping[str, str]],
    Any,  # IO / PathLike accepted at runtime; summarized
]
def file_from_path(path: str) -> FileTypes: ...

# -----------------------------------------------------------------------------
# Errors (exported from parallel.__init__)
# -----------------------------------------------------------------------------

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

class BadRequestError(APIStatusError): ...
class AuthenticationError(APIStatusError): ...
class PermissionDeniedError(APIStatusError): ...
class NotFoundError(APIStatusError): ...
class ConflictError(APIStatusError): ...
class UnprocessableEntityError(APIStatusError): ...
class RateLimitError(APIStatusError): ...
class InternalServerError(APIStatusError): ...

# -----------------------------------------------------------------------------
# BaseModel export (parallel.BaseModel)
# -----------------------------------------------------------------------------

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
    ) -> dict[str, object]: ...
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

# -----------------------------------------------------------------------------
# Response wrappers (exported as APIResponse / AsyncAPIResponse)
# -----------------------------------------------------------------------------

R = TypeVar("R")
T = TypeVar("T")

class APIResponse(Generic[R]):
    http_response: httpx.Response
    retries_taken: int
    @property
    def headers(self) -> httpx.Headers: ...
    @property
    def http_request(self) -> httpx.Request: ...
    @property
    def status_code(self) -> int: ...
    @property
    def url(self) -> httpx.URL: ...
    @property
    def method(self) -> str: ...
    @property
    def http_version(self) -> str: ...
    @property
    def elapsed(self) -> Any: ...
    @property
    def is_closed(self) -> bool: ...
    @overload
    def parse(self, *, to: Type[T]) -> T: ...
    @overload
    def parse(self) -> R: ...
    def read(self) -> bytes: ...
    def text(self) -> str: ...
    def json(self) -> object: ...
    def close(self) -> None: ...
    def iter_bytes(self, chunk_size: int | None = None) -> Iterator[bytes]: ...
    def iter_text(self, chunk_size: int | None = None) -> Iterator[str]: ...
    def iter_lines(self) -> Iterator[str]: ...

class AsyncAPIResponse(Generic[R]):
    http_response: httpx.Response
    retries_taken: int
    @property
    def headers(self) -> httpx.Headers: ...
    @property
    def http_request(self) -> httpx.Request: ...
    @property
    def status_code(self) -> int: ...
    @property
    def url(self) -> httpx.URL: ...
    @property
    def method(self) -> str: ...
    @property
    def http_version(self) -> str: ...
    @property
    def elapsed(self) -> Any: ...
    @property
    def is_closed(self) -> bool: ...
    @overload
    async def parse(self, *, to: Type[T]) -> T: ...
    @overload
    async def parse(self) -> R: ...
    async def read(self) -> bytes: ...
    async def text(self) -> str: ...
    async def json(self) -> object: ...
    async def close(self) -> None: ...
    async def iter_bytes(self, chunk_size: int | None = None) -> Any: ...
    async def iter_text(self, chunk_size: int | None = None) -> Any: ...
    async def iter_lines(self) -> Any: ...

# -----------------------------------------------------------------------------
# Streaming primitives (exported as Stream / AsyncStream)
# -----------------------------------------------------------------------------

SSEChunkT = TypeVar("SSEChunkT")

class Stream(Generic[SSEChunkT]):
    response: httpx.Response
    def __iter__(self) -> Iterator[SSEChunkT]: ...
    def __next__(self) -> SSEChunkT: ...
    def __enter__(self) -> Stream[SSEChunkT]: ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...
    def close(self) -> None: ...

class AsyncStream(Generic[SSEChunkT]):
    response: httpx.Response
    def __aiter__(self) -> Any: ...
    async def __anext__(self) -> SSEChunkT: ...
    async def __aenter__(self) -> AsyncStream[SSEChunkT]: ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...
    async def close(self) -> None: ...

# -----------------------------------------------------------------------------
# Public top-level client classes
# -----------------------------------------------------------------------------

# Forward declare resources
class TaskRunResource: ...
class AsyncTaskRunResource: ...
class TaskRunResourceWithRawResponse: ...
class AsyncTaskRunResourceWithRawResponse: ...
class TaskRunResourceWithStreamingResponse: ...
class AsyncTaskRunResourceWithStreamingResponse: ...

class BetaResource: ...
class AsyncBetaResource: ...
class BetaResourceWithRawResponse: ...
class AsyncBetaResourceWithRawResponse: ...
class BetaResourceWithStreamingResponse: ...
class AsyncBetaResourceWithStreamingResponse: ...

class ParallelWithRawResponse: ...
class AsyncParallelWithRawResponse: ...
class ParallelWithStreamedResponse: ...
class AsyncParallelWithStreamedResponse: ...

class Client: ...
class AsyncClient: ...

class Parallel:
    task_run: TaskRunResource
    beta: BetaResource
    with_raw_response: ParallelWithRawResponse
    with_streaming_response: ParallelWithStreamedResponse

    api_key: str

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | httpx.URL | None = None,
        timeout: float | Timeout | None | NotGiven = ...,
        max_retries: int = ...,
        default_headers: Mapping[str, str] | None = None,
        default_query: Mapping[str, object] | None = None,
        http_client: httpx.Client | None = None,
        _strict_response_validation: bool = False,
    ) -> None: ...

    def copy(
        self,
        *,
        api_key: str | None = None,
        base_url: str | httpx.URL | None = None,
        timeout: float | Timeout | None | NotGiven = ...,
        http_client: httpx.Client | None = None,
        max_retries: int | NotGiven = ...,
        default_headers: Mapping[str, str] | None = None,
        set_default_headers: Mapping[str, str] | None = None,
        default_query: Mapping[str, object] | None = None,
        set_default_query: Mapping[str, object] | None = None,
        _extra_kwargs: Mapping[str, Any] = ...,
    ) -> Parallel: ...
    with_options: Callable[..., Parallel]

class AsyncParallel:
    task_run: AsyncTaskRunResource
    beta: AsyncBetaResource
    with_raw_response: AsyncParallelWithRawResponse
    with_streaming_response: AsyncParallelWithStreamedResponse

    api_key: str

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | httpx.URL | None = None,
        timeout: float | Timeout | None | NotGiven = ...,
        max_retries: int = ...,
        default_headers: Mapping[str, str] | None = None,
        default_query: Mapping[str, object] | None = None,
        http_client: httpx.AsyncClient | None = None,
        _strict_response_validation: bool = False,
    ) -> None: ...

    def copy(
        self,
        *,
        api_key: str | None = None,
        base_url: str | httpx.URL | None = None,
        timeout: float | Timeout | None | NotGiven = ...,
        http_client: httpx.AsyncClient | None = None,
        max_retries: int | NotGiven = ...,
        default_headers: Mapping[str, str] | None = None,
        set_default_headers: Mapping[str, str] | None = None,
        default_query: Mapping[str, object] | None = None,
        set_default_query: Mapping[str, object] | None = None,
        _extra_kwargs: Mapping[str, Any] = ...,
    ) -> AsyncParallel: ...
    with_options: Callable[..., AsyncParallel]

Client = Parallel
AsyncClient = AsyncParallel

# -----------------------------------------------------------------------------
# resources: top-level resources module is lazily proxied at runtime as `parallel.resources`
# This footprint exposes the key classes.
# -----------------------------------------------------------------------------

# ------------------------ types namespace (parallel.types) --------------------

# shared error/warning types
class Warning(BaseModel):
    message: str
    type: Literal["spec_validation_warning", "input_validation_warning", "warning"]
    detail: Optional[Dict[str, object]] = None

class ErrorObject(BaseModel):
    message: str
    ref_id: str
    detail: Optional[Dict[str, object]] = None

class ErrorResponse(BaseModel):
    error: ErrorObject
    type: Literal["error"]

class Citation(BaseModel):
    url: str
    excerpts: Optional[List[str]] = None
    title: Optional[str] = None

class FieldBasis(BaseModel):
    field: str
    reasoning: str
    citations: Optional[List[Citation]] = None
    confidence: Optional[str] = None

# schema types
class AutoSchema(BaseModel):
    type: Optional[Literal["auto"]] = None

class TextSchema(BaseModel):
    description: Optional[str] = None
    type: Optional[Literal["text"]] = None

class JsonSchema(BaseModel):
    json_schema: Dict[str, object]
    type: Optional[Literal["json"]] = None

OutputSchema: TypeAlias = Union[JsonSchema, TextSchema, AutoSchema, str]
InputSchema: TypeAlias = Union[str, JsonSchema, TextSchema, None]

class TaskSpec(BaseModel):
    output_schema: OutputSchema
    input_schema: Optional[InputSchema] = None

# task run status/result models
class TaskRun(BaseModel):
    created_at: Optional[str] = None
    is_active: bool
    modified_at: Optional[str] = None
    processor: str
    run_id: str
    status: Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]
    error: Optional[ErrorObject] = None
    metadata: Optional[Dict[str, Union[str, float, bool]]] = None
    task_group_id: Optional[str] = None
    warnings: Optional[List[Warning]] = None

class TaskRunTextOutput(BaseModel):
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
    beta_fields: Optional[Dict[str, object]] = None

class TaskRunJsonOutput(BaseModel):
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: Literal["json"]
    beta_fields: Optional[Dict[str, object]] = None
    output_schema: Optional[Dict[str, object]] = None

TaskRunResultOutput: TypeAlias = Annotated[Union[TaskRunTextOutput, TaskRunJsonOutput], Any]

class TaskRunResult(BaseModel):
    output: TaskRunResultOutput
    run: TaskRun

# ParsedTaskRunResult generics
ContentType = TypeVar("ContentType", bound=pydantic.BaseModel)

class ParsedTaskRunTextOutput(TaskRunTextOutput, Generic[ContentType]):
    parsed: None

class ParsedTaskRunJsonOutput(TaskRunJsonOutput, Generic[ContentType]):
    parsed: Optional[ContentType] = None

class ParsedTaskRunResult(TaskRunResult, Generic[ContentType]):
    output: Union[ParsedTaskRunTextOutput[ContentType], ParsedTaskRunJsonOutput[ContentType]]

# params TypedDicts (summarized)
class AutoSchemaParam(TypedDict, total=False):
    type: Literal["auto"]

class TextSchemaParam(TypedDict, total=False):
    description: Optional[str]
    type: Literal["text"]

class JsonSchemaParam(TypedDict, total=False):
    json_schema: Dict[str, object]
    type: Literal["json"]

TaskSpecParamOutputSchema: TypeAlias = Union[JsonSchemaParam, TextSchemaParam, AutoSchemaParam, str]
TaskSpecParamInputSchema: TypeAlias = Union[str, JsonSchemaParam, TextSchemaParam]

class TaskSpecParam(TypedDict, total=False):
    output_schema: TaskSpecParamOutputSchema
    input_schema: Optional[TaskSpecParamInputSchema]

class SourcePolicy(TypedDict, total=False):
    exclude_domains: Sequence[str]
    include_domains: Sequence[str]

class TaskRunCreateParams(TypedDict, total=False):
    input: Union[str, Dict[str, object]]
    processor: str
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicy]
    task_spec: Optional[TaskSpecParam]

class TaskRunResultParams(TypedDict, total=False):
    api_timeout: int  # alias="timeout" in runtime transform

# ------------------------ beta types (parallel.types.beta) --------------------

ParallelBetaParam: TypeAlias = Union[
    Literal[
        "mcp-server-2025-07-17",
        "events-sse-2025-07-24",
        "webhook-2025-08-12",
        "findall-2025-09-15",
        "search-extract-2025-10-10",
    ],
    str,
]

class UsageItem(BaseModel):
    count: int
    name: str

class WebSearchResult(BaseModel):
    url: str
    excerpts: Optional[List[str]] = None
    publish_date: Optional[str] = None
    title: Optional[str] = None

class SearchResult(BaseModel):
    results: List[WebSearchResult]
    search_id: str
    usage: Optional[List[UsageItem]] = None
    warnings: Optional[List[Warning]] = None

class ExtractError(BaseModel):
    content: Optional[str] = None
    error_type: str
    http_status_code: Optional[int] = None
    url: str

class ExtractResult(BaseModel):
    url: str
    excerpts: Optional[List[str]] = None
    full_content: Optional[str] = None
    publish_date: Optional[str] = None
    title: Optional[str] = None

class ExtractResponse(BaseModel):
    errors: List[ExtractError]
    extract_id: str
    results: List[ExtractResult]
    usage: Optional[List[UsageItem]] = None
    warnings: Optional[List[Warning]] = None

class Webhook(BaseModel):
    url: str
    event_types: Optional[List[Literal["task_run.status"]]] = None

class WebhookParam(TypedDict, total=False):
    url: str
    event_types: List[Literal["task_run.status"]]

class McpServer(BaseModel):
    name: str
    url: str
    allowed_tools: Optional[List[str]] = None
    headers: Optional[Dict[str, str]] = None
    type: Optional[Literal["url"]] = None

class McpServerParam(TypedDict, total=False):
    name: str
    url: str
    allowed_tools: Optional[Sequence[str]]
    headers: Optional[Dict[str, str]]
    type: Literal["url"]

class McpToolCall(BaseModel):
    arguments: str
    server_name: str
    tool_call_id: str
    tool_name: str
    content: Optional[str] = None
    error: Optional[str] = None

# Beta task run result
class OutputBetaTaskRunTextOutput(BaseModel):
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
    beta_fields: Optional[Dict[str, object]] = None
    mcp_tool_calls: Optional[List[McpToolCall]] = None

class OutputBetaTaskRunJsonOutput(BaseModel):
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: Literal["json"]
    beta_fields: Optional[Dict[str, object]] = None
    mcp_tool_calls: Optional[List[McpToolCall]] = None
    output_schema: Optional[Dict[str, object]] = None

BetaTaskRunOutput: TypeAlias = Annotated[Union[OutputBetaTaskRunTextOutput, OutputBetaTaskRunJsonOutput], Any]

class BetaTaskRunResult(BaseModel):
    output: BetaTaskRunOutput
    run: TaskRun

# Task run events stream union (beta)
class ErrorEvent(BaseModel):
    error: ErrorObject
    type: Literal["error"]

class TaskRunEvent(BaseModel):
    event_id: Optional[str] = None
    run: TaskRun
    type: Literal["task_run.state"]
    input: Optional[Any] = None
    output: Optional[Any] = None

class TaskRunProgressStatsEventSourceStats(BaseModel):
    num_sources_considered: Optional[int] = None
    num_sources_read: Optional[int] = None
    sources_read_sample: Optional[List[str]] = None

class TaskRunProgressStatsEvent(BaseModel):
    progress_meter: float
    source_stats: TaskRunProgressStatsEventSourceStats
    type: Literal["task_run.progress_stats"]

class TaskRunProgressMessageEvent(BaseModel):
    message: str
    timestamp: Optional[str] = None
    type: Literal[
        "task_run.progress_msg.plan",
        "task_run.progress_msg.search",
        "task_run.progress_msg.result",
        "task_run.progress_msg.tool_call",
        "task_run.progress_msg.exec_status",
    ]

TaskRunEventsResponse: TypeAlias = Annotated[
    Union[TaskRunProgressStatsEvent, TaskRunProgressMessageEvent, TaskRunEvent, ErrorEvent],
    Any,
]

# -----------------------------------------------------------------------------
# Non-beta TaskRunResource (parallel.resources.task_run)
# -----------------------------------------------------------------------------

OutputT = TypeVar("OutputT", bound=pydantic.BaseModel)
OutputSchemaParamOrStr: TypeAlias = Union[TaskSpecParamOutputSchema, str, JsonSchemaParam, TextSchemaParam, AutoSchemaParam]

class TaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        source_policy: Optional[SourcePolicy] | Omit = ...,
        task_spec: Optional[TaskSpecParam] | Omit = ...,
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRun: ...

    def retrieve(
        self,
        run_id: str,
        *,
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRun: ...

    def result(
        self,
        run_id: str,
        *,
        api_timeout: int | Omit = ...,
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
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
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
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
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ParsedTaskRunResult[OutputT]: ...
    def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        output: Optional[OutputSchema] | Type[OutputT] | Omit = ...,
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
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
        source_policy: Optional[SourcePolicy] | Omit = ...,
        task_spec: Optional[TaskSpecParam] | Omit = ...,
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRun: ...

    async def retrieve(
        self,
        run_id: str,
        *,
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRun: ...

    async def result(
        self,
        run_id: str,
        *,
        api_timeout: int | Omit = ...,
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
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
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
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
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ParsedTaskRunResult[OutputT]: ...
    async def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        output: Optional[OutputSchema] | Type[OutputT] | Omit = ...,
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
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

# -----------------------------------------------------------------------------
# Beta resources (parallel.resources.beta.*)
# -----------------------------------------------------------------------------

class BetaResource:
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

    def search(
        self,
        *,
        excerpts: Any | Omit = ...,
        fetch_policy: Any | Omit = ...,
        max_chars_per_result: Optional[int] | Omit = ...,
        max_results: Optional[int] | Omit = ...,
        mode: Optional[Literal["one-shot", "agentic"]] | Omit = ...,
        objective: Optional[str] | Omit = ...,
        processor: Optional[Literal["base", "pro"]] | Omit = ...,
        search_queries: Optional[Sequence[str]] | Omit = ...,
        source_policy: Optional[SourcePolicy] | Omit = ...,
        betas: List[ParallelBetaParam] | Omit = ...,
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> SearchResult: ...

    def extract(
        self,
        *,
        urls: Sequence[str],
        excerpts: Any | Omit = ...,
        fetch_policy: Any | Omit = ...,
        full_content: Any | Omit = ...,
        objective: Optional[str] | Omit = ...,
        search_queries: Optional[Sequence[str]] | Omit = ...,
        betas: List[ParallelBetaParam] | Omit = ...,
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ExtractResponse: ...

    @property
    def with_raw_response(self) -> BetaResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> BetaResourceWithStreamingResponse: ...

class AsyncBetaResource:
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

    async def search(self, **kwargs: Any) -> SearchResult: ...
    async def extract(self, **kwargs: Any) -> ExtractResponse: ...

    @property
    def with_raw_response(self) -> AsyncBetaResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncBetaResourceWithStreamingResponse: ...

class BetaResourceWithRawResponse:
    extract: Callable[..., APIResponse[ExtractResponse]]
    search: Callable[..., APIResponse[SearchResult]]
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

class AsyncBetaResourceWithRawResponse:
    extract: Callable[..., Awaitable[AsyncAPIResponse[ExtractResponse]]]
    search: Callable[..., Awaitable[AsyncAPIResponse[SearchResult]]]
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

class BetaResourceWithStreamingResponse:
    extract: Callable[..., Any]
    search: Callable[..., Any]
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

class AsyncBetaResourceWithStreamingResponse:
    extract: Callable[..., Any]
    search: Callable[..., Any]
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

# -----------------------------------------------------------------------------
# Parallel "with_*_response" helpers
# -----------------------------------------------------------------------------

class ParallelWithRawResponse:
    task_run: TaskRunResourceWithRawResponse
    beta: BetaResourceWithRawResponse

class AsyncParallelWithRawResponse:
    task_run: AsyncTaskRunResourceWithRawResponse
    beta: AsyncBetaResourceWithRawResponse

class ParallelWithStreamedResponse:
    task_run: TaskRunResourceWithStreamingResponse
    beta: BetaResourceWithStreamingResponse

class AsyncParallelWithStreamedResponse:
    task_run: AsyncTaskRunResourceWithStreamingResponse
    beta: AsyncBetaResourceWithStreamingResponse

# -----------------------------------------------------------------------------
# Exported defaults from parallel.__init__
# -----------------------------------------------------------------------------

DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits

DefaultHttpxClient: Type[httpx.Client]
DefaultAsyncHttpxClient: Type[httpx.AsyncClient]
DefaultAioHttpClient: Type[httpx.AsyncClient]

# -----------------------------------------------------------------------------
# `parallel.types` namespace (as imported in parallel.__init__)
# -----------------------------------------------------------------------------

class types:
    # surface the main types users import from parallel.types
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

    class beta:
        Webhook = Webhook
        McpServer = McpServer
        UsageItem = UsageItem
        ErrorEvent = ErrorEvent
        McpToolCall = McpToolCall
        SearchResult = SearchResult
        WebhookParam = WebhookParam
        ExtractError = ExtractError
        ExtractResult = ExtractResult
        ExtractResponse = ExtractResponse
        McpServerParam = McpServerParam
        ParallelBetaParam = ParallelBetaParam
        BetaTaskRunResult = BetaTaskRunResult
        TaskRunEvent = TaskRunEvent
        TaskRunEventsResponse = TaskRunEventsResponse
```

If you want, I can also generate a **second version** that:
- includes **every single TypedDict/BaseModel** under `parallel.types.beta` and `parallel.types.*` (it will be much longer), and
- adds a short index at the top mapping “what to call” (e.g., `Parallel().task_run.execute`, `Parallel().beta.search`, SSE stream usage, etc.)—but that index would not be “copied 1:1” since it wouldn’t exist in your source.