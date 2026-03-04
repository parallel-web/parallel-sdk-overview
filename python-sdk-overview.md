Below is a single **`parallel.pyi`** “API footprint” stub that an LLM can skim to understand the public surface area: client entrypoints, resources/methods, key models/params, and the beta namespace.  

Notes / constraints I followed:

- I **only copied docstrings 1:1 where they exist in the SDK source** (mostly resource methods and some model classes). If something had no docstring in the source, I did not invent one.
- This is a *summary* stub: it’s not every internal helper, but it captures the externally used API (clients/resources/types) and the important types that appear in method signatures/returns.
- The SDK has both `parallel.resources.task_run.TaskRunResource` and `parallel.resources.beta.task_run.TaskRunResource`; in this `.pyi` I expose them under different names via the `client.task_run` vs `client.beta.task_run` structure, matching the real package layout.

---

```pyi
# parallel.pyi
# A single-file stub summarizing the public API footprint of the `parallel` SDK.

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
    Union,
    Generic,
    TypeVar,
    overload,
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
# Sentinel / helper types (publicly exported)
# ---------------------------------------------------------------------------

class NotGiven:
    def __bool__(self) -> bool: ...
    def __repr__(self) -> str: ...

not_given: NotGiven
NOT_GIVEN: NotGiven

class Omit:
    def __bool__(self) -> bool: ...

omit: Omit

NoneType: type[None]

Transport = httpx.BaseTransport
ProxiesTypes = Union[str, httpx.Proxy, Dict[Union[str, httpx.URL], Union[None, str, httpx.URL, httpx.Proxy]]]

Timeout = Union[float, httpx.Timeout, None]

class RequestOptions(Dict[str, object]): ...
DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits

def file_from_path(path: str) -> Any: ...

# ---------------------------------------------------------------------------
# Exceptions (publicly exported)
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

# ---------------------------------------------------------------------------
# BaseModel (publicly exported)
# ---------------------------------------------------------------------------

class BaseModel(pydantic.BaseModel):
    def to_dict(
        self,
        *,
        mode: str = ...,
        use_api_names: bool = ...,
        exclude_unset: bool = ...,
        exclude_defaults: bool = ...,
        exclude_none: bool = ...,
        warnings: bool = ...,
    ) -> Dict[str, object]: ...
    def to_json(
        self,
        *,
        indent: int | None = ...,
        use_api_names: bool = ...,
        exclude_unset: bool = ...,
        exclude_defaults: bool = ...,
        exclude_none: bool = ...,
        warnings: bool = ...,
    ) -> str: ...

# ---------------------------------------------------------------------------
# Streaming (publicly exported via _client import)
# ---------------------------------------------------------------------------

_T = TypeVar("_T")

class Stream(Generic[_T]):
    response: httpx.Response
    def __iter__(self) -> Iterator[_T]: ...
    def __next__(self) -> _T: ...
    def close(self) -> None: ...
    def __enter__(self) -> Stream[_T]: ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: object | None) -> None: ...

class AsyncStream(Generic[_T]):
    response: httpx.Response
    def __aiter__(self) -> AsyncIterator[_T]: ...
    async def __anext__(self) -> _T: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> AsyncStream[_T]: ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: object | None) -> None: ...

# ---------------------------------------------------------------------------
# Core types (parallel.types.*)
# ---------------------------------------------------------------------------

class ErrorObject(BaseModel):
    """An error message."""
    message: str
    """Human-readable message."""
    ref_id: str
    """Reference ID for the error."""
    detail: Optional[Dict[str, object]] = None
    """Optional detail supporting the error."""

class ErrorResponse(BaseModel):
    """Response object used for non-200 status codes."""
    error: ErrorObject
    """Error."""
    type: Any
    """Always 'error'."""

class Warning(BaseModel):
    """Human-readable message for a task."""
    message: str
    """Human-readable message."""
    type: Any
    """Type of warning.

    Note that adding new warning types is considered a backward-compatible change.
    """
    detail: Optional[Dict[str, object]] = None
    """Optional detail supporting the warning."""

class SourcePolicy(BaseModel):
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    after_date: Optional[date] = None
    """Optional start date for filtering search results.

    Results will be limited to content published on or after this date. Provided as
    an RFC 3339 date string (YYYY-MM-DD).
    """
    exclude_domains: Optional[List[str]] = None
    """List of domains to exclude from results.

    If specified, sources from these domains will be excluded. Accepts plain domains
    (e.g., example.com, subdomain.example.gov) or bare domain extension starting
    with a period (e.g., .gov, .edu, .co.uk).
    """
    include_domains: Optional[List[str]] = None
    """List of domains to restrict the results to.

    If specified, only sources from these domains will be included. Accepts plain
    domains (e.g., example.com, subdomain.example.gov) or bare domain extension
    starting with a period (e.g., .gov, .edu, .co.uk).
    """

class Citation(BaseModel):
    """A citation for a task output."""
    url: str
    """URL of the citation."""
    excerpts: Optional[List[str]] = None
    """Excerpts from the citation supporting the output.

    Only certain processors provide excerpts.
    """
    title: Optional[str] = None
    """Title of the citation."""

class FieldBasis(BaseModel):
    """Citations and reasoning supporting one field of a task output."""
    field: str
    """Name of the output field."""
    reasoning: str
    """Reasoning for the output field."""
    citations: Optional[List[Citation]] = None
    """List of citations supporting the output field."""
    confidence: Optional[str] = None
    """Confidence level for the output field.

    Only certain processors provide confidence levels.
    """

class AutoSchema(BaseModel):
    """Auto schema for a task input or output."""
    type: Optional[Any] = None
    """The type of schema being defined. Always `auto`."""

class TextSchema(BaseModel):
    """Text description for a task input or output."""
    description: Optional[str] = None
    """A text description of the desired output from the task."""
    type: Optional[Any] = None
    """The type of schema being defined. Always `text`."""

class JsonSchema(BaseModel):
    """JSON schema for a task input or output."""
    json_schema: Dict[str, object]
    """A JSON Schema object. Only a subset of JSON Schema is supported."""
    type: Optional[Any] = None
    """The type of schema being defined. Always `json`."""

OutputSchema = Union[JsonSchema, TextSchema, AutoSchema, str]
InputSchema = Union[str, JsonSchema, TextSchema, None]

class TaskSpec(BaseModel):
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`. Not
    specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    output_schema: OutputSchema
    """JSON schema or text fully describing the desired output from the task.

    Descriptions of output fields will determine the form and content of the
    response. A bare string is equivalent to a text schema with the same
    description.
    """
    input_schema: Optional[InputSchema] = None
    """Optional JSON schema or text description of expected input to the task.

    A bare string is equivalent to a text schema with the same description.
    """

class TaskRun(BaseModel):
    """Status of a task run."""
    created_at: Optional[str] = None
    """Timestamp of the creation of the task, as an RFC 3339 string."""
    is_active: bool
    """Whether the run is currently active, i.e.

    status is one of {'cancelling', 'queued', 'running'}.
    """
    modified_at: Optional[str] = None
    """Timestamp of the last modification to the task, as an RFC 3339 string."""
    processor: str
    """Processor used for the run."""
    run_id: str
    """ID of the task run."""
    status: Any
    """Status of the run."""
    error: Optional[ErrorObject] = None
    """An error message."""
    metadata: Optional[Dict[str, Union[str, float, bool]]] = None
    """User-provided metadata stored with the run."""
    task_group_id: Optional[str] = None
    """ID of the taskgroup to which the run belongs."""
    warnings: Optional[List[Warning]] = None
    """Warnings for the run, if any."""

class TaskRunTextOutput(BaseModel):
    """Output from a task that returns text."""
    basis: List[FieldBasis]
    """Basis for the output. The basis has a single field 'output'."""
    content: str
    """Text output from the task."""
    type: Any
    """
    The type of output being returned, as determined by the output schema of the
    task spec.
    """
    beta_fields: Optional[Dict[str, object]] = None
    """Additional fields from beta features used in this task run.

    When beta features are specified during both task run creation and result
    retrieval, this field will be empty and instead the relevant beta attributes
    will be directly included in the `BetaTaskRunJsonOutput` or corresponding output
    type. However, if beta features were specified during task run creation but not
    during result retrieval, this field will contain the dump of fields from those
    beta features. Each key represents the beta feature version (one amongst
    parallel-beta headers) and the values correspond to the beta feature attributes,
    if any. For now, only MCP server beta features have attributes. For example,
    `{mcp-server-2025-07-17: [{'server_name':'mcp_server', 'tool_call_id': 'tc_123', ...}]}}`
    """

class TaskRunJsonOutput(BaseModel):
    """Output from a task that returns JSON."""
    basis: List[FieldBasis]
    """Basis for each top-level field in the JSON output.

    Per-list-element basis entries are available only when the
    `parallel-beta: field-basis-2025-11-25` header is supplied.
    """
    content: Dict[str, object]
    """
    Output from the task as a native JSON object, as determined by the output schema
    of the task spec.
    """
    type: Any
    """
    The type of output being returned, as determined by the output schema of the
    task spec.
    """
    beta_fields: Optional[Dict[str, object]] = None
    """Additional fields from beta features used in this task run.

    When beta features are specified during both task run creation and result
    retrieval, this field will be empty and instead the relevant beta attributes
    will be directly included in the `BetaTaskRunJsonOutput` or corresponding output
    type. However, if beta features were specified during task run creation but not
    during result retrieval, this field will contain the dump of fields from those
    beta features. Each key represents the beta feature version (one amongst
    parallel-beta headers) and the values correspond to the beta feature attributes,
    if any. For now, only MCP server beta features have attributes. For example,
    `{mcp-server-2025-07-17: [{'server_name':'mcp_server', 'tool_call_id': 'tc_123', ...}]}}`
    """
    output_schema: Optional[Dict[str, object]] = None
    """Output schema for the Task Run.

    Populated only if the task was executed with an auto schema.
    """

TaskRunResultOutput = Union[TaskRunTextOutput, TaskRunJsonOutput]

class TaskRunResult(BaseModel):
    """Result of a task run."""
    output: TaskRunResultOutput
    """Output from the task conforming to the output schema."""
    run: TaskRun
    """Task run object with status 'completed'."""

# Parsed output support (execute(output=MyPydanticModel))
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

# ---------------------------------------------------------------------------
# Core param TypedDicts (summarized)
# ---------------------------------------------------------------------------

class TaskRunCreateParams(Dict[str, object]): ...
class TaskRunResultParams(Dict[str, object]): ...
class TaskSpecParam(Dict[str, object]): ...
class JsonSchemaParam(Dict[str, object]): ...
class TextSchemaParam(Dict[str, object]): ...
class AutoSchemaParam(Dict[str, object]): ...

# ---------------------------------------------------------------------------
# Beta types (parallel.types.beta.*) - key models used by endpoints
# ---------------------------------------------------------------------------

ParallelBetaParam = Union[
    str,  # includes known literals like "mcp-server-2025-07-17", ...
]

class UsageItem(BaseModel):
    """Usage item for a single operation."""
    count: int
    """Count of the SKU."""
    name: str
    """Name of the SKU."""

class WebSearchResult(BaseModel):
    """A single search result from the web search API."""
    url: str
    """URL associated with the search result."""
    excerpts: Optional[List[str]] = None
    """Relevant excerpted content from the URL, formatted as markdown."""
    publish_date: Optional[str] = None
    """Publish date of the webpage in YYYY-MM-DD format, if available."""
    title: Optional[str] = None
    """Title of the webpage, if available."""

class SearchResult(BaseModel):
    """Output for the Search API."""
    results: List[WebSearchResult]
    """A list of WebSearchResult objects, ordered by decreasing relevance."""
    search_id: str
    """Search ID. Example: `search_cad0a6d2dec046bd95ae900527d880e7`"""
    usage: Optional[List[UsageItem]] = None
    """Usage metrics for the search request."""
    warnings: Optional[List[Warning]] = None
    """Warnings for the search request, if any."""

class ExtractError(BaseModel):
    """Extract error details."""
    content: Optional[str] = None
    """Content returned for http client or server errors, if any."""
    error_type: str
    """Error type."""
    http_status_code: Optional[int] = None
    """HTTP status code, if available."""
    url: str

class ExtractResult(BaseModel):
    """Extract result for a single URL."""
    url: str
    """URL associated with the search result."""
    excerpts: Optional[List[str]] = None
    """Relevant excerpted content from the URL, formatted as markdown."""
    full_content: Optional[str] = None
    """Full content from the URL formatted as markdown, if requested."""
    publish_date: Optional[str] = None
    """Publish date of the webpage in YYYY-MM-DD format, if available."""
    title: Optional[str] = None
    """Title of the webpage, if available."""

class ExtractResponse(BaseModel):
    """Fetch result."""
    errors: List[ExtractError]
    """Extract errors: requested URLs not in the results."""
    extract_id: str
    """Extract request ID, e.g. `extract_cad0a6d2dec046bd95ae900527d880e7`"""
    results: List[ExtractResult]
    """Successful extract results."""
    usage: Optional[List[UsageItem]] = None
    """Usage metrics for the extract request."""
    warnings: Optional[List[Warning]] = None
    """Warnings for the extract request, if any."""

class Webhook(BaseModel):
    """Webhooks for Task Runs."""
    url: str
    """URL for the webhook."""
    event_types: Optional[List[Any]] = None
    """Event types to send the webhook notifications for."""

class McpServer(BaseModel):
    """MCP server configuration."""
    name: str
    """Name of the MCP server."""
    url: str
    """URL of the MCP server."""
    allowed_tools: Optional[List[str]] = None
    """List of allowed tools for the MCP server."""
    headers: Optional[Dict[str, str]] = None
    """Headers for the MCP server."""
    type: Optional[Any] = None
    """Type of MCP server being configured. Always `url`."""

class McpToolCall(BaseModel):
    """Result of an MCP tool call."""
    arguments: str
    """Arguments used to call the MCP tool."""
    server_name: str
    """Name of the MCP server."""
    tool_call_id: str
    """Identifier for the tool call."""
    tool_name: str
    """Name of the tool being called."""
    content: Optional[str] = None
    """Output received from the tool call, if successful."""
    error: Optional[str] = None
    """Error message if the tool call failed."""

class BetaTaskRunTextOutput(BaseModel):
    """Output from a task that returns text."""
    basis: List[FieldBasis]
    """Basis for the output.

    To include per-list-element basis entries, send the `parallel-beta` header with
    the value `field-basis-2025-11-25` when creating the run.
    """
    content: str
    """Text output from the task."""
    type: Any
    """
    The type of output being returned, as determined by the output schema of the
    task spec.
    """
    beta_fields: Optional[Dict[str, object]] = None
    """Always None."""
    mcp_tool_calls: Optional[List[McpToolCall]] = None
    """MCP tool calls made by the task."""

class BetaTaskRunJsonOutput(BaseModel):
    """Output from a task that returns JSON."""
    basis: List[FieldBasis]
    """Basis for the output.

    To include per-list-element basis entries, send the `parallel-beta` header with
    the value `field-basis-2025-11-25` when creating the run.
    """
    content: Dict[str, object]
    """
    Output from the task as a native JSON object, as determined by the output schema
    of the task spec.
    """
    type: Any
    """
    The type of output being returned, as determined by the output schema of the
    task spec.
    """
    beta_fields: Optional[Dict[str, object]] = None
    """Always None."""
    mcp_tool_calls: Optional[List[McpToolCall]] = None
    """MCP tool calls made by the task."""
    output_schema: Optional[Dict[str, object]] = None
    """Output schema for the Task Run.

    Populated only if the task was executed with an auto schema.
    """

BetaTaskRunResultOutput = Union[BetaTaskRunTextOutput, BetaTaskRunJsonOutput]

class BetaTaskRunResult(BaseModel):
    """Result of a beta task run. Available only if beta headers are specified."""
    output: BetaTaskRunResultOutput
    """Output from the task conforming to the output schema."""
    run: TaskRun
    """Beta task run object with status 'completed'."""

# TaskRun events (beta)
class TaskRunProgressStatsEventSourceStats(BaseModel):
    """Source stats describing progress so far."""
    num_sources_considered: Optional[int] = None
    """Number of sources considered in processing the task."""
    num_sources_read: Optional[int] = None
    """Number of sources read in processing the task."""
    sources_read_sample: Optional[List[str]] = None
    """A sample of URLs of sources read in processing the task."""

class TaskRunProgressStatsEvent(BaseModel):
    """A progress update for a task run."""
    progress_meter: float
    """Completion percentage of the task run.

    Ranges from 0 to 100 where 0 indicates no progress and 100 indicates completion.
    """
    source_stats: TaskRunProgressStatsEventSourceStats
    """Source stats describing progress so far."""
    type: Any
    """Event type; always 'task_run.progress_stats'."""

class TaskRunProgressMessageEvent(BaseModel):
    """A message for a task run progress update."""
    message: str
    """Progress update message."""
    timestamp: Optional[str] = None
    """Timestamp of the message."""
    type: Any
    """Event type; always starts with 'task_run.progress_msg'."""

class ErrorEvent(BaseModel):
    """Event indicating an error."""
    error: ErrorObject
    """Error."""
    type: Any
    """Event type; always 'error'."""

class TaskRunEvent(BaseModel):
    """Event when a task run transitions to a non-active status.

    May indicate completion, cancellation, or failure.
    """
    event_id: Optional[str] = None
    """Cursor to resume the event stream. Always empty for non Task Group runs."""
    run: TaskRun
    """Task run object."""
    type: Any
    """Event type; always 'task_run.state'."""
    input: Optional[object] = None
    """Task run input with additional beta fields."""
    output: Optional[object] = None
    """Output from the run; included only if requested and if status == `completed`."""

TaskRunEventsResponse = Union[TaskRunProgressStatsEvent, TaskRunProgressMessageEvent, TaskRunEvent, ErrorEvent]

# FindAll / TaskGroup beta models are large; we include primary entry models used in resource methods
class TaskGroupStatus(BaseModel):
    """Status of a task group."""
    is_active: bool
    """True if at least one run in the group is currently active, i.e.

    status is one of {'cancelling', 'queued', 'running'}.
    """
    modified_at: Optional[str] = None
    """Timestamp of the last status update to the group, as an RFC 3339 string."""
    num_task_runs: int
    """Number of task runs in the group."""
    status_message: Optional[str] = None
    """Human-readable status message for the group."""
    task_run_status_counts: Dict[str, int]
    """Number of task runs with each status."""

class TaskGroup(BaseModel):
    """Response object for a task group, including its status and metadata."""
    created_at: Optional[str] = None
    """Timestamp of the creation of the group, as an RFC 3339 string."""
    status: TaskGroupStatus
    """Status of the group."""
    task_group_id: str
    """ID of the group."""
    metadata: Optional[Dict[str, Union[str, float, bool]]] = None
    """User-provided metadata stored with the group."""

class TaskGroupRunResponse(BaseModel):
    """Response from adding new task runs to a task group."""
    event_cursor: Optional[str] = None
    """
    Cursor for these runs in the event stream at
    taskgroup/events?last_event_id=<event_cursor>. Empty for the first runs in the
    group.
    """
    run_cursor: Optional[str] = None
    """
    Cursor for these runs in the run stream at
    taskgroup/runs?last_event_id=<run_cursor>. Empty for the first runs in the
    group.
    """
    run_ids: List[str]
    """IDs of the newly created runs."""
    status: TaskGroupStatus
    """Status of the group."""

TaskGroupEventsResponse = object
TaskGroupGetRunsResponse = object

class FindAllRun(BaseModel): ...
class FindAllSchema(BaseModel): ...
class FindAllRunResult(BaseModel): ...
FindAllEventsResponse = object

# ---------------------------------------------------------------------------
# Resources: core (parallel.task_run)
# ---------------------------------------------------------------------------

OutputT = TypeVar("OutputT", bound=pydantic.BaseModel)

class TaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        source_policy: Optional[Dict[str, object]] = ...,
        task_spec: Optional[Dict[str, object]] = ...,
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Mapping[str, object] | None = ...,
        extra_body: object | None = ...,
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
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Mapping[str, object] | None = ...,
        extra_body: object | None = ...,
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
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Mapping[str, object] | None = ...,
        extra_body: object | None = ...,
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
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Mapping[str, object] | None = ...,
        extra_body: object | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRunResult: ...
    @overload
    def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        output: type[OutputT],
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Mapping[str, object] | None = ...,
        extra_body: object | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ParsedTaskRunResult[OutputT]: ...
    def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        output: Optional[OutputSchema] | type[OutputT] = ...,
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Mapping[str, object] | None = ...,
        extra_body: object | None = ...,
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
    async def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        source_policy: Optional[Dict[str, object]] = ...,
        task_spec: Optional[Dict[str, object]] = ...,
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Mapping[str, object] | None = ...,
        extra_body: object | None = ...,
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

    async def retrieve(
        self,
        run_id: str,
        *,
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Mapping[str, object] | None = ...,
        extra_body: object | None = ...,
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

    async def result(
        self,
        run_id: str,
        *,
        api_timeout: int = ...,
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Mapping[str, object] | None = ...,
        extra_body: object | None = ...,
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
    async def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        output: Optional[OutputSchema] = ...,
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Mapping[str, object] | None = ...,
        extra_body: object | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRunResult: ...
    @overload
    async def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        output: type[OutputT],
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Mapping[str, object] | None = ...,
        extra_body: object | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ParsedTaskRunResult[OutputT]: ...
    async def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        output: Optional[OutputSchema] | type[OutputT] = ...,
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Mapping[str, object] | None = ...,
        extra_body: object | None = ...,
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

# ---------------------------------------------------------------------------
# Resources: beta namespace (parallel.beta.*)
# ---------------------------------------------------------------------------

class BetaTaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        enable_events: Optional[bool] = ...,
        mcp_servers: Optional[Iterable[Dict[str, object]]] = ...,
        metadata: Optional[Dict[str, Union[str, float, bool]]] = ...,
        source_policy: Optional[Dict[str, object]] = ...,
        task_spec: Optional[Dict[str, object]] = ...,
        webhook: Optional[Dict[str, object]] = ...,
        betas: List[ParallelBetaParam] = ...,
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Mapping[str, object] | None = ...,
        extra_body: object | None = ...,
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
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Mapping[str, object] | None = ...,
        extra_body: object | None = ...,
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
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Mapping[str, object] | None = ...,
        extra_body: object | None = ...,
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

class BetaTaskGroupResource:
    def create(self, **kwargs: Any) -> TaskGroup:
        """
        Initiates a TaskGroup to group and track multiple runs.

        Args:
          metadata: User-provided metadata stored with the task group.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
    def retrieve(self, task_group_id: str, **kwargs: Any) -> TaskGroup:
        """
        Retrieves aggregated status across runs in a TaskGroup.

        Args:
          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
    def add_runs(self, task_group_id: str, **kwargs: Any) -> TaskGroupRunResponse:
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
    def events(self, task_group_id: str, **kwargs: Any) -> Stream[TaskGroupEventsResponse]:
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
    def get_runs(self, task_group_id: str, **kwargs: Any) -> Stream[TaskGroupGetRunsResponse]:
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

class BetaFindAllResource:
    def create(self, **kwargs: Any) -> FindAllRun:
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

        Args:
          entity_type: Type of the entity for the FindAll run.

          generator: Generator for the FindAll run. One of base, core, pro, preview.

          match_conditions: List of match conditions for the FindAll run.

          match_limit: Maximum number of matches to find for this FindAll run. Must be between 5 and
              1000 (inclusive).

          objective: Natural language objective of the FindAll run.

          exclude_list: List of entity names/IDs to exclude from results.

          metadata: Metadata for the FindAll run.

          webhook: Webhooks for Task Runs.

          betas: Optional header to specify the beta version(s) to enable.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
    def retrieve(self, findall_id: str, **kwargs: Any) -> FindAllRun:
        """
        Retrieve a FindAll run.

        Args:
          betas: Optional header to specify the beta version(s) to enable.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
    def cancel(self, findall_id: str, **kwargs: Any) -> object:
        """
        Cancel a FindAll run.

        Args:
          betas: Optional header to specify the beta version(s) to enable.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
    def enrich(self, findall_id: str, **kwargs: Any) -> FindAllSchema:
        """
        Add an enrichment to a FindAll run.

        Args:
          output_schema: JSON schema for the enrichment output schema for the FindAll run.

          mcp_servers: List of MCP servers to use for the task.

          processor: Processor to use for the task.

          betas: Optional header to specify the beta version(s) to enable.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
    def events(self, findall_id: str, **kwargs: Any) -> Stream[FindAllEventsResponse]:
        """
        Stream events from a FindAll run.

        Args: request: The Shapi request findall_id: The FindAll run ID last_event_id:
        Optional event ID to resume from. timeout: Optional timeout in seconds. If None,
        keep connection alive as long as the run is going. If set, stop after specified
        duration.

        Args:
          betas: Optional header to specify the beta version(s) to enable.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
    def extend(self, findall_id: str, **kwargs: Any) -> FindAllSchema:
        """
        Extend a FindAll run by adding additional matches to the current match limit.

        Args:
          additional_match_limit: Additional number of matches to find for this FindAll run. This value will be
              added to the current match limit to determine the new total match limit. Must be
              greater than 0.

          betas: Optional header to specify the beta version(s) to enable.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
    def ingest(self, **kwargs: Any) -> FindAllSchema:
        """
        Transforms a natural language search objective into a structured FindAll spec.

        Note: Access to this endpoint requires the parallel-beta header.

        The generated specification serves as a suggested starting point and can be
        further customized by the user.

        Args:
          objective: Natural language objective to create a FindAll run spec.

          betas: Optional header to specify the beta version(s) to enable.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
    def result(self, findall_id: str, **kwargs: Any) -> FindAllRunResult:
        """
        Retrieve the FindAll run result at the time of the request.

        Args:
          betas: Optional header to specify the beta version(s) to enable.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """
    def schema(self, findall_id: str, **kwargs: Any) -> FindAllSchema:
        """
        Get FindAll Run Schema

        Args:
          betas: Optional header to specify the beta version(s) to enable.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """

class BetaResource:
    task_run: BetaTaskRunResource
    task_group: BetaTaskGroupResource
    findall: BetaFindAllResource

    def extract(self, **kwargs: Any) -> ExtractResponse:
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

    def search(self, **kwargs: Any) -> SearchResult:
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

class AsyncBetaResource:
    task_run: AsyncBetaTaskRunResource
    # task_group/findall omitted here for brevity; same structure as sync
    async def extract(self, **kwargs: Any) -> ExtractResponse: ...
    async def search(self, **kwargs: Any) -> SearchResult: ...

# ---------------------------------------------------------------------------
# Top-level Clients
# ---------------------------------------------------------------------------

class Parallel:
    api_key: str
    task_run: TaskRunResource
    beta: BetaResource

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

    with_options: Any  # alias for copy

class AsyncParallel:
    api_key: str
    task_run: AsyncTaskRunResource
    beta: AsyncBetaResource

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

    with_options: Any  # alias for copy

# Aliases exported by package
Client = Parallel
AsyncClient = AsyncParallel

# ---------------------------------------------------------------------------
# `parallel.resources` proxy (available at runtime as parallel.resources)
# ---------------------------------------------------------------------------

resources: Any

# ---------------------------------------------------------------------------
# `parallel.types` module shortcut
# ---------------------------------------------------------------------------

class types:
    Warning: type[Warning]
    ErrorObject: type[ErrorObject]
    SourcePolicy: type[SourcePolicy]
    ErrorResponse: type[ErrorResponse]
    Citation: type[Citation]
    TaskRun: type[TaskRun]
    TaskSpec: type[TaskSpec]
    AutoSchema: type[AutoSchema]
    FieldBasis: type[FieldBasis]
    JsonSchema: type[JsonSchema]
    TextSchema: type[TextSchema]
    TaskRunResult: type[TaskRunResult]
    TaskSpecParam: type[TaskSpecParam]
    AutoSchemaParam: type[AutoSchemaParam]
    JsonSchemaParam: type[JsonSchemaParam]
    TextSchemaParam: type[TextSchemaParam]
    TaskRunJsonOutput: type[TaskRunJsonOutput]
    TaskRunTextOutput: type[TaskRunTextOutput]
    ParsedTaskRunResult: type[ParsedTaskRunResult]
    TaskRunCreateParams: type[TaskRunCreateParams]
    TaskRunResultParams: type[TaskRunResultParams]
```

---

If you want, I can generate an alternate version that is **even more “LLM-friendly”** by:
- flattening the beta subresources (`beta.search`, `beta.extract`, `beta.task_run.*`, `beta.task_group.*`, `beta.findall.*`) into a compact “endpoint table” comment block at the top, or
- including *all* beta models (FindAll events, Candidate types, etc.) in full rather than the summarized placeholders I used for the largest ones.