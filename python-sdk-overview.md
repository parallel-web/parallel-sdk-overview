Below is a **single stub file** (`parallel_api_footprint.pyi`) that summarizes the *public* API surface (client classes, resources, key models/types, and the beta sub-resources) based on the code you provided.

Notes / limits:
- I’m only copying docstrings **1:1 where they appear clearly in the provided excerpts** (not reworded). Many classes/methods in the generated SDK have docstrings; I included the ones visible above (especially resource methods). For many model classes, the “doc-comments” in your dump are inline attribute docstrings; `.pyi` does not support attribute docstrings, so those can’t be preserved 1:1 at field level in a stub. I kept **class docstrings** where available.
- This is intended as an LLM-friendly footprint, not a perfect type-complete stub for mypy/pyright.

Save as: `parallel_api_footprint.pyi`

```pyi
# parallel_api_footprint.pyi
# Summarized API footprint of the `parallel` Python SDK (v0.4.1) from provided source dump.

from __future__ import annotations

from typing import (
    Any,
    Dict,
    Mapping,
    List,
    Optional,
    Iterable,
    Iterator,
    AsyncIterator,
    Union,
    Generic,
    TypeVar,
    overload,
    Literal,
)
from datetime import date, datetime
import httpx
import pydantic

# ---------------------------------------------------------------------------
# Package metadata
# ---------------------------------------------------------------------------

__title__: str
__version__: str

# ---------------------------------------------------------------------------
# Sentinel / helper types exposed from parallel.__init__
# ---------------------------------------------------------------------------

class NotGiven:
    def __bool__(self) -> Literal[False]: ...
    def __repr__(self) -> str: ...

class Omit:
    def __bool__(self) -> Literal[False]: ...

NOT_GIVEN: NotGiven
not_given: NotGiven
omit: Omit

NoneType: type[None]

Transport = httpx.BaseTransport
ProxiesTypes = Union[str, httpx.Proxy, Dict[Union[str, httpx.URL], Union[None, str, httpx.URL, httpx.Proxy]]]
Timeout = httpx.Timeout

class RequestOptions(Dict[str, Any]): ...

def file_from_path(path: str) -> Any: ...

# ---------------------------------------------------------------------------
# Exceptions (public)
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
# BaseModel export
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

# ---------------------------------------------------------------------------
# Streaming primitives
# ---------------------------------------------------------------------------

_T = TypeVar("_T")

class Stream(Generic[_T]):
    response: httpx.Response
    def __iter__(self) -> Iterator[_T]: ...
    def __next__(self) -> _T: ...
    def close(self) -> None: ...
    def __enter__(self) -> Stream[_T]: ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

class AsyncStream(Generic[_T]):
    response: httpx.Response
    def __aiter__(self) -> AsyncIterator[_T]: ...
    async def __anext__(self) -> _T: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> AsyncStream[_T]: ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

# ---------------------------------------------------------------------------
# APIResponse wrappers (public exports)
# ---------------------------------------------------------------------------

R = TypeVar("R")

class APIResponse(Generic[R]):
    http_response: httpx.Response
    retries_taken: int
    @property
    def headers(self) -> httpx.Headers: ...
    @property
    def status_code(self) -> int: ...
    @property
    def url(self) -> httpx.URL: ...
    def parse(self, *, to: type[_T] | None = None) -> Union[R, _T]: ...
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
    @property
    def url(self) -> httpx.URL: ...
    async def parse(self, *, to: type[_T] | None = None) -> Union[R, _T]: ...
    async def read(self) -> bytes: ...
    async def text(self) -> str: ...
    async def json(self) -> object: ...
    async def close(self) -> None: ...
    async def iter_bytes(self, chunk_size: int | None = None) -> AsyncIterator[bytes]: ...
    async def iter_text(self, chunk_size: int | None = None) -> AsyncIterator[str]: ...
    async def iter_lines(self) -> AsyncIterator[str]: ...

# ---------------------------------------------------------------------------
# Types (core)
# ---------------------------------------------------------------------------

# Shared
class ErrorObject(BaseModel):
    """An error message."""
    message: str
    ref_id: str
    detail: Optional[Dict[str, object]]

class ErrorResponse(BaseModel):
    """Response object used for non-200 status codes."""
    error: ErrorObject
    type: Literal["error"]

class Warning(BaseModel):
    """Human-readable message for a task."""
    message: str
    type: Literal["spec_validation_warning", "input_validation_warning", "warning"]
    detail: Optional[Dict[str, object]]

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

# TaskSpec / schemas
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

# Task run objects/results
TaskRunStatus = Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]

class TaskRun(BaseModel):
    """Status of a task run."""
    created_at: Optional[str]
    is_active: bool
    modified_at: Optional[str]
    processor: str
    run_id: str
    status: TaskRunStatus
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

TaskRunOutput = Union[TaskRunTextOutput, TaskRunJsonOutput]

class TaskRunResult(BaseModel):
    """Result of a task run."""
    output: TaskRunOutput
    run: TaskRun

# Parsed result helpers
ContentType = TypeVar("ContentType", bound=pydantic.BaseModel)

class ParsedTaskRunTextOutput(TaskRunTextOutput, Generic[ContentType]):
    parsed: None

class ParsedTaskRunJsonOutput(TaskRunJsonOutput, Generic[ContentType]):
    parsed: Optional[ContentType]

class ParsedTaskRunResult(TaskRunResult, Generic[ContentType]):
    output: Union[ParsedTaskRunTextOutput[ContentType], ParsedTaskRunJsonOutput[ContentType]]

# Request param TypedDicts (represented as dict-like in stub)
class SourcePolicy(BaseModel):
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    after_date: Optional[date]
    exclude_domains: Optional[List[str]]
    include_domains: Optional[List[str]]

class TaskRunCreateParams(Dict[str, Any]): ...
class TaskRunResultParams(Dict[str, Any]): ...
class TaskSpecParam(Dict[str, Any]): ...

# ---------------------------------------------------------------------------
# Beta types (selected)
# ---------------------------------------------------------------------------

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

class BetaTaskRunTextOutput(BaseModel):
    """Output from a task that returns text."""
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
    beta_fields: Optional[Dict[str, object]]
    mcp_tool_calls: Optional[List[McpToolCall]]

class BetaTaskRunJsonOutput(BaseModel):
    """Output from a task that returns JSON."""
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: Literal["json"]
    beta_fields: Optional[Dict[str, object]]
    mcp_tool_calls: Optional[List[McpToolCall]]
    output_schema: Optional[Dict[str, object]]

BetaTaskRunOutput = Union[BetaTaskRunTextOutput, BetaTaskRunJsonOutput]

class BetaTaskRunResult(BaseModel):
    """Result of a beta task run. Available only if beta headers are specified."""
    output: BetaTaskRunOutput
    run: TaskRun

# Task run events (beta)
class TaskRunProgressStatsEventSourceStats(BaseModel):
    """Source stats describing progress so far."""
    num_sources_considered: Optional[int]
    num_sources_read: Optional[int]
    sources_read_sample: Optional[List[str]]

class TaskRunProgressStatsEvent(BaseModel):
    """A progress update for a task run."""
    progress_meter: float
    source_stats: TaskRunProgressStatsEventSourceStats
    type: Literal["task_run.progress_stats"]

class TaskRunProgressMessageEvent(BaseModel):
    """A message for a task run progress update."""
    message: str
    timestamp: Optional[str]
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

class BetaRunInput(BaseModel):
    """Task run input with additional beta fields."""
    input: Union[str, Dict[str, object]]
    processor: str
    enable_events: Optional[bool]
    mcp_servers: Optional[List[McpServer]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicy]
    task_spec: Optional[TaskSpec]
    webhook: Optional[Webhook]

class TaskRunEvent(BaseModel):
    """Event when a task run transitions to a non-active status.

    May indicate completion, cancellation, or failure.
    """
    event_id: Optional[str]
    run: TaskRun
    type: Literal["task_run.state"]
    input: Optional[BetaRunInput]
    output: Optional[Union[TaskRunTextOutput, TaskRunJsonOutput, None]]

TaskRunEventsResponse = Union[
    TaskRunProgressStatsEvent,
    TaskRunProgressMessageEvent,
    TaskRunEvent,
    ErrorEvent,
]

# Beta search/extract
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

# Beta TaskGroup / FindAll (high-level footprints)
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

class TaskGroupStatusEvent(BaseModel):
    """Event indicating an update to group status."""
    event_id: str
    status: TaskGroupStatus
    type: Literal["task_group_status"]

TaskGroupEventsResponse = Union[TaskGroupStatusEvent, TaskRunEvent, ErrorEvent]
TaskGroupGetRunsResponse = Union[TaskRunEvent, ErrorEvent]

class TaskGroupRunResponse(BaseModel):
    """Response from adding new task runs to a task group."""
    event_cursor: Optional[str]
    run_cursor: Optional[str]
    run_ids: List[str]
    status: TaskGroupStatus

# FindAll (beta)
FindAllTerminationReason = Literal[
    "low_match_rate",
    "match_limit_met",
    "candidates_exhausted",
    "user_cancelled",
    "error_occurred",
    "timeout",
]

class FindAllRunStatusMetrics(BaseModel):
    """Candidate metrics for the FindAll run."""
    generated_candidates_count: Optional[int]
    matched_candidates_count: Optional[int]

class FindAllRunStatus(BaseModel):
    """Status object for the FindAll run."""
    is_active: bool
    metrics: FindAllRunStatusMetrics
    status: TaskRunStatus
    termination_reason: Optional[FindAllTerminationReason]

class FindAllRun(BaseModel):
    """FindAll run object with status and metadata."""
    findall_id: str
    generator: Literal["base", "core", "pro", "preview"]
    status: FindAllRunStatus
    created_at: Optional[str]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    modified_at: Optional[str]

class FindAllSchemaMatchCondition(BaseModel):
    """Match condition model for FindAll ingest."""
    description: str
    name: str

class FindAllEnrichInput(BaseModel):
    """Input model for FindAll enrich."""
    output_schema: JsonSchema
    mcp_servers: Optional[List[McpServer]]
    processor: Optional[str]

class FindAllSchema(BaseModel):
    """Response model for FindAll ingest."""
    entity_type: str
    match_conditions: List[FindAllSchemaMatchCondition]
    objective: str
    enrichments: Optional[List[FindAllEnrichInput]]
    generator: Optional[Literal["base", "core", "pro", "preview"]]
    match_limit: Optional[int]

class FindAllRunResultCandidate(BaseModel):
    """Candidate for a find all run that may end up as a match.

    Contains all the candidate's metadata and the output of the match conditions.
    A candidate is a match if all match conditions are satisfied.
    """
    candidate_id: str
    match_status: Literal["generated", "matched", "unmatched", "discarded"]
    name: str
    url: str
    basis: Optional[List[FieldBasis]]
    description: Optional[str]
    output: Optional[Dict[str, object]]

class FindAllRunResult(BaseModel):
    """Complete FindAll search results.

    Represents a snapshot of a FindAll run, including run metadata and a list of
    candidate entities with their match status and details at the time the snapshot was
    taken.
    """
    candidates: List[FindAllRunResultCandidate]
    run: FindAllRun
    last_event_id: Optional[str]

# FindAll events
class FindAllRunStatusEvent(BaseModel):
    """Event containing status update for FindAll run."""
    data: FindAllRun
    event_id: str
    timestamp: datetime
    type: Literal["findall.status"]

class FindAllSchemaUpdatedEvent(BaseModel):
    """Event containing full snapshot of FindAll run state."""
    data: FindAllSchema
    event_id: str
    timestamp: datetime
    type: Literal["findall.schema.updated"]

class FindAllCandidateMatchStatusEventData(BaseModel):
    """The candidate whose match status has been updated."""
    candidate_id: str
    match_status: Literal["generated", "matched", "unmatched", "discarded"]
    name: str
    url: str
    basis: Optional[List[FieldBasis]]
    description: Optional[str]
    output: Optional[Dict[str, object]]

class FindAllCandidateMatchStatusEvent(BaseModel):
    """Event containing a candidate whose match status has changed."""
    data: FindAllCandidateMatchStatusEventData
    event_id: str
    timestamp: datetime
    type: Literal[
        "findall.candidate.generated",
        "findall.candidate.matched",
        "findall.candidate.unmatched",
        "findall.candidate.discarded",
        "findall.candidate.enriched",
    ]

FindAllEventsResponse = Union[
    FindAllSchemaUpdatedEvent,
    FindAllRunStatusEvent,
    FindAllCandidateMatchStatusEvent,
    ErrorEvent,
]

# ---------------------------------------------------------------------------
# Resources (core + beta) and Client entrypoints
# ---------------------------------------------------------------------------

class TaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        source_policy: Optional[SourcePolicy] = ...,
        task_spec: Optional[TaskSpecParam] = ...,
        extra_headers: Optional[Mapping[str, Any]] = ...,
        extra_query: Optional[Mapping[str, object]] = ...,
        extra_body: Optional[object] = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRun: ...

    def retrieve(
        self,
        run_id: str,
        *,
        extra_headers: Optional[Mapping[str, Any]] = ...,
        extra_query: Optional[Mapping[str, object]] = ...,
        extra_body: Optional[object] = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRun: ...

    def result(
        self,
        run_id: str,
        *,
        api_timeout: int = ...,
        extra_headers: Optional[Mapping[str, Any]] = ...,
        extra_query: Optional[Mapping[str, object]] = ...,
        extra_body: Optional[object] = ...,
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
        extra_headers: Optional[Mapping[str, Any]] = ...,
        extra_query: Optional[Mapping[str, object]] = ...,
        extra_body: Optional[object] = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRunResult: ...
    @overload
    def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        output: type[ContentType],
        extra_headers: Optional[Mapping[str, Any]] = ...,
        extra_query: Optional[Mapping[str, object]] = ...,
        extra_body: Optional[object] = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ParsedTaskRunResult[ContentType]: ...
    def execute(self, **kwargs: Any) -> Any: ...

class AsyncTaskRunResource:
    async def create(self, *, input: Union[str, Dict[str, object]], processor: str, **kwargs: Any) -> TaskRun: ...
    async def retrieve(self, run_id: str, **kwargs: Any) -> TaskRun: ...
    async def result(self, run_id: str, **kwargs: Any) -> TaskRunResult: ...

    @overload
    async def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        output: Optional[OutputSchema] = ...,
        extra_headers: Optional[Mapping[str, Any]] = ...,
        extra_query: Optional[Mapping[str, object]] = ...,
        extra_body: Optional[object] = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRunResult: ...
    @overload
    async def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        output: type[ContentType],
        extra_headers: Optional[Mapping[str, Any]] = ...,
        extra_query: Optional[Mapping[str, object]] = ...,
        extra_body: Optional[object] = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ParsedTaskRunResult[ContentType]: ...
    async def execute(self, **kwargs: Any) -> Any: ...

class BetaTaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        enable_events: Optional[bool] = ...,
        mcp_servers: Optional[Iterable[Dict[str, Any]]] = ...,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        source_policy: Optional[SourcePolicy] = ...,
        task_spec: Optional[TaskSpecParam] = ...,
        webhook: Optional[Dict[str, Any]] = ...,
        betas: List[ParallelBetaParam] = ...,
        extra_headers: Optional[Mapping[str, Any]] = ...,
        extra_query: Optional[Mapping[str, object]] = ...,
        extra_body: Optional[object] = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRun:
        """
        Initiates a task run.

        Returns immediately with a run object in status 'queued'.

        Beta features can be enabled by setting the 'parallel-beta' header.
        """
        ...

    def events(
        self,
        run_id: str,
        *,
        extra_headers: Optional[Mapping[str, Any]] = ...,
        extra_query: Optional[Mapping[str, object]] = ...,
        extra_body: Optional[object] = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> Stream[TaskRunEventsResponse]:
        """
        Streams events for a task run.

        Returns a stream of events showing progress updates and state changes for the
        task run.

        For task runs that did not have enable_events set to true during creation, the
        frequency of events will be reduced.
        """
        ...

    def result(
        self,
        run_id: str,
        *,
        api_timeout: int = ...,
        betas: List[ParallelBetaParam] = ...,
        extra_headers: Optional[Mapping[str, Any]] = ...,
        extra_query: Optional[Mapping[str, object]] = ...,
        extra_body: Optional[object] = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> BetaTaskRunResult:
        """
        Retrieves a run result by run_id, blocking until the run is completed.
        """
        ...

class AsyncBetaTaskRunResource:
    async def create(self, *, input: Union[str, Dict[str, object]], processor: str, **kwargs: Any) -> TaskRun: ...
    async def events(self, run_id: str, **kwargs: Any) -> AsyncStream[TaskRunEventsResponse]: ...
    async def result(self, run_id: str, **kwargs: Any) -> BetaTaskRunResult: ...

class BetaTaskGroupResource:
    def create(self, **kwargs: Any) -> TaskGroup: ...
    def retrieve(self, task_group_id: str, **kwargs: Any) -> TaskGroup: ...
    def add_runs(self, task_group_id: str, **kwargs: Any) -> TaskGroupRunResponse: ...
    def events(self, task_group_id: str, **kwargs: Any) -> Stream[TaskGroupEventsResponse]: ...
    def get_runs(self, task_group_id: str, **kwargs: Any) -> Stream[TaskGroupGetRunsResponse]: ...

class AsyncBetaTaskGroupResource:
    async def create(self, **kwargs: Any) -> TaskGroup: ...
    async def retrieve(self, task_group_id: str, **kwargs: Any) -> TaskGroup: ...
    async def add_runs(self, task_group_id: str, **kwargs: Any) -> TaskGroupRunResponse: ...
    async def events(self, task_group_id: str, **kwargs: Any) -> AsyncStream[TaskGroupEventsResponse]: ...
    async def get_runs(self, task_group_id: str, **kwargs: Any) -> AsyncStream[TaskGroupGetRunsResponse]: ...

class FindAllResource:
    def create(self, **kwargs: Any) -> FindAllRun: ...
    def retrieve(self, findall_id: str, **kwargs: Any) -> FindAllRun: ...
    def cancel(self, findall_id: str, **kwargs: Any) -> object: ...
    def enrich(self, findall_id: str, **kwargs: Any) -> FindAllSchema: ...
    def events(self, findall_id: str, **kwargs: Any) -> Stream[FindAllEventsResponse]: ...
    def extend(self, findall_id: str, **kwargs: Any) -> FindAllSchema: ...
    def ingest(self, **kwargs: Any) -> FindAllSchema: ...
    def result(self, findall_id: str, **kwargs: Any) -> FindAllRunResult: ...
    def schema(self, findall_id: str, **kwargs: Any) -> FindAllSchema: ...

class AsyncFindAllResource:
    async def create(self, **kwargs: Any) -> FindAllRun: ...
    async def retrieve(self, findall_id: str, **kwargs: Any) -> FindAllRun: ...
    async def cancel(self, findall_id: str, **kwargs: Any) -> object: ...
    async def enrich(self, findall_id: str, **kwargs: Any) -> FindAllSchema: ...
    async def events(self, findall_id: str, **kwargs: Any) -> AsyncStream[FindAllEventsResponse]: ...
    async def extend(self, findall_id: str, **kwargs: Any) -> FindAllSchema: ...
    async def ingest(self, **kwargs: Any) -> FindAllSchema: ...
    async def result(self, findall_id: str, **kwargs: Any) -> FindAllRunResult: ...
    async def schema(self, findall_id: str, **kwargs: Any) -> FindAllSchema: ...

class BetaResource:
    task_run: BetaTaskRunResource
    task_group: BetaTaskGroupResource
    findall: FindAllResource

    def extract(self, **kwargs: Any) -> ExtractResponse: ...
    def search(self, **kwargs: Any) -> SearchResult: ...

class AsyncBetaResource:
    task_run: AsyncBetaTaskRunResource
    task_group: AsyncBetaTaskGroupResource
    findall: AsyncFindAllResource

    async def extract(self, **kwargs: Any) -> ExtractResponse: ...
    async def search(self, **kwargs: Any) -> SearchResult: ...

class Parallel:
    """
    Construct a new synchronous Parallel client instance.

    This automatically infers the `api_key` argument from the `PARALLEL_API_KEY` environment variable if it is not provided.
    """
    api_key: str
    task_run: TaskRunResource
    beta: BetaResource
    with_raw_response: Any
    with_streaming_response: Any

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | httpx.URL | None = None,
        timeout: float | Timeout | None | NotGiven = not_given,
        max_retries: int = ...,
        default_headers: Mapping[str, str] | None = None,
        default_query: Mapping[str, object] | None = None,
        http_client: httpx.Client | None = None,
        _strict_response_validation: bool = False,
    ) -> None: ...

    def copy(self, **kwargs: Any) -> Parallel: ...
    with_options: Any

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
        api_key: str | None = None,
        base_url: str | httpx.URL | None = None,
        timeout: float | Timeout | None | NotGiven = not_given,
        max_retries: int = ...,
        default_headers: Mapping[str, str] | None = None,
        default_query: Mapping[str, object] | None = None,
        http_client: httpx.AsyncClient | None = None,
        _strict_response_validation: bool = False,
    ) -> None: ...

    def copy(self, **kwargs: Any) -> AsyncParallel: ...
    with_options: Any

Client = Parallel
AsyncClient = AsyncParallel

# ---------------------------------------------------------------------------
# Lazy module proxy exported at runtime as parallel.resources
# ---------------------------------------------------------------------------

resources: Any
types: Any

# Defaults exported
DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits

# Base http client helpers
DefaultHttpxClient: type[httpx.Client]
DefaultAsyncHttpxClient: type[httpx.AsyncClient]
DefaultAioHttpClient: type[httpx.AsyncClient]
```

If you want, I can also generate an alternate version that is **even more LLM-oriented** (less typing fidelity, more “API map” comments), or include **every** beta typed param dict as `TypedDict` shapes (but that will be much longer).