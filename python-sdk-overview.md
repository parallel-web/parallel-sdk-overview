Yes — but I can’t faithfully do the “copy doc-comments 1:1” requirement from what you’ve pasted, because most of the package’s public surface (and many docstrings) live in files you *didn’t include in the snippet* (notably: a big chunk of `parallel/resources/*` and `parallel/types/*` aren’t fully shown; and several “File generated …” headers are comments, not docstrings). A correct single-file `.pyi` needs the actual source for every exported symbol, including signatures and docstrings, otherwise I’d be inventing or omitting details.

What I *can* do right now:
- Provide a **single consolidated `parallel.pyi`** that captures the API footprint visible from the tree and the excerpts you included, and that keeps any docstrings that are present in those excerpts **verbatim**.
- If you want it to be complete and exact, you can either (a) paste the remaining key files’ contents, or (b) point me at the repo / upload an archive; then I’ll regenerate an exact `.pyi`.

Below is a **single-file `parallel.pyi`** you can drop next to the package (or use as an LLM “API map”). It focuses on the *public import surface* (`parallel.__init__`, the client/resources, and `parallel.types` / `parallel.types.beta` / `shared`), plus the commonly used request params and response models. Where a docstring exists in your excerpts, I copied it 1:1.

> Note: `.pyi` files can contain docstrings (triple-quoted strings) and type checkers generally ignore them, but they’re useful for LLMs.

---

```pyi
# parallel.pyi
# Consolidated API footprint summary for the `parallel` Python SDK.
# Generated manually from provided source excerpts.

from __future__ import annotations

from datetime import date, datetime
from typing import (
    Any,
    AsyncIterator,
    Awaitable,
    Callable,
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
    TypeAlias,
    TypedDict,
)

import httpx
import pydantic

# -------------------------
# Version metadata
# -------------------------

__title__: str
__version__: str


# -------------------------
# Sentinels / helper types
# -------------------------

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

# Workaround to allow passing `None` to cast_to.
NoneType: Type[None]

Timeout: TypeAlias = Union[float, httpx.Timeout]
Transport: TypeAlias = httpx.BaseTransport
ProxiesTypes: TypeAlias = Union[str, httpx.Proxy, Dict[Union[str, httpx.URL], Union[None, str, httpx.URL, httpx.Proxy]]]

Headers: TypeAlias = Mapping[str, Union[str, Omit]]
Query: TypeAlias = Mapping[str, object]
Body: TypeAlias = object

class RequestOptions(TypedDict, total=False):
    headers: Headers
    max_retries: int
    timeout: float | httpx.Timeout | None
    params: Query
    extra_json: Mapping[str, object]
    idempotency_key: str
    follow_redirects: bool


# -------------------------
# Exceptions
# -------------------------

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


# -------------------------
# BaseModel used by all models in this SDK
# -------------------------

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


# -------------------------
# Streaming (SSE)
# -------------------------

_T = TypeVar("_T")

class Stream(Iterator[_T]):
    response: httpx.Response
    def __iter__(self) -> Iterator[_T]: ...
    def close(self) -> None: ...
    def __enter__(self) -> "Stream[_T]": ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: object | None) -> None: ...

class AsyncStream(AsyncIterator[_T]):
    response: httpx.Response
    def __aiter__(self) -> AsyncIterator[_T]: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> "AsyncStream[_T]": ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: object | None) -> None: ...


# -------------------------
# Raw APIResponse wrappers (used by with_raw_response / with_streaming_response)
# -------------------------

R = TypeVar("R")

class APIResponse(Generic[R]):
    http_response: httpx.Response
    retries_taken: int
    def parse(self, *, to: Type[_T] | None = None) -> Union[R, _T]: ...
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
    async def parse(self, *, to: Type[_T] | None = None) -> Union[R, _T]: ...
    async def read(self) -> bytes: ...
    async def text(self) -> str: ...
    async def json(self) -> object: ...
    async def close(self) -> None: ...
    async def iter_bytes(self, chunk_size: int | None = None) -> AsyncIterator[bytes]: ...
    async def iter_text(self, chunk_size: int | None = None) -> AsyncIterator[str]: ...
    async def iter_lines(self) -> AsyncIterator[str]: ...


# -------------------------
# Types (public models)
# -------------------------

# Shared models

class ErrorObject(BaseModel):
    """An error message."""
    message: str
    """Human-readable message."""
    ref_id: str
    """Reference ID for the error."""
    detail: Optional[Dict[str, object]] = ...

class ErrorResponse(BaseModel):
    """Response object used for non-200 status codes."""
    error: ErrorObject
    """Error."""
    type: Literal["error"]
    """Always 'error'."""

class Warning(BaseModel):
    """Human-readable message for a task."""
    message: str
    """Human-readable message."""
    type: Literal["spec_validation_warning", "input_validation_warning", "warning"]
    """Type of warning.

    Note that adding new warning types is considered a backward-compatible change.
    """
    detail: Optional[Dict[str, object]] = ...
    """Optional detail supporting the warning."""

class SourcePolicy(BaseModel):
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    after_date: Optional[date] = ...
    """Optional start date for filtering search results.

    Results will be limited to content published on or after this date. Provided as
    an RFC 3339 date string (YYYY-MM-DD).
    """
    exclude_domains: Optional[List[str]] = ...
    """List of domains to exclude from results.

    If specified, sources from these domains will be excluded. Accepts plain domains
    (e.g., example.com, subdomain.example.gov) or bare domain extension starting
    with a period (e.g., .gov, .edu, .co.uk).
    """
    include_domains: Optional[List[str]] = ...
    """List of domains to restrict the results to.

    If specified, only sources from these domains will be included. Accepts plain
    domains (e.g., example.com, subdomain.example.gov) or bare domain extension
    starting with a period (e.g., .gov, .edu, .co.uk).
    """

# Schemas

class AutoSchema(BaseModel):
    """Auto schema for a task input or output."""
    type: Optional[Literal["auto"]] = ...
    """The type of schema being defined. Always `auto`."""

class TextSchema(BaseModel):
    """Text description for a task input or output."""
    description: Optional[str] = ...
    """A text description of the desired output from the task."""
    type: Optional[Literal["text"]] = ...
    """The type of schema being defined. Always `text`."""

class JsonSchema(BaseModel):
    """JSON schema for a task input or output."""
    json_schema: Dict[str, object]
    """A JSON Schema object. Only a subset of JSON Schema is supported."""
    type: Optional[Literal["json"]] = ...
    """The type of schema being defined. Always `json`."""

# Output / citations

class Citation(BaseModel):
    """A citation for a task output."""
    url: str
    """URL of the citation."""
    excerpts: Optional[List[str]] = ...
    """Excerpts from the citation supporting the output.

    Only certain processors provide excerpts.
    """
    title: Optional[str] = ...
    """Title of the citation."""

class FieldBasis(BaseModel):
    """Citations and reasoning supporting one field of a task output."""
    field: str
    """Name of the output field."""
    reasoning: str
    """Reasoning for the output field."""
    citations: Optional[List[Citation]] = ...
    """List of citations supporting the output field."""
    confidence: Optional[str] = ...
    """Confidence level for the output field.

    Only certain processors provide confidence levels.
    """

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
    beta_fields: Optional[Dict[str, object]] = ...
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
    beta_fields: Optional[Dict[str, object]] = ...
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
    output_schema: Optional[Dict[str, object]] = ...
    """Output schema for the Task Run.

    Populated only if the task was executed with an auto schema.
    """

# TaskSpec / TaskRun / TaskRunResult

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
    input_schema: Optional[InputSchema] = ...
    """Optional JSON schema or text description of expected input to the task.

    A bare string is equivalent to a text schema with the same description.
    """

class TaskRun(BaseModel):
    """Status of a task run."""
    created_at: Optional[str] = ...
    """Timestamp of the creation of the task, as an RFC 3339 string."""
    is_active: bool
    """Whether the run is currently active, i.e.

    status is one of {'cancelling', 'queued', 'running'}.
    """
    modified_at: Optional[str] = ...
    """Timestamp of the last modification to the task, as an RFC 3339 string."""
    processor: str
    """Processor used for the run."""
    run_id: str
    """ID of the task run."""
    status: Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]
    """Status of the run."""
    error: Optional[ErrorObject] = ...
    """An error message."""
    metadata: Optional[Dict[str, Union[str, float, bool]]] = ...
    """User-provided metadata stored with the run."""
    task_group_id: Optional[str] = ...
    """ID of the taskgroup to which the run belongs."""
    warnings: Optional[List[Warning]] = ...
    """Warnings for the run, if any."""

TaskRunResultOutput: TypeAlias = Annotated[Union[TaskRunTextOutput, TaskRunJsonOutput], object]

class TaskRunResult(BaseModel):
    """Result of a task run."""
    output: Union[TaskRunTextOutput, TaskRunJsonOutput]
    """Output from the task conforming to the output schema."""
    run: TaskRun
    """Task run object with status 'completed'."""


# Parsed result generics (for pydantic response parsing)
ContentType = TypeVar("ContentType", bound=pydantic.BaseModel)

class ParsedTaskRunTextOutput(TaskRunTextOutput, Generic[ContentType]):
    parsed: None
    """The parsed output from the task run."""

class ParsedTaskRunJsonOutput(TaskRunJsonOutput, Generic[ContentType]):
    parsed: Optional[ContentType] = ...
    """The parsed output from the task run."""

class ParsedTaskRunResult(TaskRunResult, Generic[ContentType]):
    output: Union[ParsedTaskRunTextOutput[ContentType], ParsedTaskRunJsonOutput[ContentType]]
    """The parsed output from the task run."""


# -------------------------
# Params (TypedDicts) for main API
# -------------------------

class SourcePolicyParam(TypedDict, total=False):
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    after_date: Annotated[Union[str, date, None], object]
    exclude_domains: Sequence[str]
    include_domains: Sequence[str]

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
    task_spec: Optional["TaskSpecParam"]
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
    Not specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """

class TaskRunResultParams(TypedDict, total=False):
    api_timeout: Annotated[int, object]  # alias "timeout" in runtime code


# TaskSpecParam / schema params

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

OutputSchemaParam: TypeAlias = Union[JsonSchemaParam, TextSchemaParam, AutoSchemaParam, str]
InputSchemaParam: TypeAlias = Union[str, JsonSchemaParam, TextSchemaParam]

OutputT = TypeVar("OutputT", bound=pydantic.BaseModel)

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


# -------------------------
# Beta types (subset shown in your excerpts)
# -------------------------

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
    excerpts: Optional[List[str]] = ...
    """Relevant excerpted content from the URL, formatted as markdown."""
    publish_date: Optional[str] = ...
    """Publish date of the webpage in YYYY-MM-DD format, if available."""
    title: Optional[str] = ...
    """Title of the webpage, if available."""

class SearchResult(BaseModel):
    """Output for the Search API."""
    results: List[WebSearchResult]
    """A list of WebSearchResult objects, ordered by decreasing relevance."""
    search_id: str
    """Search ID. Example: `search_cad0a6d2dec046bd95ae900527d880e7`"""
    usage: Optional[List[UsageItem]] = ...
    """Usage metrics for the search request."""
    warnings: Optional[List[Warning]] = ...
    """Warnings for the search request, if any."""

class ExtractError(BaseModel):
    """Extract error details."""
    content: Optional[str] = ...
    """Content returned for http client or server errors, if any."""
    error_type: str
    """Error type."""
    http_status_code: Optional[int] = ...
    """HTTP status code, if available."""
    url: str

class ExtractResult(BaseModel):
    """Extract result for a single URL."""
    url: str
    """URL associated with the search result."""
    excerpts: Optional[List[str]] = ...
    """Relevant excerpted content from the URL, formatted as markdown."""
    full_content: Optional[str] = ...
    """Full content from the URL formatted as markdown, if requested."""
    publish_date: Optional[str] = ...
    """Publish date of the webpage in YYYY-MM-DD format, if available."""
    title: Optional[str] = ...
    """Title of the webpage, if available."""

class ExtractResponse(BaseModel):
    """Fetch result."""
    errors: List[ExtractError]
    """Extract errors: requested URLs not in the results."""
    extract_id: str
    """Extract request ID, e.g. `extract_cad0a6d2dec046bd95ae900527d880e7`"""
    results: List[ExtractResult]
    """Successful extract results."""
    usage: Optional[List[UsageItem]] = ...
    """Usage metrics for the extract request."""
    warnings: Optional[List[Warning]] = ...
    """Warnings for the extract request, if any."""

class Webhook(BaseModel):
    """Webhooks for Task Runs."""
    url: str
    """URL for the webhook."""
    event_types: Optional[List[Literal["task_run.status"]]] = ...
    """Event types to send the webhook notifications for."""

class WebhookParam(TypedDict, total=False):
    """Webhooks for Task Runs."""
    url: str
    """URL for the webhook."""
    event_types: List[Literal["task_run.status"]]
    """Event types to send the webhook notifications for."""

class McpServer(BaseModel):
    """MCP server configuration."""
    name: str
    """Name of the MCP server."""
    url: str
    """URL of the MCP server."""
    allowed_tools: Optional[List[str]] = ...
    """List of allowed tools for the MCP server."""
    headers: Optional[Dict[str, str]] = ...
    """Headers for the MCP server."""
    type: Optional[Literal["url"]] = ...
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
    content: Optional[str] = ...
    """Output received from the tool call, if successful."""
    error: Optional[str] = ...
    """Error message if the tool call failed."""


# -------------------------
# Client + resources
# -------------------------

class Parallel:
    """
    Synchronous Parallel client.
    """
    api_key: str

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

    @property
    def task_run(self) -> "TaskRunResource": ...
    @property
    def beta(self) -> "BetaResource": ...

    @property
    def with_raw_response(self) -> "ParallelWithRawResponse": ...
    @property
    def with_streaming_response(self) -> "ParallelWithStreamingResponse": ...

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
    ) -> "Parallel": ...

    with_options: Callable[..., "Parallel"]

class AsyncParallel:
    """
    Asynchronous Parallel client.
    """
    api_key: str

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

    @property
    def task_run(self) -> "AsyncTaskRunResource": ...
    @property
    def beta(self) -> "AsyncBetaResource": ...

    @property
    def with_raw_response(self) -> "AsyncParallelWithRawResponse": ...
    @property
    def with_streaming_response(self) -> "AsyncParallelWithStreamingResponse": ...

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
    ) -> "AsyncParallel": ...

    with_options: Callable[..., "AsyncParallel"]

Client = Parallel
AsyncClient = AsyncParallel


# -------- Core (non-beta) TaskRun resource --------

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
    ) -> TaskRun: ...

    def retrieve(
        self,
        run_id: str,
        *,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskRun: ...

    def result(
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


# -------- Beta resource (search/extract + beta task_run/task_group/findall) --------

class BetaResource:
    @property
    def task_run(self) -> "BetaTaskRunResource": ...
    @property
    def task_group(self) -> "TaskGroupResource": ...
    @property
    def findall(self) -> "FindAllResource": ...

    def search(
        self,
        *,
        excerpts: object | Omit = ...,
        fetch_policy: object | Omit = ...,
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

    def extract(
        self,
        *,
        urls: Sequence[str],
        betas: List[ParallelBetaParam],
        excerpts: object | Omit = ...,
        fetch_policy: object | Omit = ...,
        full_content: object | Omit = ...,
        objective: Optional[str] | Omit = ...,
        search_queries: Optional[Sequence[str]] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ExtractResponse: ...

class AsyncBetaResource:
    @property
    def task_run(self) -> "AsyncBetaTaskRunResource": ...
    @property
    def task_group(self) -> "AsyncTaskGroupResource": ...
    @property
    def findall(self) -> "AsyncFindAllResource": ...

    async def search(self, *, excerpts: object | Omit = ..., fetch_policy: object | Omit = ..., max_chars_per_result: Optional[int] | Omit = ..., max_results: Optional[int] | Omit = ..., mode: Optional[Literal["one-shot", "agentic"]] | Omit = ..., objective: Optional[str] | Omit = ..., processor: Optional[Literal["base", "pro"]] | Omit = ..., search_queries: Optional[Sequence[str]] | Omit = ..., source_policy: Optional[SourcePolicyParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> SearchResult: ...
    async def extract(self, *, urls: Sequence[str], betas: List[ParallelBetaParam], excerpts: object | Omit = ..., fetch_policy: object | Omit = ..., full_content: object | Omit = ..., objective: Optional[str] | Omit = ..., search_queries: Optional[Sequence[str]] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> ExtractResponse: ...


# -------------------------
# with_raw_response / with_streaming_response wrappers (high level)
# -------------------------

class ParallelWithRawResponse:
    @property
    def task_run(self) -> "TaskRunResourceWithRawResponse": ...
    @property
    def beta(self) -> "BetaResourceWithRawResponse": ...

class AsyncParallelWithRawResponse:
    @property
    def task_run(self) -> "AsyncTaskRunResourceWithRawResponse": ...
    @property
    def beta(self) -> "AsyncBetaResourceWithRawResponse": ...

class ParallelWithStreamingResponse:
    @property
    def task_run(self) -> "TaskRunResourceWithStreamingResponse": ...
    @property
    def beta(self) -> "BetaResourceWithStreamingResponse": ...

class AsyncParallelWithStreamingResponse:
    @property
    def task_run(self) -> "AsyncTaskRunResourceWithStreamingResponse": ...
    @property
    def beta(self) -> "AsyncBetaResourceWithStreamingResponse": ...


# These wrapper resource classes return APIResponse/AsyncAPIResponse context managers in runtime;
# in this condensed .pyi we expose them as returning APIResponse objects directly.

class TaskRunResourceWithRawResponse:
    def create(self, **kwargs: Any) -> APIResponse[TaskRun]: ...
    def retrieve(self, **kwargs: Any) -> APIResponse[TaskRun]: ...
    def result(self, **kwargs: Any) -> APIResponse[TaskRunResult]: ...

class AsyncTaskRunResourceWithRawResponse:
    async def create(self, **kwargs: Any) -> AsyncAPIResponse[TaskRun]: ...
    async def retrieve(self, **kwargs: Any) -> AsyncAPIResponse[TaskRun]: ...
    async def result(self, **kwargs: Any) -> AsyncAPIResponse[TaskRunResult]: ...

class TaskRunResourceWithStreamingResponse:
    def create(self, **kwargs: Any) -> APIResponse[TaskRun]: ...
    def retrieve(self, **kwargs: Any) -> APIResponse[TaskRun]: ...
    def result(self, **kwargs: Any) -> APIResponse[TaskRunResult]: ...

class AsyncTaskRunResourceWithStreamingResponse:
    async def create(self, **kwargs: Any) -> AsyncAPIResponse[TaskRun]: ...
    async def retrieve(self, **kwargs: Any) -> AsyncAPIResponse[TaskRun]: ...
    async def result(self, **kwargs: Any) -> AsyncAPIResponse[TaskRunResult]: ...

class BetaResourceWithRawResponse:
    def search(self, **kwargs: Any) -> APIResponse[SearchResult]: ...
    def extract(self, **kwargs: Any) -> APIResponse[ExtractResponse]: ...

class AsyncBetaResourceWithRawResponse:
    async def search(self, **kwargs: Any) -> AsyncAPIResponse[SearchResult]: ...
    async def extract(self, **kwargs: Any) -> AsyncAPIResponse[ExtractResponse]: ...

class BetaResourceWithStreamingResponse:
    def search(self, **kwargs: Any) -> APIResponse[SearchResult]: ...
    def extract(self, **kwargs: Any) -> APIResponse[ExtractResponse]: ...

class AsyncBetaResourceWithStreamingResponse:
    async def search(self, **kwargs: Any) -> AsyncAPIResponse[SearchResult]: ...
    async def extract(self, **kwargs: Any) -> AsyncAPIResponse[ExtractResponse]: ...


# -------------------------
# Lightweight "types" module re-export surface
# -------------------------

# For LLM navigation: users commonly do `from parallel import types`
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

    class beta:
        Webhook = Webhook
        McpServer = McpServer
        UsageItem = UsageItem
        McpToolCall = McpToolCall
        SearchResult = SearchResult
        ExtractResponse = ExtractResponse
        WebSearchResult = WebSearchResult
        ExtractResult = ExtractResult
        ExtractError = ExtractError
        ParallelBetaParam = ParallelBetaParam


# -------------------------
# Resources proxy (parallel.resources)
# -------------------------

# runtime exposes a lazy proxy at `parallel.resources` when not type-checking.
class resources:
    ...
```

---

### To make this **complete and exact**
Send me either:
1) The full contents of these files (minimum set):
- `src/parallel/__init__.py`
- `src/parallel/_client.py`
- `src/parallel/resources/task_run.py`
- `src/parallel/resources/beta/beta.py`
- `src/parallel/resources/beta/task_run.py`
- `src/parallel/resources/beta/task_group.py`
- `src/parallel/resources/beta/findall.py`
- `src/parallel/types/__init__.py`
- `src/parallel/types/*.py` (all)
- `src/parallel/types/beta/*.py` (all)
- `src/parallel/types/shared/*.py` and `shared_params/*.py`

or

2) A zip/tarball of `src/parallel` (best).

Then I’ll regenerate a single `.pyi` that:
- includes **every** publicly importable symbol,
- includes docstrings **verbatim 1:1** wherever they appear,
- matches the real signatures precisely (including overloads, streaming context managers, aliases, deprecated names, etc.).