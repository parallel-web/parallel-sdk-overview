Below is a single **`parallel.pyi`** “API footprint” stub that captures the *public* surface area an LLM needs to understand how to use the SDK: top-level exports, clients, resources, core methods, streams, main models and TypedDict params (including beta resources and event streams).  

Notes:
- I only included **doc-comments that exist in the provided code snippets** (copied 1:1). Many public classes/functions do not have docstrings in the excerpts; those are left without docstrings.
- This is a **summary** stub (not a complete re-export of every internal helper); it focuses on what users call/import.
- Types like `httpx.Timeout`/`httpx.Response` are referenced directly.
- Some internal generics (e.g. `APIResponse[T]`) are included enough to convey usage; the full internal parsing/transform machinery isn’t replicated.

Save as: `parallel.pyi`

```pyi
# parallel.pyi
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
    Generic,
    overload,
)
from typing_extensions import (
    Annotated,
    Literal,
    ParamSpec,
    Protocol,
    Required,
    TypeAlias,
    TypedDict,
)

import httpx
import pydantic

# =========================
# Version
# =========================

__title__: str
__version__: str


# =========================
# Sentinel/utility types
# =========================

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

Timeout: TypeAlias = httpx.Timeout

Headers: TypeAlias = Mapping[str, Union[str, Omit]]
Query: TypeAlias = Mapping[str, object]
Body: TypeAlias = object

RequestOptions = TypedDict(
    "RequestOptions",
    {
        "headers": Headers,
        "max_retries": int,
        "timeout": Union[float, Timeout, None],
        "params": Query,
        "extra_json": Mapping[str, object],
        "idempotency_key": str,
        "follow_redirects": bool,
    },
    total=False,
)

DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits


# =========================
# Exceptions
# =========================

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


# =========================
# BaseModel
# =========================

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


# =========================
# API response wrappers
# =========================

R = TypeVar("R")
T = TypeVar("T")

class APIResponse(Generic[R]):
    http_response: httpx.Response
    retries_taken: int
    def parse(self, *, to: Type[T]) -> T: ...
    def parse(self) -> R: ...
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
    async def parse(self, *, to: Type[T]) -> T: ...
    async def parse(self) -> R: ...
    async def read(self) -> bytes: ...
    async def text(self) -> str: ...
    async def json(self) -> object: ...
    async def close(self) -> None: ...
    async def iter_bytes(self, chunk_size: int | None = None) -> AsyncIterator[bytes]: ...
    async def iter_text(self, chunk_size: int | None = None) -> AsyncIterator[str]: ...
    async def iter_lines(self) -> AsyncIterator[str]: ...


# =========================
# SSE Streaming
# =========================

StreamItemT = TypeVar("StreamItemT")

class Stream(Generic[StreamItemT]):
    """Provides the core interface to iterate over a synchronous stream response."""
    response: httpx.Response
    def __iter__(self) -> Iterator[StreamItemT]: ...
    def __next__(self) -> StreamItemT: ...
    def close(self) -> None: ...
    def __enter__(self) -> "Stream[StreamItemT]": ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

class AsyncStream(Generic[StreamItemT]):
    """Provides the core interface to iterate over an asynchronous stream response."""
    response: httpx.Response
    def __aiter__(self) -> AsyncIterator[StreamItemT]: ...
    async def __anext__(self) -> StreamItemT: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> "AsyncStream[StreamItemT]": ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...


# =========================
# Shared models / params
# =========================

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


# Source policy (model + params)
class SourcePolicy(BaseModel):
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    after_date: Optional[Any] = None
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
    after_date: Annotated[Union[str, Any, None], Any]
    exclude_domains: Sequence[str]
    include_domains: Sequence[str]


# =========================
# Task schemas / specs
# =========================

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

OutputT = TypeVar("OutputT", bound=pydantic.BaseModel)

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
    """Optional JSON schema or text description of expected input to the task.

    A bare string is equivalent to a text schema with the same description.
    """


# =========================
# Citations / basis
# =========================

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


# =========================
# Task runs / outputs / results
# =========================

TaskRunStatus: TypeAlias = Literal[
    "queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"
]

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
    status: TaskRunStatus
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


# Parsed output support (execute(..., output=MyPydanticModel))
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


# =========================
# Non-beta TaskRun params
# =========================

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
    api_timeout: Annotated[int, Any]  # alias="timeout"


# =========================
# Resources (non-beta)
# =========================

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
    def with_raw_response(self) -> "TaskRunResourceWithRawResponse": ...
    @property
    def with_streaming_response(self) -> "TaskRunResourceWithStreamingResponse": ...

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
    ) -> TaskRunResult | ParsedTaskRunResult[OutputT]: ...

    @property
    def with_raw_response(self) -> "AsyncTaskRunResourceWithRawResponse": ...
    @property
    def with_streaming_response(self) -> "AsyncTaskRunResourceWithStreamingResponse": ...


class TaskRunResourceWithRawResponse:
    def create(self, *args: Any, **kwargs: Any) -> APIResponse[TaskRun]: ...
    def retrieve(self, *args: Any, **kwargs: Any) -> APIResponse[TaskRun]: ...
    def result(self, *args: Any, **kwargs: Any) -> APIResponse[TaskRunResult]: ...

class AsyncTaskRunResourceWithRawResponse:
    async def create(self, *args: Any, **kwargs: Any) -> AsyncAPIResponse[TaskRun]: ...
    async def retrieve(self, *args: Any, **kwargs: Any) -> AsyncAPIResponse[TaskRun]: ...
    async def result(self, *args: Any, **kwargs: Any) -> AsyncAPIResponse[TaskRunResult]: ...

class TaskRunResourceWithStreamingResponse:
    def create(self, *args: Any, **kwargs: Any) -> Any: ...
    def retrieve(self, *args: Any, **kwargs: Any) -> Any: ...
    def result(self, *args: Any, **kwargs: Any) -> Any: ...

class AsyncTaskRunResourceWithStreamingResponse:
    def create(self, *args: Any, **kwargs: Any) -> Any: ...
    def retrieve(self, *args: Any, **kwargs: Any) -> Any: ...
    def result(self, *args: Any, **kwargs: Any) -> Any: ...


# =========================
# Beta types (search/extract/task-group/findall)
# =========================

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

BetaExtractExcerpts: TypeAlias = Union[bool, ExcerptSettingsParam]
class FullContentFullContentSettings(TypedDict, total=False):
    """Optional settings for returning full content."""
    max_chars_per_result: Optional[int]
    """
    Optional limit on the number of characters to include in the full content for
    each url. Full content always starts at the beginning of the page and is
    truncated at the limit if necessary.
    """
BetaExtractFullContent: TypeAlias = Union[bool, FullContentFullContentSettings]

class BetaExtractParams(TypedDict, total=False):
    urls: Required[Sequence[str]]
    excerpts: BetaExtractExcerpts
    """Include excerpts from each URL relevant to the search objective and queries.

    Note that if neither objective nor search_queries is provided, excerpts are
    redundant with full content.
    """
    fetch_policy: Optional[FetchPolicyParam]
    """Policy for live fetching web results."""
    full_content: BetaExtractFullContent
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


# Events / SSE unions (beta task run)
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

# Beta TaskRunEvent (terminal state)
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
    mcp_servers: Optional[List[Any]] = None
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
    webhook: Optional[Any] = None
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


# Beta Task Run result (includes MCP tool calls etc.)
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


class BetaTaskRunResultParams(TypedDict, total=False):
    api_timeout: Annotated[int, Any]
    betas: Annotated[List[ParallelBetaParam], Any]
    """Optional header to specify the beta version(s) to enable."""


# =========================
# Beta resources
# =========================

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
        """

    def extract(
        self,
        *,
        urls: Sequence[str],
        excerpts: BetaExtractExcerpts | Omit = ...,
        fetch_policy: Optional[FetchPolicyParam] | Omit = ...,
        full_content: BetaExtractFullContent | Omit = ...,
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
        """

    @property
    def with_raw_response(self) -> "BetaResourceWithRawResponse": ...
    @property
    def with_streaming_response(self) -> "BetaResourceWithStreamingResponse": ...

class AsyncBetaResource:
    @property
    def task_run(self) -> "AsyncBetaTaskRunResource": ...
    @property
    def task_group(self) -> "AsyncTaskGroupResource": ...
    @property
    def findall(self) -> "AsyncFindAllResource": ...

    async def search(self, *args: Any, **kwargs: Any) -> SearchResult: ...
    async def extract(self, *args: Any, **kwargs: Any) -> ExtractResponse: ...

    @property
    def with_raw_response(self) -> "AsyncBetaResourceWithRawResponse": ...
    @property
    def with_streaming_response(self) -> "AsyncBetaResourceWithStreamingResponse": ...

class BetaResourceWithRawResponse:
    def search(self, *args: Any, **kwargs: Any) -> APIResponse[SearchResult]: ...
    def extract(self, *args: Any, **kwargs: Any) -> APIResponse[ExtractResponse]: ...
    @property
    def task_run(self) -> "BetaTaskRunResourceWithRawResponse": ...
    @property
    def task_group(self) -> Any: ...
    @property
    def findall(self) -> Any: ...

class AsyncBetaResourceWithRawResponse:
    async def search(self, *args: Any, **kwargs: Any) -> AsyncAPIResponse[SearchResult]: ...
    async def extract(self, *args: Any, **kwargs: Any) -> AsyncAPIResponse[ExtractResponse]: ...
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


# Beta TaskRun resource (events/result with beta headers)
class BetaTaskRunResource:
    def create(self, *args: Any, **kwargs: Any) -> TaskRun: ...
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
    def result(self, *args: Any, **kwargs: Any) -> BetaTaskRunResult: ...
    @property
    def with_raw_response(self) -> "BetaTaskRunResourceWithRawResponse": ...
    @property
    def with_streaming_response(self) -> "BetaTaskRunResourceWithStreamingResponse": ...

class AsyncBetaTaskRunResource:
    async def create(self, *args: Any, **kwargs: Any) -> TaskRun: ...
    async def events(self, run_id: str, **kwargs: Any) -> AsyncStream[TaskRunEventsResponse]: ...
    async def result(self, *args: Any, **kwargs: Any) -> BetaTaskRunResult: ...
    @property
    def with_raw_response(self) -> Any: ...
    @property
    def with_streaming_response(self) -> Any: ...

class BetaTaskRunResourceWithRawResponse: ...
class BetaTaskRunResourceWithStreamingResponse: ...


# Task Group / FindAll resources are substantial; for LLM usage, the main entry points are:
# client.beta.task_group.(create, retrieve, add_runs, events, get_runs)
# client.beta.findall.(ingest, create, retrieve, events, result, schema, enrich, extend, cancel)

class TaskGroupResource: ...
class AsyncTaskGroupResource: ...
class FindAllResource: ...
class AsyncFindAllResource: ...


# =========================
# Client classes
# =========================

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

    @property
    def with_raw_response(self) -> "ParallelWithRawResponse": ...
    @property
    def with_streaming_response(self) -> "ParallelWithStreamedResponse": ...

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

    with_options: Any

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

    @property
    def with_raw_response(self) -> "AsyncParallelWithRawResponse": ...
    @property
    def with_streaming_response(self) -> "AsyncParallelWithStreamedResponse": ...

    def copy(self, *args: Any, **kwargs: Any) -> "AsyncParallel": ...
    with_options: Any

Client = Parallel
AsyncClient = AsyncParallel


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


# =========================
# Top-level re-export module proxy
# =========================

# In runtime code, `parallel.resources` is lazily proxied.
# For an LLM-facing stub, just expose a placeholder.
class resources(Protocol): ...
```

If you want, I can generate a **second variant** that is *much more exhaustive* (includes all beta TaskGroup + FindAll models/events/params, with full method signatures from those resources), but it will be significantly longer.