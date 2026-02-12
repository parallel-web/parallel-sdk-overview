Below is a **single** `parallel.pyi` stub that captures the *public footprint* an LLM typically needs to understand how to use the SDK: the top-level exports (`Parallel`, `AsyncParallel`, errors, helpers), the main resources (`task_run`, `beta.*`), and the core request/response models + parameter types (including beta/event stream types).

Notes / constraints:
- A `.pyi` can’t realistically (or usefully) contain every internal helper without becoming enormous; this focuses on the **user-facing API surface**.
- I copied docstrings **1:1 where they were present on the key public methods/models** in the snippets you provided. Many generated model classes do not have docstrings at the class level in all files; where they do, they’re preserved.
- Some internal types (`Stream`, `AsyncStream`, `APIResponse`, etc.) are included because they’re returned from public methods.
- If you want *literally every class/function in every module*, say so and I’ll generate a “complete internal stub” version too (it will be very large).

Save as: `parallel.pyi`

```pyi
# Stub file for the `parallel` package (summarized public footprint).

from __future__ import annotations

import datetime
from datetime import date, datetime as dt_datetime
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
    Protocol,
    Required,
    TypedDict,
    TypeAlias,
)

import httpx
import pydantic


__title__: str
__version__: str


# ----------------------------
# Core sentinel / helper types
# ----------------------------

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
ProxiesTypes: TypeAlias = Union[str, httpx.Proxy, Dict[Union[str, httpx.URL], Union[None, str, httpx.URL, httpx.Proxy]]]
Timeout = httpx.Timeout

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


# -----------
# Exceptions
# -----------

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


# ------------------------
# Base model used by types
# ------------------------

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


# -------------------
# Streaming responses
# -------------------

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


# -------------------
# Raw APIResponse type
# -------------------

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
    @property
    def method(self) -> str: ...
    @property
    def elapsed(self) -> datetime.timedelta: ...
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
    def status_code(self) -> int: ...
    @property
    def url(self) -> httpx.URL: ...
    @property
    def method(self) -> str: ...
    @property
    def elapsed(self) -> datetime.timedelta: ...
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


# ----------------------
# Shared / core TypeDefs
# ----------------------

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

class SourcePolicyParam(TypedDict, total=False):
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    after_date: Annotated[Union[str, date, None], Any]
    exclude_domains: Sequence[str]
    include_domains: Sequence[str]


# ----------------
# Schema objects
# ----------------

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

OutputSchemaParam: TypeAlias = Union[JsonSchemaParam, TextSchemaParam, AutoSchemaParam, str]
InputSchemaParam: TypeAlias = Union[str, JsonSchemaParam, TextSchemaParam]

class TaskSpecParam(TypedDict, total=False):
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`. Not
    specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    output_schema: Required[OutputSchemaParam]
    """JSON schema or text fully describing the desired output from the task.

    Descriptions of output fields will determine the form and content of the
    response. A bare string is equivalent to a text schema with the same
    description.
    """
    input_schema: Optional[InputSchemaParam]


# --------------------
# Task run core models
# --------------------

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

TaskRunOutput: TypeAlias = Annotated[Union[TaskRunTextOutput, TaskRunJsonOutput], Any]

class TaskRunResult(BaseModel):
    """Result of a task run."""
    output: TaskRunOutput
    """Output from the task conforming to the output schema."""
    run: TaskRun
    """Task run object with status 'completed'."""

class TaskRunCreateParams(TypedDict, total=False):
    input: Required[Union[str, Dict[str, object]]]
    """Input to the task, either text or a JSON object."""
    processor: Required[str]
    """Processor to use for the task."""
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    """User-provided metadata stored with the run.

    Keys and values must be strings with a maximum length of 16 and 512 characters
    respectively.
    """
    source_policy: Optional[SourcePolicyParam]
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    task_spec: Optional[TaskSpecParam]
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
    Not specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """

class TaskRunResultParams(TypedDict, total=False):
    api_timeout: Annotated[int, Any]


# -------------------------
# Parsed result convenience
# -------------------------

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


# ----------------------------
# Beta types (search/extract, task groups, events, MCP)
# ----------------------------

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

class FetchPolicyParam(TypedDict, total=False):
    """Policy for live fetching web results."""
    disable_cache_fallback: bool
    """
    If false, fallback to cached content older than max-age if live fetch fails or
    times out. If true, returns an error instead.
    """
    max_age_seconds: Optional[int]
    """Maximum age of cached content in seconds to trigger a live fetch.

    Minimum value 600 seconds (10 minutes).
    """
    timeout_seconds: Optional[float]
    """Timeout in seconds for fetching live content if unavailable in cache."""

class ExcerptSettingsParam(TypedDict, total=False):
    """Optional settings for returning relevant excerpts."""
    max_chars_per_result: Optional[int]
    """Optional upper bound on the total number of characters to include per url.

    Excerpts may contain fewer characters than this limit to maximize relevance and
    token efficiency, but will never contain fewer than 1000 characters per result.
    """
    max_chars_total: Optional[int]
    """
    Optional upper bound on the total number of characters to include across all
    urls. Results may contain fewer characters than this limit to maximize relevance
    and token efficiency, but will never contain fewer than 1000 characters per
    result.This overall limit applies in addition to max_chars_per_result.
    """

class BetaSearchParams(TypedDict, total=False):
    excerpts: ExcerptSettingsParam
    """Optional settings to configure excerpt generation."""
    fetch_policy: Optional[FetchPolicyParam]
    """Policy for live fetching web results."""
    max_chars_per_result: Optional[int]
    """DEPRECATED: Use `excerpts.max_chars_per_result` instead."""
    max_results: Optional[int]
    """Upper bound on the number of results to return.

    May be limited by the processor. Defaults to 10 if not provided.
    """
    mode: Optional[Literal["one-shot", "agentic"]]
    """Presets default values for parameters for different use cases.

    `one-shot` returns more comprehensive results and longer excerpts to answer
    questions from a single response, while `agentic` returns more concise,
    token-efficient results for use in an agentic loop.
    """
    objective: Optional[str]
    """Natural-language description of what the web search is trying to find.

    May include guidance about preferred sources or freshness. At least one of
    objective or search_queries must be provided.
    """
    processor: Optional[Literal["base", "pro"]]
    """DEPRECATED: use `mode` instead."""
    search_queries: Optional[Sequence[str]]
    """Optional list of traditional keyword search queries to guide the search.

    May contain search operators. At least one of objective or search_queries must
    be provided.
    """
    source_policy: Optional[SourcePolicyParam]
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    betas: Annotated[List[ParallelBetaParam], Any]
    """Optional header to specify the beta version(s) to enable."""

# Events

class ErrorEvent(BaseModel):
    """Event indicating an error."""
    error: ErrorObject
    """Error."""
    type: Literal["error"]
    """Event type; always 'error'."""

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

# Beta task run result

class BetaTaskRunTextOutput(BaseModel):
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

BetaTaskRunOutput: TypeAlias = Annotated[Union[BetaTaskRunTextOutput, BetaTaskRunJsonOutput], Any]

class BetaTaskRunResult(BaseModel):
    """Result of a beta task run. Available only if beta headers are specified."""
    output: BetaTaskRunOutput
    """Output from the task conforming to the output schema."""
    run: TaskRun
    """Beta task run object with status 'completed'."""

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

BetaTaskRunEventOutput: TypeAlias = Annotated[Union[TaskRunTextOutput, TaskRunJsonOutput, None], Any]

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
    output: Optional[BetaTaskRunEventOutput] = None
    """Output from the run; included only if requested and if status == `completed`."""

TaskRunEventsResponse: TypeAlias = Annotated[
    Union[TaskRunProgressStatsEvent, TaskRunProgressMessageEvent, TaskRunEvent, ErrorEvent],
    Any,
]

class BetaTaskRunCreateParams(TypedDict, total=False):
    input: Required[Union[str, Dict[str, object]]]
    processor: Required[str]
    enable_events: Optional[bool]
    mcp_servers: Optional[Iterable[McpServerParam]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicyParam]
    task_spec: Optional[TaskSpecParam]
    webhook: Optional[WebhookParam]
    betas: Annotated[List[ParallelBetaParam], Any]

class BetaTaskRunResultParams(TypedDict, total=False):
    api_timeout: Annotated[int, Any]
    betas: Annotated[List[ParallelBetaParam], Any]


# ----------------------------
# Main client classes / entrypoints
# ----------------------------

OutputT = TypeVar("OutputT", bound=pydantic.BaseModel)

class Parallel:
    api_key: str

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | httpx.URL | None = None,
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
    with_options: Any

    @property
    def with_raw_response(self) -> ParallelWithRawResponse: ...
    @property
    def with_streaming_response(self) -> ParallelWithStreamedResponse: ...

class AsyncParallel:
    api_key: str

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | httpx.URL | None = None,
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
    with_options: Any

    @property
    def with_raw_response(self) -> AsyncParallelWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncParallelWithStreamedResponse: ...

Client = Parallel
AsyncClient = AsyncParallel


# ----------------------------
# Resources: task_run (stable)
# ----------------------------

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

    async def result(
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


# -----------------------------
# Resources: beta entry points
# -----------------------------

class BetaResource:
    @property
    def task_run(self) -> BetaTaskRunResource: ...
    @property
    def task_group(self) -> BetaTaskGroupResource: ...
    @property
    def findall(self) -> FindAllResource: ...

    def extract(
        self,
        *,
        urls: Sequence[str],
        excerpts: object | Omit = ...,
        fetch_policy: Optional[FetchPolicyParam] | Omit = ...,
        full_content: object | Omit = ...,
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

    @property
    def with_raw_response(self) -> BetaResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> BetaResourceWithStreamingResponse: ...

class AsyncBetaResource:
    @property
    def task_run(self) -> AsyncBetaTaskRunResource: ...
    @property
    def task_group(self) -> AsyncBetaTaskGroupResource: ...
    @property
    def findall(self) -> AsyncFindAllResource: ...

    async def extract(self, *, urls: Sequence[str], excerpts: object | Omit = ..., fetch_policy: Optional[FetchPolicyParam] | Omit = ..., full_content: object | Omit = ..., objective: Optional[str] | Omit = ..., search_queries: Optional[Sequence[str]] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> ExtractResponse: ...
    async def search(self, *, excerpts: ExcerptSettingsParam | Omit = ..., fetch_policy: Optional[FetchPolicyParam] | Omit = ..., max_chars_per_result: Optional[int] | Omit = ..., max_results: Optional[int] | Omit = ..., mode: Optional[Literal["one-shot", "agentic"]] | Omit = ..., objective: Optional[str] | Omit = ..., processor: Optional[Literal["base", "pro"]] | Omit = ..., search_queries: Optional[Sequence[str]] | Omit = ..., source_policy: Optional[SourcePolicyParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> SearchResult: ...

    @property
    def with_raw_response(self) -> AsyncBetaResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncBetaResourceWithStreamingResponse: ...

class BetaResourceWithRawResponse:
    extract: Any
    search: Any
    @property
    def task_run(self) -> BetaTaskRunResourceWithRawResponse: ...
    @property
    def task_group(self) -> BetaTaskGroupResourceWithRawResponse: ...
    @property
    def findall(self) -> FindAllResourceWithRawResponse: ...

class AsyncBetaResourceWithRawResponse:
    extract: Any
    search: Any
    @property
    def task_run(self) -> AsyncBetaTaskRunResourceWithRawResponse: ...
    @property
    def task_group(self) -> AsyncBetaTaskGroupResourceWithRawResponse: ...
    @property
    def findall(self) -> AsyncFindAllResourceWithRawResponse: ...

class BetaResourceWithStreamingResponse:
    extract: Any
    search: Any
    @property
    def task_run(self) -> BetaTaskRunResourceWithStreamingResponse: ...
    @property
    def task_group(self) -> BetaTaskGroupResourceWithStreamingResponse: ...
    @property
    def findall(self) -> FindAllResourceWithStreamingResponse: ...

class AsyncBetaResourceWithStreamingResponse:
    extract: Any
    search: Any
    @property
    def task_run(self) -> AsyncBetaTaskRunResourceWithStreamingResponse: ...
    @property
    def task_group(self) -> AsyncBetaTaskGroupResourceWithStreamingResponse: ...
    @property
    def findall(self) -> AsyncFindAllResourceWithStreamingResponse: ...


# -----------------------------
# Beta TaskRun resource
# -----------------------------

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

    @property
    def with_raw_response(self) -> BetaTaskRunResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> BetaTaskRunResourceWithStreamingResponse: ...

class AsyncBetaTaskRunResource:
    async def create(self, *, input: Union[str, Dict[str, object]], processor: str, enable_events: Optional[bool] | Omit = ..., mcp_servers: Optional[Iterable[McpServerParam]] | Omit = ..., metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ..., source_policy: Optional[SourcePolicyParam] | Omit = ..., task_spec: Optional[TaskSpecParam] | Omit = ..., webhook: Optional[WebhookParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskRun: ...
    async def events(self, run_id: str, *, extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> AsyncStream[TaskRunEventsResponse]: ...
    async def result(self, run_id: str, *, api_timeout: int | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> BetaTaskRunResult: ...
    @property
    def with_raw_response(self) -> AsyncBetaTaskRunResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncBetaTaskRunResourceWithStreamingResponse: ...

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


# -----------------------------
# Beta TaskGroup resource (API footprint only; models elided for brevity)
# -----------------------------

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

class TaskGroupCreateParams(TypedDict, total=False):
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    """User-provided metadata stored with the task group."""

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

class TaskGroupStatusEvent(BaseModel):
    """Event indicating an update to group status."""
    event_id: str
    """Cursor to resume the event stream."""
    status: TaskGroupStatus
    """Task group status object."""
    type: Literal["task_group_status"]
    """Event type; always 'task_group_status'."""

TaskGroupEventsResponse: TypeAlias = Annotated[Union[TaskGroupStatusEvent, TaskRunEvent, ErrorEvent], Any]
TaskGroupGetRunsResponse: TypeAlias = Annotated[Union[TaskRunEvent, ErrorEvent], Any]

class TaskGroupEventsParams(TypedDict, total=False):
    last_event_id: Optional[str]
    api_timeout: Annotated[Optional[float], Any]

class TaskGroupGetRunsParams(TypedDict, total=False):
    include_input: bool
    include_output: bool
    last_event_id: Optional[str]
    status: Optional[Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]]

class BetaRunInputParam(TypedDict, total=False):
    """Task run input with additional beta fields."""
    input: Required[Union[str, Dict[str, object]]]
    """Input to the task, either text or a JSON object."""
    processor: Required[str]
    """Processor to use for the task."""
    enable_events: Optional[bool]
    mcp_servers: Optional[Iterable[McpServerParam]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicyParam]
    task_spec: Optional[TaskSpecParam]
    webhook: Optional[WebhookParam]

class TaskGroupAddRunsParams(TypedDict, total=False):
    inputs: Required[Iterable[BetaRunInputParam]]
    """List of task runs to execute."""
    default_task_spec: Optional[TaskSpecParam]
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.

    Not specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    betas: Annotated[List[ParallelBetaParam], Any]
    """Optional header to specify the beta version(s) to enable."""

class BetaTaskGroupResource:
    def create(self, *, metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroup: ...
    def retrieve(self, task_group_id: str, *, extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroup: ...
    def add_runs(self, task_group_id: str, *, inputs: Iterable[BetaRunInputParam], default_task_spec: Optional[TaskSpecParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroupRunResponse: ...
    def events(self, task_group_id: str, *, last_event_id: Optional[str] | Omit = ..., api_timeout: Optional[float] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> Stream[TaskGroupEventsResponse]: ...
    def get_runs(self, task_group_id: str, *, include_input: bool | Omit = ..., include_output: bool | Omit = ..., last_event_id: Optional[str] | Omit = ..., status: Optional[Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> Stream[TaskGroupGetRunsResponse]: ...
    @property
    def with_raw_response(self) -> BetaTaskGroupResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> BetaTaskGroupResourceWithStreamingResponse: ...

class AsyncBetaTaskGroupResource:
    async def create(self, *, metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroup: ...
    async def retrieve(self, task_group_id: str, *, extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroup: ...
    async def add_runs(self, task_group_id: str, *, inputs: Iterable[BetaRunInputParam], default_task_spec: Optional[TaskSpecParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroupRunResponse: ...
    async def events(self, task_group_id: str, *, last_event_id: Optional[str] | Omit = ..., api_timeout: Optional[float] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> AsyncStream[TaskGroupEventsResponse]: ...
    async def get_runs(self, task_group_id: str, *, include_input: bool | Omit = ..., include_output: bool | Omit = ..., last_event_id: Optional[str] | Omit = ..., status: Optional[Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> AsyncStream[TaskGroupGetRunsResponse]: ...
    @property
    def with_raw_response(self) -> AsyncBetaTaskGroupResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncBetaTaskGroupResourceWithStreamingResponse: ...

class BetaTaskGroupResourceWithRawResponse: ...
class AsyncBetaTaskGroupResourceWithRawResponse: ...
class BetaTaskGroupResourceWithStreamingResponse: ...
class AsyncBetaTaskGroupResourceWithStreamingResponse: ...


# -----------------------------
# FindAll (beta) — API footprint only
# -----------------------------

class FindAllRun(BaseModel):
    """FindAll run object with status and metadata."""
    findall_id: str
    """ID of the FindAll run."""
    generator: Literal["base", "core", "pro", "preview"]
    """Generator for the FindAll run."""
    status: Any
    """Status object for the FindAll run."""
    created_at: Optional[str] = None
    """Timestamp of the creation of the run, in RFC 3339 format."""
    metadata: Optional[Dict[str, Union[str, float, bool]]] = None
    """Metadata for the FindAll run."""
    modified_at: Optional[str] = None
    """
    Timestamp of the latest modification to the FindAll run result, in RFC 3339
    format.
    """

class FindAllSchema(BaseModel):
    """Response model for FindAll ingest."""
    entity_type: str
    """Type of the entity for the FindAll run."""
    match_conditions: List[Any]
    """List of match conditions for the FindAll run."""
    objective: str
    """Natural language objective of the FindAll run."""
    enrichments: Optional[List[Any]] = None
    """List of enrichment inputs for the FindAll run."""
    generator: Optional[Literal["base", "core", "pro", "preview"]] = None
    """The generator of the FindAll run."""
    match_limit: Optional[int] = None
    """Max number of candidates to evaluate"""

class FindAllRunResult(BaseModel):
    """Complete FindAll search results."""
    candidates: List[Any]
    run: FindAllRun
    last_event_id: Optional[str] = None

FindAllEventsResponse: TypeAlias = Annotated[Union[Any, ErrorEvent], Any]

class FindAllResource:
    def create(self, *, entity_type: str, generator: Literal["base","core","pro","preview"], match_conditions: Iterable[Mapping[str, object]], match_limit: int, objective: str, exclude_list: Optional[Iterable[Mapping[str, object]]] | Omit = ..., metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ..., webhook: Optional[WebhookParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllRun: ...
    def retrieve(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllRun: ...
    def cancel(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> object: ...
    def enrich(self, findall_id: str, *, output_schema: JsonSchemaParam, mcp_servers: Optional[Iterable[McpServerParam]] | Omit = ..., processor: str | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...
    def events(self, findall_id: str, *, last_event_id: Optional[str] | Omit = ..., api_timeout: Optional[float] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> Stream[FindAllEventsResponse]: ...
    def extend(self, findall_id: str, *, additional_match_limit: int, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...
    def ingest(self, *, objective: str, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...
    def result(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllRunResult: ...
    def schema(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...
    @property
    def with_raw_response(self) -> FindAllResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> FindAllResourceWithStreamingResponse: ...

class AsyncFindAllResource:
    async def create(self, *, entity_type: str, generator: Literal["base","core","pro","preview"], match_conditions: Iterable[Mapping[str, object]], match_limit: int, objective: str, exclude_list: Optional[Iterable[Mapping[str, object]]] | Omit = ..., metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ..., webhook: Optional[WebhookParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllRun: ...
    async def retrieve(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllRun: ...
    async def cancel(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> object: ...
    async def enrich(self, findall_id: str, *, output_schema: JsonSchemaParam, mcp_servers: Optional[Iterable[McpServerParam]] | Omit = ..., processor: str | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...
    async def events(self, findall_id: str, *, last_event_id: Optional[str] | Omit = ..., api_timeout: Optional[float] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> AsyncStream[FindAllEventsResponse]: ...
    async def extend(self, findall_id: str, *, additional_match_limit: int, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...
    async def ingest(self, *, objective: str, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...
    async def result(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllRunResult: ...
    async def schema(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...
    @property
    def with_raw_response(self) -> AsyncFindAllResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncFindAllResourceWithStreamingResponse: ...

class FindAllResourceWithRawResponse: ...
class AsyncFindAllResourceWithRawResponse: ...
class FindAllResourceWithStreamingResponse: ...
class AsyncFindAllResourceWithStreamingResponse: ...


# ----------------------------
# Top-level “with raw response”
# ----------------------------

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


# ----------------------------
# Misc exported helpers
# ----------------------------

DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits

class DefaultHttpxClient(httpx.Client): ...
class DefaultAsyncHttpxClient(httpx.AsyncClient): ...
class DefaultAioHttpClient(httpx.AsyncClient): ...

def file_from_path(path: str) -> object: ...


# ----------------------------
# `parallel.types` namespace (lightweight)
# ----------------------------

class types:
    Warning = Warning
    ErrorObject = ErrorObject
    ErrorResponse = ErrorResponse
    SourcePolicy = SourcePolicy

    Citation = Citation
    FieldBasis = FieldBasis

    TaskRun = TaskRun
    TaskSpec = TaskSpec
    TaskRunResult = TaskRunResult
    ParsedTaskRunResult = ParsedTaskRunResult

    TaskRunCreateParams = TaskRunCreateParams
    TaskRunResultParams = TaskRunResultParams

    # Beta types
    ParallelBetaParam = ParallelBetaParam
    SearchResult = SearchResult
    ExtractResponse = ExtractResponse
    TaskRunEventsResponse = TaskRunEventsResponse
```

If you want this stub to be **more “module-faithful”** (e.g., separate `parallel.types.beta.*` namespaces, include all TypedDict param shapes for FindAll, include discriminated unions exactly as generated with `PropertyInfo(discriminator="type")`, include `resources` proxy module, etc.), tell me:
1) whether you want **only public surface** (recommended) or **everything including internal `_utils`, `_base_client`, `_response`**, and  
2) whether to keep **beta features** fully expanded (FindAll candidate/event models are sizeable).