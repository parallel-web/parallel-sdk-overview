Below is a **single** `parallel.pyi` stub file that summarizes the *public* SDK surface (client classes, resources, key models/types, beta resources, and the parsing helpers that are intended for user consumption).  

Notes / constraints I followed:
- I only included what is realistically part of the **API footprint a user/LLM needs** (not every internal `_utils/*` helper).
- I **copied docstrings 1:1** where they were present on the public methods/models shown in your dump (not reworded).
- This is a `.pyi` (type stub), so implementations are replaced with `...`.
- A few internal types are referenced (e.g. `httpx.Timeout`) because they appear in public signatures.

Save as: `parallel.pyi`

```pyi
# parallel.pyi
# File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

from __future__ import annotations

import datetime
from typing import (
    Any,
    Awaitable,
    Callable,
    Coroutine,
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
    Protocol,
    TypedDict,
    TypeAlias,
)

import httpx
import pydantic


# ---------------------------------------------------------------------------
# Package metadata
# ---------------------------------------------------------------------------

__title__: str
__version__: str


# ---------------------------------------------------------------------------
# Core exported sentinel / helper types
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


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Base model class exported by SDK
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
# Shared types/models
# ---------------------------------------------------------------------------

class Citation(BaseModel):
    """A citation for a task output."""
    url: str
    """URL of the citation."""
    excerpts: Optional[List[str]]
    """Excerpts from the citation supporting the output.

    Only certain processors provide excerpts.
    """
    title: Optional[str]
    """Title of the citation."""

class FieldBasis(BaseModel):
    """Citations and reasoning supporting one field of a task output."""
    field: str
    """Name of the output field."""
    reasoning: str
    """Reasoning for the output field."""
    citations: Optional[List[Citation]]
    """List of citations supporting the output field."""
    confidence: Optional[str]
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
    detail: Optional[Dict[str, object]]
    """Optional detail supporting the warning."""

class ErrorObject(BaseModel):
    """An error message."""
    message: str
    """Human-readable message."""
    ref_id: str
    """Reference ID for the error."""
    detail: Optional[Dict[str, object]]
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
    after_date: Optional[datetime.date]
    """Optional start date for filtering search results.

    Results will be limited to content published on or after this date. Provided as
    an RFC 3339 date string (YYYY-MM-DD).
    """
    exclude_domains: Optional[List[str]]
    """List of domains to exclude from results.

    If specified, sources from these domains will be excluded. Accepts plain domains
    (e.g., example.com, subdomain.example.gov) or bare domain extension starting
    with a period (e.g., .gov, .edu, .co.uk).
    """
    include_domains: Optional[List[str]]
    """List of domains to restrict the results to.

    If specified, only sources from these domains will be included. Accepts plain
    domains (e.g., example.com, subdomain.example.gov) or bare domain extension
    starting with a period (e.g., .gov, .edu, .co.uk).
    """


# ---------------------------------------------------------------------------
# Schema models
# ---------------------------------------------------------------------------

class AutoSchema(BaseModel):
    """Auto schema for a task input or output."""
    type: Optional[Literal["auto"]]
    """The type of schema being defined. Always `auto`."""

class TextSchema(BaseModel):
    """Text description for a task input or output."""
    description: Optional[str]
    """A text description of the desired output from the task."""
    type: Optional[Literal["text"]]
    """The type of schema being defined. Always `text`."""

class JsonSchema(BaseModel):
    """JSON schema for a task input or output."""
    json_schema: Dict[str, object]
    """A JSON Schema object. Only a subset of JSON Schema is supported."""
    type: Optional[Literal["json"]]
    """The type of schema being defined. Always `json`."""


# ---------------------------------------------------------------------------
# Task Spec
# ---------------------------------------------------------------------------

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
    input_schema: Optional[InputSchema]
    """Optional JSON schema or text description of expected input to the task.

    A bare string is equivalent to a text schema with the same description.
    """


# ---------------------------------------------------------------------------
# Task Run models
# ---------------------------------------------------------------------------

class TaskRun(BaseModel):
    """Status of a task run."""
    created_at: Optional[str]
    """Timestamp of the creation of the task, as an RFC 3339 string."""
    is_active: bool
    """Whether the run is currently active, i.e.

    status is one of {'cancelling', 'queued', 'running'}.
    """
    modified_at: Optional[str]
    """Timestamp of the last modification to the task, as an RFC 3339 string."""
    processor: str
    """Processor used for the run."""
    run_id: str
    """ID of the task run."""
    status: Literal["queued", "action_required", "running", "completed", "failed", "cancelling", "cancelled"]
    """Status of the run."""
    error: Optional[ErrorObject]
    """An error message."""
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    """User-provided metadata stored with the run."""
    task_group_id: Optional[str]
    """ID of the taskgroup to which the run belongs."""
    warnings: Optional[List[Warning]]
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
    beta_fields: Optional[Dict[str, object]]
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
    beta_fields: Optional[Dict[str, object]]
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
    output_schema: Optional[Dict[str, object]]
    """Output schema for the Task Run.

    Populated only if the task was executed with an auto schema.
    """

TaskRunOutput: TypeAlias = Annotated[Union[TaskRunTextOutput, TaskRunJsonOutput], ...]  # discriminator="type" at runtime

class TaskRunResult(BaseModel):
    """Result of a task run."""
    output: TaskRunOutput
    """Output from the task conforming to the output schema."""
    run: TaskRun
    """Task run object with status 'completed'."""


# ---------------------------------------------------------------------------
# Parsed results (execute() convenience parsing)
# ---------------------------------------------------------------------------

ContentType = TypeVar("ContentType", bound=pydantic.BaseModel)

class ParsedTaskRunTextOutput(TaskRunTextOutput, Generic[ContentType]):
    parsed: None
    """The parsed output from the task run."""

class ParsedTaskRunJsonOutput(TaskRunJsonOutput, Generic[ContentType]):
    parsed: Optional[ContentType]
    """The parsed output from the task run."""

class ParsedTaskRunResult(TaskRunResult, Generic[ContentType]):
    output: Union[ParsedTaskRunTextOutput[ContentType], ParsedTaskRunJsonOutput[ContentType]]
    """The parsed output from the task run."""


# ---------------------------------------------------------------------------
# Param TypedDicts (public)
# ---------------------------------------------------------------------------

class TaskRunResultParams(TypedDict, total=False):
    api_timeout: Annotated[int, ...]  # alias="timeout"

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
    source_policy: Optional["types.shared_params.SourcePolicy"]
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    task_spec: Optional["TaskSpecParam"]
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
    Not specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """

# TaskSpecParam + component schema params
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


# ---------------------------------------------------------------------------
# Streaming (SSE) core types
# ---------------------------------------------------------------------------

_TStream = TypeVar("_TStream")

class Stream(Generic[_TStream]):
    response: httpx.Response
    def __iter__(self) -> Iterator[_TStream]: ...
    def __next__(self) -> _TStream: ...
    def close(self) -> None: ...
    def __enter__(self) -> "Stream[_TStream]": ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

class AsyncStream(Generic[_TStream]):
    response: httpx.Response
    def __aiter__(self) -> Any: ...
    async def __anext__(self) -> _TStream: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> "AsyncStream[_TStream]": ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...


# ---------------------------------------------------------------------------
# Resources: stable (non-beta)
# ---------------------------------------------------------------------------

class TaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        source_policy: Optional["types.shared_params.SourcePolicy"] | Omit = ...,
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
        ...

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
        ...

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
        ...

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
        ...


class AsyncTaskRunResource:
    async def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        source_policy: Optional["types.shared_params.SourcePolicy"] | Omit = ...,
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
        ...

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
        ...

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
        ...

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
        ...


# ---------------------------------------------------------------------------
# Beta API surface (types + resources)
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
    """Count of the SKU."""
    name: str
    """Name of the SKU."""

class Webhook(BaseModel):
    """Webhooks for Task Runs."""
    url: str
    """URL for the webhook."""
    event_types: Optional[List[Literal["task_run.status"]]]
    """Event types to send the webhook notifications for."""

class McpServer(BaseModel):
    """MCP server configuration."""
    name: str
    """Name of the MCP server."""
    url: str
    """URL of the MCP server."""
    allowed_tools: Optional[List[str]]
    """List of allowed tools for the MCP server."""
    headers: Optional[Dict[str, str]]
    """Headers for the MCP server."""
    type: Optional[Literal["url"]]
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
    content: Optional[str]
    """Output received from the tool call, if successful."""
    error: Optional[str]
    """Error message if the tool call failed."""

class WebSearchResult(BaseModel):
    """A single search result from the web search API."""
    url: str
    """URL associated with the search result."""
    excerpts: Optional[List[str]]
    """Relevant excerpted content from the URL, formatted as markdown."""
    publish_date: Optional[str]
    """Publish date of the webpage in YYYY-MM-DD format, if available."""
    title: Optional[str]
    """Title of the webpage, if available."""

class SearchResult(BaseModel):
    """Output for the Search API."""
    results: List[WebSearchResult]
    """A list of WebSearchResult objects, ordered by decreasing relevance."""
    search_id: str
    """Search ID. Example: `search_cad0a6d2dec046bd95ae900527d880e7`"""
    usage: Optional[List[UsageItem]]
    """Usage metrics for the search request."""
    warnings: Optional[List[Warning]]
    """Warnings for the search request, if any."""

class ExtractError(BaseModel):
    """Extract error details."""
    content: Optional[str]
    """Content returned for http client or server errors, if any."""
    error_type: str
    """Error type."""
    http_status_code: Optional[int]
    """HTTP status code, if available."""
    url: str

class ExtractResult(BaseModel):
    """Extract result for a single URL."""
    url: str
    """URL associated with the search result."""
    excerpts: Optional[List[str]]
    """Relevant excerpted content from the URL, formatted as markdown."""
    full_content: Optional[str]
    """Full content from the URL formatted as markdown, if requested."""
    publish_date: Optional[str]
    """Publish date of the webpage in YYYY-MM-DD format, if available."""
    title: Optional[str]
    """Title of the webpage, if available."""

class ExtractResponse(BaseModel):
    """Fetch result."""
    errors: List[ExtractError]
    """Extract errors: requested URLs not in the results."""
    extract_id: str
    """Extract request ID, e.g. `extract_cad0a6d2dec046bd95ae900527d880e7`"""
    results: List[ExtractResult]
    """Successful extract results."""
    usage: Optional[List[UsageItem]]
    """Usage metrics for the extract request."""
    warnings: Optional[List[Warning]]
    """Warnings for the extract request, if any."""

# Beta Task Run Result
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
    beta_fields: Optional[Dict[str, object]]
    """Always None."""
    mcp_tool_calls: Optional[List[McpToolCall]]
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
    beta_fields: Optional[Dict[str, object]]
    """Always None."""
    mcp_tool_calls: Optional[List[McpToolCall]]
    """MCP tool calls made by the task."""
    output_schema: Optional[Dict[str, object]]
    """Output schema for the Task Run.

    Populated only if the task was executed with an auto schema.
    """

BetaTaskRunOutput: TypeAlias = Annotated[Union[OutputBetaTaskRunTextOutput, OutputBetaTaskRunJsonOutput], ...]  # discriminator="type"

class BetaTaskRunResult(BaseModel):
    """Result of a beta task run. Available only if beta headers are specified."""
    output: BetaTaskRunOutput
    """Output from the task conforming to the output schema."""
    run: TaskRun
    """Beta task run object with status 'completed'."""

# Beta events
class ErrorEvent(BaseModel):
    """Event indicating an error."""
    error: ErrorObject
    """Error."""
    type: Literal["error"]
    """Event type; always 'error'."""

class TaskRunProgressStatsEventSourceStats(BaseModel):
    """Source stats describing progress so far."""
    num_sources_considered: Optional[int]
    """Number of sources considered in processing the task."""
    num_sources_read: Optional[int]
    """Number of sources read in processing the task."""
    sources_read_sample: Optional[List[str]]
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
    timestamp: Optional[str]
    """Timestamp of the message."""
    type: Literal[
        "task_run.progress_msg.plan",
        "task_run.progress_msg.search",
        "task_run.progress_msg.result",
        "task_run.progress_msg.tool_call",
        "task_run.progress_msg.exec_status",
    ]
    """Event type; always starts with 'task_run.progress_msg'."""

class BetaRunInput(BaseModel):
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
    mcp_servers: Optional[List[McpServer]]
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
    source_policy: Optional[SourcePolicy]
    """Source policy for web search results.

    This policy governs which sources are allowed/disallowed in results.
    """
    task_spec: Optional[TaskSpec]
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
    Not specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    webhook: Optional[Webhook]
    """Webhooks for Task Runs."""

class TaskRunEvent(BaseModel):
    """Event when a task run transitions to a non-active status.

    May indicate completion, cancellation, or failure.
    """
    event_id: Optional[str]
    """Cursor to resume the event stream. Always empty for non Task Group runs."""
    run: TaskRun
    """Task run object."""
    type: Literal["task_run.state"]
    """Event type; always 'task_run.state'."""
    input: Optional[BetaRunInput]
    """Task run input with additional beta fields."""
    output: Optional[Union[TaskRunTextOutput, TaskRunJsonOutput, None]]
    """Output from the run; included only if requested and if status == `completed`."""

TaskRunEventsResponse: TypeAlias = Annotated[
    Union[TaskRunProgressStatsEvent, TaskRunProgressMessageEvent, TaskRunEvent, ErrorEvent],
    ...,
]


# ---------------------------------------------------------------------------
# Beta Task Group + FindAll (high-level summary)
# ---------------------------------------------------------------------------

class TaskGroupStatus(BaseModel):
    """Status of a task group."""
    is_active: bool
    """True if at least one run in the group is currently active, i.e.

    status is one of {'cancelling', 'queued', 'running'}.
    """
    modified_at: Optional[str]
    """Timestamp of the last status update to the group, as an RFC 3339 string."""
    num_task_runs: int
    """Number of task runs in the group."""
    status_message: Optional[str]
    """Human-readable status message for the group."""
    task_run_status_counts: Dict[str, int]
    """Number of task runs with each status."""

class TaskGroup(BaseModel):
    """Response object for a task group, including its status and metadata."""
    created_at: Optional[str]
    """Timestamp of the creation of the group, as an RFC 3339 string."""
    status: TaskGroupStatus
    """Status of the group."""
    task_group_id: str
    """ID of the group."""
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    """User-provided metadata stored with the group."""

class TaskGroupRunResponse(BaseModel):
    """Response from adding new task runs to a task group."""
    event_cursor: Optional[str]
    """
    Cursor for these runs in the event stream at
    taskgroup/events?last_event_id=<event_cursor>. Empty for the first runs in the
    group.
    """
    run_cursor: Optional[str]
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

TaskGroupEventsResponse: TypeAlias = Annotated[
    Union[TaskGroupStatusEvent, TaskRunEvent, ErrorEvent],
    ...,
]

TaskGroupGetRunsResponse: TypeAlias = Annotated[Union[TaskRunEvent, ErrorEvent], ...]


# ---------------------------------------------------------------------------
# Beta Resources (SDK classes)
# ---------------------------------------------------------------------------

class BetaTaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        enable_events: Optional[bool] | Omit = ...,
        mcp_servers: Optional[Iterable["McpServerParam"]] | Omit = ...,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        source_policy: Optional["types.shared_params.SourcePolicy"] | Omit = ...,
        task_spec: Optional[TaskSpecParam] | Omit = ...,
        webhook: Optional["WebhookParam"] | Omit = ...,
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
        ...

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
        ...

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
        ...

class AsyncBetaTaskRunResource:
    async def create(self, **kwargs: Any) -> TaskRun: ...
    async def events(self, run_id: str, **kwargs: Any) -> AsyncStream[TaskRunEventsResponse]: ...
    async def result(self, run_id: str, **kwargs: Any) -> BetaTaskRunResult: ...

class BetaResource:
    task_run: BetaTaskRunResource
    # also task_group, findall; plus beta.search and beta.extract

    def extract(
        self,
        *,
        urls: Sequence[str],
        excerpts: Union[bool, "ExcerptSettingsParam"] | Omit = ...,
        fetch_policy: Optional["FetchPolicyParam"] | Omit = ...,
        full_content: Union[bool, TypedDict] | Omit = ...,
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
        ...

    def search(
        self,
        *,
        excerpts: "ExcerptSettingsParam" | Omit = ...,
        fetch_policy: Optional["FetchPolicyParam"] | Omit = ...,
        max_chars_per_result: Optional[int] | Omit = ...,
        max_results: Optional[int] | Omit = ...,
        mode: Optional[Literal["one-shot", "agentic"]] | Omit = ...,
        objective: Optional[str] | Omit = ...,
        processor: Optional[Literal["base", "pro"]] | Omit = ...,
        search_queries: Optional[Sequence[str]] | Omit = ...,
        source_policy: Optional["types.shared_params.SourcePolicy"] | Omit = ...,
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
        ...


class AsyncBetaResource:
    task_run: AsyncBetaTaskRunResource
    async def extract(self, **kwargs: Any) -> ExtractResponse: ...
    async def search(self, **kwargs: Any) -> SearchResult: ...


# ---------------------------------------------------------------------------
# Top-level client classes
# ---------------------------------------------------------------------------

class Parallel:
    api_key: str
    task_run: TaskRunResource
    beta: BetaResource

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
    ) -> Parallel: ...

    with_options: Callable[..., Parallel]

class AsyncParallel:
    api_key: str
    task_run: AsyncTaskRunResource
    beta: AsyncBetaResource

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
    ) -> AsyncParallel: ...

    with_options: Callable[..., AsyncParallel]

Client = Parallel
AsyncClient = AsyncParallel


# ---------------------------------------------------------------------------
# Defaults exported
# ---------------------------------------------------------------------------

DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits


# ---------------------------------------------------------------------------
# Utility exported in __init__
# ---------------------------------------------------------------------------

def file_from_path(path: str) -> Any: ...


# ---------------------------------------------------------------------------
# lib._parsing exports (as seen in parallel/lib/_parsing/__init__.py)
# ---------------------------------------------------------------------------

def build_task_spec_param(
    output_format: OutputSchemaParam | Type[OutputT] | Omit | None,
    _: Union[str, object],
) -> TaskSpecParam | Omit: ...

def task_run_result_parser(
    run_result: TaskRunResult,
    output_format: Union[OutputSchemaParam, Type[OutputT]] | Omit | None,
) -> TaskRunResult | ParsedTaskRunResult[OutputT]: ...
```

If you want, I can also generate an **“everything including internals”** version (it will be huge), or produce a **compressed LLM-oriented “cheat sheet” `.pyi`** that keeps only the call paths and key models (e.g., `Parallel -> task_run.execute/result/create`, `beta.search/extract`, `beta.task_group.*`, `beta.findall.*`).