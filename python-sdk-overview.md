Below is a **single `parallel.pyi`** “API footprint” stub that captures the public surface area an LLM (or type-checker) would care about: client entrypoints, resources, key models/params, streaming, and exceptions.  

Notes:
- I **only copied docstrings where they exist in the sources shown** and copied them **verbatim** (no edits). Many generated classes in your dump don’t include docstrings at the method level; those are therefore absent here.
- This is a *summary stub*, not a full fidelity stub of every internal helper. It focuses on what a user calls/receives.

```pyi
# parallel.pyi
# A single-file API footprint stub for the "parallel" SDK.

from __future__ import annotations

from datetime import date, datetime
from typing import (
    Any,
    Callable,
    Coroutine,
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
    NotRequired,
    ParamSpec,
    Protocol,
    Required,
    TypeAlias,
    TypedDict,
)

import httpx
import pydantic

__title__: str
__version__: str

# -------------------------
# Top-level re-exports
# -------------------------

# Sentinels / option helpers
class NotGiven:
    def __bool__(self) -> Literal[False]: ...
    def __repr__(self) -> str: ...

class Omit:
    def __bool__(self) -> Literal[False]: ...

NOT_GIVEN: NotGiven
not_given: NotGiven
omit: Omit

NoneType: Type[None]

Transport = httpx.BaseTransport
ProxiesTypes: TypeAlias = Union[str, httpx.Proxy, Dict[Union[str, httpx.URL], Union[None, str, httpx.URL, httpx.Proxy]]]
Timeout = httpx.Timeout

# Exceptions
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

DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits

# BaseModel export
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

def file_from_path(path: str) -> Any: ...

# -------------------------
# Core Types / Params
# -------------------------

class RequestOptions(TypedDict, total=False):
    headers: Mapping[str, Union[str, Omit]]
    max_retries: int
    timeout: float | httpx.Timeout | None
    params: Mapping[str, object]
    extra_json: Mapping[str, object]
    idempotency_key: str
    follow_redirects: bool

Headers: TypeAlias = Mapping[str, Union[str, Omit]]
Query: TypeAlias = Mapping[str, object]
Body: TypeAlias = object

# -------------------------
# Streaming (SSE)
# -------------------------

_T = TypeVar("_T")

class Stream(Generic[_T]):
    """Provides the core interface to iterate over a synchronous stream response."""
    response: httpx.Response
    def __iter__(self) -> Iterator[_T]: ...
    def __next__(self) -> _T: ...
    def close(self) -> None: ...
    def __enter__(self) -> "Stream[_T]": ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

class AsyncStream(Generic[_T]):
    """Provides the core interface to iterate over an asynchronous stream response."""
    response: httpx.Response
    def __aiter__(self) -> Any: ...
    async def __anext__(self) -> _T: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> "AsyncStream[_T]": ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

# -------------------------
# Response wrappers
# -------------------------

R = TypeVar("R")

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
    def parse(self, *, to: Type[_T]) -> _T: ...
    @overload
    def parse(self) -> R: ...
    def parse(self, *, to: Type[_T] | None = None) -> R | _T: ...

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
    async def parse(self, *, to: Type[_T]) -> _T: ...
    @overload
    async def parse(self) -> R: ...
    async def parse(self, *, to: Type[_T] | None = None) -> R | _T: ...

    async def read(self) -> bytes: ...
    async def text(self) -> str: ...
    async def json(self) -> object: ...
    async def close(self) -> None: ...
    async def iter_bytes(self, chunk_size: int | None = None) -> Any: ...
    async def iter_text(self, chunk_size: int | None = None) -> Any: ...
    async def iter_lines(self) -> Any: ...

# -------------------------
# Schemas
# -------------------------

class AutoSchemaParam(TypedDict, total=False):
    """Auto schema for a task input or output."""
    type: Literal["auto"]

class TextSchemaParam(TypedDict, total=False):
    """Text description for a task input or output."""
    description: Optional[str]
    type: Literal["text"]

class JsonSchemaParam(TypedDict, total=False):
    """JSON schema for a task input or output."""
    json_schema: Required[Dict[str, object]]
    type: Literal["json"]

class AutoSchema(BaseModel):
    """Auto schema for a task input or output."""
    type: Optional[Literal["auto"]] = None

class TextSchema(BaseModel):
    """Text description for a task input or output."""
    description: Optional[str] = None
    type: Optional[Literal["text"]] = None

class JsonSchema(BaseModel):
    """JSON schema for a task input or output."""
    json_schema: Dict[str, object]
    type: Optional[Literal["json"]] = None

OutputSchema: TypeAlias = Union[JsonSchema, TextSchema, AutoSchema, str]
InputSchema: TypeAlias = Union[str, JsonSchema, TextSchema, None]

class TaskSpec(BaseModel):
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`. Not
    specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    output_schema: OutputSchema
    input_schema: Optional[InputSchema] = None

OutputSchemaParam: TypeAlias = Union[JsonSchemaParam, TextSchemaParam, AutoSchemaParam, str]
InputSchemaParam: TypeAlias = Union[str, JsonSchemaParam, TextSchemaParam]

OutputT = TypeVar("OutputT", bound=pydantic.BaseModel)

class TaskSpecParam(TypedDict, total=False):
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`. Not
    specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    output_schema: Required[OutputSchemaParam]
    input_schema: NotRequired[Optional[InputSchemaParam]]

# -------------------------
# Shared models
# -------------------------

class ErrorObject(BaseModel):
    """An error message."""
    message: str
    ref_id: str
    detail: Optional[Dict[str, object]] = None

class ErrorResponse(BaseModel):
    """Response object used for non-200 status codes."""
    error: ErrorObject
    type: Literal["error"]

class Warning(BaseModel):
    """Human-readable message for a task."""
    message: str
    type: Literal["spec_validation_warning", "input_validation_warning", "warning"]
    detail: Optional[Dict[str, object]] = None

class SourcePolicy(BaseModel):
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    after_date: Optional[date] = None
    exclude_domains: Optional[List[str]] = None
    include_domains: Optional[List[str]] = None

class SourcePolicyParam(TypedDict, total=False):
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    after_date: Annotated[Union[str, date, None], Any]
    exclude_domains: Sequence[str]
    include_domains: Sequence[str]

# -------------------------
# Task run core models
# -------------------------

class TaskRun(BaseModel):
    """Status of a task run."""
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

class Citation(BaseModel):
    """A citation for a task output."""
    url: str
    excerpts: Optional[List[str]] = None
    title: Optional[str] = None

class FieldBasis(BaseModel):
    """Citations and reasoning supporting one field of a task output."""
    field: str
    reasoning: str
    citations: Optional[List[Citation]] = None
    confidence: Optional[str] = None

class TaskRunTextOutput(BaseModel):
    """Output from a task that returns text."""
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
    beta_fields: Optional[Dict[str, object]] = None

class TaskRunJsonOutput(BaseModel):
    """Output from a task that returns JSON."""
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: Literal["json"]
    beta_fields: Optional[Dict[str, object]] = None
    output_schema: Optional[Dict[str, object]] = None

TaskRunResultOutput: TypeAlias = Annotated[Union[TaskRunTextOutput, TaskRunJsonOutput], Any]

class TaskRunResult(BaseModel):
    """Result of a task run."""
    output: TaskRunResultOutput
    run: TaskRun

class ParsedTaskRunTextOutput(TaskRunTextOutput, Generic[OutputT]):
    parsed: None

class ParsedTaskRunJsonOutput(TaskRunJsonOutput, Generic[OutputT]):
    parsed: Optional[OutputT] = None

class ParsedTaskRunResult(TaskRunResult, Generic[OutputT]):
    output: Union[ParsedTaskRunTextOutput[OutputT], ParsedTaskRunJsonOutput[OutputT]]

class TaskRunCreateParams(TypedDict, total=False):
    input: Required[Union[str, Dict[str, object]]]
    processor: Required[str]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicyParam]
    task_spec: Optional[TaskSpecParam]

class TaskRunResultParams(TypedDict, total=False):
    api_timeout: Annotated[int, Any]

# -------------------------
# Beta types (subset needed for footprints)
# -------------------------

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

class WebSearchResult(BaseModel):
    """A single search result from the web search API."""
    url: str
    excerpts: Optional[List[str]] = None
    publish_date: Optional[str] = None
    title: Optional[str] = None

class SearchResult(BaseModel):
    """Output for the Search API."""
    results: List[WebSearchResult]
    search_id: str
    usage: Optional[List[UsageItem]] = None
    warnings: Optional[List[Warning]] = None

class ExtractError(BaseModel):
    """Extract error details."""
    content: Optional[str] = None
    error_type: str
    http_status_code: Optional[int] = None
    url: str

class ExtractResult(BaseModel):
    """Extract result for a single URL."""
    url: str
    excerpts: Optional[List[str]] = None
    full_content: Optional[str] = None
    publish_date: Optional[str] = None
    title: Optional[str] = None

class ExtractResponse(BaseModel):
    """Fetch result."""
    errors: List[ExtractError]
    extract_id: str
    results: List[ExtractResult]
    usage: Optional[List[UsageItem]] = None
    warnings: Optional[List[Warning]] = None

class WebhookParam(TypedDict, total=False):
    """Webhooks for Task Runs."""
    url: Required[str]
    event_types: List[Literal["task_run.status"]]

class McpServerParam(TypedDict, total=False):
    """MCP server configuration."""
    name: Required[str]
    url: Required[str]
    allowed_tools: Optional[Sequence[str]]
    headers: Optional[Dict[str, str]]
    type: Literal["url"]

class TaskRunEventsResponse(BaseModel): ...
class TaskGroupEventsResponse(BaseModel): ...
class TaskGroupGetRunsResponse(BaseModel): ...
class FindAllEventsResponse(BaseModel): ...

class BetaTaskRunResult(BaseModel):
    """Result of a beta task run. Available only if beta headers are specified."""
    output: Any
    run: TaskRun

# -------------------------
# Resources
# -------------------------

class TaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        source_policy: Optional[SourcePolicyParam] = ...,
        task_spec: Optional[TaskSpecParam] = ...,
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
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        output: Optional[OutputSchema] = ...,
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
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
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
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
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
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        source_policy: Optional[SourcePolicyParam] = ...,
        task_spec: Optional[TaskSpecParam] = ...,
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
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        output: Optional[OutputSchema] = ...,
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
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
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
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
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
    create: Callable[..., Coroutine[Any, Any, AsyncAPIResponse[TaskRun]]]
    retrieve: Callable[..., Coroutine[Any, Any, AsyncAPIResponse[TaskRun]]]
    result: Callable[..., Coroutine[Any, Any, AsyncAPIResponse[TaskRunResult]]]

class TaskRunResourceWithStreamingResponse:
    create: Callable[..., Any]
    retrieve: Callable[..., Any]
    result: Callable[..., Any]

class AsyncTaskRunResourceWithStreamingResponse:
    create: Callable[..., Any]
    retrieve: Callable[..., Any]
    result: Callable[..., Any]

# -------------------------
# Beta resources
# -------------------------

class BetaTaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        enable_events: Optional[bool] | Omit = ...,
        mcp_servers: Optional[Iterable[McpServerParam]] | Omit = ...,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        source_policy: Optional[SourcePolicyParam] | Omit = ...,
        task_spec: Optional[TaskSpecParam] | Omit = ...,
        webhook: Optional[WebhookParam] | Omit = ...,
        betas: List[ParallelBetaParam] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRun: ...

    def events(
        self,
        run_id: str,
        *,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> Stream[Any]: ...

    def result(
        self,
        run_id: str,
        *,
        api_timeout: int | Omit = ...,
        betas: List[ParallelBetaParam] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> BetaTaskRunResult: ...

class AsyncBetaTaskRunResource:
    async def create(self, **kwargs: Any) -> TaskRun: ...
    async def events(self, run_id: str, **kwargs: Any) -> AsyncStream[Any]: ...
    async def result(self, run_id: str, **kwargs: Any) -> BetaTaskRunResult: ...

class BetaResource:
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
        source_policy: Optional[SourcePolicyParam] | Omit = ...,
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
        excerpts: Any | Omit = ...,
        fetch_policy: Any | Omit = ...,
        full_content: Any | Omit = ...,
        objective: Optional[str] | Omit = ...,
        search_queries: Optional[Sequence[str]] | Omit = ...,
        betas: List[ParallelBetaParam] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ExtractResponse: ...

    @property
    def task_run(self) -> BetaTaskRunResource: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

    @property
    def with_raw_response(self) -> BetaResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> BetaResourceWithStreamingResponse: ...

class AsyncBetaResource:
    async def search(self, **kwargs: Any) -> SearchResult: ...
    async def extract(self, **kwargs: Any) -> ExtractResponse: ...
    @property
    def task_run(self) -> AsyncBetaTaskRunResource: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...
    @property
    def with_raw_response(self) -> AsyncBetaResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncBetaResourceWithStreamingResponse: ...

class BetaResourceWithRawResponse:
    search: Callable[..., APIResponse[SearchResult]]
    extract: Callable[..., APIResponse[ExtractResponse]]
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

class AsyncBetaResourceWithRawResponse:
    search: Callable[..., Coroutine[Any, Any, AsyncAPIResponse[SearchResult]]]
    extract: Callable[..., Coroutine[Any, Any, AsyncAPIResponse[ExtractResponse]]]
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

class BetaResourceWithStreamingResponse:
    search: Callable[..., Any]
    extract: Callable[..., Any]
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

class AsyncBetaResourceWithStreamingResponse:
    search: Callable[..., Any]
    extract: Callable[..., Any]
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

# -------------------------
# Clients
# -------------------------

class Parallel:
    api_key: str

    def __init__(
        self,
        *,
        api_key: str | None = ...,
        base_url: str | httpx.URL | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
        max_retries: int = ...,
        default_headers: Mapping[str, str] | None = ...,
        default_query: Mapping[str, object] | None = ...,
        http_client: httpx.Client | None = ...,
        _strict_response_validation: bool = ...,
    ) -> None: ...

    @property
    def task_run(self) -> TaskRunResource: ...
    @property
    def beta(self) -> BetaResource: ...

    def copy(
        self,
        *,
        api_key: str | None = ...,
        base_url: str | httpx.URL | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
        http_client: httpx.Client | None = ...,
        max_retries: int | NotGiven = ...,
        default_headers: Mapping[str, str] | None = ...,
        set_default_headers: Mapping[str, str] | None = ...,
        default_query: Mapping[str, object] | None = ...,
        set_default_query: Mapping[str, object] | None = ...,
        _extra_kwargs: Mapping[str, Any] = ...,
    ) -> Parallel: ...

    with_options: Callable[..., Parallel]

    @property
    def with_raw_response(self) -> ParallelWithRawResponse: ...
    @property
    def with_streaming_response(self) -> ParallelWithStreamedResponse: ...

class AsyncParallel:
    api_key: str

    def __init__(
        self,
        *,
        api_key: str | None = ...,
        base_url: str | httpx.URL | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
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

    def copy(
        self,
        *,
        api_key: str | None = ...,
        base_url: str | httpx.URL | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
        http_client: httpx.AsyncClient | None = ...,
        max_retries: int | NotGiven = ...,
        default_headers: Mapping[str, str] | None = ...,
        set_default_headers: Mapping[str, str] | None = ...,
        default_query: Mapping[str, object] | None = ...,
        set_default_query: Mapping[str, object] | None = ...,
        _extra_kwargs: Mapping[str, Any] = ...,
    ) -> AsyncParallel: ...

    with_options: Callable[..., AsyncParallel]

    @property
    def with_raw_response(self) -> AsyncParallelWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncParallelWithStreamedResponse: ...

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

# Aliases
Client = Parallel
AsyncClient = AsyncParallel

# -------------------------
# "types" namespace (light)
# -------------------------

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

# -------------------------
# resources proxy (runtime in package; as stub we expose module-ish)
# -------------------------

class resources:
    TaskRunResource = TaskRunResource
    AsyncTaskRunResource = AsyncTaskRunResource
    TaskRunResourceWithRawResponse = TaskRunResourceWithRawResponse
    AsyncTaskRunResourceWithRawResponse = AsyncTaskRunResourceWithRawResponse
    TaskRunResourceWithStreamingResponse = TaskRunResourceWithStreamingResponse
    AsyncTaskRunResourceWithStreamingResponse = AsyncTaskRunResourceWithStreamingResponse
```

If you want, I can regenerate this in a more “complete” way (still single-file) by:
1) including the **entire beta TaskGroup + FindAll resource method signatures**, and  
2) adding **all TypedDict params and union event types** (TaskRunEventsResponse/TaskGroupEventsResponse/FindAllEventsResponse) as proper discriminated unions, matching your `PropertyInfo(discriminator="type")` setup.