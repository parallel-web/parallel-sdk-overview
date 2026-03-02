Below is a **single-file** `parallel.pyi` “API footprint” stub that an LLM can scan to understand the SDK surface area: client entrypoints, resources, methods, and the primary request/response types (including betas + SSE streams).  

Notes/limits:
- This is a **summary stub** (not every helper/internal module is reproduced), but it includes the *public* `parallel` exports plus the key `types` and `resources` APIs.
- **Docstrings included** are copied **1:1** from the snippets in your dump *where present on public methods/classes*. Many generated `TypedDict`/`BaseModel` classes in your dump don’t have docstrings beyond field comments; those field comments aren’t always in docstring form in stubs, so I kept the class docstrings and method docstrings where available.
- If you want this to be **exhaustive down to every model field comment**, say so and I’ll expand it (it will get very large).

---

```pyi
# parallel.pyi
# A single-file stub summarizing the public footprint of the `parallel` SDK.
# Generated manually from the provided source tree dump.

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
    NotRequired,
    Protocol,
    Required,
    TypeAlias,
    TypedDict,
)

import httpx
import pydantic

__title__: str
__version__: str

# -----------------------------------------------------------------------------
# Sentinel / option types
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

DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits

# -----------------------------------------------------------------------------
# Exceptions (public exports)
# -----------------------------------------------------------------------------

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

class BadRequestError(APIStatusError): status_code: Literal[400]
class AuthenticationError(APIStatusError): status_code: Literal[401]
class PermissionDeniedError(APIStatusError): status_code: Literal[403]
class NotFoundError(APIStatusError): status_code: Literal[404]
class ConflictError(APIStatusError): status_code: Literal[409]
class UnprocessableEntityError(APIStatusError): status_code: Literal[422]
class RateLimitError(APIStatusError): status_code: Literal[429]
class InternalServerError(APIStatusError): ...

# -----------------------------------------------------------------------------
# BaseModel export
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

class GenericModel(BaseModel): ...

# -----------------------------------------------------------------------------
# Streaming (SSE) primitives
# -----------------------------------------------------------------------------

_T = TypeVar("_T")

class Stream(Generic[_T]):
    """Provides the core interface to iterate over a synchronous stream response."""
    response: httpx.Response
    def __iter__(self) -> Iterator[_T]: ...
    def __next__(self) -> _T: ...
    def close(self) -> None: ...
    def __enter__(self) -> Stream[_T]: ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any | None) -> None: ...

class AsyncStream(Generic[_T]):
    """Provides the core interface to iterate over an asynchronous stream response."""
    response: httpx.Response
    def __aiter__(self) -> AsyncIterator[_T]: ...
    async def __anext__(self) -> _T: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> AsyncStream[_T]: ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any | None) -> None: ...

# -----------------------------------------------------------------------------
# APIResponse wrappers (raw/streaming response access)
# -----------------------------------------------------------------------------

R = TypeVar("R")

class APIResponse(Generic[R]):
    http_response: httpx.Response
    retries_taken: int
    @property
    def headers(self) -> httpx.Headers: ...
    @property
    def status_code(self) -> int: ...
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
    def status_code(self) -> int: ...
    @overload
    async def parse(self, *, to: Type[_T]) -> _T: ...
    @overload
    async def parse(self) -> R: ...
    async def parse(self, *, to: Type[_T] | None = None) -> R | _T: ...
    async def read(self) -> bytes: ...
    async def text(self) -> str: ...
    async def json(self) -> object: ...
    async def close(self) -> None: ...
    async def iter_bytes(self, chunk_size: int | None = None) -> AsyncIterator[bytes]: ...
    async def iter_text(self, chunk_size: int | None = None) -> AsyncIterator[str]: ...
    async def iter_lines(self) -> AsyncIterator[str]: ...

# -----------------------------------------------------------------------------
# types (public models + params)
# -----------------------------------------------------------------------------

# --- shared types ---

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
    after_date: Annotated[Union[str, date, None], Any]  # PropertyInfo(format="iso8601") at runtime
    exclude_domains: Sequence[str]
    include_domains: Sequence[str]

# --- schema models ---

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

# --- citations/basis ---

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

# --- task spec & task run types ---

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
    task_group_id: Optional[str] = None  # alias="taskgroup_id" at runtime
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

TaskRunOutput: TypeAlias = Annotated[Union[TaskRunTextOutput, TaskRunJsonOutput], Any]  # discriminator="type"

class TaskRunResult(BaseModel):
    """Result of a task run."""
    output: TaskRunOutput
    run: TaskRun

class ParsedTaskRunTextOutput(TaskRunTextOutput, GenericModel, Generic[OutputT]):
    parsed: None
    """The parsed output from the task run."""

class ParsedTaskRunJsonOutput(TaskRunJsonOutput, GenericModel, Generic[OutputT]):
    parsed: Optional[OutputT] = None
    """The parsed output from the task run."""

class ParsedTaskRunResult(TaskRunResult, GenericModel, Generic[OutputT]):
    output: Union[ParsedTaskRunTextOutput[OutputT], ParsedTaskRunJsonOutput[OutputT]]
    """The parsed output from the task run."""

class TaskRunCreateParams(TypedDict, total=False):
    input: Required[Union[str, Dict[str, object]]]
    processor: Required[str]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicyParam]
    task_spec: Optional[TaskSpecParam]

class TaskRunResultParams(TypedDict, total=False):
    api_timeout: Annotated[int, Any]  # alias="timeout" at runtime

# -----------------------------------------------------------------------------
# beta types namespace
# -----------------------------------------------------------------------------

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
    event_types: Optional[List[Literal["task_run.status"]]] = None

class WebhookParam(TypedDict, total=False):
    """Webhooks for Task Runs."""
    url: Required[str]
    event_types: List[Literal["task_run.status"]]

class McpServer(BaseModel):
    """MCP server configuration."""
    name: str
    url: str
    allowed_tools: Optional[List[str]] = None
    headers: Optional[Dict[str, str]] = None
    type: Optional[Literal["url"]] = None

class McpServerParam(TypedDict, total=False):
    """MCP server configuration."""
    name: Required[str]
    url: Required[str]
    allowed_tools: Optional[Sequence[str]]
    headers: Optional[Dict[str, str]]
    type: Literal["url"]

class McpToolCall(BaseModel):
    """Result of an MCP tool call."""
    arguments: str
    server_name: str
    tool_call_id: str
    tool_name: str
    content: Optional[str] = None
    error: Optional[str] = None

class BetaRunInput(BaseModel):
    """Task run input with additional beta fields."""
    input: Union[str, Dict[str, object]]
    processor: str
    enable_events: Optional[bool] = None
    mcp_servers: Optional[List[McpServer]] = None
    metadata: Optional[Dict[str, Union[str, float, bool]]] = None
    source_policy: Optional[SourcePolicy] = None
    task_spec: Optional[TaskSpec] = None
    webhook: Optional[Webhook] = None

class BetaRunInputParam(TypedDict, total=False):
    """Task run input with additional beta fields."""
    input: Required[Union[str, Dict[str, object]]]
    processor: Required[str]
    enable_events: Optional[bool]
    mcp_servers: Optional[Iterable[McpServerParam]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicyParam]
    task_spec: Optional[TaskSpecParam]
    webhook: Optional[WebhookParam]

class TaskRunCreateParamsBeta(TypedDict, total=False):
    input: Required[Union[str, Dict[str, object]]]
    processor: Required[str]
    enable_events: Optional[bool]
    mcp_servers: Optional[Iterable[McpServerParam]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicyParam]
    task_spec: Optional[TaskSpecParam]
    webhook: Optional[WebhookParam]
    betas: Annotated[List[ParallelBetaParam], Any]  # alias="parallel-beta" at runtime

class ErrorEvent(BaseModel):
    """Event indicating an error."""
    error: ErrorObject
    type: Literal["error"]

# task run events stream (beta)
class TaskRunProgressStatsEventSourceStats(BaseModel):
    """Source stats describing progress so far."""
    num_sources_considered: Optional[int] = None
    num_sources_read: Optional[int] = None
    sources_read_sample: Optional[List[str]] = None

class TaskRunProgressStatsEvent(BaseModel):
    """A progress update for a task run."""
    progress_meter: float
    source_stats: TaskRunProgressStatsEventSourceStats
    type: Literal["task_run.progress_stats"]

class TaskRunProgressMessageEvent(BaseModel):
    """A message for a task run progress update."""
    message: str
    timestamp: Optional[str] = None
    type: Literal[
        "task_run.progress_msg.plan",
        "task_run.progress_msg.search",
        "task_run.progress_msg.result",
        "task_run.progress_msg.tool_call",
        "task_run.progress_msg.exec_status",
    ]

class TaskRunEvent(BaseModel):
    """Event when a task run transitions to a non-active status.

    May indicate completion, cancellation, or failure.
    """
    event_id: Optional[str] = None
    run: TaskRun
    type: Literal["task_run.state"]
    input: Optional[BetaRunInput] = None
    output: Optional[Annotated[Union[TaskRunTextOutput, TaskRunJsonOutput, None], Any]] = None  # discriminator="type"

TaskRunEventsResponse: TypeAlias = Annotated[
    Union[TaskRunProgressStatsEvent, TaskRunProgressMessageEvent, TaskRunEvent, ErrorEvent],
    Any,  # discriminator="type" at runtime
]

# beta task run result
class OutputBetaTaskRunTextOutput(BaseModel):
    """Output from a task that returns text."""
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
    beta_fields: Optional[Dict[str, object]] = None
    mcp_tool_calls: Optional[List[McpToolCall]] = None

class OutputBetaTaskRunJsonOutput(BaseModel):
    """Output from a task that returns JSON."""
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: Literal["json"]
    beta_fields: Optional[Dict[str, object]] = None
    mcp_tool_calls: Optional[List[McpToolCall]] = None
    output_schema: Optional[Dict[str, object]] = None

BetaTaskRunOutput: TypeAlias = Annotated[
    Union[OutputBetaTaskRunTextOutput, OutputBetaTaskRunJsonOutput],
    Any,  # discriminator="type" at runtime
]

class BetaTaskRunResult(BaseModel):
    """Result of a beta task run. Available only if beta headers are specified."""
    output: BetaTaskRunOutput
    run: TaskRun

class TaskRunResultParamsBeta(TypedDict, total=False):
    api_timeout: Annotated[int, Any]  # alias="timeout"
    betas: Annotated[List[ParallelBetaParam], Any]  # alias="parallel-beta"

# Search/Extract betas
class FetchPolicyParam(TypedDict, total=False):
    """Policy for live fetching web results."""
    disable_cache_fallback: bool
    max_age_seconds: Optional[int]
    timeout_seconds: Optional[float]

class ExcerptSettingsParam(TypedDict, total=False):
    """Optional settings for returning relevant excerpts."""
    max_chars_per_result: Optional[int]
    max_chars_total: Optional[int]

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
    betas: Annotated[List[ParallelBetaParam], Any]  # alias="parallel-beta"

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
    betas: Annotated[List[ParallelBetaParam], Any]  # alias="parallel-beta"

# FindAll betas
class FindAllEnrichInput(BaseModel):
    """Input model for FindAll enrich."""
    output_schema: JsonSchema
    mcp_servers: Optional[List[McpServer]] = None
    processor: Optional[str] = None

class MatchConditionModel(BaseModel):
    """Match condition model for FindAll ingest."""
    description: str
    name: str

class FindAllSchema(BaseModel):
    """Response model for FindAll ingest."""
    entity_type: str
    match_conditions: List[MatchConditionModel]
    objective: str
    enrichments: Optional[List[FindAllEnrichInput]] = None
    generator: Optional[Literal["base", "core", "pro", "preview"]] = None
    match_limit: Optional[int] = None

class FindAllRunStatusMetrics(BaseModel):
    """Candidate metrics for the FindAll run."""
    generated_candidates_count: Optional[int] = None
    matched_candidates_count: Optional[int] = None

class FindAllRunStatus(BaseModel):
    """Status object for the FindAll run."""
    is_active: bool
    metrics: FindAllRunStatusMetrics
    status: Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]
    termination_reason: Optional[
        Literal[
            "low_match_rate",
            "match_limit_met",
            "candidates_exhausted",
            "user_cancelled",
            "error_occurred",
            "timeout",
        ]
    ] = None

class FindAllRun(BaseModel):
    """FindAll run object with status and metadata."""
    findall_id: str
    generator: Literal["base", "core", "pro", "preview"]
    status: FindAllRunStatus
    created_at: Optional[str] = None
    metadata: Optional[Dict[str, Union[str, float, bool]]] = None
    modified_at: Optional[str] = None

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
    basis: Optional[List[FieldBasis]] = None
    description: Optional[str] = None
    output: Optional[Dict[str, object]] = None

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

FindAllEventsResponse: TypeAlias = Annotated[
    Union[FindAllSchemaUpdatedEvent, FindAllRunStatusEvent, FindAllCandidateMatchStatusEvent, ErrorEvent],
    Any,  # discriminator="type"
]

class FindAllRunResultCandidate(BaseModel):
    """Candidate for a find all run that may end up as a match.

    Contains all the candidate's metadata and the output of the match conditions.
    A candidate is a match if all match conditions are satisfied.
    """
    candidate_id: str
    match_status: Literal["generated", "matched", "unmatched", "discarded"]
    name: str
    url: str
    basis: Optional[List[FieldBasis]] = None
    description: Optional[str] = None
    output: Optional[Dict[str, object]] = None

class FindAllRunResult(BaseModel):
    """Complete FindAll search results.

    Represents a snapshot of a FindAll run, including run metadata and a list of
    candidate entities with their match status and details at the time the snapshot was
    taken.
    """
    candidates: List[FindAllRunResultCandidate]
    run: FindAllRun
    last_event_id: Optional[str] = None

class FindAllIngestParams(TypedDict, total=False):
    objective: Required[str]
    betas: Annotated[List[ParallelBetaParam], Any]  # alias="parallel-beta"

class FindAllCreateParamsMatchCondition(TypedDict, total=False):
    """Match condition model for FindAll ingest."""
    description: Required[str]
    name: Required[str]

class FindAllCreateParamsExcludeList(TypedDict, total=False):
    """Exclude candidate input model for FindAll run."""
    name: Required[str]
    url: Required[str]

class FindAllCreateParams(TypedDict, total=False):
    entity_type: Required[str]
    generator: Required[Literal["base", "core", "pro", "preview"]]
    match_conditions: Required[Iterable[FindAllCreateParamsMatchCondition]]
    match_limit: Required[int]
    objective: Required[str]
    exclude_list: Optional[Iterable[FindAllCreateParamsExcludeList]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    webhook: Optional[WebhookParam]
    betas: Annotated[List[ParallelBetaParam], Any]  # alias="parallel-beta"

class FindAllExtendParams(TypedDict, total=False):
    additional_match_limit: Required[int]
    betas: Annotated[List[ParallelBetaParam], Any]  # alias="parallel-beta"

class FindAllEnrichParams(TypedDict, total=False):
    output_schema: Required[JsonSchemaParam]
    mcp_servers: Optional[Iterable[McpServerParam]]
    processor: str
    betas: Annotated[List[ParallelBetaParam], Any]  # alias="parallel-beta"

class FindAllEventsParams(TypedDict, total=False):
    last_event_id: Optional[str]
    api_timeout: Annotated[Optional[float], Any]  # alias="timeout"
    betas: Annotated[List[ParallelBetaParam], Any]  # alias="parallel-beta"

# TaskGroup betas
class TaskGroupStatus(BaseModel):
    """Status of a task group."""
    is_active: bool
    modified_at: Optional[str] = None
    num_task_runs: int
    status_message: Optional[str] = None
    task_run_status_counts: Dict[str, int]

class TaskGroup(BaseModel):
    """Response object for a task group, including its status and metadata."""
    created_at: Optional[str] = None
    status: TaskGroupStatus
    task_group_id: str  # alias="taskgroup_id"
    metadata: Optional[Dict[str, Union[str, float, bool]]] = None

class TaskGroupCreateParams(TypedDict, total=False):
    metadata: Optional[Dict[str, Union[str, float, bool]]]

class TaskGroupAddRunsParams(TypedDict, total=False):
    inputs: Required[Iterable[BetaRunInputParam]]
    default_task_spec: Optional[TaskSpecParam]
    betas: Annotated[List[ParallelBetaParam], Any]  # alias="parallel-beta"

class TaskGroupEventsParams(TypedDict, total=False):
    last_event_id: Optional[str]
    api_timeout: Annotated[Optional[float], Any]  # alias="timeout"

class TaskGroupGetRunsParams(TypedDict, total=False):
    include_input: bool
    include_output: bool
    last_event_id: Optional[str]
    status: Optional[Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]]

class TaskGroupRunResponse(BaseModel):
    """Response from adding new task runs to a task group."""
    event_cursor: Optional[str] = None
    run_cursor: Optional[str] = None
    run_ids: List[str]
    status: TaskGroupStatus

class TaskGroupStatusEvent(BaseModel):
    """Event indicating an update to group status."""
    event_id: str
    status: TaskGroupStatus
    type: Literal["task_group_status"]

TaskGroupEventsResponse: TypeAlias = Annotated[
    Union[TaskGroupStatusEvent, TaskRunEvent, ErrorEvent],
    Any,  # discriminator="type"
]

TaskGroupGetRunsResponse: TypeAlias = Annotated[
    Union[TaskRunEvent, ErrorEvent],
    Any,  # discriminator="type"
]

# -----------------------------------------------------------------------------
# Resources / client
# -----------------------------------------------------------------------------

class DefaultHttpxClient(httpx.Client): ...
class DefaultAsyncHttpxClient(httpx.AsyncClient): ...
class DefaultAioHttpClient(httpx.AsyncClient): ...

class Parallel:
    # client options
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
    ) -> None:
        """Construct a new synchronous Parallel client instance.

        This automatically infers the `api_key` argument from the `PARALLEL_API_KEY` environment variable if it is not provided.
        """

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
    ) -> None:
        """Construct a new async AsyncParallel client instance.

        This automatically infers the `api_key` argument from the `PARALLEL_API_KEY` environment variable if it is not provided.
        """

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
# Non-beta TaskRun resource
# -----------------------------------------------------------------------------

class TaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        source_policy: Optional[SourcePolicyParam] | Omit = ...,
        task_spec: Optional[TaskSpecParam] | Omit = ...,
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
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
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
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
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
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
    async def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        source_policy: Optional[SourcePolicyParam] | Omit = ...,
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
    def create(self, *args: Any, **kwargs: Any) -> APIResponse[TaskRun]: ...
    def retrieve(self, *args: Any, **kwargs: Any) -> APIResponse[TaskRun]: ...
    def result(self, *args: Any, **kwargs: Any) -> APIResponse[TaskRunResult]: ...

class AsyncTaskRunResourceWithRawResponse:
    def create(self, *args: Any, **kwargs: Any) -> Awaitable[AsyncAPIResponse[TaskRun]]: ...
    def retrieve(self, *args: Any, **kwargs: Any) -> Awaitable[AsyncAPIResponse[TaskRun]]: ...
    def result(self, *args: Any, **kwargs: Any) -> Awaitable[AsyncAPIResponse[TaskRunResult]]: ...

class TaskRunResourceWithStreamingResponse:
    def create(self, *args: Any, **kwargs: Any) -> Any: ...
    def retrieve(self, *args: Any, **kwargs: Any) -> Any: ...
    def result(self, *args: Any, **kwargs: Any) -> Any: ...

class AsyncTaskRunResourceWithStreamingResponse:
    def create(self, *args: Any, **kwargs: Any) -> Any: ...
    def retrieve(self, *args: Any, **kwargs: Any) -> Any: ...
    def result(self, *args: Any, **kwargs: Any) -> Any: ...

# -----------------------------------------------------------------------------
# Beta resources
# -----------------------------------------------------------------------------

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
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
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
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
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

# --- beta.task_run resource (SSE events + beta result) ---

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
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
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
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
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
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
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
    async def create(self, **kwargs: Any) -> TaskRun: ...
    async def events(self, run_id: str, **kwargs: Any) -> AsyncStream[TaskRunEventsResponse]: ...
    async def result(self, run_id: str, **kwargs: Any) -> BetaTaskRunResult: ...

# --- beta.task_group resource ---

class TaskGroupResource:
    def create(self, *, metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ..., **kwargs: Any) -> TaskGroup: ...
    def retrieve(self, task_group_id: str, **kwargs: Any) -> TaskGroup: ...
    def add_runs(self, task_group_id: str, *, inputs: Iterable[BetaRunInputParam], default_task_spec: Optional[TaskSpecParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., **kwargs: Any) -> TaskGroupRunResponse: ...
    def events(self, task_group_id: str, *, last_event_id: Optional[str] | Omit = ..., api_timeout: Optional[float] | Omit = ..., **kwargs: Any) -> Stream[TaskGroupEventsResponse]: ...
    def get_runs(self, task_group_id: str, *, include_input: bool | Omit = ..., include_output: bool | Omit = ..., last_event_id: Optional[str] | Omit = ..., status: Optional[Literal["queued","action_required","running","completed","failed","cancelling","cancelled"]] | Omit = ..., **kwargs: Any) -> Stream[TaskGroupGetRunsResponse]: ...

class AsyncTaskGroupResource:
    async def create(self, **kwargs: Any) -> TaskGroup: ...
    async def retrieve(self, task_group_id: str, **kwargs: Any) -> TaskGroup: ...
    async def add_runs(self, task_group_id: str, **kwargs: Any) -> TaskGroupRunResponse: ...
    async def events(self, task_group_id: str, **kwargs: Any) -> AsyncStream[TaskGroupEventsResponse]: ...
    async def get_runs(self, task_group_id: str, **kwargs: Any) -> AsyncStream[TaskGroupGetRunsResponse]: ...

# --- beta.findall resource ---

class FindAllResource:
    def create(self, **kwargs: Any) -> FindAllRun: ...
    def retrieve(self, findall_id: str, **kwargs: Any) -> FindAllRun: ...
    def cancel(self, findall_id: str, **kwargs: Any) -> object: ...
    def ingest(self, *, objective: str, **kwargs: Any) -> FindAllSchema: ...
    def enrich(self, findall_id: str, *, output_schema: JsonSchemaParam, **kwargs: Any) -> FindAllSchema: ...
    def extend(self, findall_id: str, *, additional_match_limit: int, **kwargs: Any) -> FindAllSchema: ...
    def events(self, findall_id: str, **kwargs: Any) -> Stream[FindAllEventsResponse]: ...
    def result(self, findall_id: str, **kwargs: Any) -> FindAllRunResult: ...
    def schema(self, findall_id: str, **kwargs: Any) -> FindAllSchema: ...

class AsyncFindAllResource:
    async def create(self, **kwargs: Any) -> FindAllRun: ...
    async def retrieve(self, findall_id: str, **kwargs: Any) -> FindAllRun: ...
    async def cancel(self, findall_id: str, **kwargs: Any) -> object: ...
    async def ingest(self, *, objective: str, **kwargs: Any) -> FindAllSchema: ...
    async def enrich(self, findall_id: str, *, output_schema: JsonSchemaParam, **kwargs: Any) -> FindAllSchema: ...
    async def extend(self, findall_id: str, *, additional_match_limit: int, **kwargs: Any) -> FindAllSchema: ...
    async def events(self, findall_id: str, **kwargs: Any) -> AsyncStream[FindAllEventsResponse]: ...
    async def result(self, findall_id: str, **kwargs: Any) -> FindAllRunResult: ...
    async def schema(self, findall_id: str, **kwargs: Any) -> FindAllSchema: ...

# -----------------------------------------------------------------------------
# Client raw/streaming wrappers (top-level)
# -----------------------------------------------------------------------------

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

class BetaResourceWithRawResponse:
    def search(self, *args: Any, **kwargs: Any) -> APIResponse[SearchResult]: ...
    def extract(self, *args: Any, **kwargs: Any) -> APIResponse[ExtractResponse]: ...
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

class AsyncBetaResourceWithRawResponse:
    def search(self, *args: Any, **kwargs: Any) -> Awaitable[AsyncAPIResponse[SearchResult]]: ...
    def extract(self, *args: Any, **kwargs: Any) -> Awaitable[AsyncAPIResponse[ExtractResponse]]: ...
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

class BetaResourceWithStreamingResponse:
    def search(self, *args: Any, **kwargs: Any) -> Any: ...
    def extract(self, *args: Any, **kwargs: Any) -> Any: ...
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

class AsyncBetaResourceWithStreamingResponse:
    def search(self, *args: Any, **kwargs: Any) -> Any: ...
    def extract(self, *args: Any, **kwargs: Any) -> Any: ...
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

# -----------------------------------------------------------------------------
# Re-export "resources" module proxy (runtime only). In stubs, show as Any-like.
# -----------------------------------------------------------------------------

class _ResourcesModule(Protocol):
    TaskRunResource: type[TaskRunResource]
    AsyncTaskRunResource: type[AsyncTaskRunResource]
    # beta package resources:
    # - TaskRunResource, TaskGroupResource, FindAllResource, BetaResource
    ...

resources: _ResourcesModule
```

---

If you want, I can also output this as:
1) a **more “LLM-friendly”** condensed version (grouped by endpoints, showing URLs and required headers), or  
2) an **exhaustive** `.pyi` that enumerates *all* beta and non-beta model classes exactly (including every type alias and every parameter TypedDict), still in a single file.