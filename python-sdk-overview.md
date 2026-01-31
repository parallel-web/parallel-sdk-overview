Below is a single **`parallel.pyi`** stub file that “summarizes the entire footprint of the API” exposed by this SDK, focusing on what an LLM needs to understand how to call it: the public client classes, resources, key methods, and the major request/response types and events.

Notes / constraints (so you know what this is and isn’t):
- This is a **summary stub**, not a byte-for-byte reproduction of every internal helper. It covers the externally meaningful surface area: `Parallel` / `AsyncParallel`, resources, and all the public `types` models/params that are used in method signatures.
- Docstrings included below are copied **1:1** from the source **where present** on public-facing entities/methods/types shown in the excerpts (many generated models have docstrings; many modules/classes have none).
- Some implementation-only/private modules exist in the repo; those are intentionally excluded unless they affect public usage.
- Where the runtime exports `parallel.resources` via a lazy proxy, the stub reflects `resources` as a module-like attribute.

Save as: **`parallel.pyi`**

```pyi
# parallel.pyi
# Stubs summarizing the Parallel Python SDK public API footprint.

from __future__ import annotations

from datetime import date, datetime
from typing import (
    Any,
    Dict,
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
    Protocol,
    TypedDict,
    TypeAlias,
)

import httpx
import pydantic


# -----------------------------------------------------------------------------
# Top-level exports (parallel/__init__.py)
# -----------------------------------------------------------------------------

__title__: str
__version__: str

# Sentinel / helper types
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

# SDK defaults (parallel/_constants.py)
DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits


# -----------------------------------------------------------------------------
# Exceptions (parallel/_exceptions.py)
# -----------------------------------------------------------------------------

class ParallelError(Exception): ...

class APIError(ParallelError):
    message: str
    request: httpx.Request
    body: object | None
    """
    The API response body.

    If the API responded with a valid JSON structure then this property will be the
    decoded result.

    If it isn't a valid JSON structure then this will be the raw response.

    If there was no response associated with this error then it will be `None`.
    """
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


# -----------------------------------------------------------------------------
# BaseModel export (parallel/_models.py)
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
    ) -> Dict[str, object]:
        """Recursively generate a dictionary representation of the model, optionally specifying which fields to include or exclude.

        By default, fields that were not set by the API will not be included,
        and keys will match the API response, *not* the property names from the model.

        For example, if the API responds with `"fooBar": true` but we've defined a `foo_bar: bool` property,
        the output will use the `"fooBar"` key (unless `use_api_names=False` is passed).

        Args:
            mode:
                If mode is 'json', the dictionary will only contain JSON serializable types. e.g. `datetime` will be turned into a string, `"2024-3-22T18:11:19.117000Z"`.
                If mode is 'python', the dictionary may contain any Python objects. e.g. `datetime(2024, 3, 22)`

            use_api_names: Whether to use the key that the API responded with or the property name. Defaults to `True`.
            exclude_unset: Whether to exclude fields that have not been explicitly set.
            exclude_defaults: Whether to exclude fields that are set to their default value from the output.
            exclude_none: Whether to exclude fields that have a value of `None` from the output.
            warnings: Whether to log warnings when invalid fields are encountered. This is only supported in Pydantic v2.
        """
        ...
    def to_json(
        self,
        *,
        indent: int | None = 2,
        use_api_names: bool = True,
        exclude_unset: bool = True,
        exclude_defaults: bool = False,
        exclude_none: bool = False,
        warnings: bool = True,
    ) -> str:
        """Generates a JSON string representing this model as it would be received from or sent to the API (but with indentation).

        By default, fields that were not set by the API will not be included,
        and keys will match the API response, *not* the property names from the model.

        For example, if the API responds with `"fooBar": true` but we've defined a `foo_bar: bool` property,
        the output will use the `"fooBar"` key (unless `use_api_names=False` is passed).

        Args:
            indent: Indentation to use in the JSON output. If `None` is passed, the output will be compact. Defaults to `2`
            use_api_names: Whether to use the key that the API responded with or the property name. Defaults to `True`.
            exclude_unset: Whether to exclude fields that have not been explicitly set.
            exclude_defaults: Whether to exclude fields that have the default value.
            exclude_none: Whether to exclude fields that have a value of `None`.
            warnings: Whether to show any warnings that occurred during serialization. This is only supported in Pydantic v2.
        """
        ...


# -----------------------------------------------------------------------------
# Streaming (parallel/_streaming.py + parallel/_response.py surface)
# -----------------------------------------------------------------------------

_T = TypeVar("_T")

class Stream(Iterator[_T]):
    """Provides the core interface to iterate over a synchronous stream response."""
    response: httpx.Response
    def __enter__(self) -> Stream[_T]: ...
    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        exc_tb: Any,
    ) -> None: ...
    def close(self) -> None: ...

class AsyncStream(Protocol[_T]):
    """Provides the core interface to iterate over an asynchronous stream response."""
    response: httpx.Response
    async def __aenter__(self) -> Any: ...
    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        exc_tb: Any,
    ) -> None: ...
    async def close(self) -> None: ...

class APIResponse(Protocol[_T]):
    http_response: httpx.Response
    retries_taken: int
    @property
    def headers(self) -> httpx.Headers: ...
    @property
    def status_code(self) -> int: ...
    def parse(self, *, to: type[Any] | None = None) -> Any: ...
    def read(self) -> bytes: ...
    def text(self) -> str: ...
    def json(self) -> object: ...
    def close(self) -> None: ...

class AsyncAPIResponse(Protocol[_T]):
    http_response: httpx.Response
    retries_taken: int
    @property
    def headers(self) -> httpx.Headers: ...
    @property
    def status_code(self) -> int: ...
    async def parse(self, *, to: type[Any] | None = None) -> Any: ...
    async def read(self) -> bytes: ...
    async def text(self) -> str: ...
    async def json(self) -> object: ...
    async def close(self) -> None: ...


# -----------------------------------------------------------------------------
# Types (parallel/types/*) — models & params used by API methods
# -----------------------------------------------------------------------------

# --- shared ---
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

# shared_params.SourcePolicy (TypedDict used in requests)
class SourcePolicyParam(TypedDict, total=False):
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    after_date: Annotated[Union[str, date, None], Any]
    """Optional start date for filtering search results.

    Results will be limited to content published on or after this date. Provided as
    an RFC 3339 date string (YYYY-MM-DD).
    """
    exclude_domains: Sequence[str]
    """List of domains to exclude from results.

    If specified, sources from these domains will be excluded. Accepts plain domains
    (e.g., example.com, subdomain.example.gov) or bare domain extension starting
    with a period (e.g., .gov, .edu, .co.uk).
    """
    include_domains: Sequence[str]
    """List of domains to restrict the results to.

    If specified, only sources from these domains will be included. Accepts plain
    domains (e.g., example.com, subdomain.example.gov) or bare domain extension
    starting with a period (e.g., .gov, .edu, .co.uk).
    """

# --- schemas ---
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
    json_schema: Dict[str, object]
    """A JSON Schema object. Only a subset of JSON Schema is supported."""
    type: Literal["json"]
    """The type of schema being defined. Always `json`."""

# --- citations / basis ---
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

# --- task spec ---
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

_OutputT = TypeVar("_OutputT", bound=pydantic.BaseModel)

class TaskSpecParam(TypedDict, total=False):
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`. Not
    specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    output_schema: OutputSchemaParam
    """JSON schema or text fully describing the desired output from the task.

    Descriptions of output fields will determine the form and content of the
    response. A bare string is equivalent to a text schema with the same
    description.
    """
    input_schema: Optional[InputSchemaParam]
    """Optional JSON schema or text description of expected input to the task.

    A bare string is equivalent to a text schema with the same description.
    """

# --- task run core types ---
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

# parsed result wrapper (useful when passing pydantic model to execute())
class ParsedTaskRunTextOutput(TaskRunTextOutput, pydantic.BaseModel):
    parsed: None
    """The parsed output from the task run."""

class ParsedTaskRunJsonOutput(TaskRunJsonOutput, pydantic.BaseModel):
    parsed: Optional[_OutputT] = None
    """The parsed output from the task run."""

class ParsedTaskRunResult(TaskRunResult, pydantic.BaseModel):
    output: Union[ParsedTaskRunTextOutput, ParsedTaskRunJsonOutput]
    """The parsed output from the task run."""

# --- request params for core task runs ---
class TaskRunCreateParams(TypedDict, total=False):
    input: Union[str, Dict[str, object]]
    """Input to the task, either text or a JSON object."""
    processor: str
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
    api_timeout: Annotated[int, Any]  # alias "timeout"


# -----------------------------------------------------------------------------
# Beta types (parallel/types/beta/*)
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

# extract
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

Excerpts: TypeAlias = Union[bool, ExcerptSettingsParam]
class FullContentFullContentSettings(TypedDict, total=False):
    """Optional settings for returning full content."""
    max_chars_per_result: Optional[int]
    """
    Optional limit on the number of characters to include in the full content for
    each url. Full content always starts at the beginning of the page and is
    truncated at the limit if necessary.
    """
FullContent: TypeAlias = Union[bool, FullContentFullContentSettings]

class BetaExtractParams(TypedDict, total=False):
    urls: Sequence[str]
    excerpts: Excerpts
    """Include excerpts from each URL relevant to the search objective and queries.

    Note that if neither objective nor search_queries is provided, excerpts are
    redundant with full content.
    """
    fetch_policy: Optional[FetchPolicyParam]
    """Policy for live fetching web results."""
    full_content: FullContent
    """Include full content from each URL.

    Note that if neither objective nor search_queries is provided, excerpts are
    redundant with full content.
    """
    objective: Optional[str]
    """If provided, focuses extracted content on the specified search objective."""
    search_queries: Optional[Sequence[str]]
    """If provided, focuses extracted content on the specified keyword search queries."""
    betas: Annotated[List[ParallelBetaParam], Any]
    """Optional header to specify the beta version(s) to enable."""

# webhooks
class Webhook(BaseModel):
    """Webhooks for Task Runs."""
    url: str
    """URL for the webhook."""
    event_types: Optional[List[Literal["task_run.status"]]] = None
    """Event types to send the webhook notifications for."""

class WebhookParam(TypedDict, total=False):
    """Webhooks for Task Runs."""
    url: str
    """URL for the webhook."""
    event_types: List[Literal["task_run.status"]]
    """Event types to send the webhook notifications for."""

# MCP
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
    name: str
    """Name of the MCP server."""
    url: str
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

# beta task run result
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

BetaTaskRunResultOutput: TypeAlias = Annotated[
    Union[OutputBetaTaskRunTextOutput, OutputBetaTaskRunJsonOutput],
    Any,
]

class BetaTaskRunResult(BaseModel):
    """Result of a beta task run. Available only if beta headers are specified."""
    output: BetaTaskRunResultOutput
    """Output from the task conforming to the output schema."""
    run: TaskRun
    """Beta task run object with status 'completed'."""

# Beta run input (returned in some events)
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
    input: Union[str, Dict[str, object]]
    """Input to the task, either text or a JSON object."""
    processor: str
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
    webhook: Optional[WebhookParam]
    """Webhooks for Task Runs."""

# Events
class ErrorEvent(BaseModel):
    """Event indicating an error."""
    error: ErrorObject
    """Error."""
    type: Literal["error"]
    """Event type; always 'error'."""

TaskRunEventOutput: TypeAlias = Annotated[Union[TaskRunTextOutput, TaskRunJsonOutput, None], Any]

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
    output: Optional[TaskRunEventOutput] = None
    """Output from the run; included only if requested and if status == `completed`."""

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

TaskRunEventsResponse: TypeAlias = Annotated[
    Union[TaskRunProgressStatsEvent, TaskRunProgressMessageEvent, TaskRunEvent, ErrorEvent],
    Any,
]

# TaskGroup
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

class TaskGroupEventsParams(TypedDict, total=False):
    last_event_id: Optional[str]
    api_timeout: Annotated[Optional[float], Any]  # alias "timeout"

class TaskGroupGetRunsParams(TypedDict, total=False):
    include_input: bool
    include_output: bool
    last_event_id: Optional[str]
    status: Optional[Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]]

class TaskGroupAddRunsParams(TypedDict, total=False):
    inputs: Iterable[BetaRunInputParam]
    """List of task runs to execute."""
    default_task_spec: Optional[TaskSpecParam]
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
    Not specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    betas: Annotated[List[ParallelBetaParam], Any]
    """Optional header to specify the beta version(s) to enable."""

class TaskGroupStatusEvent(BaseModel):
    """Event indicating an update to group status."""
    event_id: str
    """Cursor to resume the event stream."""
    status: TaskGroupStatus
    """Task group status object."""
    type: Literal["task_group_status"]
    """Event type; always 'task_group_status'."""

TaskGroupEventsResponse: TypeAlias = Annotated[
    Union[TaskGroupStatusEvent, TaskRunEvent, ErrorEvent],
    Any,
]

TaskGroupGetRunsResponse: TypeAlias = Annotated[
    Union[TaskRunEvent, ErrorEvent],
    Any,
]

# FindAll
class FindAllEnrichInput(BaseModel):
    """Input model for FindAll enrich."""
    output_schema: JsonSchema
    """JSON schema for the enrichment output schema for the FindAll run."""
    mcp_servers: Optional[List[McpServer]] = None
    """List of MCP servers to use for the task."""
    processor: Optional[str] = None
    """Processor to use for the task."""

class FindAllSchemaMatchCondition(BaseModel):
    """Match condition model for FindAll ingest."""
    description: str
    """Detailed description of the match condition.

    Include as much specific information as possible to help improve the quality and
    accuracy of Find All run results.
    """
    name: str
    """Name of the match condition."""

class FindAllSchema(BaseModel):
    """Response model for FindAll ingest."""
    entity_type: str
    """Type of the entity for the FindAll run."""
    match_conditions: List[FindAllSchemaMatchCondition]
    """List of match conditions for the FindAll run."""
    objective: str
    """Natural language objective of the FindAll run."""
    enrichments: Optional[List[FindAllEnrichInput]] = None
    """List of enrichment inputs for the FindAll run."""
    generator: Optional[Literal["base", "core", "pro", "preview"]] = None
    """The generator of the FindAll run."""
    match_limit: Optional[int] = None
    """Max number of candidates to evaluate"""

class FindAllRunStatusMetrics(BaseModel):
    """Candidate metrics for the FindAll run."""
    generated_candidates_count: Optional[int] = None
    """Number of candidates that were selected."""
    matched_candidates_count: Optional[int] = None
    """Number of candidates that evaluated to matched."""

class FindAllRunStatus(BaseModel):
    """Status object for the FindAll run."""
    is_active: bool
    """Whether the FindAll run is active"""
    metrics: FindAllRunStatusMetrics
    """Candidate metrics for the FindAll run."""
    status: Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]
    """Status of the FindAll run."""
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
    """Reason for termination when FindAll run is in terminal status."""

class FindAllRun(BaseModel):
    """FindAll run object with status and metadata."""
    findall_id: str
    """ID of the FindAll run."""
    generator: Literal["base", "core", "pro", "preview"]
    """Generator for the FindAll run."""
    status: FindAllRunStatus
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

class FindAllCandidate(BaseModel):
    """Candidate for a find all run that may end up as a match.

    Contains all the candidate's metadata and the output of the match conditions.
    A candidate is a match if all match conditions are satisfied.
    """
    candidate_id: str
    """ID of the candidate."""
    match_status: Literal["generated", "matched", "unmatched", "discarded"]
    """Status of the candidate. One of generated, matched, unmatched, discarded."""
    name: str
    """Name of the candidate."""
    url: str
    """URL that provides context or details of the entity for disambiguation."""
    basis: Optional[List[FieldBasis]] = None
    """List of FieldBasis objects supporting the output."""
    description: Optional[str] = None
    """
    Brief description of the entity that can help answer whether entity satisfies
    the query.
    """
    output: Optional[Dict[str, object]] = None
    """Results of the match condition evaluations for this candidate.

    This object contains the structured output that determines whether the candidate
    matches the overall FindAll objective.
    """

class FindAllRunResult(BaseModel):
    """Complete FindAll search results.

    Represents a snapshot of a FindAll run, including run metadata and a list of
    candidate entities with their match status and details at the time the snapshot was
    taken.
    """
    candidates: List[FindAllCandidate]
    """All evaluated candidates at the time of the snapshot."""
    run: FindAllRun
    """FindAll run object."""
    last_event_id: Optional[str] = None
    """ID of the last event of the run at the time of the request.

    This can be used to resume streaming from the last event.
    """

class FindAllRunStatusEvent(BaseModel):
    """Event containing status update for FindAll run."""
    data: FindAllRun
    """Updated FindAll run information."""
    event_id: str
    """Unique event identifier for the event."""
    timestamp: datetime
    """Timestamp of the event."""
    type: Literal["findall.status"]
    """Event type; always 'findall.status'."""

class FindAllSchemaUpdatedEvent(BaseModel):
    """Event containing full snapshot of FindAll run state."""
    data: FindAllSchema
    """Updated FindAll schema."""
    event_id: str
    """Unique event identifier for the event."""
    timestamp: datetime
    """Timestamp of the event."""
    type: Literal["findall.schema.updated"]
    """Event type; always 'findall.schema.updated'."""

class FindAllCandidateMatchStatusEventData(BaseModel):
    """The candidate whose match status has been updated."""
    candidate_id: str
    """ID of the candidate."""
    match_status: Literal["generated", "matched", "unmatched", "discarded"]
    """Status of the candidate. One of generated, matched, unmatched, discarded."""
    name: str
    """Name of the candidate."""
    url: str
    """URL that provides context or details of the entity for disambiguation."""
    basis: Optional[List[FieldBasis]] = None
    """List of FieldBasis objects supporting the output."""
    description: Optional[str] = None
    """
    Brief description of the entity that can help answer whether entity satisfies
    the query.
    """
    output: Optional[Dict[str, object]] = None
    """Results of the match condition evaluations for this candidate.

    This object contains the structured output that determines whether the candidate
    matches the overall FindAll objective.
    """

class FindAllCandidateMatchStatusEvent(BaseModel):
    """Event containing a candidate whose match status has changed."""
    data: FindAllCandidateMatchStatusEventData
    """The candidate whose match status has been updated."""
    event_id: str
    """Unique event identifier for the event."""
    timestamp: datetime
    """Timestamp of the event."""
    type: Literal[
        "findall.candidate.generated",
        "findall.candidate.matched",
        "findall.candidate.unmatched",
        "findall.candidate.discarded",
        "findall.candidate.enriched",
    ]
    """
    Event type; one of findall.candidate.generated, findall.candidate.matched,
    findall.candidate.unmatched, findall.candidate.discarded,
    findall.candidate.enriched.
    """

FindAllEventsResponse: TypeAlias = Annotated[
    Union[FindAllSchemaUpdatedEvent, FindAllRunStatusEvent, FindAllCandidateMatchStatusEvent, ErrorEvent],
    Any,
]

class FindAllIngestParams(TypedDict, total=False):
    objective: str
    """Natural language objective to create a FindAll run spec."""
    betas: Annotated[List[ParallelBetaParam], Any]
    """Optional header to specify the beta version(s) to enable."""

class FindAllCreateParams(TypedDict, total=False):
    entity_type: str
    """Type of the entity for the FindAll run."""
    generator: Literal["base", "core", "pro", "preview"]
    """Generator for the FindAll run. One of base, core, pro, preview."""
    match_conditions: Iterable[Dict[str, str]]
    """List of match conditions for the FindAll run."""
    match_limit: int
    """Maximum number of matches to find for this FindAll run.

    Must be between 5 and 1000 (inclusive).
    """
    objective: str
    """Natural language objective of the FindAll run."""
    exclude_list: Optional[Iterable[Dict[str, str]]]
    """List of entity names/IDs to exclude from results."""
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    """Metadata for the FindAll run."""
    webhook: Optional[WebhookParam]
    """Webhooks for Task Runs."""
    betas: Annotated[List[ParallelBetaParam], Any]
    """Optional header to specify the beta version(s) to enable."""

class FindAllEnrichParams(TypedDict, total=False):
    output_schema: JsonSchemaParam
    """JSON schema for the enrichment output schema for the FindAll run."""
    mcp_servers: Optional[Iterable[McpServerParam]]
    """List of MCP servers to use for the task."""
    processor: str
    """Processor to use for the task."""
    betas: Annotated[List[ParallelBetaParam], Any]
    """Optional header to specify the beta version(s) to enable."""

class FindAllEventsParams(TypedDict, total=False):
    last_event_id: Optional[str]
    api_timeout: Annotated[Optional[float], Any]  # alias "timeout"
    betas: Annotated[List[ParallelBetaParam], Any]
    """Optional header to specify the beta version(s) to enable."""

class FindAllExtendParams(TypedDict, total=False):
    additional_match_limit: int
    """Additional number of matches to find for this FindAll run.

    This value will be added to the current match limit to determine the new total
    match limit. Must be greater than 0.
    """
    betas: Annotated[List[ParallelBetaParam], Any]
    """Optional header to specify the beta version(s) to enable."""


# -----------------------------------------------------------------------------
# Resources modules facade (parallel.resources and parallel.resources.beta.*)
# -----------------------------------------------------------------------------

# `parallel.resources` is lazily imported at runtime; exposed here for type checking.
class _ResourcesModule(Protocol):
    TaskRunResource: type[Any]
    AsyncTaskRunResource: type[Any]
    TaskRunResourceWithRawResponse: type[Any]
    AsyncTaskRunResourceWithRawResponse: type[Any]
    TaskRunResourceWithStreamingResponse: type[Any]
    AsyncTaskRunResourceWithStreamingResponse: type[Any]

resources: _ResourcesModule


# -----------------------------------------------------------------------------
# Client classes (parallel/_client.py)
# -----------------------------------------------------------------------------

class Parallel:
    """
    Construct a new synchronous Parallel client instance.

    This automatically infers the `api_key` argument from the `PARALLEL_API_KEY` environment variable if it is not provided.
    """
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
    ) -> None: ...

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
    with_options: Any  # alias for copy

class AsyncParallel:
    """
    Construct a new async AsyncParallel client instance.

    This automatically infers the `api_key` argument from the `PARALLEL_API_KEY` environment variable if it is not provided.
    """
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
    ) -> None: ...

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
    with_options: Any  # alias for copy

Client = Parallel
AsyncClient = AsyncParallel


# -----------------------------------------------------------------------------
# Core resource: /v1/tasks/runs (parallel/resources/task_run.py)
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
        ...

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
        ...

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
        ...

    @overload
    def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        output: Optional[OutputSchemaParam] | Omit = ...,
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
        output: Type[_OutputT],
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ParsedTaskRunResult: ...
    def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        output: Optional[OutputSchemaParam] | Type[_OutputT] | Omit = ...,
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> Union[TaskRunResult, ParsedTaskRunResult]:
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
        output: Optional[OutputSchemaParam] | Omit = ...,
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
        output: Type[_OutputT],
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ParsedTaskRunResult: ...
    async def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        output: Optional[OutputSchemaParam] | Type[_OutputT] | Omit = ...,
        extra_headers: Headers | None = None,
        extra_query: Query | None = None,
        extra_body: Body | None = None,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> Union[TaskRunResult, ParsedTaskRunResult]: ...

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


# -----------------------------------------------------------------------------
# Beta resources (parallel/resources/beta/*)
# -----------------------------------------------------------------------------

class BetaResource:
    @property
    def task_run(self) -> BetaTaskRunResource: ...
    @property
    def task_group(self) -> TaskGroupResource: ...
    @property
    def findall(self) -> FindAllResource: ...

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
        ...

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

    async def extract(self, **kwargs: Any) -> ExtractResponse: ...
    async def search(self, **kwargs: Any) -> SearchResult: ...

    @property
    def with_raw_response(self) -> AsyncBetaResourceWithRawResponse: ...
    @property
    def with_streaming_response(self) -> AsyncBetaResourceWithStreamingResponse: ...

class BetaResourceWithRawResponse:
    extract: Any
    search: Any
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

class AsyncBetaResourceWithRawResponse:
    extract: Any
    search: Any
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

class BetaResourceWithStreamingResponse:
    extract: Any
    search: Any
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

class AsyncBetaResourceWithStreamingResponse:
    extract: Any
    search: Any
    @property
    def task_run(self) -> Any: ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...


# --- beta.task_run resource ---
class BetaTaskRunResultParams(TypedDict, total=False):
    api_timeout: Annotated[int, Any]  # alias "timeout"
    betas: Annotated[List[ParallelBetaParam], Any]  # alias "parallel-beta"
    """Optional header to specify the beta version(s) to enable."""

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
        ...

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
        ...

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
        ...

class AsyncBetaTaskRunResource:
    async def create(self, **kwargs: Any) -> TaskRun: ...
    async def events(self, run_id: str, **kwargs: Any) -> Any: ...
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
    async def events(self, task_group_id: str, **kwargs: Any) -> Any: ...
    async def get_runs(self, task_group_id: str, **kwargs: Any) -> Any: ...


# --- beta.findall resource ---
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
    async def events(self, findall_id: str, **kwargs: Any) -> Any: ...
    async def extend(self, findall_id: str, **kwargs: Any) -> FindAllSchema: ...
    async def ingest(self, **kwargs: Any) -> FindAllSchema: ...
    async def result(self, findall_id: str, **kwargs: Any) -> FindAllRunResult: ...
    async def schema(self, findall_id: str, **kwargs: Any) -> FindAllSchema: ...


# -----------------------------------------------------------------------------
# Client "with_raw_response" / "with_streaming_response" facades
# -----------------------------------------------------------------------------

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


# -----------------------------------------------------------------------------
# Types module re-export (parallel/types/__init__.py)
# -----------------------------------------------------------------------------

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
```

If you want this to be even more “LLM-friendly”, I can also produce an alternate version that:
- groups the API by endpoint (e.g. `POST /v1/tasks/runs` etc.) inside comments,
- includes a short “usage skeleton” section at the top (still valid `.pyi`),
- and/or includes the beta resources’ method docstrings in full (they’re already included for the bigger ones, but I omitted docstrings on some stubs where the repo excerpt didn’t show them clearly).