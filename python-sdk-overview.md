Below is a **single, monolithic `parallel.pyi`** “API footprint” stub file that captures the **public surface area** an LLM typically needs to understand how to use this SDK:

- Top-level exports from `parallel.__init__`
- Client classes (`Parallel`, `AsyncParallel`) and their key properties (`task_run`, `beta`, `with_raw_response`, `with_streaming_response`)
- Resources and resource methods with signatures and docstrings copied 1:1 where present in the provided sources
- Core models/types that show inputs/outputs for the API calls (TaskRun, TaskRunResult, ParsedTaskRunResult, beta models, etc.)
- Streaming primitives (`Stream`, `AsyncStream`) and response wrappers (`APIResponse`, `AsyncAPIResponse`) in a minimal but useful form

Save this as **`parallel.pyi`** (or whatever name you want). It’s intentionally *single-file* and *summary-oriented* (not every internal helper is replicated).

```pyi
# parallel.pyi
# A single-file, summary stub of the Parallel Python SDK public API footprint.

from __future__ import annotations

from datetime import date, datetime
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
    Generic,
    overload,
)
from typing_extensions import (
    Annotated,
    Literal,
    ParamSpec,
    Protocol,
    Required,
    TypedDict,
    TypeAlias,
)

import httpx
import pydantic


# =============================================================================
# Version
# =============================================================================

__title__: str
__version__: str


# =============================================================================
# Core sentinels / option types
# =============================================================================

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


# =============================================================================
# Exceptions
# =============================================================================

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


# =============================================================================
# BaseModel
# =============================================================================

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


# =============================================================================
# Streaming
# =============================================================================

_T = TypeVar("_T")

class Stream(Generic[_T]):
    """Provides the core interface to iterate over a synchronous stream response."""
    response: httpx.Response
    def __iter__(self) -> Iterator[_T]: ...
    def __next__(self) -> _T: ...
    def close(self) -> None: ...
    def __enter__(self) -> Stream[_T]: ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

class AsyncStream(Generic[_T]):
    """Provides the core interface to iterate over an asynchronous stream response."""
    response: httpx.Response
    def __aiter__(self) -> AsyncIterator[_T]: ...
    async def __anext__(self) -> _T: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> AsyncStream[_T]: ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...


# =============================================================================
# Raw/streaming response wrappers
# =============================================================================

R = TypeVar("R")
P = ParamSpec("P")
_U = TypeVar("_U")

class APIResponse(Generic[R]):
    http_response: httpx.Response
    retries_taken: int
    @property
    def headers(self) -> httpx.Headers: ...
    @property
    def status_code(self) -> int: ...
    @property
    def url(self) -> httpx.URL: ...
    @property
    def method(self) -> str: ...
    @property
    def is_closed(self) -> bool: ...
    def read(self) -> bytes: ...
    def text(self) -> str: ...
    def json(self) -> object: ...
    def close(self) -> None: ...
    def iter_bytes(self, chunk_size: int | None = None) -> Iterator[bytes]: ...
    def iter_text(self, chunk_size: int | None = None) -> Iterator[str]: ...
    def iter_lines(self) -> Iterator[str]: ...
    @overload
    def parse(self, *, to: Type[_U]) -> _U: ...
    @overload
    def parse(self) -> R: ...

class AsyncAPIResponse(Generic[R]):
    http_response: httpx.Response
    retries_taken: int
    @property
    def headers(self) -> httpx.Headers: ...
    @property
    def status_code(self) -> int: ...
    @property
    def url(self) -> httpx.URL: ...
    @property
    def method(self) -> str: ...
    @property
    def is_closed(self) -> bool: ...
    async def read(self) -> bytes: ...
    async def text(self) -> str: ...
    async def json(self) -> object: ...
    async def close(self) -> None: ...
    def iter_bytes(self, chunk_size: int | None = None) -> AsyncIterator[bytes]: ...
    def iter_text(self, chunk_size: int | None = None) -> AsyncIterator[str]: ...
    def iter_lines(self) -> AsyncIterator[str]: ...
    @overload
    async def parse(self, *, to: Type[_U]) -> _U: ...
    @overload
    async def parse(self) -> R: ...


# =============================================================================
# Types: schemas, citations, basis
# =============================================================================

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

class TextSchema(BaseModel):
    """Text description for a task input or output."""
    description: Optional[str] = None
    type: Optional[Literal["text"]] = None

class JsonSchema(BaseModel):
    """JSON schema for a task input or output."""
    json_schema: Dict[str, object]
    type: Optional[Literal["json"]] = None

class AutoSchema(BaseModel):
    """Auto schema for a task input or output."""
    type: Optional[Literal["auto"]] = None

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


# =============================================================================
# Shared: warnings/errors/source policy
# =============================================================================

class Warning(BaseModel):
    """Human-readable message for a task."""
    message: str
    type: Literal["spec_validation_warning", "input_validation_warning", "warning"]
    detail: Optional[Dict[str, object]] = None

class ErrorObject(BaseModel):
    """An error message."""
    message: str
    ref_id: str
    detail: Optional[Dict[str, object]] = None

class ErrorResponse(BaseModel):
    """Response object used for non-200 status codes."""
    error: ErrorObject
    type: Literal["error"]

class SourcePolicy(BaseModel):
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    after_date: Optional[date] = None
    exclude_domains: Optional[List[str]] = None
    include_domains: Optional[List[str]] = None


# =============================================================================
# Task runs: core models
# =============================================================================

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
    output: Union[TaskRunTextOutput, TaskRunJsonOutput]
    run: TaskRun


# =============================================================================
# Parsed results (generic)
# =============================================================================

ContentType = TypeVar("ContentType", bound=pydantic.BaseModel)

class ParsedTaskRunTextOutput(TaskRunTextOutput, Generic[ContentType]):
    parsed: None
    """The parsed output from the task run."""

class ParsedTaskRunJsonOutput(TaskRunJsonOutput, Generic[ContentType]):
    parsed: Optional[ContentType] = None
    """The parsed output from the task run."""

class ParsedTaskRunResult(TaskRunResult, Generic[ContentType]):
    output: Union[ParsedTaskRunTextOutput[ContentType], ParsedTaskRunJsonOutput[ContentType]]
    """The parsed output from the task run."""


# =============================================================================
# Param TypedDicts used by public methods
# =============================================================================

class TextSchemaParam(TypedDict, total=False):
    """Text description for a task input or output."""
    description: Optional[str]
    type: Literal["text"]

class JsonSchemaParam(TypedDict, total=False):
    """JSON schema for a task input or output."""
    json_schema: Required[Dict[str, object]]
    type: Literal["json"]

class AutoSchemaParam(TypedDict, total=False):
    """Auto schema for a task input or output."""
    type: Literal["auto"]

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
    input_schema: Optional[InputSchemaParam]

class TaskRunCreateParams(TypedDict, total=False):
    input: Required[Union[str, Dict[str, object]]]
    processor: Required[str]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional["SourcePolicyParam"]
    task_spec: Optional[TaskSpecParam]

class SourcePolicyParam(TypedDict, total=False):
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    after_date: Union[str, date, None]
    exclude_domains: Sequence[str]
    include_domains: Sequence[str]

class TaskRunResultParams(TypedDict, total=False):
    api_timeout: int


# =============================================================================
# Beta types / resources (selected)
# =============================================================================

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

class FetchPolicyParam(TypedDict, total=False):
    """Policy for live fetching web results."""
    disable_cache_fallback: bool
    max_age_seconds: Optional[int]
    timeout_seconds: Optional[float]

class ExcerptSettingsParam(TypedDict, total=False):
    """Optional settings for returning relevant excerpts."""
    max_chars_per_result: Optional[int]
    max_chars_total: Optional[int]

class BetaSearchParams(TypedDict, total=False):
    excerpts: ExcerptSettingsParam
    fetch_policy: Optional[FetchPolicyParam]
    max_chars_per_result: Optional[int]
    max_results: Optional[int]
    mode: Optional[Literal["one-shot", "agentic"]]
    objective: Optional[str]
    processor: Optional[Literal["base", "pro"]]
    search_queries: Optional[Sequence[str]]
    source_policy: Optional[SourcePolicyParam]
    betas: Annotated[List[ParallelBetaParam], Any]

Excerpts: TypeAlias = Union[bool, ExcerptSettingsParam]

class FullContentFullContentSettings(TypedDict, total=False):
    """Optional settings for returning full content."""
    max_chars_per_result: Optional[int]

FullContent: TypeAlias = Union[bool, FullContentFullContentSettings]

class BetaExtractParams(TypedDict, total=False):
    urls: Required[Sequence[str]]
    excerpts: Excerpts
    fetch_policy: Optional[FetchPolicyParam]
    full_content: FullContent
    objective: Optional[str]
    search_queries: Optional[Sequence[str]]
    betas: Annotated[List[ParallelBetaParam], Any]


# =============================================================================
# Resources
# =============================================================================

class TaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        source_policy: Optional[SourcePolicyParam] | Omit = ...,
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
        output: Optional[Union[OutputSchema, str]] | Omit = ...,
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
        output: Optional[Union[OutputSchema, str]] | Type[OutputT] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRunResult | ParsedTaskRunResult[OutputT]:
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
        source_policy: Optional[SourcePolicyParam] | Omit = ...,
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
        output: Optional[Union[OutputSchema, str]] | Omit = ...,
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
        output: Optional[Union[OutputSchema, str]] | Type[OutputT] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRunResult | ParsedTaskRunResult[OutputT]: ...

    @property
    def with_raw_response(self) -> AsyncTaskRunResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncTaskRunResourceWithStreamingResponse: ...


class TaskRunResourceWithRawResponse:
    create: Any
    retrieve: Any
    result: Any

class AsyncTaskRunResourceWithRawResponse:
    create: Any
    retrieve: Any
    result: Any

class TaskRunResourceWithStreamingResponse:
    create: Any
    retrieve: Any
    result: Any

class AsyncTaskRunResourceWithStreamingResponse:
    create: Any
    retrieve: Any
    result: Any


# =============================================================================
# Beta resource (search/extract) surface
# =============================================================================

class BetaResource:
    def extract(
        self,
        *,
        urls: Sequence[str],
        excerpts: Excerpts | Omit = ...,
        fetch_policy: Optional[FetchPolicyParam] | Omit = ...,
        full_content: FullContent | Omit = ...,
        objective: Optional[str] | Omit = ...,
        search_queries: Optional[Sequence[str]] | Omit = ...,
        betas: List[ParallelBetaParam] | Omit = ...,
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
          excerpts: Include excerpts from each URL relevant to the search objective and queries.
              Note that if neither objective nor search_queries is provided, excerpts are
              redundant with full content.

          fetch_policy: Policy for live fetching web results.

          full_content: Include full content from each URL. Note that if neither objective nor
              search_queries is provided, excerpts are redundant with full content.

          objective: If provided, focuses extracted content on the specified search objective.

          search_queries: If provided, focuses extracted content on the specified keyword search queries.

          betas: Optional header to specify the beta version(s) to enable.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
        ...

    def search(
        self,
        *,
        excerpts: ExcerptSettingsParam | Omit = ...,
        fetch_policy: Optional[FetchPolicyParam] | Omit = ...,
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

    @property
    def with_raw_response(self) -> BetaResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> BetaResourceWithStreamingResponse: ...


class AsyncBetaResource:
    async def extract(
        self,
        *,
        urls: Sequence[str],
        excerpts: Excerpts | Omit = ...,
        fetch_policy: Optional[FetchPolicyParam] | Omit = ...,
        full_content: FullContent | Omit = ...,
        objective: Optional[str] | Omit = ...,
        search_queries: Optional[Sequence[str]] | Omit = ...,
        betas: List[ParallelBetaParam] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ExtractResponse: ...

    async def search(
        self,
        *,
        excerpts: ExcerptSettingsParam | Omit = ...,
        fetch_policy: Optional[FetchPolicyParam] | Omit = ...,
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

    @property
    def with_raw_response(self) -> AsyncBetaResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncBetaResourceWithStreamingResponse: ...


class BetaResourceWithRawResponse:
    extract: Any
    search: Any

class AsyncBetaResourceWithRawResponse:
    extract: Any
    search: Any

class BetaResourceWithStreamingResponse:
    extract: Any
    search: Any

class AsyncBetaResourceWithStreamingResponse:
    extract: Any
    search: Any


# =============================================================================
# Client entrypoints
# =============================================================================

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
    ) -> None:
        """Construct a new synchronous Parallel client instance.

        This automatically infers the `api_key` argument from the `PARALLEL_API_KEY` environment variable if it is not provided.
        """
        ...

    @property
    def task_run(self) -> TaskRunResource: ...
    @property
    def beta(self) -> BetaResource: ...
    @property
    def with_raw_response(self) -> ParallelWithRawResponse: ...
    @property
    def with_streaming_response(self) -> ParallelWithStreamedResponse: ...

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
    ) -> Parallel:
        """
        Create a new client instance re-using the same options given to the current client with optional overriding.
        """
        ...

    with_options: Any  # alias of copy


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
    ) -> None:
        """Construct a new async AsyncParallel client instance.

        This automatically infers the `api_key` argument from the `PARALLEL_API_KEY` environment variable if it is not provided.
        """
        ...

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
    ) -> AsyncParallel:
        """
        Create a new client instance re-using the same options given to the current client with optional overriding.
        """
        ...

    with_options: Any  # alias of copy


Client = Parallel
AsyncClient = AsyncParallel


class ParallelWithRawResponse:
    @property
    def task_run(self) -> Any: ...
    @property
    def beta(self) -> Any: ...

class AsyncParallelWithRawResponse:
    @property
    def task_run(self) -> Any: ...
    @property
    def beta(self) -> Any: ...

class ParallelWithStreamedResponse:
    @property
    def task_run(self) -> Any: ...
    @property
    def beta(self) -> Any: ...

class AsyncParallelWithStreamedResponse:
    @property
    def task_run(self) -> Any: ...
    @property
    def beta(self) -> Any: ...


# =============================================================================
# Utilities exported at top-level
# =============================================================================

def file_from_path(path: str) -> Any: ...


# =============================================================================
# Defaults exported at top-level
# =============================================================================

DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits
DefaultHttpxClient: Type[httpx.Client]
DefaultAsyncHttpxClient: Type[httpx.AsyncClient]
DefaultAioHttpClient: Type[httpx.AsyncClient]


# =============================================================================
# types namespace (re-export module marker)
# =============================================================================

class types:
    # Marker class to help LLMs; actual runtime is a module.
    ...
```

### Notes / limitations (so you can decide if you want me to iterate)
1. This is a **single-file summary**, not a perfect mypy-accurate stub of every internal symbol. It’s optimized for an LLM’s “how do I call this SDK” understanding.
2. I included **docstrings copied 1:1** for the big public methods (notably `task_run.create/result/execute` and `beta.search/extract`) exactly as they appear in your provided source.
3. The beta “task_group” and “findall” resource surfaces are not included in this stub to keep it shorter; I can add them too (they’re sizeable, but straightforward).
4. In a few places where the SDK uses `Annotated[..., PropertyInfo(...)]` to alias header/query params, the stub uses `Any` in those `Annotated` metadata slots because your goal is LLM comprehension rather than type-checker-perfect metadata.

If you want, I can generate a **v2** of this file that also includes:
- `parallel.resources.beta.task_group` full streaming event/run types
- `parallel.resources.beta.findall` full set of methods + event union models
- the `parallel.resources` lazy proxy as a typed module-like object (`parallel.resources.task_run`, etc.)