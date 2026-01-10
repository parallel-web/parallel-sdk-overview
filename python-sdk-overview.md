Below is a **single, consolidated** `parallel.pyi` stub that captures the *public* SDK surface area that an LLM/user typically needs to understand “how to use the API”: the top-level exports, the client objects, the main resources/methods, and the primary request/response model types (including the Beta surface).

It’s **not** a mechanically perfect stub of every internal helper (that would be thousands of lines and not very useful for “how the API works”), but it **does** summarize the complete externally-consumable footprint as expressed by `parallel/__init__.py`, `parallel/_client.py`, and `parallel/resources/**`, plus the core `parallel/types/**` models that those resources return/accept.

> Notes:
> - I copied docstrings where they appear in the resource methods (these are the most important user-facing docs).  
> - Many generated models don’t have docstrings (they have inline field comments in `.py`), so there’s nothing “1:1 docstring” to copy for those.
> - This is meant for comprehension and tooling; some complex typing details (e.g., all overloads of helper wrappers) are simplified but remain faithful to usage.

Save as: `parallel.pyi`

```pyi
# parallel.pyi
# Consolidated SDK footprint stub for LLM/API comprehension.
# Generated manually from repository snapshot.

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
)

import httpx
import pydantic
from typing_extensions import (
    Annotated,
    Literal,
    NotRequired,
    Protocol,
    Required,
    TypeAlias,
    TypedDict,
)

__title__: str
__version__: str

# -----------------------------
# Sentinel / options types
# -----------------------------

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

NOT_GIVEN: NotGiven
not_given: NotGiven
omit: Omit

# Special helper to allow cast_to=type(None)
NoneType: type[None]

# httpx-ish types re-exported
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

# -----------------------------
# Exceptions (public)
# -----------------------------

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

# -----------------------------
# BaseModel / response helpers
# -----------------------------

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

# Raw/streaming response wrappers exposed at top-level
R = TypeVar("R")
T_co = TypeVar("T_co", covariant=True)

class APIResponse(Protocol[T_co]):
    http_response: httpx.Response
    headers: httpx.Headers
    status_code: int
    url: httpx.URL
    method: str

    @overload
    def parse(self, *, to: Type[R]) -> R: ...
    @overload
    def parse(self) -> T_co: ...

    def read(self) -> bytes: ...
    def text(self) -> str: ...
    def json(self) -> object: ...
    def close(self) -> None: ...

class AsyncAPIResponse(Protocol[T_co]):
    http_response: httpx.Response
    headers: httpx.Headers
    status_code: int
    url: httpx.URL
    method: str

    @overload
    async def parse(self, *, to: Type[R]) -> R: ...
    @overload
    async def parse(self) -> T_co: ...

    async def read(self) -> bytes: ...
    async def text(self) -> str: ...
    async def json(self) -> object: ...
    async def close(self) -> None: ...

# SSE stream wrappers (core usage: iterate events)
class Stream(Protocol[T_co]):
    response: httpx.Response
    def __iter__(self) -> Iterator[T_co]: ...
    def __next__(self) -> T_co: ...
    def close(self) -> None: ...
    def __enter__(self) -> Stream[T_co]: ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

class AsyncStream(Protocol[T_co]):
    response: httpx.Response
    def __aiter__(self) -> AsyncIterator[T_co]: ...
    async def __anext__(self) -> T_co: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> AsyncStream[T_co]: ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

# Defaults re-exported
DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits

# Default http clients
DefaultHttpxClient: type[httpx.Client]
DefaultAsyncHttpxClient: type[httpx.AsyncClient]
DefaultAioHttpClient: type[httpx.AsyncClient]

# Utility
def file_from_path(path: str) -> object: ...


# ============================================================
# Types (public models + params)
# ============================================================

# ---- shared / warnings / errors ----

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

class SourcePolicy(BaseModel):
    exclude_domains: Optional[List[str]]
    include_domains: Optional[List[str]]

class FieldBasis(BaseModel):
    field: str
    reasoning: str
    citations: Optional[List[Citation]]
    confidence: Optional[str]


# ---- schemas / task spec ----

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


# ---- run / outputs ----

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

TaskRunOutput: TypeAlias = Annotated[Union[TaskRunTextOutput, TaskRunJsonOutput], object]

class TaskRunResult(BaseModel):
    output: TaskRunOutput
    run: TaskRun


# ---- parsed results helper (generic) ----

ContentType = TypeVar("ContentType", bound=pydantic.BaseModel)

class ParsedTaskRunTextOutput(TaskRunTextOutput, Generic[ContentType]):
    parsed: None

class ParsedTaskRunJsonOutput(TaskRunJsonOutput, Generic[ContentType]):
    parsed: Optional[ContentType]

class ParsedTaskRunResult(TaskRunResult, Generic[ContentType]):
    output: Union[ParsedTaskRunTextOutput[ContentType], ParsedTaskRunJsonOutput[ContentType]]


# ---- params TypedDicts (non-beta + shared_params) ----

class SourcePolicyParam(TypedDict, total=False):
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

OutputSchemaParam: TypeAlias = Union[JsonSchemaParam, TextSchemaParam, AutoSchemaParam, str]
InputSchemaParam: TypeAlias = Union[str, JsonSchemaParam, TextSchemaParam]

class TaskSpecParam(TypedDict, total=False):
    output_schema: Required[OutputSchemaParam]
    input_schema: NotRequired[Optional[InputSchemaParam]]

class TaskRunCreateParams(TypedDict, total=False):
    input: Required[Union[str, Dict[str, object]]]
    processor: Required[str]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicyParam]
    task_spec: Optional[TaskSpecParam]

class TaskRunResultParams(TypedDict, total=False):
    api_timeout: Annotated[int, object]  # alias="timeout" at runtime


# ============================================================
# Beta types (parallel.types.beta)
# ============================================================

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

# Beta run input (when streamed or included)
class BetaRunInput(BaseModel):
    input: Union[str, Dict[str, object]]
    processor: str
    enable_events: Optional[bool]
    mcp_servers: Optional[List[McpServer]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicy]
    task_spec: Optional[TaskSpec]
    webhook: Optional[Webhook]

class BetaRunInputParam(TypedDict, total=False):
    input: Required[Union[str, Dict[str, object]]]
    processor: Required[str]
    enable_events: Optional[bool]
    mcp_servers: Optional[Iterable[McpServerParam]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicyParam]
    task_spec: Optional[TaskSpecParam]
    webhook: Optional[WebhookParam]

# Beta task-run result includes MCP tool calls in output variants.
class OutputBetaTaskRunTextOutput(BaseModel):
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
    beta_fields: Optional[Dict[str, object]]
    mcp_tool_calls: Optional[List[McpToolCall]]

class OutputBetaTaskRunJsonOutput(BaseModel):
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: Literal["json"]
    beta_fields: Optional[Dict[str, object]]
    mcp_tool_calls: Optional[List[McpToolCall]]
    output_schema: Optional[Dict[str, object]]

BetaTaskRunOutput: TypeAlias = Annotated[Union[OutputBetaTaskRunTextOutput, OutputBetaTaskRunJsonOutput], object]

class BetaTaskRunResult(BaseModel):
    output: BetaTaskRunOutput
    run: TaskRun

class BetaTaskRunResultParams(TypedDict, total=False):
    api_timeout: Annotated[int, object]  # alias="timeout"
    betas: Annotated[List[ParallelBetaParam], object]  # alias="parallel-beta"

# ---- Beta search/extract ----

class ExcerptSettingsParam(TypedDict, total=False):
    max_chars_per_result: Optional[int]

class FetchPolicyParam(TypedDict, total=False):
    disable_cache_fallback: bool
    max_age_seconds: Optional[int]
    timeout_seconds: Optional[float]

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
    betas: Annotated[List[ParallelBetaParam], object]  # alias="parallel-beta"

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
    betas: Annotated[List[ParallelBetaParam], object]  # alias="parallel-beta"

# ---- Beta events ----

class ErrorEvent(BaseModel):
    error: ErrorObject
    type: Literal["error"]

class TaskRunEventOutputText(BaseModel):
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
    beta_fields: Optional[Dict[str, object]]

class TaskRunEventOutputJson(BaseModel):
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: Literal["json"]
    beta_fields: Optional[Dict[str, object]]
    output_schema: Optional[Dict[str, object]]

TaskRunEventOutput: TypeAlias = Annotated[Union[TaskRunEventOutputText, TaskRunEventOutputJson, None], object]

class TaskRunEvent(BaseModel):
    event_id: Optional[str]
    run: TaskRun
    type: Literal["task_run.state"]
    input: Optional[BetaRunInput]
    output: Optional[TaskRunEventOutput]

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

# ---- Beta TaskGroup ----

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

class TaskGroupRunResponse(BaseModel):
    event_cursor: Optional[str]
    run_cursor: Optional[str]
    run_ids: List[str]
    status: TaskGroupStatus

class TaskGroupAddRunsParams(TypedDict, total=False):
    inputs: Required[Iterable[BetaRunInputParam]]
    default_task_spec: Optional[TaskSpecParam]
    betas: Annotated[List[ParallelBetaParam], object]  # alias="parallel-beta"

class TaskGroupEventsParams(TypedDict, total=False):
    last_event_id: Optional[str]
    api_timeout: Annotated[Optional[float], object]  # alias="timeout"

class TaskGroupGetRunsParams(TypedDict, total=False):
    include_input: bool
    include_output: bool
    last_event_id: Optional[str]
    status: Optional[Literal["queued","action_required","running","completed","failed","cancelling","cancelled"]]

class TaskGroupStatusEvent(BaseModel):
    event_id: str
    status: TaskGroupStatus
    type: Literal["task_group_status"]

TaskGroupEventsResponse: TypeAlias = Annotated[Union[TaskGroupStatusEvent, TaskRunEvent, ErrorEvent], object]
TaskGroupGetRunsResponse: TypeAlias = Annotated[Union[TaskRunEvent, ErrorEvent], object]

# ---- Beta FindAll (summary) ----

class FindallRunStatusMetrics(BaseModel):
    generated_candidates_count: Optional[int]
    matched_candidates_count: Optional[int]

class FindallRunStatus(BaseModel):
    is_active: bool
    metrics: FindallRunStatusMetrics
    status: Literal["queued","action_required","running","completed","failed","cancelling","cancelled"]
    termination_reason: Optional[str]

class FindallRun(BaseModel):
    findall_id: str
    generator: Literal["base", "core", "pro", "preview"]
    status: FindallRunStatus
    created_at: Optional[str]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    modified_at: Optional[str]

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
    generator: Optional[Literal["base","core","pro","preview"]]
    match_limit: Optional[int]

class FindallCreateParams(TypedDict, total=False):
    entity_type: Required[str]
    generator: Required[Literal["base","core","pro","preview"]]
    match_conditions: Required[Iterable[TypedDict]]  # see repo for exact TypedDict shape
    match_limit: Required[int]
    objective: Required[str]
    exclude_list: Optional[Iterable[TypedDict]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    webhook: Optional[WebhookParam]
    betas: Annotated[List[ParallelBetaParam], object]  # alias="parallel-beta"

class FindallIngestParams(TypedDict, total=False):
    objective: Required[str]
    betas: Annotated[List[ParallelBetaParam], object]  # alias="parallel-beta"

class FindallExtendParams(TypedDict, total=False):
    additional_match_limit: Required[int]
    betas: Annotated[List[ParallelBetaParam], object]  # alias="parallel-beta"

class FindallEnrichParams(TypedDict, total=False):
    output_schema: Required[JsonSchemaParam]
    mcp_servers: Optional[Iterable[McpServerParam]]
    processor: str
    betas: Annotated[List[ParallelBetaParam], object]  # alias="parallel-beta"

class FindallRunResultCandidate(BaseModel):
    candidate_id: str
    match_status: Literal["generated","matched","unmatched","discarded"]
    name: str
    url: str
    basis: Optional[List[FieldBasis]]
    description: Optional[str]
    output: Optional[Dict[str, object]]

class FindallRunResult(BaseModel):
    candidates: List[FindallRunResultCandidate]
    run: FindallRun
    last_event_id: Optional[str]

# Findall events (high-level union)
class FindallRunStatusEvent(BaseModel):
    data: FindallRun
    event_id: str
    timestamp: Any
    type: Literal["findall.status"]

class FindallSchemaUpdatedEvent(BaseModel):
    data: FindallSchema
    event_id: str
    timestamp: Any
    type: Literal["findall.schema.updated"]

class FindallCandidateMatchStatusEventData(BaseModel):
    candidate_id: str
    match_status: Literal["generated","matched","unmatched","discarded"]
    name: str
    url: str
    basis: Optional[List[FieldBasis]]
    description: Optional[str]
    output: Optional[Dict[str, object]]

class FindallCandidateMatchStatusEvent(BaseModel):
    data: FindallCandidateMatchStatusEventData
    event_id: str
    timestamp: Any
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

FindallRetrieveResponse: TypeAlias = Union[FindallRun, BaseModel]  # includes FindAllPollResponse large model


# ============================================================
# Resources (public API entrypoints)
# ============================================================

# ---- Non-beta task_run ----

OutputT = TypeVar("OutputT", bound=pydantic.BaseModel)

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
        output: Optional[OutputSchemaParam] = ...,
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
        output: Type[OutputT] = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ParsedTaskRunResult[OutputT]: ...
    def execute(self, *, input: Union[str, Dict[str, object]], processor: str, metadata: Any = ..., output: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> Any:
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
    async def create(self, *, input: Union[str, Dict[str, object]], processor: str, metadata: Any = ..., source_policy: Any = ..., task_spec: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskRun: ...
    async def retrieve(self, run_id: str, *, extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskRun: ...
    async def result(self, run_id: str, *, api_timeout: int = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskRunResult: ...

    @overload
    async def execute(self, *, input: Union[str, Dict[str, object]], processor: str, metadata: Any = ..., output: Optional[OutputSchemaParam] = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskRunResult: ...
    @overload
    async def execute(self, *, input: Union[str, Dict[str, object]], processor: str, metadata: Any = ..., output: Type[OutputT] = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> ParsedTaskRunResult[OutputT]: ...
    async def execute(self, *, input: Any, processor: Any, metadata: Any = ..., output: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> Any: ...


# ---- Beta resources ----

class BetaTaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        enable_events: Optional[bool] = ...,
        mcp_servers: Optional[Iterable[McpServerParam]] = ...,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        source_policy: Optional[SourcePolicyParam] = ...,
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
    async def create(self, *, input: Any, processor: Any, enable_events: Any = ..., mcp_servers: Any = ..., metadata: Any = ..., source_policy: Any = ..., task_spec: Any = ..., webhook: Any = ..., betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskRun: ...
    async def events(self, run_id: str, *, extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> AsyncStream[TaskRunEventsResponse]: ...
    async def result(self, run_id: str, *, api_timeout: int = ..., betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> BetaTaskRunResult: ...

class BetaTaskGroupResource:
    def create(self, *, metadata: Optional[Dict[str, Union[str, float, bool]]] = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskGroup:
        """
        Initiates a TaskGroup to group and track multiple runs.

        Args:
          metadata: User-provided metadata stored with the task group.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """

    def retrieve(self, task_group_id: str, *, extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskGroup:
        """
        Retrieves aggregated status across runs in a TaskGroup.

        Args:
          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """

    def add_runs(self, task_group_id: str, *, inputs: Iterable[BetaRunInputParam], default_task_spec: Optional[TaskSpecParam] = ..., betas: List[ParallelBetaParam] = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskGroupRunResponse:
        """
        Initiates multiple task runs within a TaskGroup.

        Args:
          inputs: List of task runs to execute.

          default_task_spec: Specification for a task.

              Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
              Not specifying a TaskSpec is the same as setting an auto output schema.

              For convenience bare strings are also accepted as input or output schemas.

          betas: Optional header to specify the beta version(s) to enable.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """

    def events(self, task_group_id: str, *, last_event_id: Optional[str] = ..., api_timeout: Optional[float] = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> Stream[TaskGroupEventsResponse]:
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

    def get_runs(self, task_group_id: str, *, include_input: bool = ..., include_output: bool = ..., last_event_id: Optional[str] = ..., status: Optional[Literal["queued","action_required","running","completed","failed","cancelling","cancelled"]] = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> Stream[TaskGroupGetRunsResponse]:
        """
        Retrieves task runs in a TaskGroup and optionally their inputs and outputs.

        All runs within a TaskGroup are returned as a stream. To get the inputs and/or
        outputs back in the stream, set the corresponding `include_input` and
        `include_output` parameters to `true`.

        The stream is resumable using the `event_id` as the cursor. To resume a stream,
        specify the `last_event_id` parameter with the `event_id` of the last event in
        the stream. The stream will resume from the next event after the
        `last_event_id`.

        Args:
          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """

class AsyncBetaTaskGroupResource:
    async def create(self, *, metadata: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskGroup: ...
    async def retrieve(self, task_group_id: str, *, extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskGroup: ...
    async def add_runs(self, task_group_id: str, *, inputs: Any, default_task_spec: Any = ..., betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskGroupRunResponse: ...
    async def events(self, task_group_id: str, *, last_event_id: Any = ..., api_timeout: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> AsyncStream[TaskGroupEventsResponse]: ...
    async def get_runs(self, task_group_id: str, *, include_input: Any = ..., include_output: Any = ..., last_event_id: Any = ..., status: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> AsyncStream[TaskGroupGetRunsResponse]: ...

class BetaFindallResource:
    def create(self, *, entity_type: str, generator: Literal["base","core","pro","preview"], match_conditions: Iterable[Any], match_limit: int, objective: str, exclude_list: Any = ..., metadata: Any = ..., webhook: Any = ..., betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> FindallRun: ...
    def retrieve(self, findall_id: str, *, betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> FindallRetrieveResponse: ...
    def cancel(self, findall_id: str, *, betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> object: ...
    def ingest(self, *, objective: str, betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> FindallSchema: ...
    def schema(self, findall_id: str, *, betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> FindallSchema: ...
    def result(self, findall_id: str, *, betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> FindallRunResult: ...
    def events(self, findall_id: str, *, last_event_id: Any = ..., api_timeout: Any = ..., betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> Stream[FindallEventsResponse]: ...
    def enrich(self, findall_id: str, *, output_schema: JsonSchemaParam, mcp_servers: Any = ..., processor: Any = ..., betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> FindallSchema: ...
    def extend(self, findall_id: str, *, additional_match_limit: int, betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> FindallSchema: ...

class AsyncBetaFindallResource:
    async def create(self, *, entity_type: Any, generator: Any, match_conditions: Any, match_limit: Any, objective: Any, exclude_list: Any = ..., metadata: Any = ..., webhook: Any = ..., betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> FindallRun: ...
    async def retrieve(self, findall_id: str, *, betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> FindallRetrieveResponse: ...
    async def cancel(self, findall_id: str, *, betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> object: ...
    async def ingest(self, *, objective: str, betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> FindallSchema: ...
    async def schema(self, findall_id: str, *, betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> FindallSchema: ...
    async def result(self, findall_id: str, *, betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> FindallRunResult: ...
    async def events(self, findall_id: str, *, last_event_id: Any = ..., api_timeout: Any = ..., betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> AsyncStream[FindallEventsResponse]: ...
    async def enrich(self, findall_id: str, *, output_schema: Any, mcp_servers: Any = ..., processor: Any = ..., betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> FindallSchema: ...
    async def extend(self, findall_id: str, *, additional_match_limit: Any, betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> FindallSchema: ...

class BetaResource:
    task_run: BetaTaskRunResource
    task_group: BetaTaskGroupResource
    findall: BetaFindallResource

    def extract(
        self,
        *,
        urls: Sequence[str],
        excerpts: BetaExtractExcerpts = ...,
        fetch_policy: Optional[FetchPolicyParam] = ...,
        full_content: BetaExtractFullContent = ...,
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

    def search(
        self,
        *,
        excerpts: ExcerptSettingsParam = ...,
        fetch_policy: Optional[FetchPolicyParam] = ...,
        max_chars_per_result: Optional[int] = ...,
        max_results: Optional[int] = ...,
        mode: Optional[Literal["one-shot", "agentic"]] = ...,
        objective: Optional[str] = ...,
        processor: Optional[Literal["base", "pro"]] = ...,
        search_queries: Optional[Sequence[str]] = ...,
        source_policy: Optional[SourcePolicyParam] = ...,
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

class AsyncBetaResource:
    task_run: AsyncBetaTaskRunResource
    task_group: AsyncBetaTaskGroupResource
    findall: AsyncBetaFindallResource
    async def extract(self, *, urls: Any, excerpts: Any = ..., fetch_policy: Any = ..., full_content: Any = ..., objective: Any = ..., search_queries: Any = ..., betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> ExtractResponse: ...
    async def search(self, *, excerpts: Any = ..., fetch_policy: Any = ..., max_chars_per_result: Any = ..., max_results: Any = ..., mode: Any = ..., objective: Any = ..., processor: Any = ..., search_queries: Any = ..., source_policy: Any = ..., betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> SearchResult: ...


# ============================================================
# Clients
# ============================================================

class Parallel:
    """
    Construct a new synchronous Parallel client instance.

    This automatically infers the `api_key` argument from the `PARALLEL_API_KEY` environment variable if it is not provided.
    """
    api_key: str

    task_run: TaskRunResource
    beta: BetaResource

    # convenience namespaces
    with_raw_response: Any
    with_streaming_response: Any

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

    with_options: Any  # alias of copy()

class AsyncParallel:
    """
    Construct a new async AsyncParallel client instance.

    This automatically infers the `api_key` argument from the `PARALLEL_API_KEY` environment variable if it is not provided.
    """
    api_key: str

    task_run: AsyncTaskRunResource
    beta: AsyncBetaResource

    with_raw_response: Any
    with_streaming_response: Any

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

    with_options: Any  # alias of copy()

# Aliases exported by parallel/__init__.py
Client = Parallel
AsyncClient = AsyncParallel

# Resources lazy module proxy in runtime; in stubs expose module-level symbol
class _ResourcesModule(Protocol):
    TaskRunResource: Type[TaskRunResource]
    AsyncTaskRunResource: Type[AsyncTaskRunResource]
    BetaResource: Type[BetaResource]
    AsyncBetaResource: Type[AsyncBetaResource]

resources: _ResourcesModule

# Re-export "types" package marker (for typing only)
class types: ...
```

---

If you want, I can also produce an **“everything including every model field”** variant (massive), but for LLM comprehension it’s usually better to keep:
- resource method signatures + docstrings
- key request/response models
- event stream unions
- beta headers / betas lists

Tell me which style you prefer:
1) **Concise (this one)**, optimized for “how to call the API”
2) **Exhaustive**, includes every `parallel.types.*` and `parallel.types.beta.*` class with every field and field doc-comment extracted from inline `"""..."""` where present (that requires transforming field-comments into docstrings, which wouldn’t be “1:1” unless you allow it)