Below is a single, self-contained **`parallel_api_footprint.pyi`** stub that summarizes the public API surface area implied by your source tree. I’ve focused on what an LLM needs to understand “how to use the SDK”: client entrypoints, resources + methods, important request/response models, and the beta namespace.  

Notes / constraints (so you know what’s included/excluded):
- I **copied docstrings 1:1** where they were visible in the snippets you provided (not reworded).
- I did **not** attempt to perfectly mirror every internal helper and every generated type in `types/beta/*` (there are many); instead I included the key ones plus the discriminated unions used by streaming.
- Types referenced but not crucial are still declared (often as `BaseModel` subclasses / `TypedDict`) so the file stays coherent for an LLM.

---

```py
# parallel_api_footprint.pyi
# A single-file footprint summary of the `parallel` SDK API.

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import (
    Any,
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
    ParamSpec,
    Protocol,
    Required,
    Self,
    TypeAlias,
    TypedDict,
)

import httpx
import pydantic

# --------------------------------------------------------------------------------------
# Package metadata
# --------------------------------------------------------------------------------------

__title__: str
__version__: str

# --------------------------------------------------------------------------------------
# Sentinel / option types
# --------------------------------------------------------------------------------------

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

NoneType: type[None]

Headers: TypeAlias = Mapping[str, Union[str, Omit]]
Query: TypeAlias = Mapping[str, object]
Body: TypeAlias = object

Transport: TypeAlias = httpx.BaseTransport
AsyncTransport: TypeAlias = httpx.AsyncBaseTransport

Timeout: TypeAlias = httpx.Timeout

# Proxies types (approx.)
ProxiesDict: TypeAlias = Dict[Union[str, httpx.URL], Union[None, str, httpx.URL, httpx.Proxy]]
ProxiesTypes: TypeAlias = Union[str, httpx.Proxy, ProxiesDict]

class RequestOptions(TypedDict, total=False):
    headers: Headers
    max_retries: int
    timeout: float | Timeout | None
    params: Query
    extra_json: Mapping[str, object]
    idempotency_key: str
    follow_redirects: bool

# --------------------------------------------------------------------------------------
# Exceptions (public)
# --------------------------------------------------------------------------------------

class ParallelError(Exception): ...

class APIError(ParallelError):
    message: str
    request: httpx.Request
    body: object | None
    """The API response body.

    If the API responded with a valid JSON structure then this property will be the
    decoded result.

    If it isn't a valid JSON structure then this will be the raw response.

    If there was no response associated with this error then it will be `None`.
    """

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

# --------------------------------------------------------------------------------------
# Base model (public)
# --------------------------------------------------------------------------------------

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

class GenericModel(BaseModel, Generic[TypeVar("T")]): ...

# --------------------------------------------------------------------------------------
# Core domain types (types/*)
# --------------------------------------------------------------------------------------

class Warning(BaseModel):
    """Human-readable message for a task."""
    message: str
    """Human-readable message."""
    type: Literal["spec_validation_warning", "input_validation_warning", "warning"]
    """Type of warning.

    Note that adding new warning types is considered a backward-compatible change.
    """
    detail: Optional[Dict[str, object]] = None
    """Optional detail supporting the warning."""

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
    type: Literal["error"]
    """Always 'error'."""

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
    type: Optional[Literal["auto"]] = None
    """The type of schema being defined. Always `auto`."""

class TextSchema(BaseModel):
    """Text description for a task input or output."""
    description: Optional[str] = None
    """A text description of the desired output from the task."""
    type: Optional[Literal["text"]] = None
    """The type of schema being defined. Always `text`."""

class JsonSchema(BaseModel):
    """JSON schema for a task input or output."""
    json_schema: Dict[str, object]
    """A JSON Schema object. Only a subset of JSON Schema is supported."""
    type: Optional[Literal["json"]] = None
    """The type of schema being defined. Always `json`."""

OutputSchema: TypeAlias = Union[JsonSchema, TextSchema, AutoSchema, str]
InputSchema: TypeAlias = Union[str, JsonSchema, TextSchema, None]

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

# params (TypedDict) versions
class AutoSchemaParam(TypedDict, total=False):
    """Auto schema for a task input or output."""
    type: Literal["auto"]
    """The type of schema being defined. Always `auto`."""

class TextSchemaParam(TypedDict, total=False):
    """Text description for a task input or output."""
    description: Optional[str]
    """A text description of the desired output from the task."""
    type: Literal["text"]
    """The type of schema being defined. Always `text`."""

class JsonSchemaParam(TypedDict, total=False):
    """JSON schema for a task input or output."""
    json_schema: Required[Dict[str, object]]
    """A JSON Schema object. Only a subset of JSON Schema is supported."""
    type: Literal["json"]
    """The type of schema being defined. Always `json`."""

class TaskSpecParam(TypedDict, total=False):
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`. Not
    specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    output_schema: Required[Union[JsonSchemaParam, TextSchemaParam, AutoSchemaParam, str]]
    """JSON schema or text fully describing the desired output from the task.

    Descriptions of output fields will determine the form and content of the
    response. A bare string is equivalent to a text schema with the same
    description.
    """
    input_schema: Optional[Union[str, JsonSchemaParam, TextSchemaParam]]

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
    status: Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]
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
    type: Literal["text"]
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
    type: Literal["json"]
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

TaskRunResultOutput: TypeAlias = Annotated[Union[TaskRunTextOutput, TaskRunJsonOutput], Any]

class TaskRunResult(BaseModel):
    """Result of a task run."""
    output: TaskRunResultOutput
    """Output from the task conforming to the output schema."""
    run: TaskRun
    """Task run object with status 'completed'."""

# Parsed results
ContentType = TypeVar("ContentType", bound=pydantic.BaseModel)

class ParsedTaskRunTextOutput(TaskRunTextOutput, GenericModel, Generic[ContentType]):
    parsed: None
    """The parsed output from the task run."""

class ParsedTaskRunJsonOutput(TaskRunJsonOutput, GenericModel, Generic[ContentType]):
    parsed: Optional[ContentType] = None
    """The parsed output from the task run."""

class ParsedTaskRunResult(TaskRunResult, GenericModel, Generic[ContentType]):
    output: Union[ParsedTaskRunTextOutput[ContentType], ParsedTaskRunJsonOutput[ContentType]]
    """The parsed output from the task run."""

# --------------------------------------------------------------------------------------
# Beta domain (types/beta/*)
# --------------------------------------------------------------------------------------

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
    """Count of the SKU."""
    name: str
    """Name of the SKU."""

class Webhook(BaseModel):
    """Webhooks for Task Runs."""
    url: str
    """URL for the webhook."""
    event_types: Optional[List[Literal["task_run.status"]]] = None
    """Event types to send the webhook notifications for."""

class WebhookParam(TypedDict, total=False):
    """Webhooks for Task Runs."""
    url: Required[str]
    """URL for the webhook."""
    event_types: List[Literal["task_run.status"]]
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
    type: Optional[Literal["url"]] = None
    """Type of MCP server being configured. Always `url`."""

class McpServerParam(TypedDict, total=False):
    """MCP server configuration."""
    name: Required[str]
    """Name of the MCP server."""
    url: Required[str]
    """URL of the MCP server."""
    allowed_tools: Optional[Sequence[str]]
    """List of allowed tools for the MCP server."""
    headers: Optional[Dict[str, str]]
    """Headers for the MCP server."""
    type: Literal["url"]
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

class BetaRunInput(BaseModel):
    """Task run input with additional beta fields."""
    input: Union[str, Dict[str, object]]
    """Input to the task, either text or a JSON object."""
    processor: str
    """Processor to use for the task."""
    enable_events: Optional[bool] = None
    """Controls tracking of task run execution progress.

    When set to true, progress events are recorded and can be accessed via the
    [Task Run events](https://platform.parallel.ai/api-reference) endpoint. When
    false, no progress events are tracked. Note that progress tracking cannot be
    enabled after a run has been created. The flag is set to true by default for
    premium processors (pro and above). To enable this feature in your requests,
    specify `events-sse-2025-07-24` as one of the values in `parallel-beta` header
    (for API calls) or `betas` param (for the SDKs).
    """
    mcp_servers: Optional[List[McpServer]] = None
    """
    Optional list of MCP servers to use for the run. To enable this feature in your
    requests, specify `mcp-server-2025-07-17` as one of the values in
    `parallel-beta` header (for API calls) or `betas` param (for the SDKs).
    """
    metadata: Optional[Dict[str, Union[str, float, bool]]] = None
    """User-provided metadata stored with the run.

    Keys and values must be strings with a maximum length of 16 and 512 characters
    respectively.
    """
    source_policy: Optional[SourcePolicy] = None
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    task_spec: Optional[TaskSpec] = None
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
    Not specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    webhook: Optional[Webhook] = None
    """Webhooks for Task Runs."""

class BetaRunInputParam(TypedDict, total=False):
    """Task run input with additional beta fields."""
    input: Required[Union[str, Dict[str, object]]]
    """Input to the task, either text or a JSON object."""
    processor: Required[str]
    """Processor to use for the task."""
    enable_events: Optional[bool]
    """Controls tracking of task run execution progress.

    When set to true, progress events are recorded and can be accessed via the
    [Task Run events](https://platform.parallel.ai/api-reference) endpoint. When
    false, no progress events are tracked. Note that progress tracking cannot be
    enabled after a run has been created. The flag is set to true by default for
    premium processors (pro and above). To enable this feature in your requests,
    specify `events-sse-2025-07-24` as one of the values in `parallel-beta` header
    (for API calls) or `betas` param (for the SDKs).
    """
    mcp_servers: Optional[Iterable[McpServerParam]]
    """
    Optional list of MCP servers to use for the run. To enable this feature in your
    requests, specify `mcp-server-2025-07-17` as one of the values in
    `parallel-beta` header (for API calls) or `betas` param (for the SDKs).
    """
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    """User-provided metadata stored with the run.

    Keys and values must be strings with a maximum length of 16 and 512 characters
    respectively.
    """
    source_policy: Optional[Any]
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    task_spec: Optional[TaskSpecParam]
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
    Not specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    webhook: Optional[WebhookParam]
    """Webhooks for Task Runs."""

# Task run events stream (beta)
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
    type: Literal["task_run.progress_stats"]
    """Event type; always 'task_run.progress_stats'."""

class TaskRunProgressMessageEvent(BaseModel):
    """A message for a task run progress update."""
    message: str
    """Progress update message."""
    timestamp: Optional[str] = None
    """Timestamp of the message."""
    type: Literal[
        "task_run.progress_msg.plan",
        "task_run.progress_msg.search",
        "task_run.progress_msg.result",
        "task_run.progress_msg.tool_call",
        "task_run.progress_msg.exec_status",
    ]
    """Event type; always starts with 'task_run.progress_msg'."""

class ErrorEvent(BaseModel):
    """Event indicating an error."""
    error: ErrorObject
    """Error."""
    type: Literal["error"]
    """Event type; always 'error'."""

# Beta task run result
class OutputBetaTaskRunTextOutput(BaseModel):
    """Output from a task that returns text."""
    basis: List[FieldBasis]
    """Basis for the output.

    To include per-list-element basis entries, send the `parallel-beta` header with
    the value `field-basis-2025-11-25` when creating the run.
    """
    content: str
    """Text output from the task."""
    type: Literal["text"]
    """
    The type of output being returned, as determined by the output schema of the
    task spec.
    """
    beta_fields: Optional[Dict[str, object]] = None
    """Always None."""
    mcp_tool_calls: Optional[List[McpToolCall]] = None
    """MCP tool calls made by the task."""

class OutputBetaTaskRunJsonOutput(BaseModel):
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
    type: Literal["json"]
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

BetaTaskRunResultOutput: TypeAlias = Annotated[Union[OutputBetaTaskRunTextOutput, OutputBetaTaskRunJsonOutput], Any]

class BetaTaskRunResult(BaseModel):
    """Result of a beta task run. Available only if beta headers are specified."""
    output: BetaTaskRunResultOutput
    """Output from the task conforming to the output schema."""
    run: TaskRun
    """Beta task run object with status 'completed'."""

class TaskRunEvent(BaseModel):
    """Event when a task run transitions to a non-active status.

    May indicate completion, cancellation, or failure.
    """
    event_id: Optional[str] = None
    """Cursor to resume the event stream. Always empty for non Task Group runs."""
    run: TaskRun
    """Task run object."""
    type: Literal["task_run.state"]
    """Event type; always 'task_run.state'."""
    input: Optional[BetaRunInput] = None
    """Task run input with additional beta fields."""
    output: Optional[Union[TaskRunTextOutput, TaskRunJsonOutput, None]] = None
    """Output from the run; included only if requested and if status == `completed`."""

TaskRunEventsResponse: TypeAlias = Annotated[
    Union[TaskRunProgressStatsEvent, TaskRunProgressMessageEvent, TaskRunEvent, ErrorEvent],
    Any,
]

# --------------------------------------------------------------------------------------
# Streaming types (SSE)
# --------------------------------------------------------------------------------------

_T = TypeVar("_T")

class Stream(Generic[_T]):
    """Provides the core interface to iterate over a synchronous stream response."""
    response: httpx.Response
    def __iter__(self) -> Iterator[_T]: ...
    def __next__(self) -> _T: ...
    def close(self) -> None: ...
    def __enter__(self) -> Self: ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

class AsyncStream(Generic[_T]):
    """Provides the core interface to iterate over an asynchronous stream response."""
    response: httpx.Response
    def __aiter__(self) -> AsyncIterator[_T]: ...
    async def __anext__(self) -> _T: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> Self: ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

# --------------------------------------------------------------------------------------
# Resources (sync/async) - main surface
# --------------------------------------------------------------------------------------

OutputT = TypeVar("OutputT", bound=pydantic.BaseModel)

class TaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        source_policy: Optional[Any] | Omit = ...,
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

    def execute(self, *, input: Union[str, Dict[str, object]], processor: str, metadata: Any = ..., output: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> Union[TaskRunResult, ParsedTaskRunResult[Any]]:
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
    async def result(self, run_id: str, *, api_timeout: int | Omit = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskRunResult: ...

    @overload
    async def execute(self, *, input: Union[str, Dict[str, object]], processor: str, metadata: Any = ..., output: Optional[OutputSchema] | Omit = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskRunResult: ...
    @overload
    async def execute(self, *, input: Union[str, Dict[str, object]], processor: str, metadata: Any = ..., output: Type[OutputT], extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> ParsedTaskRunResult[OutputT]: ...
    async def execute(self, *, input: Any, processor: Any, metadata: Any = ..., output: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> Union[TaskRunResult, ParsedTaskRunResult[Any]]: ...

# --------------------------------------------------------------------------------------
# Beta resources (search/extract/task_run/task_group/findall)
# --------------------------------------------------------------------------------------

class BetaTaskRunResource:
    def create(self, *, input: Union[str, Dict[str, object]], processor: str, enable_events: Optional[bool] | Omit = ..., mcp_servers: Optional[Iterable[McpServerParam]] | Omit = ..., metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ..., source_policy: Any = ..., task_spec: Optional[TaskSpecParam] | Omit = ..., webhook: Optional[WebhookParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskRun: ...
    def events(self, run_id: str, *, extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> Stream[TaskRunEventsResponse]: ...
    def result(self, run_id: str, *, api_timeout: int | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> BetaTaskRunResult: ...

class AsyncBetaTaskRunResource:
    async def create(self, *, input: Any, processor: Any, enable_events: Any = ..., mcp_servers: Any = ..., metadata: Any = ..., source_policy: Any = ..., task_spec: Any = ..., webhook: Any = ..., betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskRun: ...
    async def events(self, run_id: str, *, extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> AsyncStream[TaskRunEventsResponse]: ...
    async def result(self, run_id: str, *, api_timeout: int | Omit = ..., betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> BetaTaskRunResult: ...

# (TaskGroup / FindAll / Search / Extract types omitted for brevity; key entrypoints below)

class BetaResource:
    def search(self, **kwargs: Any) -> Any: ...
    def extract(self, **kwargs: Any) -> Any: ...
    @property
    def task_run(self) -> BetaTaskRunResource: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

class AsyncBetaResource:
    async def search(self, **kwargs: Any) -> Any: ...
    async def extract(self, **kwargs: Any) -> Any: ...
    @property
    def task_run(self) -> AsyncBetaTaskRunResource: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

# --------------------------------------------------------------------------------------
# Client (Parallel / AsyncParallel) - primary entrypoints
# --------------------------------------------------------------------------------------

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

    @property
    def task_run(self) -> TaskRunResource: ...

    @property
    def beta(self) -> BetaResource: ...

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
    ) -> Self: ...
    with_options: Callable[..., Self]

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

    @property
    def task_run(self) -> AsyncTaskRunResource: ...

    @property
    def beta(self) -> AsyncBetaResource: ...

    def copy(self, **kwargs: Any) -> Self: ...
    with_options: Callable[..., Self]

Client = Parallel
AsyncClient = AsyncParallel

# --------------------------------------------------------------------------------------
# Convenience exports visible from `parallel.__init__`
# --------------------------------------------------------------------------------------

DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits

def file_from_path(path: str) -> Any: ...

# End of footprint
```

---

If you want, I can regenerate this footprint in one of these stricter styles:
1) **“Everything public”**: include *all* `types/beta/*.py` classes and param TypedDicts (huge but complete).  
2) **“Only callable surface”**: just clients/resources/method signatures + key request/response models.  
3) **“LLM-optimized”**: add a short comment block above each resource showing typical usage patterns (without changing docstrings; only adding new comments).