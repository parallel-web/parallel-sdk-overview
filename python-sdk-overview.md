Below is a **single** `parallel.pyi` “footprint” stub that exposes the *public* API surface an LLM/user would use: top-level package exports, the main client classes (`Parallel` / `AsyncParallel`), resources (`task_run`, `beta` and nested beta resources), key request/response types, error classes, and the streaming helpers.

Notes / constraints:
- A `.pyi` can’t realistically include **every internal helper** without becoming enormous and less useful. This focuses on the SDK’s *user-facing* entrypoints and the primary model/param types.
- I **copied docstrings 1:1 where they exist in the SDK sources** for the exported call surfaces (`create`, `result`, `execute`, etc.). Many modules are “generated” and contain no docstrings—those remain undocumented here.
- This is intended as a “reading map” for an LLM; it is not a perfect type-checking stub.

Save as: `parallel.pyi`

```pyi
# parallel.pyi
# Single-file API footprint summary for the `parallel` SDK.
# Generated manually from the provided source tree.

from __future__ import annotations

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
from datetime import date, datetime

import httpx
import pydantic

# ---------------------------------------------------------------------------
# Core sentinel / support types (exported from parallel.__init__)
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

NOT_GIVEN: NotGiven
not_given: NotGiven

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

omit: Omit

NoneType: Type[None]

Transport = httpx.BaseTransport
ProxiesTypes = Union[str, httpx.Proxy, Dict[Union[str, httpx.URL], Union[None, str, httpx.URL, httpx.Proxy]]]

Timeout = Union[float, httpx.Timeout, None]
Query = Mapping[str, object]
Body = object
Headers = Mapping[str, Union[str, Omit]]

class RequestOptions(TypedDict, total=False):
    headers: Headers
    max_retries: int
    timeout: float | httpx.Timeout | None
    params: Query
    extra_json: Mapping[str, object]
    idempotency_key: str
    follow_redirects: bool

# ---------------------------------------------------------------------------
# Exceptions (exported in parallel.__init__)
# ---------------------------------------------------------------------------

class ParallelError(Exception): ...
class APIError(ParallelError):
    message: str
    request: httpx.Request
    body: object | None
class APIResponseValidationError(APIError):
    response: httpx.Response
    status_code: int
class APIStatusError(APIError):
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

# ---------------------------------------------------------------------------
# BaseModel (exported)
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
# Streaming helpers (exported from parallel._client / parallel._streaming)
# ---------------------------------------------------------------------------

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

# Raw/parsed APIResponse wrappers (exported)
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
    def parse(self) -> R: ...
    @overload
    def parse(self, *, to: Type[_T]) -> _T: ...
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
    async def parse(self) -> R: ...
    @overload
    async def parse(self, *, to: Type[_T]) -> _T: ...
    async def read(self) -> bytes: ...
    async def text(self) -> str: ...
    async def json(self) -> object: ...
    async def close(self) -> None: ...
    async def iter_bytes(self, chunk_size: int | None = None) -> AsyncIterator[bytes]: ...
    async def iter_text(self, chunk_size: int | None = None) -> AsyncIterator[str]: ...
    async def iter_lines(self) -> AsyncIterator[str]: ...

# ---------------------------------------------------------------------------
# Types: Shared / Core models (subset)
# ---------------------------------------------------------------------------

class Citation(BaseModel):
    url: str
    excerpts: Optional[List[str]] = None
    title: Optional[str] = None

class FieldBasis(BaseModel):
    field: str
    reasoning: str
    citations: Optional[List[Citation]] = None
    confidence: Optional[str] = None

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

TaskRunOutput = Union[TaskRunTextOutput, TaskRunJsonOutput]

class ErrorObject(BaseModel):
    message: str
    ref_id: str
    detail: Optional[Dict[str, object]] = None

class Warning(BaseModel):
    message: str
    type: Literal["spec_validation_warning", "input_validation_warning", "warning"]
    detail: Optional[Dict[str, object]] = None

class ErrorResponse(BaseModel):
    error: ErrorObject
    type: Literal["error"]

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

class TaskRunResult(BaseModel):
    output: TaskRunOutput
    run: TaskRun

# ParsedTaskRunResult (when output is a Pydantic model)
ContentType = TypeVar("ContentType", bound=pydantic.BaseModel)

class ParsedTaskRunTextOutput(TaskRunTextOutput, Generic[ContentType]):
    parsed: None

class ParsedTaskRunJsonOutput(TaskRunJsonOutput, Generic[ContentType]):
    parsed: Optional[ContentType] = None

class ParsedTaskRunResult(TaskRunResult, Generic[ContentType]):
    output: Union[ParsedTaskRunTextOutput[ContentType], ParsedTaskRunJsonOutput[ContentType]]

# TaskSpec / schema types (core)
class AutoSchema(BaseModel):
    type: Optional[Literal["auto"]] = None

class TextSchema(BaseModel):
    description: Optional[str] = None
    type: Optional[Literal["text"]] = None

class JsonSchema(BaseModel):
    json_schema: Dict[str, object]
    type: Optional[Literal["json"]] = None

OutputSchema = Union[JsonSchema, TextSchema, AutoSchema, str]
InputSchema = Union[str, JsonSchema, TextSchema, None]

class TaskSpec(BaseModel):
    output_schema: OutputSchema
    input_schema: Optional[InputSchema] = None

# Params TypedDicts (selected)
class SourcePolicy(TypedDict, total=False):
    exclude_domains: Sequence[str]
    include_domains: Sequence[str]

class AutoSchemaParam(TypedDict, total=False):
    type: Literal["auto"]

class TextSchemaParam(TypedDict, total=False):
    description: Optional[str]
    type: Literal["text"]

class JsonSchemaParam(TypedDict, total=False):
    json_schema: Required[Dict[str, object]]
    type: Literal["json"]

OutputSchemaParam = Union[JsonSchemaParam, TextSchemaParam, AutoSchemaParam, str]
InputSchemaParam = Union[str, JsonSchemaParam, TextSchemaParam]

class TaskSpecParam(TypedDict, total=False):
    output_schema: Required[OutputSchemaParam]
    input_schema: NotRequired[Optional[InputSchemaParam]]

class TaskRunCreateParams(TypedDict, total=False):
    input: Required[Union[str, Dict[str, object]]]
    processor: Required[str]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicy]
    task_spec: Optional[TaskSpecParam]

class TaskRunResultParams(TypedDict, total=False):
    api_timeout: Annotated[int, Any]  # alias="timeout" at runtime

# ---------------------------------------------------------------------------
# Beta types (subset)
# ---------------------------------------------------------------------------

ParallelBetaParam = Union[
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

class McpServerParam(TypedDict, total=False):
    name: Required[str]
    url: Required[str]
    allowed_tools: Optional[Sequence[str]]
    headers: Optional[Dict[str, str]]
    type: Literal["url"]

class WebhookParam(TypedDict, total=False):
    url: Required[str]
    event_types: List[Literal["task_run.status"]]

class BetaRunInputParam(TypedDict, total=False):
    input: Required[Union[str, Dict[str, object]]]
    processor: Required[str]
    enable_events: Optional[bool]
    mcp_servers: Optional[Iterable[McpServerParam]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicy]
    task_spec: Optional[TaskSpecParam]
    webhook: Optional[WebhookParam]

class McpToolCall(BaseModel):
    arguments: str
    server_name: str
    tool_call_id: str
    tool_name: str
    content: Optional[str] = None
    error: Optional[str] = None

class BetaTaskRunTextOutput(BaseModel):
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
    beta_fields: Optional[Dict[str, object]] = None
    mcp_tool_calls: Optional[List[McpToolCall]] = None

class BetaTaskRunJsonOutput(BaseModel):
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: Literal["json"]
    beta_fields: Optional[Dict[str, object]] = None
    mcp_tool_calls: Optional[List[McpToolCall]] = None
    output_schema: Optional[Dict[str, object]] = None

BetaTaskRunOutput = Union[BetaTaskRunTextOutput, BetaTaskRunJsonOutput]

class BetaTaskRunResult(BaseModel):
    output: BetaTaskRunOutput
    run: TaskRun

# TaskRun events stream (beta)
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

class BetaRunInput(BaseModel):
    input: Union[str, Dict[str, object]]
    processor: str
    enable_events: Optional[bool] = None
    mcp_servers: Optional[List[Any]] = None
    metadata: Optional[Dict[str, Union[str, float, bool]]] = None
    source_policy: Optional[Any] = None
    task_spec: Optional[TaskSpec] = None
    webhook: Optional[Any] = None

class TaskRunEvent(BaseModel):
    event_id: Optional[str] = None
    run: TaskRun
    type: Literal["task_run.state"]
    input: Optional[BetaRunInput] = None
    output: Optional[Union[TaskRunTextOutput, TaskRunJsonOutput, None]] = None

class ErrorEvent(BaseModel):
    error: ErrorObject
    type: Literal["error"]

TaskRunEventsResponse = Union[TaskRunProgressStatsEvent, TaskRunProgressMessageEvent, TaskRunEvent, ErrorEvent]

# TaskGroup types (beta)
class TaskGroupStatus(BaseModel):
    is_active: bool
    modified_at: Optional[str] = None
    num_task_runs: int
    status_message: Optional[str] = None
    task_run_status_counts: Dict[str, int]

class TaskGroup(BaseModel):
    created_at: Optional[str] = None
    status: TaskGroupStatus
    task_group_id: str
    metadata: Optional[Dict[str, Union[str, float, bool]]] = None

class TaskGroupRunResponse(BaseModel):
    event_cursor: Optional[str] = None
    run_cursor: Optional[str] = None
    run_ids: List[str]
    status: TaskGroupStatus

class TaskGroupCreateParams(TypedDict, total=False):
    metadata: Optional[Dict[str, Union[str, float, bool]]]

class TaskGroupAddRunsParams(TypedDict, total=False):
    inputs: Required[Iterable[BetaRunInputParam]]
    default_task_spec: Optional[TaskSpecParam]
    betas: Annotated[List[ParallelBetaParam], Any]

class TaskGroupEventsParams(TypedDict, total=False):
    last_event_id: Optional[str]
    api_timeout: Annotated[Optional[float], Any]

class TaskGroupGetRunsParams(TypedDict, total=False):
    include_input: bool
    include_output: bool
    last_event_id: Optional[str]
    status: Optional[Literal["queued","action_required","running","completed","failed","cancelling","cancelled"]]

class TaskGroupStatusEvent(BaseModel):
    event_id: str
    status: TaskGroupStatus
    type: Literal["task_group_status"]

TaskGroupEventsResponse = Union[TaskGroupStatusEvent, TaskRunEvent, ErrorEvent]
TaskGroupGetRunsResponse = Union[TaskRunEvent, ErrorEvent]

# FindAll types (beta; subset)
class FindallRunStatusMetrics(BaseModel):
    generated_candidates_count: Optional[int] = None
    matched_candidates_count: Optional[int] = None

class FindallRunStatus(BaseModel):
    is_active: bool
    metrics: FindallRunStatusMetrics
    status: Literal["queued","action_required","running","completed","failed","cancelling","cancelled"]
    termination_reason: Optional[str] = None

class FindallRun(BaseModel):
    findall_id: str
    generator: Literal["base","core","pro","preview"]
    status: FindallRunStatus
    created_at: Optional[str] = None
    metadata: Optional[Dict[str, Union[str, float, bool]]] = None
    modified_at: Optional[str] = None

class FindallSchemaMatchCondition(BaseModel):
    description: str
    name: str

class FindallEnrichInput(BaseModel):
    output_schema: JsonSchema
    mcp_servers: Optional[List[Any]] = None
    processor: Optional[str] = None

class FindallSchema(BaseModel):
    entity_type: str
    match_conditions: List[FindallSchemaMatchCondition]
    objective: str
    enrichments: Optional[List[FindallEnrichInput]] = None
    generator: Optional[Literal["base","core","pro","preview"]] = None
    match_limit: Optional[int] = None

class FindallRunResultCandidate(BaseModel):
    candidate_id: str
    match_status: Literal["generated", "matched", "unmatched", "discarded"]
    name: str
    url: str
    basis: Optional[List[FieldBasis]] = None
    description: Optional[str] = None
    output: Optional[Dict[str, object]] = None

class FindallRunResult(BaseModel):
    candidates: List[FindallRunResultCandidate]
    run: FindallRun
    last_event_id: Optional[str] = None

class FindallIngestParams(TypedDict, total=False):
    objective: Required[str]
    betas: Annotated[List[ParallelBetaParam], Any]

class FindallCreateParamsMatchCondition(TypedDict, total=False):
    description: Required[str]
    name: Required[str]

class FindallCreateParamsExcludeList(TypedDict, total=False):
    name: Required[str]
    url: Required[str]

class FindallCreateParams(TypedDict, total=False):
    entity_type: Required[str]
    generator: Required[Literal["base","core","pro","preview"]]
    match_conditions: Required[Iterable[FindallCreateParamsMatchCondition]]
    match_limit: Required[int]
    objective: Required[str]
    exclude_list: Optional[Iterable[FindallCreateParamsExcludeList]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    webhook: Optional[WebhookParam]
    betas: Annotated[List[ParallelBetaParam], Any]

class FindallExtendParams(TypedDict, total=False):
    additional_match_limit: Required[int]
    betas: Annotated[List[ParallelBetaParam], Any]

class FindallEnrichParams(TypedDict, total=False):
    output_schema: Required[JsonSchemaParam]
    mcp_servers: Optional[Iterable[McpServerParam]]
    processor: str
    betas: Annotated[List[ParallelBetaParam], Any]

class FindallEventsParams(TypedDict, total=False):
    last_event_id: Optional[str]
    api_timeout: Annotated[Optional[float], Any]
    betas: Annotated[List[ParallelBetaParam], Any]

class FindallRunStatusEvent(BaseModel):
    data: FindallRun
    event_id: str
    timestamp: datetime
    type: Literal["findall.status"]

class FindallSchemaUpdatedEvent(BaseModel):
    data: FindallSchema
    event_id: str
    timestamp: datetime
    type: Literal["findall.schema.updated"]

class FindallCandidateMatchStatusEventData(BaseModel):
    candidate_id: str
    match_status: Literal["generated", "matched", "unmatched", "discarded"]
    name: str
    url: str
    basis: Optional[List[FieldBasis]] = None
    description: Optional[str] = None
    output: Optional[Dict[str, object]] = None

class FindallCandidateMatchStatusEvent(BaseModel):
    data: FindallCandidateMatchStatusEventData
    event_id: str
    timestamp: datetime
    type: Literal[
        "findall.candidate.generated",
        "findall.candidate.matched",
        "findall.candidate.unmatched",
        "findall.candidate.discarded",
        "findall.candidate.enriched",
    ]

FindallEventsResponse = Union[
    FindallSchemaUpdatedEvent,
    FindallRunStatusEvent,
    FindallCandidateMatchStatusEvent,
    ErrorEvent,
]

FindallRetrieveResponse = Union[FindallRun, Any]  # FindAllPollResponse omitted for brevity

# ---------------------------------------------------------------------------
# Resources
# ---------------------------------------------------------------------------

OutputT = TypeVar("OutputT", bound=pydantic.BaseModel)

class TaskRunResource:
    """
    (Resource) /v1/tasks/runs endpoints.
    """
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        source_policy: Optional[SourcePolicy] = ...,
        task_spec: Optional[TaskSpecParam] = ...,
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

    def result(
        self,
        run_id: str,
        *,
        api_timeout: int = ...,
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
        output: Optional[OutputSchema] | Type[OutputT] = ...,
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

    @property
    def with_raw_response(self) -> TaskRunResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> TaskRunResourceWithStreamingResponse: ...

class AsyncTaskRunResource:
    # Same surface as TaskRunResource but async.
    async def create(self, *, input: Union[str, Dict[str, object]], processor: str, metadata: Optional[Dict[str, Union[str,float,bool]]] = ..., source_policy: Optional[SourcePolicy] = ..., task_spec: Optional[TaskSpecParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskRun: ...
    async def retrieve(self, run_id: str, *, extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskRun: ...
    async def result(self, run_id: str, *, api_timeout: int = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskRunResult: ...
    @overload
    async def execute(self, *, input: Union[str, Dict[str, object]], processor: str, metadata: Optional[Dict[str, Union[str,float,bool]]] = ..., output: Optional[OutputSchema] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskRunResult: ...
    @overload
    async def execute(self, *, input: Union[str, Dict[str, object]], processor: str, metadata: Optional[Dict[str, Union[str,float,bool]]] = ..., output: Type[OutputT], extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> ParsedTaskRunResult[OutputT]: ...
    async def execute(self, *, input: Union[str, Dict[str, object]], processor: str, metadata: Optional[Dict[str, Union[str,float,bool]]] = ..., output: Optional[OutputSchema] | Type[OutputT] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> Union[TaskRunResult, ParsedTaskRunResult[OutputT]]: ...

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

# -------------------- Beta resources --------------------

class BetaTaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        enable_events: Optional[bool] = ...,
        mcp_servers: Optional[Iterable[McpServerParam]] = ...,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        source_policy: Optional[SourcePolicy] = ...,
        task_spec: Optional[TaskSpecParam] = ...,
        webhook: Optional[WebhookParam] = ...,
        betas: List[ParallelBetaParam] = ...,
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

          enable_events: Controls tracking of task run execution progress. When set to true, progress
              events are recorded and can be accessed via the
              [Task Run events](https://platform.parallel.ai/api-reference) endpoint. When
              false, no progress events are tracked. Note that progress tracking cannot be
              enabled after a run has been created. The flag is set to true by default for
              premium processors (pro and above). To enable this feature in your requests,
              specify `events-sse-2025-07-24` as one of the values in `parallel-beta` header
              (for API calls) or `betas` param (for the SDKs).

          mcp_servers: Optional list of MCP servers to use for the run. To enable this feature in your
              requests, specify `mcp-server-2025-07-17` as one of the values in
              `parallel-beta` header (for API calls) or `betas` param (for the SDKs).

          metadata: User-provided metadata stored with the run. Keys and values must be strings with
              a maximum length of 16 and 512 characters respectively.

          source_policy: Source policy for web search results.

              This policy governs which sources are allowed/disallowed in results.

          task_spec: Specification for a task.

              Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
              Not specifying a TaskSpec is the same as setting an auto output schema.

              For convenience bare strings are also accepted as input or output schemas.

          webhook: Webhooks for Task Runs.

          betas: Optional header to specify the beta version(s) to enable.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """

    def events(
        self,
        run_id: str,
        *,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> Stream[TaskRunEventsResponse]:
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

    def result(
        self,
        run_id: str,
        *,
        api_timeout: int = ...,
        betas: List[ParallelBetaParam] = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> BetaTaskRunResult:
        """
        Retrieves a run result by run_id, blocking until the run is completed.

        Args:
          betas: Optional header to specify the beta version(s) to enable.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """

class AsyncBetaTaskRunResource:
    async def create(self, *, input: Union[str, Dict[str, object]], processor: str, enable_events: Optional[bool] = ..., mcp_servers: Optional[Iterable[McpServerParam]] = ..., metadata: Optional[Dict[str, Union[str,float,bool]]] = ..., source_policy: Optional[SourcePolicy] = ..., task_spec: Optional[TaskSpecParam] = ..., webhook: Optional[WebhookParam] = ..., betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskRun: ...
    async def events(self, run_id: str, *, extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> AsyncStream[TaskRunEventsResponse]: ...
    async def result(self, run_id: str, *, api_timeout: int = ..., betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> BetaTaskRunResult: ...

class BetaTaskGroupResource:
    def create(self, *, metadata: Optional[Dict[str, Union[str,float,bool]]] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroup: ...
    def retrieve(self, task_group_id: str, *, extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroup: ...
    def add_runs(self, task_group_id: str, *, inputs: Iterable[BetaRunInputParam], default_task_spec: Optional[TaskSpecParam] = ..., betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroupRunResponse: ...
    def events(self, task_group_id: str, *, last_event_id: Optional[str] = ..., api_timeout: Optional[float] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> Stream[TaskGroupEventsResponse]: ...
    def get_runs(self, task_group_id: str, *, include_input: bool = ..., include_output: bool = ..., last_event_id: Optional[str] = ..., status: Optional[Literal["queued","action_required","running","completed","failed","cancelling","cancelled"]] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> Stream[TaskGroupGetRunsResponse]: ...

class AsyncBetaTaskGroupResource:
    async def create(self, *, metadata: Optional[Dict[str, Union[str,float,bool]]] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroup: ...
    async def retrieve(self, task_group_id: str, *, extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroup: ...
    async def add_runs(self, task_group_id: str, *, inputs: Iterable[BetaRunInputParam], default_task_spec: Optional[TaskSpecParam] = ..., betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroupRunResponse: ...
    async def events(self, task_group_id: str, *, last_event_id: Optional[str] = ..., api_timeout: Optional[float] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> AsyncStream[TaskGroupEventsResponse]: ...
    async def get_runs(self, task_group_id: str, *, include_input: bool = ..., include_output: bool = ..., last_event_id: Optional[str] = ..., status: Optional[Literal["queued","action_required","running","completed","failed","cancelling","cancelled"]] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> AsyncStream[TaskGroupGetRunsResponse]: ...

class BetaFindallResource:
    def create(self, *, entity_type: str, generator: Literal["base","core","pro","preview"], match_conditions: Iterable[FindallCreateParamsMatchCondition], match_limit: int, objective: str, exclude_list: Optional[Iterable[FindallCreateParamsExcludeList]] = ..., metadata: Optional[Dict[str, Union[str,float,bool]]] = ..., webhook: Optional[WebhookParam] = ..., betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindallRun: ...
    def retrieve(self, findall_id: str, *, betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindallRetrieveResponse: ...
    def cancel(self, findall_id: str, *, betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> object: ...
    def enrich(self, findall_id: str, *, output_schema: JsonSchemaParam, mcp_servers: Optional[Iterable[McpServerParam]] = ..., processor: str = ..., betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindallSchema: ...
    def events(self, findall_id: str, *, last_event_id: Optional[str] = ..., api_timeout: Optional[float] = ..., betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> Stream[FindallEventsResponse]: ...
    def extend(self, findall_id: str, *, additional_match_limit: int, betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindallSchema: ...
    def ingest(self, *, objective: str, betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindallSchema: ...
    def result(self, findall_id: str, *, betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindallRunResult: ...
    def schema(self, findall_id: str, *, betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindallSchema: ...

class AsyncBetaFindallResource:
    async def create(self, *, entity_type: str, generator: Literal["base","core","pro","preview"], match_conditions: Iterable[FindallCreateParamsMatchCondition], match_limit: int, objective: str, exclude_list: Optional[Iterable[FindallCreateParamsExcludeList]] = ..., metadata: Optional[Dict[str, Union[str,float,bool]]] = ..., webhook: Optional[WebhookParam] = ..., betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindallRun: ...
    async def retrieve(self, findall_id: str, *, betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindallRetrieveResponse: ...
    async def cancel(self, findall_id: str, *, betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> object: ...
    async def enrich(self, findall_id: str, *, output_schema: JsonSchemaParam, mcp_servers: Optional[Iterable[McpServerParam]] = ..., processor: str = ..., betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindallSchema: ...
    async def events(self, findall_id: str, *, last_event_id: Optional[str] = ..., api_timeout: Optional[float] = ..., betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> AsyncStream[FindallEventsResponse]: ...
    async def extend(self, findall_id: str, *, additional_match_limit: int, betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindallSchema: ...
    async def ingest(self, *, objective: str, betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindallSchema: ...
    async def result(self, findall_id: str, *, betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindallRunResult: ...
    async def schema(self, findall_id: str, *, betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindallSchema: ...

class BetaResource:
    @property
    def task_run(self) -> BetaTaskRunResource: ...
    @property
    def task_group(self) -> BetaTaskGroupResource: ...
    @property
    def findall(self) -> BetaFindallResource: ...

    def search(
        self,
        *,
        excerpts: Any = ...,
        fetch_policy: Any = ...,
        max_chars_per_result: Optional[int] = ...,
        max_results: Optional[int] = ...,
        mode: Optional[Literal["one-shot","agentic"]] = ...,
        objective: Optional[str] = ...,
        processor: Optional[Literal["base","pro"]] = ...,
        search_queries: Optional[Sequence[str]] = ...,
        source_policy: Optional[SourcePolicy] = ...,
        betas: List[ParallelBetaParam] = ...,
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
          excerpts: Optional settings for returning relevant excerpts.

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

    def extract(
        self,
        *,
        urls: Sequence[str],
        excerpts: Any = ...,
        fetch_policy: Any = ...,
        full_content: Any = ...,
        objective: Optional[str] = ...,
        search_queries: Optional[Sequence[str]] = ...,
        betas: List[ParallelBetaParam] = ...,
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

class AsyncBetaResource:
    @property
    def task_run(self) -> AsyncBetaTaskRunResource: ...
    @property
    def task_group(self) -> AsyncBetaTaskGroupResource: ...
    @property
    def findall(self) -> AsyncBetaFindallResource: ...
    async def search(self, *, excerpts: Any = ..., fetch_policy: Any = ..., max_chars_per_result: Optional[int] = ..., max_results: Optional[int] = ..., mode: Optional[Literal["one-shot","agentic"]] = ..., objective: Optional[str] = ..., processor: Optional[Literal["base","pro"]] = ..., search_queries: Optional[Sequence[str]] = ..., source_policy: Optional[SourcePolicy] = ..., betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> SearchResult: ...
    async def extract(self, *, urls: Sequence[str], excerpts: Any = ..., fetch_policy: Any = ..., full_content: Any = ..., objective: Optional[str] = ..., search_queries: Optional[Sequence[str]] = ..., betas: List[ParallelBetaParam] = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> ExtractResponse: ...

# ---------------------------------------------------------------------------
# Main client objects
# ---------------------------------------------------------------------------

class Parallel:
    """
    Main synchronous client.

    Constructed as:
        Parallel(api_key=..., base_url=..., timeout=..., max_retries=..., ...)
    """
    api_key: str
    task_run: TaskRunResource
    beta: BetaResource

    with_raw_response: ParallelWithRawResponse
    with_streaming_response: ParallelWithStreamingResponse

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

class AsyncParallel:
    api_key: str
    task_run: AsyncTaskRunResource
    beta: AsyncBetaResource

    with_raw_response: AsyncParallelWithRawResponse
    with_streaming_response: AsyncParallelWithStreamingResponse

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

Client = Parallel
AsyncClient = AsyncParallel

class ParallelWithRawResponse:
    task_run: TaskRunResourceWithRawResponse
    beta: Any

class AsyncParallelWithRawResponse:
    task_run: AsyncTaskRunResourceWithRawResponse
    beta: Any

class ParallelWithStreamingResponse:
    task_run: TaskRunResourceWithStreamingResponse
    beta: Any

class AsyncParallelWithStreamingResponse:
    task_run: AsyncTaskRunResourceWithStreamingResponse
    beta: Any

# ---------------------------------------------------------------------------
# Package-level exports
# ---------------------------------------------------------------------------

__title__: str
__version__: str

# `types` module proxy re-export (users import parallel.types.* in runtime).
class types: ...
```

If you want this to be even more LLM-friendly, tell me:
1) whether you want **every** beta “poll response” model (FindAllPollResponse is huge), and  
2) whether you want me to include the **raw-response** / **streaming-response** wrapper classes for *all* resources (BetaResourceWithRawResponse etc.) with their exact attributes.