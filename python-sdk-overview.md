Below is a **single “footprint” stub file** (one `.pyi`) that captures the **public surface area** of this SDK as exposed from `parallel/__init__.py`, plus the **primary resource APIs** (`task_run`, `beta.*`) and the **key public types** that a caller will interact with.

Notes / scope decisions (so the LLM sees “how to use it”):
- This is a **summary** of the callable API: `Parallel` / `AsyncParallel`, their resources, and the core request/response models and params.
- I’ve included **docstrings copied 1:1** where present on the public resource methods (notably the long docstrings on `resources/task_run.py`, `resources/beta/*.py`).
- Many internal modules (`_utils`, `_base_client`, etc.) are not included unless they appear in the public import footprint.
- For model fields, I keep the structural shape and key types (not every internal alias), so an LLM sees what objects contain.
- Where the code uses `typing_extensions.Annotated`/`PropertyInfo` alias transformations, that’s runtime serialization detail; the stub focuses on the user-facing names.

Save this as something like `parallel_api_footprint.pyi`.

```pyi
# parallel_api_footprint.pyi
# A single-file summary of the public API footprint for the `parallel` SDK.

from __future__ import annotations

from datetime import date, datetime
from typing import (
    Any,
    Callable,
    Coroutine,
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

import httpx
from typing_extensions import (
    Annotated,
    Literal,
    Protocol,
    TypedDict,
    TypeAlias,
)

# ---------------------------------------------------------------------------
# Version / package exports
# ---------------------------------------------------------------------------

__title__: str
__version__: str

# ---------------------------------------------------------------------------
# Sentinels / common types exported at package root
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

def file_from_path(path: str) -> Any: ...

# ---------------------------------------------------------------------------
# Exceptions exported at package root
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
# Base models (pydantic-based)
# ---------------------------------------------------------------------------

class BaseModel:
    # pydantic model; runtime supports .to_dict()/.to_json()
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
# Types namespace export
# ---------------------------------------------------------------------------

# The real package exposes `parallel.types` as a module; in this single-file stub
# we include the key user-facing models below and also provide a "types" alias.
class _TypesModule(Protocol):
    # shared
    Warning: Type["Warning"]
    ErrorObject: Type["ErrorObject"]
    ErrorResponse: Type["ErrorResponse"]
    SourcePolicy: Type["SourcePolicy"]

    # main
    TaskRun: Type["TaskRun"]
    TaskSpec: Type["TaskSpec"]
    TaskRunResult: Type["TaskRunResult"]
    ParsedTaskRunResult: Type["ParsedTaskRunResult[Any]"]

    TaskRunCreateParams: Type["TaskRunCreateParams"]
    TaskRunResultParams: Type["TaskRunResultParams"]

    # beta
    beta: Any

types: _TypesModule

# ---------------------------------------------------------------------------
# Core shared models / params
# ---------------------------------------------------------------------------

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
    after_date: Union[str, date, None]
    exclude_domains: Sequence[str]
    include_domains: Sequence[str]

# ---------------------------------------------------------------------------
# Task spec / schemas
# ---------------------------------------------------------------------------

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
    json_schema: Dict[str, object]
    type: Literal["json"]

OutputSchema: TypeAlias = Union[JsonSchema, TextSchema, AutoSchema, str]
InputSchema: TypeAlias = Union[str, JsonSchema, TextSchema, None]

OutputSchemaParam: TypeAlias = Union[JsonSchemaParam, TextSchemaParam, AutoSchemaParam, str]
InputSchemaParam: TypeAlias = Union[str, JsonSchemaParam, TextSchemaParam]

class TaskSpec(BaseModel):
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`. Not
    specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    output_schema: OutputSchema
    input_schema: Optional[InputSchema] = None

class TaskSpecParam(TypedDict, total=False):
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`. Not
    specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    output_schema: OutputSchemaParam
    input_schema: Optional[InputSchemaParam]

# ---------------------------------------------------------------------------
# Task run models / outputs
# ---------------------------------------------------------------------------

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
    task_group_id: Optional[str] = None
    warnings: Optional[List[Warning]] = None

class TaskRunTextOutput(BaseModel):
    """Output from a task that returns text."""
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
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
    content: Dict[str, object]
    type: Literal["json"]
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
    run: TaskRun

# ---------------------------------------------------------------------------
# Parsed result helper (generic)
# ---------------------------------------------------------------------------

_PydanticModelT = TypeVar("_PydanticModelT", bound=Any)

class ParsedTaskRunTextOutput(TaskRunTextOutput):
    parsed: None
    """The parsed output from the task run."""

class ParsedTaskRunJsonOutput(TaskRunJsonOutput):
    parsed: Optional[_PydanticModelT] = None
    """The parsed output from the task run."""

class ParsedTaskRunResult(TaskRunResult, Generic[_PydanticModelT]):
    output: Union[ParsedTaskRunTextOutput, ParsedTaskRunJsonOutput]
    """The parsed output from the task run."""

# ---------------------------------------------------------------------------
# Request params (non-beta)
# ---------------------------------------------------------------------------

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
    api_timeout: int  # alias="timeout" at runtime

# ---------------------------------------------------------------------------
# Streaming
# ---------------------------------------------------------------------------

_TStreamChunk = TypeVar("_TStreamChunk")

class Stream(Iterator[_TStreamChunk]):
    response: httpx.Response
    def __enter__(self) -> "Stream[_TStreamChunk]": ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...
    def close(self) -> None: ...

class AsyncStream(Protocol[_TStreamChunk]):
    response: httpx.Response
    async def __aenter__(self) -> "AsyncStream[_TStreamChunk]": ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...
    async def close(self) -> None: ...
    def __aiter__(self) -> Any: ...

# ---------------------------------------------------------------------------
# APIResponse exports
# ---------------------------------------------------------------------------

_R = TypeVar("_R")

class APIResponse(Generic[_R]):
    http_response: httpx.Response
    retries_taken: int
    @property
    def headers(self) -> httpx.Headers: ...
    @property
    def status_code(self) -> int: ...
    def parse(self, *, to: Type[Any] | None = None) -> Any: ...
    def read(self) -> bytes: ...
    def text(self) -> str: ...
    def json(self) -> object: ...
    def close(self) -> None: ...

class AsyncAPIResponse(Generic[_R]):
    http_response: httpx.Response
    retries_taken: int
    @property
    def headers(self) -> httpx.Headers: ...
    @property
    def status_code(self) -> int: ...
    async def parse(self, *, to: Type[Any] | None = None) -> Any: ...
    async def read(self) -> bytes: ...
    async def text(self) -> str: ...
    async def json(self) -> object: ...
    async def close(self) -> None: ...

# ---------------------------------------------------------------------------
# Resources: non-beta TaskRun
# ---------------------------------------------------------------------------

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
        output: Optional[OutputSchemaParam] | Omit = ...,
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
        output: Type[_PydanticModelT],
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ParsedTaskRunResult[_PydanticModelT]: ...
    def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        output: Optional[OutputSchemaParam] | Type[_PydanticModelT] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> Union[TaskRunResult, ParsedTaskRunResult[_PydanticModelT]]:
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
        output: Optional[OutputSchemaParam] | Omit = ...,
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
        output: Type[_PydanticModelT],
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ParsedTaskRunResult[_PydanticModelT]: ...
    async def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        output: Optional[OutputSchemaParam] | Type[_PydanticModelT] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> Union[TaskRunResult, ParsedTaskRunResult[_PydanticModelT]]: ...

# ---------------------------------------------------------------------------
# Beta types (feature flags, search/extract, task groups, findall)
# ---------------------------------------------------------------------------

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

class FetchPolicyParam(TypedDict, total=False):
    """Policy for live fetching web results."""
    disable_cache_fallback: bool
    max_age_seconds: Optional[int]
    timeout_seconds: Optional[float]

class ExcerptSettingsParam(TypedDict, total=False):
    """Optional settings for returning relevant excerpts."""
    max_chars_per_result: Optional[int]
    max_chars_total: Optional[int]

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
    betas: List[ParallelBetaParam]

class BetaExtractParams(TypedDict, total=False):
    urls: Sequence[str]
    betas: List[ParallelBetaParam]
    excerpts: Union[bool, ExcerptSettingsParam]
    fetch_policy: Optional[FetchPolicyParam]
    full_content: Union[bool, TypedDict("FullContentFullContentSettings", {"max_chars_per_result": Optional[int]}, total=False)]
    objective: Optional[str]
    search_queries: Optional[Sequence[str]]

# ---- Beta TaskRun extras (MCP servers, events, webhook) ----

class Webhook(BaseModel):
    """Webhooks for Task Runs."""
    url: str
    event_types: Optional[List[Literal["task_run.status"]]] = None

class WebhookParam(TypedDict, total=False):
    """Webhooks for Task Runs."""
    url: str
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
    name: str
    url: str
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
    input: Union[str, Dict[str, object]]
    processor: str
    enable_events: Optional[bool]
    mcp_servers: Optional[Iterable[McpServerParam]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicyParam]
    task_spec: Optional[TaskSpecParam]
    webhook: Optional[WebhookParam]

class BetaTaskRunTextOutput(BaseModel):
    basis: List[FieldBasis]
    content: str
    type: Literal["text"]
    beta_fields: Optional[Dict[str, object]] = None
    """Always None."""
    mcp_tool_calls: Optional[List[McpToolCall]] = None
    """MCP tool calls made by the task."""

class BetaTaskRunJsonOutput(BaseModel):
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: Literal["json"]
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
    run: TaskRun

# ---- Beta events streaming ----

class ErrorEvent(BaseModel):
    """Event indicating an error."""
    error: ErrorObject
    type: Literal["error"]

class TaskRunEvent(BaseModel):
    """Event when a task run transitions to a non-active status.

    May indicate completion, cancellation, or failure.
    """
    event_id: Optional[str] = None
    run: TaskRun
    type: Literal["task_run.state"]
    input: Optional[BetaRunInput] = None
    output: Optional[Union[TaskRunTextOutput, TaskRunJsonOutput, None]] = None

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

TaskRunEventsResponse: TypeAlias = Annotated[
    Union[TaskRunProgressStatsEvent, TaskRunProgressMessageEvent, TaskRunEvent, ErrorEvent],
    Any,
]

# ---- Beta task groups ----

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
    task_group_id: str
    metadata: Optional[Dict[str, Union[str, float, bool]]] = None

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

TaskGroupEventsResponse: TypeAlias = Annotated[Union[TaskGroupStatusEvent, TaskRunEvent, ErrorEvent], Any]
TaskGroupGetRunsResponse: TypeAlias = Annotated[Union[TaskRunEvent, ErrorEvent], Any]

class TaskGroupCreateParams(TypedDict, total=False):
    metadata: Optional[Dict[str, Union[str, float, bool]]]

class TaskGroupAddRunsParams(TypedDict, total=False):
    inputs: Iterable[BetaRunInputParam]
    default_task_spec: Optional[TaskSpecParam]
    betas: List[ParallelBetaParam]

class TaskGroupEventsParams(TypedDict, total=False):
    last_event_id: Optional[str]
    api_timeout: Optional[float]
    betas: List[ParallelBetaParam]

class TaskGroupGetRunsParams(TypedDict, total=False):
    include_input: bool
    include_output: bool
    last_event_id: Optional[str]
    status: Optional[Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]]

# ---- FindAll beta ----

class FindAllSchema(BaseModel):
    """Response model for FindAll ingest."""
    entity_type: str
    objective: str
    match_conditions: List[Any]
    enrichments: Optional[List[Any]] = None
    generator: Optional[Literal["base", "core", "pro", "preview"]] = None
    match_limit: Optional[int] = None

class FindAllRun(BaseModel):
    """FindAll run object with status and metadata."""
    findall_id: str
    generator: Literal["base", "core", "pro", "preview"]
    status: Any
    created_at: Optional[str] = None
    metadata: Optional[Dict[str, Union[str, float, bool]]] = None
    modified_at: Optional[str] = None

class FindAllRunResult(BaseModel):
    """Complete FindAll search results.

    Represents a snapshot of a FindAll run, including run metadata and a list of
    candidate entities with their match status and details at the time the snapshot was
    taken.
    """
    candidates: List[Any]
    run: FindAllRun
    last_event_id: Optional[str] = None

FindAllEventsResponse: TypeAlias = Annotated[Union[Any, ErrorEvent], Any]

class FindAllCreateParams(TypedDict, total=False):
    entity_type: str
    generator: Literal["base", "core", "pro", "preview"]
    match_conditions: Iterable[Dict[str, object]]
    match_limit: int
    objective: str
    exclude_list: Optional[Iterable[Dict[str, object]]]
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    webhook: Optional[WebhookParam]
    betas: List[ParallelBetaParam]

class FindAllIngestParams(TypedDict, total=False):
    objective: str
    betas: List[ParallelBetaParam]

class FindAllEnrichParams(TypedDict, total=False):
    output_schema: JsonSchemaParam
    mcp_servers: Optional[Iterable[McpServerParam]]
    processor: str
    betas: List[ParallelBetaParam]

class FindAllExtendParams(TypedDict, total=False):
    additional_match_limit: int
    betas: List[ParallelBetaParam]

class FindAllEventsParams(TypedDict, total=False):
    last_event_id: Optional[str]
    api_timeout: Optional[float]
    betas: List[ParallelBetaParam]

# ---------------------------------------------------------------------------
# Beta resources
# ---------------------------------------------------------------------------

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

class AsyncBetaTaskRunResource:
    async def create(self, *, input: Union[str, Dict[str, object]], processor: str, enable_events: Optional[bool] | Omit = ..., mcp_servers: Optional[Iterable[McpServerParam]] | Omit = ..., metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ..., source_policy: Optional[SourcePolicyParam] | Omit = ..., task_spec: Optional[TaskSpecParam] | Omit = ..., webhook: Optional[WebhookParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskRun: ...
    async def events(self, run_id: str, *, extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> AsyncStream[TaskRunEventsResponse]: ...
    async def result(self, run_id: str, *, api_timeout: int | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> BetaTaskRunResult: ...

class BetaTaskGroupResource:
    def create(
        self,
        *,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> TaskGroup:
        """
        Initiates a TaskGroup to group and track multiple runs.

        Args:
          metadata: User-provided metadata stored with the task group.

          extra_headers: Send extra headers

          extra_query: Add additional query parameters to the request

          extra_body: Add additional JSON properties to the request

          timeout: Override the client-level default timeout for this request, in seconds
        """

    def retrieve(self, task_group_id: str, *, extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroup: ...
    def add_runs(self, task_group_id: str, *, inputs: Iterable[BetaRunInputParam], default_task_spec: Optional[TaskSpecParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroupRunResponse: ...
    def events(self, task_group_id: str, *, last_event_id: Optional[str] | Omit = ..., api_timeout: Optional[float] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> Stream[TaskGroupEventsResponse]: ...
    def get_runs(self, task_group_id: str, *, include_input: bool | Omit = ..., include_output: bool | Omit = ..., last_event_id: Optional[str] | Omit = ..., status: Optional[Literal["queued","action_required","running","completed","failed","cancelling","cancelled"]] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> Stream[TaskGroupGetRunsResponse]: ...

class AsyncBetaTaskGroupResource:
    async def create(self, *, metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroup: ...
    async def retrieve(self, task_group_id: str, *, extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroup: ...
    async def add_runs(self, task_group_id: str, *, inputs: Iterable[BetaRunInputParam], default_task_spec: Optional[TaskSpecParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> TaskGroupRunResponse: ...
    async def events(self, task_group_id: str, *, last_event_id: Optional[str] | Omit = ..., api_timeout: Optional[float] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> AsyncStream[TaskGroupEventsResponse]: ...
    async def get_runs(self, task_group_id: str, *, include_input: bool | Omit = ..., include_output: bool | Omit = ..., last_event_id: Optional[str] | Omit = ..., status: Optional[Literal["queued","action_required","running","completed","failed","cancelling","cancelled"]] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> AsyncStream[TaskGroupGetRunsResponse]: ...

class FindAllResource:
    def create(self, *, entity_type: str, generator: Literal["base","core","pro","preview"], match_conditions: Iterable[Dict[str, object]], match_limit: int, objective: str, exclude_list: Optional[Iterable[Dict[str, object]]] | Omit = ..., metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ..., webhook: Optional[WebhookParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllRun: ...
    def retrieve(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllRun: ...
    def cancel(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> object: ...
    def enrich(self, findall_id: str, *, output_schema: JsonSchemaParam, mcp_servers: Optional[Iterable[McpServerParam]] | Omit = ..., processor: str | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...
    def events(self, findall_id: str, *, last_event_id: Optional[str] | Omit = ..., api_timeout: Optional[float] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> Stream[FindAllEventsResponse]: ...
    def extend(self, findall_id: str, *, additional_match_limit: int, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...
    def ingest(self, *, objective: str, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...
    def result(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllRunResult: ...
    def schema(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...

class AsyncFindAllResource:
    async def create(self, *, entity_type: str, generator: Literal["base","core","pro","preview"], match_conditions: Iterable[Dict[str, object]], match_limit: int, objective: str, exclude_list: Optional[Iterable[Dict[str, object]]] | Omit = ..., metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ..., webhook: Optional[WebhookParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllRun: ...
    async def retrieve(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllRun: ...
    async def cancel(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> object: ...
    async def enrich(self, findall_id: str, *, output_schema: JsonSchemaParam, mcp_servers: Optional[Iterable[McpServerParam]] | Omit = ..., processor: str | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...
    async def events(self, findall_id: str, *, last_event_id: Optional[str] | Omit = ..., api_timeout: Optional[float] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> AsyncStream[FindAllEventsResponse]: ...
    async def extend(self, findall_id: str, *, additional_match_limit: int, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...
    async def ingest(self, *, objective: str, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...
    async def result(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllRunResult: ...
    async def schema(self, findall_id: str, *, betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> FindAllSchema: ...

class BetaResource:
    task_run: BetaTaskRunResource
    task_group: BetaTaskGroupResource
    findall: FindAllResource

    def extract(
        self,
        *,
        urls: Sequence[str],
        betas: List[ParallelBetaParam],
        excerpts: Union[bool, ExcerptSettingsParam] | Omit = ...,
        fetch_policy: Optional[FetchPolicyParam] | Omit = ...,
        full_content: Any | Omit = ...,
        objective: Optional[str] | Omit = ...,
        search_queries: Optional[Sequence[str]] | Omit = ...,
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
          betas: Optional header to specify the beta version(s) to enable.

          excerpts: Include excerpts from each URL relevant to the search objective and queries.
              Note that if neither objective nor search_queries is provided, excerpts are
              redundant with full content.

          fetch_policy: Policy for live fetching web results.

          full_content: Include full content from each URL. Note that if neither objective nor
              search_queries is provided, excerpts are redundant with full content.

          objective: If provided, focuses extracted content on the specified search objective.

          search_queries: If provided, focuses extracted content on the specified keyword search queries.

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

class AsyncBetaResource:
    task_run: AsyncBetaTaskRunResource
    task_group: AsyncBetaTaskGroupResource
    findall: AsyncFindAllResource
    async def extract(self, *, urls: Sequence[str], betas: List[ParallelBetaParam], excerpts: Union[bool, ExcerptSettingsParam] | Omit = ..., fetch_policy: Optional[FetchPolicyParam] | Omit = ..., full_content: Any | Omit = ..., objective: Optional[str] | Omit = ..., search_queries: Optional[Sequence[str]] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> ExtractResponse: ...
    async def search(self, *, excerpts: ExcerptSettingsParam | Omit = ..., fetch_policy: Optional[FetchPolicyParam] | Omit = ..., max_chars_per_result: Optional[int] | Omit = ..., max_results: Optional[int] | Omit = ..., mode: Optional[Literal["one-shot","agentic"]] | Omit = ..., objective: Optional[str] | Omit = ..., processor: Optional[Literal["base","pro"]] | Omit = ..., search_queries: Optional[Sequence[str]] | Omit = ..., source_policy: Optional[SourcePolicyParam] | Omit = ..., betas: List[ParallelBetaParam] | Omit = ..., extra_headers: Headers | None = ..., extra_query: Query | None = ..., extra_body: Body | None = ..., timeout: float | httpx.Timeout | None | NotGiven = ...) -> SearchResult: ...

# ---------------------------------------------------------------------------
# Client classes at top-level: Parallel / AsyncParallel
# ---------------------------------------------------------------------------

DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits

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
    ) -> None: ...

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
    ) -> "Parallel": ...
    with_options: Callable[..., "Parallel"]

    # low-level http helpers
    def get(self, path: str, *, cast_to: Type[Any], options: RequestOptions = ..., stream: bool = ..., stream_cls: Type[Any] | None = ...) -> Any: ...
    def post(self, path: str, *, cast_to: Type[Any], body: Body | None = ..., options: RequestOptions = ..., files: Any = ..., stream: bool = ..., stream_cls: Type[Any] | None = ...) -> Any: ...
    def patch(self, path: str, *, cast_to: Type[Any], body: Body | None = ..., files: Any = ..., options: RequestOptions = ...) -> Any: ...
    def put(self, path: str, *, cast_to: Type[Any], body: Body | None = ..., files: Any = ..., options: RequestOptions = ...) -> Any: ...
    def delete(self, path: str, *, cast_to: Type[Any], body: Body | None = ..., options: RequestOptions = ...) -> Any: ...

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
    ) -> None: ...

    @property
    def task_run(self) -> AsyncTaskRunResource: ...
    @property
    def beta(self) -> AsyncBetaResource: ...

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
    ) -> "AsyncParallel": ...
    with_options: Callable[..., "AsyncParallel"]

    # low-level http helpers
    async def get(self, path: str, *, cast_to: Type[Any], options: RequestOptions = ..., stream: bool = ..., stream_cls: Type[Any] | None = ...) -> Any: ...
    async def post(self, path: str, *, cast_to: Type[Any], body: Body | None = ..., options: RequestOptions = ..., files: Any = ..., stream: bool = ..., stream_cls: Type[Any] | None = ...) -> Any: ...
    async def patch(self, path: str, *, cast_to: Type[Any], body: Body | None = ..., files: Any = ..., options: RequestOptions = ...) -> Any: ...
    async def put(self, path: str, *, cast_to: Type[Any], body: Body | None = ..., files: Any = ..., options: RequestOptions = ...) -> Any: ...
    async def delete(self, path: str, *, cast_to: Type[Any], body: Body | None = ..., options: RequestOptions = ...) -> Any: ...

# Convenience aliases exported by the package:
Client = Parallel
AsyncClient = AsyncParallel

# ---------------------------------------------------------------------------
# Lazy module proxy (parallel.resources) exists at runtime; omitted here.
# ---------------------------------------------------------------------------
```

If you want, I can also generate a **second variant** that:
- includes the `with_raw_response` / `with_streaming_response` wrappers on every resource (they exist in the code),
- and/or inlines *all* `types.beta.*` models/params (right now, I summarized FindAll candidates/events to `Any` to keep the footprint readable).