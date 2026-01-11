Below is a **single stub file** (`parallel.pyi`) that summarizes the *public* API footprint exposed by this repo. It focuses on what an SDK user (or an LLM) needs to know: top-level exports, client classes, resources, primary methods, return types, and the important data models/types. I’ve copied docstrings **1:1 where present** in the relevant public resource methods (notably `TaskRunResource` and beta resources). Many other classes in the repository have only field doc-comments (triple-quoted strings under attributes) which are not docstrings; those are represented as typed attributes here.

> Note: This is a summarization stub. It is intentionally not a 1:1 stub of every internal helper, but it does include the “entire footprint” of the API surface area that users interact with via `parallel.Parallel`, `parallel.AsyncParallel`, `parallel.task_run`, and `parallel.beta.*`.

---

```pyi
# parallel.pyi
# Stub summary of the Parallel Python SDK public API footprint.

from __future__ import annotations

from datetime import datetime, date
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
    Generic,
)

from typing_extensions import (
    Annotated,
    Literal,
    Protocol,
    TypedDict,
    TypeAlias,
)

import httpx
import pydantic


# -----------------------------------------------------------------------------
# Package metadata
# -----------------------------------------------------------------------------

__title__: str
__version__: str


# -----------------------------------------------------------------------------
# Sentinel / utility types exported at top-level
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

NoneType: Type[None]

Transport = httpx.BaseTransport
Timeout = httpx.Timeout
ProxiesTypes = Union[str, httpx.Proxy, Dict[Union[str, httpx.URL], Union[None, str, httpx.URL, httpx.Proxy]]]

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


# -----------------------------------------------------------------------------
# Exceptions exported at top-level
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


# -----------------------------------------------------------------------------
# Base model type (SDK models subclass this)
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


# -----------------------------------------------------------------------------
# Streaming
# -----------------------------------------------------------------------------

_TStream = TypeVar("_TStream")

class Stream(Generic[_TStream]):
    """Provides the core interface to iterate over a synchronous stream response."""
    response: httpx.Response
    def __iter__(self) -> Iterator[_TStream]: ...
    def __next__(self) -> _TStream: ...
    def close(self) -> None: ...
    def __enter__(self) -> Stream[_TStream]: ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: object | None) -> None: ...

class AsyncStream(Generic[_TStream]):
    """Provides the core interface to iterate over an asynchronous stream response."""
    response: httpx.Response
    def __aiter__(self) -> AsyncIterator[_TStream]: ...
    async def __anext__(self) -> _TStream: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> AsyncStream[_TStream]: ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: object | None) -> None: ...


# -----------------------------------------------------------------------------
# APIResponse wrappers (raw/streaming response access)
# -----------------------------------------------------------------------------

R = TypeVar("R")
TParse = TypeVar("TParse")

class APIResponse(Generic[R]):
    http_response: httpx.Response
    retries_taken: int
    @property
    def headers(self) -> httpx.Headers: ...
    @property
    def status_code(self) -> int: ...
    @overload
    def parse(self, *, to: Type[TParse]) -> TParse: ...
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
    def status_code(self) -> int: ...
    @overload
    async def parse(self, *, to: Type[TParse]) -> TParse: ...
    @overload
    async def parse(self) -> R: ...
    async def read(self) -> bytes: ...
    async def text(self) -> str: ...
    async def json(self) -> object: ...
    async def close(self) -> None: ...
    async def iter_bytes(self, chunk_size: int | None = None) -> AsyncIterator[bytes]: ...
    async def iter_text(self, chunk_size: int | None = None) -> AsyncIterator[str]: ...
    async def iter_lines(self) -> AsyncIterator[str]: ...


# -----------------------------------------------------------------------------
# Core types/models (non-beta)
# -----------------------------------------------------------------------------

# ---- shared models ----

class Warning(BaseModel):
    message: str
    type: Literal["spec_validation_warning", "input_validation_warning", "warning"]
    detail: Optional[Dict[str, object]]

class ErrorObject(BaseModel):
    message: str
    ref_id: str
    detail: Optional[Dict[str, object]]

class ErrorResponse(BaseModel):
    error: ErrorObject
    type: Literal["error"]

class Citation(BaseModel):
    url: str
    excerpts: Optional[List[str]]
    title: Optional[str]

class FieldBasis(BaseModel):
    field: str
    reasoning: str
    citations: Optional[List[Citation]]
    confidence: Optional[str]


# ---- schema models ----

class AutoSchema(BaseModel):
    type: Optional[Literal["auto"]]

class TextSchema(BaseModel):
    description: Optional[str]
    type: Optional[Literal["text"]]

class JsonSchema(BaseModel):
    json_schema: Dict[str, object]
    type: Optional[Literal["json"]]

OutputSchema: TypeAlias = Union[JsonSchema, TextSchema, AutoSchema, str]
InputSchema: TypeAlias = Union[str, JsonSchema, TextSchema, None]

class TaskSpec(BaseModel):
    output_schema: OutputSchema
    input_schema: Optional[InputSchema]


# ---- task run models ----

class TaskRun(BaseModel):
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
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
    beta_fields: Optional[Dict[str, object]]

class TaskRunJsonOutput(BaseModel):
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: Literal["json"]
    beta_fields: Optional[Dict[str, object]]
    output_schema: Optional[Dict[str, object]]

TaskRunResultOutput: TypeAlias = Annotated[Union[TaskRunTextOutput, TaskRunJsonOutput], object]

class TaskRunResult(BaseModel):
    output: TaskRunResultOutput
    run: TaskRun


# ---- parsed task run results (SDK convenience) ----

ContentType = TypeVar("ContentType", bound=pydantic.BaseModel)

class ParsedTaskRunTextOutput(TaskRunTextOutput, Generic[ContentType]):
    parsed: None

class ParsedTaskRunJsonOutput(TaskRunJsonOutput, Generic[ContentType]):
    parsed: Optional[ContentType]

class ParsedTaskRunResult(TaskRunResult, Generic[ContentType]):
    output: Union[ParsedTaskRunTextOutput[ContentType], ParsedTaskRunJsonOutput[ContentType]]


# -----------------------------------------------------------------------------
# Param TypedDicts (non-beta)
# -----------------------------------------------------------------------------

class AutoSchemaParam(TypedDict, total=False):
    type: Literal["auto"]

class TextSchemaParam(TypedDict, total=False):
    description: Optional[str]
    type: Literal["text"]

class JsonSchemaParam(TypedDict, total=False):
    json_schema: Required[Dict[str, object]]
    type: Literal["json"]

OutputSchemaParam: TypeAlias = Union[JsonSchemaParam, TextSchemaParam, AutoSchemaParam, str]
InputSchemaParam: TypeAlias = Union[str, JsonSchemaParam, TextSchemaParam]

OutputT = TypeVar("OutputT", bound=pydantic.BaseModel)

class TaskSpecParam(TypedDict, total=False):
    output_schema: Required[OutputSchemaParam]
    input_schema: Optional[InputSchemaParam]

class SourcePolicy(TypedDict, total=False):
    exclude_domains: Sequence[str]
    include_domains: Sequence[str]

class TaskRunCreateParams(TypedDict, total=False):
    input: Required[Union[str, Dict[str, object]]]
    processor: Required[str]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicy]
    task_spec: Optional[TaskSpecParam]

class TaskRunResultParams(TypedDict, total=False):
    api_timeout: Annotated[int, object]  # alias "timeout" at runtime


# -----------------------------------------------------------------------------
# Beta types/models
# -----------------------------------------------------------------------------

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

class Webhook(BaseModel):
    url: str
    event_types: Optional[List[Literal["task_run.status"]]]

class WebhookParam(TypedDict, total=False):
    url: Required[str]
    event_types: List[Literal["task_run.status"]]

class McpServer(BaseModel):
    name: str
    url: str
    allowed_tools: Optional[List[str]]
    headers: Optional[Dict[str, str]]
    type: Optional[Literal["url"]]

class McpServerParam(TypedDict, total=False):
    name: Required[str]
    url: Required[str]
    allowed_tools: Optional[Sequence[str]]
    headers: Optional[Dict[str, str]]
    type: Literal["url"]

class McpToolCall(BaseModel):
    arguments: str
    server_name: str
    tool_call_id: str
    tool_name: str
    content: Optional[str]
    error: Optional[str]

# Beta "task run input" snapshot type (as returned in events)
class BetaRunInput(BaseModel):
    input: Union[str, Dict[str, object]]
    processor: str
    enable_events: Optional[bool]
    mcp_servers: Optional[List[McpServer]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional["types.shared.source_policy.SourcePolicy"]  # left as string-ish reference
    task_spec: Optional[TaskSpec]
    webhook: Optional[Webhook]

class BetaRunInputParam(TypedDict, total=False):
    input: Required[Union[str, Dict[str, object]]]
    processor: Required[str]
    enable_events: Optional[bool]
    mcp_servers: Optional[Iterable[McpServerParam]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicy]
    task_spec: Optional[TaskSpecParam]
    webhook: Optional[WebhookParam]

# Beta TaskRunCreate/Result params
class BetaTaskRunCreateParams(TypedDict, total=False):
    input: Required[Union[str, Dict[str, object]]]
    processor: Required[str]
    enable_events: Optional[bool]
    mcp_servers: Optional[Iterable[McpServerParam]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicy]
    task_spec: Optional[TaskSpecParam]
    webhook: Optional[WebhookParam]
    betas: Annotated[List[ParallelBetaParam], object]  # alias "parallel-beta"

class BetaTaskRunResultParams(TypedDict, total=False):
    api_timeout: Annotated[int, object]  # alias "timeout"
    betas: Annotated[List[ParallelBetaParam], object]  # alias "parallel-beta"

# Search/Extract
class ExcerptSettingsParam(TypedDict, total=False):
    max_chars_per_result: Optional[int]

class FetchPolicyParam(TypedDict, total=False):
    disable_cache_fallback: bool
    max_age_seconds: Optional[int]
    timeout_seconds: Optional[float]

BetaExtractExcerpts: TypeAlias = Union[bool, ExcerptSettingsParam]
class FullContentFullContentSettings(TypedDict, total=False):
    max_chars_per_result: Optional[int]
BetaExtractFullContent: TypeAlias = Union[bool, FullContentFullContentSettings]

class BetaExtractParams(TypedDict, total=False):
    urls: Required[Sequence[str]]
    excerpts: BetaExtractExcerpts
    fetch_policy: Optional[FetchPolicyParam]
    full_content: BetaExtractFullContent
    objective: Optional[str]
    search_queries: Optional[Sequence[str]]
    betas: Annotated[List[ParallelBetaParam], object]  # alias "parallel-beta"

class BetaSearchParams(TypedDict, total=False):
    excerpts: ExcerptSettingsParam
    fetch_policy: Optional[FetchPolicyParam]
    max_chars_per_result: Optional[int]
    max_results: Optional[int]
    mode: Optional[Literal["one-shot", "agentic"]]
    objective: Optional[str]
    processor: Optional[Literal["base", "pro"]]
    search_queries: Optional[Sequence[str]]
    source_policy: Optional[SourcePolicy]
    betas: Annotated[List[ParallelBetaParam], object]  # alias "parallel-beta"

class WebSearchResult(BaseModel):
    url: str
    excerpts: Optional[List[str]]
    publish_date: Optional[str]
    title: Optional[str]

class SearchResult(BaseModel):
    results: List[WebSearchResult]
    search_id: str
    usage: Optional[List[UsageItem]]
    warnings: Optional[List[Warning]]

class ExtractError(BaseModel):
    content: Optional[str]
    error_type: str
    http_status_code: Optional[int]
    url: str

class ExtractResult(BaseModel):
    url: str
    excerpts: Optional[List[str]]
    full_content: Optional[str]
    publish_date: Optional[str]
    title: Optional[str]

class ExtractResponse(BaseModel):
    errors: List[ExtractError]
    extract_id: str
    results: List[ExtractResult]
    usage: Optional[List[UsageItem]]
    warnings: Optional[List[Warning]]

# Beta task run result includes MCP tool calls surfaced directly
class BetaTaskRunTextOutput(BaseModel):
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
    beta_fields: Optional[Dict[str, object]]
    mcp_tool_calls: Optional[List[McpToolCall]]

class BetaTaskRunJsonOutput(BaseModel):
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: Literal["json"]
    beta_fields: Optional[Dict[str, object]]
    mcp_tool_calls: Optional[List[McpToolCall]]
    output_schema: Optional[Dict[str, object]]

BetaTaskRunOutput: TypeAlias = Annotated[Union[BetaTaskRunTextOutput, BetaTaskRunJsonOutput], object]

class BetaTaskRunResult(BaseModel):
    output: BetaTaskRunOutput
    run: TaskRun

# SSE events for task runs (beta)
class ErrorEvent(BaseModel):
    error: ErrorObject
    type: Literal["error"]

class TaskRunEvent(BaseModel):
    event_id: Optional[str]
    run: TaskRun
    type: Literal["task_run.state"]
    input: Optional[BetaRunInput]
    output: Optional[Annotated[Union[TaskRunTextOutput, TaskRunJsonOutput, None], object]]

class TaskRunProgressStatsEventSourceStats(BaseModel):
    num_sources_considered: Optional[int]
    num_sources_read: Optional[int]
    sources_read_sample: Optional[List[str]]

class TaskRunProgressStatsEvent(BaseModel):
    progress_meter: float
    source_stats: TaskRunProgressStatsEventSourceStats
    type: Literal["task_run.progress_stats"]

class TaskRunProgressMessageEvent(BaseModel):
    message: str
    timestamp: Optional[str]
    type: Literal[
        "task_run.progress_msg.plan",
        "task_run.progress_msg.search",
        "task_run.progress_msg.result",
        "task_run.progress_msg.tool_call",
        "task_run.progress_msg.exec_status",
    ]

TaskRunEventsResponse: TypeAlias = Annotated[
    Union[TaskRunProgressStatsEvent, TaskRunProgressMessageEvent, TaskRunEvent, ErrorEvent],
    object,
]

# TaskGroup (beta)
class TaskGroupStatus(BaseModel):
    is_active: bool
    modified_at: Optional[str]
    num_task_runs: int
    status_message: Optional[str]
    task_run_status_counts: Dict[str, int]

class TaskGroup(BaseModel):
    created_at: Optional[str]
    status: TaskGroupStatus
    task_group_id: str
    metadata: Optional[Dict[str, Union[str, float, bool]]]

class TaskGroupCreateParams(TypedDict, total=False):
    metadata: Optional[Dict[str, Union[str, float, bool]]]

class TaskGroupAddRunsParams(TypedDict, total=False):
    inputs: Required[Iterable[BetaRunInputParam]]
    default_task_spec: Optional[TaskSpecParam]
    betas: Annotated[List[ParallelBetaParam], object]  # alias "parallel-beta"

class TaskGroupEventsParams(TypedDict, total=False):
    last_event_id: Optional[str]
    api_timeout: Annotated[Optional[float], object]  # alias "timeout"

class TaskGroupGetRunsParams(TypedDict, total=False):
    include_input: bool
    include_output: bool
    last_event_id: Optional[str]
    status: Optional[Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]]

class TaskGroupStatusEvent(BaseModel):
    event_id: str
    status: TaskGroupStatus
    type: Literal["task_group_status"]

TaskGroupEventsResponse: TypeAlias = Annotated[Union[TaskGroupStatusEvent, TaskRunEvent, ErrorEvent], object]
TaskGroupGetRunsResponse: TypeAlias = Annotated[Union[TaskRunEvent, ErrorEvent], object]

class TaskGroupRunResponse(BaseModel):
    event_cursor: Optional[str]
    run_cursor: Optional[str]
    run_ids: List[str]
    status: TaskGroupStatus

# FindAll (beta)
class FindallSchemaMatchCondition(BaseModel):
    description: str
    name: str

class FindallEnrichInput(BaseModel):
    output_schema: JsonSchema
    mcp_servers: Optional[List[McpServer]]
    processor: Optional[str]

class FindallSchema(BaseModel):
    entity_type: str
    match_conditions: List[FindallSchemaMatchCondition]
    objective: str
    enrichments: Optional[List[FindallEnrichInput]]
    generator: Optional[Literal["base", "core", "pro", "preview"]]
    match_limit: Optional[int]

class FindallIngestParams(TypedDict, total=False):
    objective: Required[str]
    betas: Annotated[List[ParallelBetaParam], object]  # alias "parallel-beta"

class FindallCreateMatchCondition(TypedDict, total=False):
    description: Required[str]
    name: Required[str]

class FindallCreateExcludeList(TypedDict, total=False):
    name: Required[str]
    url: Required[str]

class FindallCreateParams(TypedDict, total=False):
    entity_type: Required[str]
    generator: Required[Literal["base", "core", "pro", "preview"]]
    match_conditions: Required[Iterable[FindallCreateMatchCondition]]
    match_limit: Required[int]
    objective: Required[str]
    exclude_list: Optional[Iterable[FindallCreateExcludeList]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    webhook: Optional[WebhookParam]
    betas: Annotated[List[ParallelBetaParam], object]  # alias "parallel-beta"

class FindallExtendParams(TypedDict, total=False):
    additional_match_limit: Required[int]
    betas: Annotated[List[ParallelBetaParam], object]  # alias "parallel-beta"

class FindallEnrichParams(TypedDict, total=False):
    output_schema: Required[JsonSchemaParam]
    mcp_servers: Optional[Iterable[McpServerParam]]
    processor: str
    betas: Annotated[List[ParallelBetaParam], object]  # alias "parallel-beta"

class FindallEventsParams(TypedDict, total=False):
    last_event_id: Optional[str]
    api_timeout: Annotated[Optional[float], object]  # alias "timeout"
    betas: Annotated[List[ParallelBetaParam], object]  # alias "parallel-beta"

class FindallRunStatusMetrics(BaseModel):
    generated_candidates_count: Optional[int]
    matched_candidates_count: Optional[int]

class FindallRunStatus(BaseModel):
    is_active: bool
    metrics: FindallRunStatusMetrics
    status: Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]
    termination_reason: Optional[str]

class FindallRun(BaseModel):
    findall_id: str
    generator: Literal["base", "core", "pro", "preview"]
    status: FindallRunStatus
    created_at: Optional[str]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    modified_at: Optional[str]

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
    basis: Optional[List[FieldBasis]]
    description: Optional[str]
    output: Optional[Dict[str, object]]

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

FindallEventsResponse: TypeAlias = Annotated[
    Union[FindallSchemaUpdatedEvent, FindallRunStatusEvent, FindallCandidateMatchStatusEvent, ErrorEvent],
    object,
]

class FindallRunResultCandidate(BaseModel):
    candidate_id: str
    match_status: Literal["generated", "matched", "unmatched", "discarded"]
    name: str
    url: str
    basis: Optional[List[FieldBasis]]
    description: Optional[str]
    output: Optional[Dict[str, object]]

class FindallRunResult(BaseModel):
    candidates: List[FindallRunResultCandidate]
    run: FindallRun
    last_event_id: Optional[str]

# The retrieve endpoint is a union of two shapes; keep as object union summary
class FindAllPollResponse(BaseModel): ...
FindallRetrieveResponse: TypeAlias = Union[FindallRun, FindAllPollResponse]


# -----------------------------------------------------------------------------
# Resources
# -----------------------------------------------------------------------------

# ---- Non-beta TaskRun resource ----

class TaskRunResource:
    @property
    def with_raw_response(self) -> TaskRunResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> TaskRunResourceWithStreamingResponse: ...

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


class AsyncTaskRunResource:
    @property
    def with_raw_response(self) -> AsyncTaskRunResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncTaskRunResourceWithStreamingResponse: ...

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


# ---- Beta resources (search/extract + beta.task_run/task_group/findall) ----

class BetaTaskRunResource:
    @property
    def with_raw_response(self) -> BetaTaskRunResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> BetaTaskRunResourceWithStreamingResponse: ...

    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        enable_events: Optional[bool] | Omit = ...,
        mcp_servers: Optional[Iterable[McpServerParam]] | Omit = ...,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        source_policy: Optional[SourcePolicy] | Omit = ...,
        task_spec: Optional[TaskSpecParam] | Omit = ...,
        webhook: Optional[WebhookParam] | Omit = ...,
        betas: List[ParallelBetaParam] | Omit = ...,
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
        api_timeout: int | Omit = ...,
        betas: List[ParallelBetaParam] | Omit = ...,
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
    @property
    def with_raw_response(self) -> AsyncBetaTaskRunResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncBetaTaskRunResourceWithStreamingResponse: ...
    async def create(self, **kwargs: Any) -> TaskRun: ...
    async def events(self, run_id: str, **kwargs: Any) -> AsyncStream[TaskRunEventsResponse]: ...
    async def result(self, run_id: str, **kwargs: Any) -> BetaTaskRunResult: ...


class BetaTaskGroupResource:
    @property
    def with_raw_response(self) -> BetaTaskGroupResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> BetaTaskGroupResourceWithStreamingResponse: ...

    def create(self, *, metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ..., **kwargs: Any) -> TaskGroup: ...
    def retrieve(self, task_group_id: str, **kwargs: Any) -> TaskGroup: ...
    def add_runs(self, task_group_id: str, *, inputs: Iterable[BetaRunInputParam], default_task_spec: Optional[TaskSpecParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., **kwargs: Any) -> TaskGroupRunResponse: ...
    def events(self, task_group_id: str, *, last_event_id: Optional[str] | Omit = ..., api_timeout: Optional[float] | Omit = ..., **kwargs: Any) -> Stream[TaskGroupEventsResponse]: ...
    def get_runs(self, task_group_id: str, *, include_input: bool | Omit = ..., include_output: bool | Omit = ..., last_event_id: Optional[str] | Omit = ..., status: Optional[Literal["queued","action_required","running","completed","failed","cancelling","cancelled"]] | Omit = ..., **kwargs: Any) -> Stream[TaskGroupGetRunsResponse]: ...

class AsyncBetaTaskGroupResource:
    @property
    def with_raw_response(self) -> AsyncBetaTaskGroupResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncBetaTaskGroupResourceWithStreamingResponse: ...
    async def create(self, **kwargs: Any) -> TaskGroup: ...
    async def retrieve(self, task_group_id: str, **kwargs: Any) -> TaskGroup: ...
    async def add_runs(self, task_group_id: str, **kwargs: Any) -> TaskGroupRunResponse: ...
    async def events(self, task_group_id: str, **kwargs: Any) -> AsyncStream[TaskGroupEventsResponse]: ...
    async def get_runs(self, task_group_id: str, **kwargs: Any) -> AsyncStream[TaskGroupGetRunsResponse]: ...


class BetaFindallResource:
    @property
    def with_raw_response(self) -> BetaFindallResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> BetaFindallResourceWithStreamingResponse: ...
    def create(self, **kwargs: Any) -> FindallRun: ...
    def retrieve(self, findall_id: str, **kwargs: Any) -> FindallRetrieveResponse: ...
    def cancel(self, findall_id: str, **kwargs: Any) -> object: ...
    def enrich(self, findall_id: str, **kwargs: Any) -> FindallSchema: ...
    def events(self, findall_id: str, **kwargs: Any) -> Stream[FindallEventsResponse]: ...
    def extend(self, findall_id: str, **kwargs: Any) -> FindallSchema: ...
    def ingest(self, **kwargs: Any) -> FindallSchema: ...
    def result(self, findall_id: str, **kwargs: Any) -> FindallRunResult: ...
    def schema(self, findall_id: str, **kwargs: Any) -> FindallSchema: ...

class AsyncBetaFindallResource:
    @property
    def with_raw_response(self) -> AsyncBetaFindallResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncBetaFindallResourceWithStreamingResponse: ...
    async def create(self, **kwargs: Any) -> FindallRun: ...
    async def retrieve(self, findall_id: str, **kwargs: Any) -> FindallRetrieveResponse: ...
    async def cancel(self, findall_id: str, **kwargs: Any) -> object: ...
    async def enrich(self, findall_id: str, **kwargs: Any) -> FindallSchema: ...
    async def events(self, findall_id: str, **kwargs: Any) -> AsyncStream[FindallEventsResponse]: ...
    async def extend(self, findall_id: str, **kwargs: Any) -> FindallSchema: ...
    async def ingest(self, **kwargs: Any) -> FindallSchema: ...
    async def result(self, findall_id: str, **kwargs: Any) -> FindallRunResult: ...
    async def schema(self, findall_id: str, **kwargs: Any) -> FindallSchema: ...


class BetaResource:
    @property
    def task_run(self) -> BetaTaskRunResource: ...
    @property
    def task_group(self) -> BetaTaskGroupResource: ...
    @property
    def findall(self) -> BetaFindallResource: ...

    @property
    def with_raw_response(self) -> BetaResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> BetaResourceWithStreamingResponse: ...

    def extract(
        self,
        *,
        urls: Sequence[str],
        excerpts: BetaExtractExcerpts | Omit = ...,
        fetch_policy: Optional[FetchPolicyParam] | Omit = ...,
        full_content: BetaExtractFullContent | Omit = ...,
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

class AsyncBetaResource:
    @property
    def task_run(self) -> AsyncBetaTaskRunResource: ...
    @property
    def task_group(self) -> AsyncBetaTaskGroupResource: ...
    @property
    def findall(self) -> AsyncBetaFindallResource: ...
    @property
    def with_raw_response(self) -> AsyncBetaResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncBetaResourceWithStreamingResponse: ...
    async def extract(self, **kwargs: Any) -> ExtractResponse: ...
    async def search(self, **kwargs: Any) -> SearchResult: ...


# -----------------------------------------------------------------------------
# "with_raw_response" / "with_streaming_response" wrapper resource objects
# -----------------------------------------------------------------------------

# NOTE: These wrappers exist for: parallel.Parallel, parallel.AsyncParallel,
# and for each resource. In the generated SDK, these wrappers return
# APIResponse/AsyncAPIResponse or context managers for streamed responses.

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

class BetaTaskRunResourceWithRawResponse:
    create: Any
    events: Any
    result: Any

class AsyncBetaTaskRunResourceWithRawResponse:
    create: Any
    events: Any
    result: Any

class BetaTaskRunResourceWithStreamingResponse:
    create: Any
    events: Any
    result: Any

class AsyncBetaTaskRunResourceWithStreamingResponse:
    create: Any
    events: Any
    result: Any

class BetaTaskGroupResourceWithRawResponse:
    create: Any
    retrieve: Any
    add_runs: Any
    events: Any
    get_runs: Any

class AsyncBetaTaskGroupResourceWithRawResponse:
    create: Any
    retrieve: Any
    add_runs: Any
    events: Any
    get_runs: Any

class BetaTaskGroupResourceWithStreamingResponse:
    create: Any
    retrieve: Any
    add_runs: Any
    events: Any
    get_runs: Any

class AsyncBetaTaskGroupResourceWithStreamingResponse:
    create: Any
    retrieve: Any
    add_runs: Any
    events: Any
    get_runs: Any

class BetaFindallResourceWithRawResponse:
    create: Any
    retrieve: Any
    cancel: Any
    enrich: Any
    events: Any
    extend: Any
    ingest: Any
    result: Any
    schema: Any

class AsyncBetaFindallResourceWithRawResponse:
    create: Any
    retrieve: Any
    cancel: Any
    enrich: Any
    events: Any
    extend: Any
    ingest: Any
    result: Any
    schema: Any

class BetaFindallResourceWithStreamingResponse:
    create: Any
    retrieve: Any
    cancel: Any
    enrich: Any
    events: Any
    extend: Any
    ingest: Any
    result: Any
    schema: Any

class AsyncBetaFindallResourceWithStreamingResponse:
    create: Any
    retrieve: Any
    cancel: Any
    enrich: Any
    events: Any
    extend: Any
    ingest: Any
    result: Any
    schema: Any

class BetaResourceWithRawResponse:
    extract: Any
    search: Any
    @property
    def task_run(self) -> BetaTaskRunResourceWithRawResponse: ...
    @property
    def task_group(self) -> BetaTaskGroupResourceWithRawResponse: ...
    @property
    def findall(self) -> BetaFindallResourceWithRawResponse: ...

class AsyncBetaResourceWithRawResponse:
    extract: Any
    search: Any
    @property
    def task_run(self) -> AsyncBetaTaskRunResourceWithRawResponse: ...
    @property
    def task_group(self) -> AsyncBetaTaskGroupResourceWithRawResponse: ...
    @property
    def findall(self) -> AsyncBetaFindallResourceWithRawResponse: ...

class BetaResourceWithStreamingResponse:
    extract: Any
    search: Any
    @property
    def task_run(self) -> BetaTaskRunResourceWithStreamingResponse: ...
    @property
    def task_group(self) -> BetaTaskGroupResourceWithStreamingResponse: ...
    @property
    def findall(self) -> BetaFindallResourceWithStreamingResponse: ...

class AsyncBetaResourceWithStreamingResponse:
    extract: Any
    search: Any
    @property
    def task_run(self) -> AsyncBetaTaskRunResourceWithStreamingResponse: ...
    @property
    def task_group(self) -> AsyncBetaTaskGroupResourceWithStreamingResponse: ...
    @property
    def findall(self) -> AsyncBetaFindallResourceWithStreamingResponse: ...


# -----------------------------------------------------------------------------
# Client classes (public entry points)
# -----------------------------------------------------------------------------

DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits

class Parallel:
    task_run: TaskRunResource
    beta: BetaResource
    with_raw_response: ParallelWithRawResponse
    with_streaming_response: ParallelWithStreamedResponse

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

    with_options: Any  # alias of copy

class AsyncParallel:
    task_run: AsyncTaskRunResource
    beta: AsyncBetaResource
    with_raw_response: AsyncParallelWithRawResponse
    with_streaming_response: AsyncParallelWithStreamedResponse

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

    with_options: Any  # alias of copy

Client = Parallel
AsyncClient = AsyncParallel

class ParallelWithRawResponse:
    task_run: TaskRunResourceWithRawResponse
    beta: BetaResourceWithRawResponse
    def __init__(self, client: Parallel) -> None: ...

class AsyncParallelWithRawResponse:
    task_run: AsyncTaskRunResourceWithRawResponse
    beta: AsyncBetaResourceWithRawResponse
    def __init__(self, client: AsyncParallel) -> None: ...

class ParallelWithStreamedResponse:
    task_run: TaskRunResourceWithStreamingResponse
    beta: BetaResourceWithStreamingResponse
    def __init__(self, client: Parallel) -> None: ...

class AsyncParallelWithStreamedResponse:
    task_run: AsyncTaskRunResourceWithStreamingResponse
    beta: AsyncBetaResourceWithStreamingResponse
    def __init__(self, client: AsyncParallel) -> None: ...


# -----------------------------------------------------------------------------
# `parallel.types` module footprint (re-exported models/params)
# -----------------------------------------------------------------------------

class types:
    # shared
    Warning = Warning
    ErrorObject = ErrorObject
    SourcePolicy = SourcePolicy
    ErrorResponse = ErrorResponse

    # core models
    Citation = Citation
    TaskRun = TaskRun
    TaskSpec = TaskSpec
    AutoSchema = AutoSchema
    FieldBasis = FieldBasis
    JsonSchema = JsonSchema
    TextSchema = TextSchema
    TaskRunResult = TaskRunResult

    # params
    TaskSpecParam = TaskSpecParam
    AutoSchemaParam = AutoSchemaParam
    JsonSchemaParam = JsonSchemaParam
    TextSchemaParam = TextSchemaParam
    TaskRunCreateParams = TaskRunCreateParams
    TaskRunResultParams = TaskRunResultParams

    # outputs
    TaskRunJsonOutput = TaskRunJsonOutput
    TaskRunTextOutput = TaskRunTextOutput
    ParsedTaskRunResult = ParsedTaskRunResult

    # beta namespace
    class beta:
        Webhook = Webhook
        McpServer = McpServer
        TaskGroup = TaskGroup
        UsageItem = UsageItem
        ErrorEvent = ErrorEvent
        FindallRun = FindallRun
        ExtractError = ExtractError
        McpToolCall = McpToolCall
        SearchResult = SearchResult
        WebhookParam = WebhookParam
        BetaRunInput = BetaRunInput
        ExtractResult = ExtractResult
        FindallSchema = FindallSchema
        TaskRunEvent = TaskRunEvent
        ExtractResponse = ExtractResponse
        McpServerParam = McpServerParam
        TaskGroupStatus = TaskGroupStatus
        WebSearchResult = WebSearchResult
        BetaSearchParams = BetaSearchParams
        FetchPolicyParam = FetchPolicyParam
        FindallRunResult = FindallRunResult
        BetaExtractParams = BetaExtractParams
        ParallelBetaParam = ParallelBetaParam
        BetaRunInputParam = BetaRunInputParam
        BetaTaskRunResult = BetaTaskRunResult
        FindallEnrichInput = FindallEnrichInput
        FindallCreateParams = FindallCreateParams
        FindallEnrichParams = FindallEnrichParams
        FindallEventsParams = FindallEventsParams
        FindallExtendParams = FindallExtendParams
        FindallIngestParams = FindallIngestParams
        ExcerptSettingsParam = ExcerptSettingsParam
        TaskRunCreateParams = BetaTaskRunCreateParams
        TaskRunResultParams = BetaTaskRunResultParams
        FindallEventsResponse = FindallEventsResponse
        TaskGroupRunResponse = TaskGroupRunResponse
        FindallRunStatusEvent = FindallRunStatusEvent
        TaskGroupCreateParams = TaskGroupCreateParams
        TaskGroupEventsParams = TaskGroupEventsParams
        TaskRunEventsResponse = TaskRunEventsResponse
        FindallRetrieveResponse = FindallRetrieveResponse
        TaskGroupAddRunsParams = TaskGroupAddRunsParams
        TaskGroupEventsResponse = TaskGroupEventsResponse
        TaskGroupGetRunsParams = TaskGroupGetRunsParams
        FindallSchemaUpdatedEvent = FindallSchemaUpdatedEvent
        TaskGroupGetRunsResponse = TaskGroupGetRunsResponse
        FindallCandidateMatchStatusEvent = FindallCandidateMatchStatusEvent


# -----------------------------------------------------------------------------
# Helpers exported at top-level
# -----------------------------------------------------------------------------

def file_from_path(path: str) -> Tuple[Optional[str], bytes]: ...
```

---

If you want, I can also:
1) generate a second variant that **includes every single class** (including all internal helpers in `_utils`, `_models`, `_response`, etc.) as a monolithic stub (much bigger), or  
2) emit this as **two stubs**: `parallel.pyi` + `parallel.types.pyi`, which can be friendlier for some tooling.