Below is a single **`parallel.pyi`** “API footprint” stub that an LLM can scan to understand the public surface area of this SDK. I’ve included **docstrings copied 1:1** where they appear in the provided sources (notably the resource methods). For the many generated `types/*` models that have no module-level docstrings, I included their **field docstrings** where present.

> Notes / limitations:
> - This is a **summary**: it focuses on the primary imports/exports (`parallel.__init__`, `Parallel`/`AsyncParallel`, resources, key types, beta types). It doesn’t mirror every internal `_utils/*` helper.
> - Some model field docstrings exist in the source and are included; for many param TypedDicts the interesting docstrings are also included where present.
> - This is designed for “LLM readability”, not for perfect type-checker fidelity across all internal generics.

```pyi
# parallel.pyi
# A single-file stub summarizing the public footprint of the `parallel` Python SDK.

from __future__ import annotations

from datetime import date, datetime
from types import TracebackType
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
    Generic,
    overload,
)
from typing_extensions import Annotated, Literal, Protocol, TypedDict, TypeAlias

import httpx
import pydantic

# -----------------------------
# Version
# -----------------------------

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

# Approximates SDK headers shape
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

# file convenience
FileTypes = Union[
    Union[bytes, Any],  # simplified for footprint
]

def file_from_path(path: str) -> FileTypes: ...

# -----------------------------
# Exceptions
# -----------------------------

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

class BadRequestError(APIStatusError): ...
class AuthenticationError(APIStatusError): ...
class PermissionDeniedError(APIStatusError): ...
class NotFoundError(APIStatusError): ...
class ConflictError(APIStatusError): ...
class UnprocessableEntityError(APIStatusError): ...
class RateLimitError(APIStatusError): ...
class InternalServerError(APIStatusError): ...

# -----------------------------
# Base model
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

# -----------------------------
# Common "shared" types
# -----------------------------

class ErrorObject(BaseModel):
    message: str
    """Human-readable message."""
    ref_id: str
    """Reference ID for the error."""
    detail: Optional[Dict[str, object]] = None
    """Optional detail supporting the error."""

class ErrorResponse(BaseModel):
    error: ErrorObject
    """An error message."""
    type: Literal["error"]
    """Always 'error'."""

class Warning(BaseModel):
    message: str
    """Human-readable message."""
    type: Literal["spec_validation_warning", "input_validation_warning", "warning"]
    """Type of warning.

    Note that adding new warning types is considered a backward-compatible change.
    """
    detail: Optional[Dict[str, object]] = None
    """Optional detail supporting the warning."""

class Citation(BaseModel):
    url: str
    """URL of the citation."""
    excerpts: Optional[List[str]] = None
    """Excerpts from the citation supporting the output.

    Only certain processors provide excerpts.
    """
    title: Optional[str] = None
    """Title of the citation."""

class FieldBasis(BaseModel):
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

# -----------------------------
# Schemas
# -----------------------------

class AutoSchema(BaseModel):
    type: Optional[Literal["auto"]] = None
    """The type of schema being defined. Always `auto`."""

class TextSchema(BaseModel):
    description: Optional[str] = None
    """A text description of the desired output from the task."""
    type: Optional[Literal["text"]] = None
    """The type of schema being defined. Always `text`."""

class JsonSchema(BaseModel):
    json_schema: Dict[str, object]
    """A JSON Schema object. Only a subset of JSON Schema is supported."""
    type: Optional[Literal["json"]] = None
    """The type of schema being defined. Always `json`."""

# Param typed dicts
class AutoSchemaParam(TypedDict, total=False):
    type: Literal["auto"]
    """The type of schema being defined. Always `auto`."""

class TextSchemaParam(TypedDict, total=False):
    description: Optional[str]
    """A text description of the desired output from the task."""
    type: Literal["text"]
    """The type of schema being defined. Always `text`."""

class JsonSchemaParam(TypedDict, total=False):
    json_schema: Dict[str, object]
    """A JSON Schema object. Only a subset of JSON Schema is supported."""
    type: Literal["json"]
    """The type of schema being defined. Always `json`."""

# TaskSpec
OutputSchema: TypeAlias = Union[JsonSchema, TextSchema, AutoSchema, str]
InputSchema: TypeAlias = Union[str, JsonSchema, TextSchema, None]

class TaskSpec(BaseModel):
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

# TaskSpecParam
OutputSchemaParam: TypeAlias = Union[JsonSchemaParam, TextSchemaParam, AutoSchemaParam, str]
InputSchemaParam: TypeAlias = Union[str, JsonSchemaParam, TextSchemaParam]

OutputT = TypeVar("OutputT", bound=pydantic.BaseModel)

class TaskSpecParam(TypedDict, total=False):
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

# -----------------------------
# Task Run core types (non-beta)
# -----------------------------

class TaskRun(BaseModel):
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
    basis: List[FieldBasis]
    """Basis for each top-level field in the JSON output."""
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
    output: TaskRunResultOutput
    """Output from the task conforming to the output schema."""
    run: TaskRun
    """Status of a task run."""

# Parsed task run result (SDK helper)
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

# Params
class SourcePolicy(TypedDict, total=False):
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
    source_policy: Optional[SourcePolicy]
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
    api_timeout: Annotated[int, Any]  # alias "timeout" in runtime

# -----------------------------
# SSE streaming helpers (publicly exported)
# -----------------------------

_T = TypeVar("_T")

class Stream(Iterator[_T], Generic[_T]): ...
class AsyncStream(Generic[_T]):
    def __aiter__(self) -> Any: ...
    def __anext__(self) -> Any: ...

# -----------------------------
# Resources: task_run (stable)
# -----------------------------

class TaskRunResource:
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
        output: Optional[OutputSchemaParam] | Type[OutputT] | Omit = ...,
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
        output: Optional[OutputSchemaParam] | Type[OutputT] | Omit = ...,
        extra_headers: Headers | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> Union[TaskRunResult, ParsedTaskRunResult[OutputT]]: ...

# Raw/streaming wrappers exist for most resources (surface-level)
class TaskRunResourceWithRawResponse: ...
class AsyncTaskRunResourceWithRawResponse: ...
class TaskRunResourceWithStreamingResponse: ...
class AsyncTaskRunResourceWithStreamingResponse: ...

# -----------------------------
# Beta API (headers-based "parallel-beta")
# -----------------------------

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

# Beta: MCP
class McpServer(BaseModel):
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

class McpToolCall(BaseModel):
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

class McpServerParam(TypedDict, total=False):
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

# Beta: webhook
class Webhook(BaseModel):
    url: str
    """URL for the webhook."""
    event_types: Optional[List[Literal["task_run.status"]]] = None
    """Event types to send the webhook notifications for."""

class WebhookParam(TypedDict, total=False):
    url: str
    """URL for the webhook."""
    event_types: List[Literal["task_run.status"]]
    """Event types to send the webhook notifications for."""

# Beta: TaskRun events stream
class TaskRunProgressStatsEventSourceStats(BaseModel):
    num_sources_considered: Optional[int] = None
    """Number of sources considered in processing the task."""
    num_sources_read: Optional[int] = None
    """Number of sources read in processing the task."""
    sources_read_sample: Optional[List[str]] = None
    """A sample of URLs of sources read in processing the task."""

class TaskRunProgressStatsEvent(BaseModel):
    progress_meter: float
    """Completion percentage of the task run.

    Ranges from 0 to 100 where 0 indicates no progress and 100 indicates completion.
    """
    source_stats: TaskRunProgressStatsEventSourceStats
    """Source stats for a task run."""
    type: Literal["task_run.progress_stats"]
    """Event type; always 'task_run.progress_stats'."""

class TaskRunProgressMessageEvent(BaseModel):
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
    error: ErrorObject
    """An error message."""
    type: Literal["error"]
    """Event type; always 'error'."""

# BetaRunInput
class BetaRunInput(BaseModel):
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
    source_policy: Optional["BetaSourcePolicyModel"] = None
    task_spec: Optional[TaskSpec] = None
    webhook: Optional[Webhook] = None
    """Webhooks for Task Runs."""

# SourcePolicy model (beta uses BaseModel version)
class BetaSourcePolicyModel(BaseModel):
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

# Beta: task run result w/ MCP tool calls
class OutputBetaTaskRunTextOutput(BaseModel):
    basis: List[FieldBasis]
    """Basis for the output."""
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
    basis: List[FieldBasis]
    """Basis for the output."""
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
    output: BetaTaskRunResultOutput
    """Output from the task conforming to the output schema."""
    run: TaskRun
    """Status of a task run."""

# Beta: Search/Extract
class UsageItem(BaseModel):
    count: int
    """Count of the SKU."""
    name: str
    """Name of the SKU."""

class WebSearchResult(BaseModel):
    url: str
    """URL associated with the search result."""
    excerpts: Optional[List[str]] = None
    """Relevant excerpted content from the URL, formatted as markdown."""
    publish_date: Optional[str] = None
    """Publish date of the webpage in YYYY-MM-DD format, if available."""
    title: Optional[str] = None
    """Title of the webpage, if available."""

class SearchResult(BaseModel):
    results: List[WebSearchResult]
    """A list of WebSearchResult objects, ordered by decreasing relevance."""
    search_id: str
    """Search ID. Example: `search_cad0a6d2dec046bd95ae900527d880e7`"""
    usage: Optional[List[UsageItem]] = None
    """Usage metrics for the search request."""
    warnings: Optional[List[Warning]] = None
    """Warnings for the search request, if any."""

class ExtractError(BaseModel):
    content: Optional[str] = None
    """Content returned for http client or server errors, if any."""
    error_type: str
    """Error type."""
    http_status_code: Optional[int] = None
    """HTTP status code, if available."""
    url: str

class ExtractResult(BaseModel):
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
    max_chars_per_result: Optional[int]
    """Optional upper bound on the total number of characters to include per url.

    Excerpts may contain fewer characters than this limit to maximize relevance and
    token efficiency.
    """

class BetaSearchParams(TypedDict, total=False):
    excerpts: ExcerptSettingsParam
    """Optional settings for returning relevant excerpts."""
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
    source_policy: Optional[SourcePolicy]
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    betas: Annotated[List[ParallelBetaParam], Any]
    """Optional header to specify the beta version(s) to enable."""

# FindAll (beta)
class FindallRun(BaseModel): ...
class FindallSchema(BaseModel): ...
class FindallRunResult(BaseModel): ...
class FindallRetrieveResponse(BaseModel): ...
class FindallEventsResponse(BaseModel): ...

# -----------------------------
# Beta Resources
# -----------------------------

TaskRunEventsResponse: TypeAlias = Annotated[
    Union[TaskRunProgressStatsEvent, TaskRunProgressMessageEvent, "BetaTaskRunEvent", ErrorEvent],
    Any,
]

class BetaTaskRunEvent(BaseModel): ...

class BetaTaskRunCreateParams(TypedDict, total=False): ...
class BetaTaskRunResultParams(TypedDict, total=False): ...

class BetaTaskRunResource:
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
    async def create(self, **kwargs: Any) -> TaskRun: ...
    async def events(self, run_id: str, **kwargs: Any) -> AsyncStream[TaskRunEventsResponse]: ...
    async def result(self, run_id: str, **kwargs: Any) -> BetaTaskRunResult: ...

# Beta: TaskGroup + FindAll resources exist; included as opaque footprints
class TaskGroup(BaseModel): ...
class TaskGroupStatus(BaseModel): ...
class TaskGroupRunResponse(BaseModel): ...
class TaskGroupEventsResponse(BaseModel): ...
class TaskGroupGetRunsResponse(BaseModel): ...

class BetaTaskGroupResource: ...
class AsyncBetaTaskGroupResource: ...

class BetaFindallResource: ...
class AsyncBetaFindallResource: ...

class BetaResource:
    task_run: BetaTaskRunResource
    task_group: BetaTaskGroupResource
    findall: BetaFindallResource

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
    task_run: AsyncBetaTaskRunResource
    task_group: AsyncBetaTaskGroupResource
    findall: AsyncBetaFindallResource
    async def extract(self, **kwargs: Any) -> ExtractResponse: ...
    async def search(self, **kwargs: Any) -> SearchResult: ...

# -----------------------------
# API Response wrappers (publicly exported)
# -----------------------------

R = TypeVar("R")

class APIResponse(Generic[R]):
    http_response: httpx.Response
    retries_taken: int
    def parse(self, *, to: Type[Any] | None = None) -> Any: ...
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
    async def parse(self, *, to: Type[Any] | None = None) -> Any: ...
    async def read(self) -> bytes: ...
    async def text(self) -> str: ...
    async def json(self) -> object: ...
    async def close(self) -> None: ...
    async def iter_bytes(self, chunk_size: int | None = None) -> Any: ...
    async def iter_text(self, chunk_size: int | None = None) -> Any: ...
    async def iter_lines(self) -> Any: ...

# -----------------------------
# Clients
# -----------------------------

DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits

class DefaultHttpxClient(httpx.Client): ...
class DefaultAsyncHttpxClient(httpx.AsyncClient): ...
class DefaultAioHttpClient(httpx.AsyncClient): ...

class Parallel:
    """
    Construct a new synchronous Parallel client instance.

    This automatically infers the `api_key` argument from the `PARALLEL_API_KEY` environment variable if it is not provided.
    """
    api_key: str
    task_run: TaskRunResource
    beta: BetaResource
    with_raw_response: "ParallelWithRawResponse"
    with_streaming_response: "ParallelWithStreamedResponse"

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
    ) -> "Parallel": ...

    with_options: Any  # alias for copy

class AsyncParallel:
    """
    Construct a new async AsyncParallel client instance.

    This automatically infers the `api_key` argument from the `PARALLEL_API_KEY` environment variable if it is not provided.
    """
    api_key: str
    task_run: AsyncTaskRunResource
    beta: AsyncBetaResource
    with_raw_response: "AsyncParallelWithRawResponse"
    with_streaming_response: "AsyncParallelWithStreamedResponse"

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
    ) -> "AsyncParallel": ...

    with_options: Any  # alias for copy

# Aliases
Client = Parallel
AsyncClient = AsyncParallel

class ParallelWithRawResponse:
    task_run: TaskRunResourceWithRawResponse
    beta: Any

class AsyncParallelWithRawResponse:
    task_run: AsyncTaskRunResourceWithRawResponse
    beta: Any

class ParallelWithStreamedResponse:
    task_run: TaskRunResourceWithStreamingResponse
    beta: Any

class AsyncParallelWithStreamedResponse:
    task_run: AsyncTaskRunResourceWithStreamingResponse
    beta: Any

# -----------------------------
# Module-level "resources" proxy (runtime) - shown as a module-like object
# -----------------------------

class _ResourcesModule(Protocol):
    TaskRunResource: Type[TaskRunResource]
    AsyncTaskRunResource: Type[AsyncTaskRunResource]
    BetaResource: Type[BetaResource]
    AsyncBetaResource: Type[AsyncBetaResource]

resources: _ResourcesModule

# -----------------------------
# Exported package namespace
# -----------------------------

# The real package also exports: types (module), many classes above, defaults, and exceptions.
class types:  # module-like placeholder
    # stable
    Warning: Type[Warning]
    ErrorObject: Type[ErrorObject]
    ErrorResponse: Type[ErrorResponse]
    SourcePolicy: Type[BetaSourcePolicyModel]  # model form
    Citation: Type[Citation]
    FieldBasis: Type[FieldBasis]
    TaskRun: Type[TaskRun]
    TaskSpec: Type[TaskSpec]
    AutoSchema: Type[AutoSchema]
    JsonSchema: Type[JsonSchema]
    TextSchema: Type[TextSchema]
    TaskRunResult: Type[TaskRunResult]
    TaskRunJsonOutput: Type[TaskRunJsonOutput]
    TaskRunTextOutput: Type[TaskRunTextOutput]
    ParsedTaskRunResult: Type[ParsedTaskRunResult[Any]]
    TaskRunCreateParams: Type[TaskRunCreateParams]
    TaskRunResultParams: Type[TaskRunResultParams]
    # beta module is also present at parallel.types.beta

```

If you want, I can also generate an **“ultra-complete”** version that includes *every* `parallel.types.*` and `parallel.types.beta.*` class/TypedDict/type-alias found in the tree (it will be much longer), still as a single `.pyi` file.