Yes. Below is a single **`parallel.pyi`** “API footprint” stub that’s meant for **LLM consumption** (high-level surface area + type shapes), not for perfect type-checking completeness. I included **docstrings copied 1:1 where they were present in the SDK files you shared** (notably: many docstrings live in the generated resource methods; I preserved those verbatim where feasible). For the many models whose docstrings were available in your dump, I also copied them 1:1.

> Notes / assumptions:
> - This stub focuses on the *public surface*: `parallel.__init__` exports, `Parallel` / `AsyncParallel`, `.task_run`, `.beta` resources, and the `types` module footprint (models + params) that appear in your tree.
> - Internals (`_base_client`, `_response`, `_streaming`, `_utils`, etc.) are represented only where they leak into the public API (e.g., `Stream`, `AsyncStream`, `Timeout triggered types`, `RequestOptions`, `BaseModel`).
> - A few “plumbing” types are simplified (e.g., `Headers`, `Query`, `NotGiven`, `Omit`), but named consistently with the SDK.
> - Some docstrings exist only inline in method bodies; those are preserved exactly when included below.

---

```py
# parallel.pyi
# Stubs summarizing the public API footprint of the `parallel` SDK.
# Generated for LLM consumption.

from __future__ import annotations

from datetime import date, datetime
from typing import (
    Any,
    Dict,
    Mapping,
    Optional,
    Union,
    List,
    Iterable,
    Iterator,
    AsyncIterator,
    Tuple,
    Type,
    TypeVar,
    Generic,
    Literal,
    overload,
)

import httpx
import pydantic


# ---------------------------
# Package metadata
# ---------------------------

__title__: str
__version__: str


# ---------------------------
# Sentinel / helper types
# ---------------------------

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


# ---------------------------
# Core request option types
# ---------------------------

Timeout = httpx.Timeout
Transport = httpx.BaseTransport
ProxiesTypes = Union[str, httpx.Proxy, Dict[Union[str, httpx.URL], Union[None, str, httpx.URL, httpx.Proxy]]]

Headers = Mapping[str, Union[str, Omit]]
Query = Mapping[str, object]
Body = object

class RequestOptions(Dict[str, Any], total=False):
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


# ---------------------------
# Exceptions (public)
# ---------------------------

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


# ---------------------------
# BaseModel (public)
# ---------------------------

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


# ---------------------------
# Streaming public types
# ---------------------------

_TStreamChunk = TypeVar("_TStreamChunk")

class Stream(Generic[_TStreamChunk]):
    """Provides the core interface to iterate over a synchronous stream response."""
    response: httpx.Response
    def __iter__(self) -> Iterator[_TStreamChunk]: ...
    def __next__(self) -> _TStreamChunk: ...
    def close(self) -> None: ...
    def __enter__(self) -> Stream[_TStreamChunk]: ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

class AsyncStream(Generic[_TStreamChunk]):
    """Provides the core interface to iterate over an asynchronous stream response."""
    response: httpx.Response
    def __aiter__(self) -> AsyncIterator[_TStreamChunk]: ...
    async def __anext__(self) -> _TStreamChunk: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> AsyncStream[_TStreamChunk]: ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...


# ---------------------------
# Public client entrypoints
# ---------------------------

class Client: ...
class AsyncClient: ...

class Parallel:
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
    def task_run(self) -> resources.task_run.TaskRunResource: ...
    @property
    def beta(self) -> resources.beta.beta.BetaResource: ...

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
    with_options: Any

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
    def task_run(self) -> resources.task_run.AsyncTaskRunResource: ...
    @property
    def beta(self) -> resources.beta.beta.AsyncBetaResource: ...

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
    with_options: Any

Client = Parallel
AsyncClient = AsyncParallel


# Raw / streaming wrappers
class ParallelWithRawResponse:
    @property
    def task_run(self) -> resources.task_run.TaskRunResourceWithRawResponse: ...
    @property
    def beta(self) -> resources.beta.beta.BetaResourceWithRawResponse: ...

class AsyncParallelWithRawResponse:
    @property
    def task_run(self) -> resources.task_run.AsyncTaskRunResourceWithRawResponse: ...
    @property
    def beta(self) -> resources.beta.beta.AsyncBetaResourceWithRawResponse: ...

class ParallelWithStreamedResponse:
    @property
    def task_run(self) -> resources.task_run.TaskRunResourceWithStreamingResponse: ...
    @property
    def beta(self) -> resources.beta.beta.BetaResourceWithStreamingResponse: ...

class AsyncParallelWithStreamedResponse:
    @property
    def task_run(self) -> resources.task_run.AsyncTaskRunResourceWithStreamingResponse: ...
    @property
    def beta(self) -> resources.beta.beta.AsyncBetaResourceWithStreamingResponse: ...


# ---------------------------
# types module (public)
# ---------------------------

class types:
    # ---- shared ----
    class Warning(BaseModel):
        """Human-readable message for a task."""
        message: str
        """
        Human-readable message.
        """
        type: Literal["spec_validation_warning", "input_validation_warning", "warning"]
        """
        Type of warning.

        Note that adding new warning types is considered a backward-compatible change.
        """
        detail: Optional[Dict[str, object]]

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
        error: types.ErrorObject
        """Error."""
        type: Literal["error"]
        """Always 'error'."""

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
        citations: Optional[List[types.Citation]]
        """List of citations supporting the output field."""
        confidence: Optional[str]
        """Confidence level for the output field.

        Only certain processors provide confidence levels.
        """

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

    OutputSchema = Union["types.JsonSchema", "types.TextSchema", "types.AutoSchema", str]
    InputSchema = Union[str, "types.JsonSchema", "types.TextSchema", None]

    class TaskSpec(BaseModel):
        """Specification for a task.

        Auto output schemas can be specified by setting `output_schema={"type":"auto"}`. Not
        specifying a TaskSpec is the same as setting an auto output schema.

        For convenience bare strings are also accepted as input or output schemas.
        """
        output_schema: types.OutputSchema
        """JSON schema or text fully describing the desired output from the task.

        Descriptions of output fields will determine the form and content of the
        response. A bare string is equivalent to a text schema with the same
        description.
        """
        input_schema: Optional[types.InputSchema]
        """Optional JSON schema or text description of expected input to the task.

        A bare string is equivalent to a text schema with the same description.
        """

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
        error: Optional[types.ErrorObject]
        """An error message."""
        metadata: Optional[Dict[str, Union[str, float, bool]]]
        """User-provided metadata stored with the run."""
        task_group_id: Optional[str]
        """ID of the taskgroup to which the run belongs."""
        warnings: Optional[List[types.Warning]]
        """Warnings for the run, if any."""

    class TaskRunTextOutput(BaseModel):
        """Output from a task that returns text."""
        basis: List[types.FieldBasis]
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
        basis: List[types.FieldBasis]
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

    Output = Union["types.TaskRunTextOutput", "types.TaskRunJsonOutput"]

    class TaskRunResult(BaseModel):
        """Result of a task run."""
        output: types.Output
        """Output from the task conforming to the output schema."""
        run: types.TaskRun
        """Task run object with status 'completed'."""

    # ---- Params TypedDicts (core, non-beta) ----

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

    OutputSchemaParam = Union["types.JsonSchemaParam", "types.TextSchemaParam", "types.AutoSchemaParam", str]
    InputSchemaParam = Union[str, "types.JsonSchemaParam", "types.TextSchemaParam"]

    OutputT = TypeVar("OutputT", bound=pydantic.BaseModel)

    class TaskSpecParam(TypedDict, total=False):
        """Specification for a task.

        Auto output schemas can be specified by setting `output_schema={"type":"auto"}`. Not
        specifying a TaskSpec is the same as setting an auto output schema.

        For convenience bare strings are also accepted as input or output schemas.
        """
        output_schema: Required[types.OutputSchemaParam]
        """JSON schema or text fully describing the desired output from the task.

        Descriptions of output fields will determine the form and content of the
        response. A bare string is equivalent to a text schema with the same
        description.
        """
        input_schema: Optional[types.InputSchemaParam]
        """Optional JSON schema or text description of expected input to the task.

        A bare string is equivalent to a text schema with the same description.
        """

    class SourcePolicyParam(TypedDict, total=False):
        """Source policy for web search results.

        This policy governs which sources are allowed/disallowed in results.
        """
        after_date: Union[str, date, None]
        """Optional start date for filtering search results.

        Results will be limited to content published on or after this date. Provided as
        an RFC 3339 date string (YYYY-MM-DD).
        """
        exclude_domains: Iterable[str]
        """List of domains to exclude from results.

        If specified, sources from these domains will be excluded. Accepts plain domains
        (e.g., example.com, subdomain.example.gov) or bare domain extension starting
        with a period (e.g., .gov, .edu, .co.uk).
        """
        include_domains: Iterable[str]
        """List of domains to restrict the results to.

        If specified, only sources from these domains will be included. Accepts plain
        domains (e.g., example.com, subdomain.example.gov) or bare domain extension
        starting with a period (e.g., .gov, .edu, .co.uk).
        """

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
        source_policy: Optional[types.SourcePolicyParam]
        """Source policy for web search results.

        This policy governs which sources are allowed/disallowed in results.
        """
        task_spec: Optional[types.TaskSpecParam]
        """Specification for a task.

        Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
        Not specifying a TaskSpec is the same as setting an auto output schema.

        For convenience bare strings are also accepted as input or output schemas.
        """

    class TaskRunResultParams(TypedDict, total=False):
        api_timeout: int

    # ---- parsed result types ----

    ContentType = TypeVar("ContentType", bound=pydantic.BaseModel)

    class ParsedTaskRunTextOutput(types.TaskRunTextOutput, Generic[ContentType]):
        parsed: None
        """The parsed output from the task run."""

    class ParsedTaskRunJsonOutput(types.TaskRunJsonOutput, Generic[ContentType]):
        parsed: Optional[ContentType]
        """The parsed output from the task run."""

    class ParsedTaskRunResult(types.TaskRunResult, Generic[ContentType]):
        output: Union[types.ParsedTaskRunTextOutput[ContentType], types.ParsedTaskRunJsonOutput[ContentType]]
        """The parsed output from the task run."""

    # ---------------------------
    # beta types (types.beta.*)
    # ---------------------------

    class beta:
        ParallelBetaParam = Union[
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
            allowed_tools: Optional[List[str]]
            """List of allowed tools for the MCP server."""
            headers: Optional[Dict[str, str]]
            """Headers for the MCP server."""
            type: Optional[Literal["url"]]
            """Type of MCP server being configured. Always `url`."""

        class McpServerParam(TypedDict, total=False):
            """MCP server configuration."""
            name: Required[str]
            """Name of the MCP server."""
            url: Required[str]
            """URL of the MCP server."""
            allowed_tools: Optional[Iterable[str]]
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
            content: Optional[str]
            """Output received from the tool call, if successful."""
            error: Optional[str]
            """Error message if the tool call failed."""

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
            mcp_servers: Optional[List[types.beta.McpServer]]
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
            source_policy: Optional[types.SourcePolicy]
            """Source policy for web search results.

            This policy governs which sources are allowed/disallowed in results.
            """
            task_spec: Optional[types.TaskSpec]
            """Specification for a task.

            Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
            Not specifying a TaskSpec is the same as setting an auto output schema.

            For convenience bare strings are also accepted as input or output schemas.
            """
            webhook: Optional[types.beta.Webhook]
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
            mcp_servers: Optional[Iterable[types.beta.McpServerParam]]
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
            source_policy: Optional[types.SourcePolicyParam]
            """Source policy for web search results.

            This policy governs which sources are allowed/disallowed in results.
            """
            task_spec: Optional[types.TaskSpecParam]
            """Specification for a task.

            Auto output schemas can be specified by setting `output_schema={"type":"auto"}`.
            Not specifying a TaskSpec is the same as setting an auto output schema.

            For convenience bare strings are also accepted as input or output schemas.
            """
            webhook: Optional[types.beta.WebhookParam]
            """Webhooks for Task Runs."""

        class ErrorEvent(BaseModel):
            """Event indicating an error."""
            error: types.ErrorObject
            """Error."""
            type: Literal["error"]
            """Event type; always 'error'."""

        # --- task run events stream union ---
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
            source_stats: types.beta.TaskRunProgressStatsEventSourceStats
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

        class TaskRunEvent(BaseModel):
            """Event when a task run transitions to a non-active status.

            May indicate completion, cancellation, or failure.
            """
            event_id: Optional[str]
            """Cursor to resume the event stream. Always empty for non Task Group runs."""
            run: types.TaskRun
            """Task run object."""
            type: Literal["task_run.state"]
            """Event type; always 'task_run.state'."""
            input: Optional[types.beta.BetaRunInput]
            """Task run input with additional beta fields."""
            output: Optional[Union[types.TaskRunTextOutput, types.TaskRunJsonOutput, None]]
            """Output from the run; included only if requested and if status == `completed`."""

        TaskRunEventsResponse = Union[
            "types.beta.TaskRunProgressStatsEvent",
            "types.beta.TaskRunProgressMessageEvent",
            "types.beta.TaskRunEvent",
            "types.beta.ErrorEvent",
        ]

        # --- beta task run result (includes MCP tool calls) ---
        class OutputBetaTaskRunTextOutput(BaseModel):
            """Output from a task that returns text."""
            basis: List[types.FieldBasis]
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
            mcp_tool_calls: Optional[List[types.beta.McpToolCall]]
            """MCP tool calls made by the task."""

        class OutputBetaTaskRunJsonOutput(BaseModel):
            """Output from a task that returns JSON."""
            basis: List[types.FieldBasis]
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
            mcp_tool_calls: Optional[List[types.beta.McpToolCall]]
            """MCP tool calls made by the task."""
            output_schema: Optional[Dict[str, object]]
            """Output schema for the Task Run.

            Populated only if the task was executed with an auto schema.
            """

        BetaTaskRunOutput = Union["types.beta.OutputBetaTaskRunTextOutput", "types.beta.OutputBetaTaskRunJsonOutput"]

        class BetaTaskRunResult(BaseModel):
            """Result of a beta task run. Available only if beta headers are specified."""
            output: types.beta.BetaTaskRunOutput
            """Output from the task conforming to the output schema."""
            run: types.TaskRun
            """Beta task run object with status 'completed'."""

        # --- search/extract beta ---
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
            results: List[types.beta.WebSearchResult]
            """A list of WebSearchResult objects, ordered by decreasing relevance."""
            search_id: str
            """Search ID. Example: `search_cad0a6d2dec046bd95ae900527d880e7`"""
            usage: Optional[List[types.beta.UsageItem]]
            """Usage metrics for the search request."""
            warnings: Optional[List[types.Warning]]
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
            errors: List[types.beta.ExtractError]
            """Extract errors: requested URLs not in the results."""
            extract_id: str
            """Extract request ID, e.g. `extract_cad0a6d2dec046bd95ae900527d880e7`"""
            results: List[types.beta.ExtractResult]
            """Successful extract results."""
            usage: Optional[List[types.beta.UsageItem]]
            """Usage metrics for the extract request."""
            warnings: Optional[List[types.Warning]]
            """Warnings for the extract request, if any."""


# ---------------------------
# resources module (public)
# ---------------------------

class resources:
    class task_run:
        OutputT = TypeVar("OutputT", bound=pydantic.BaseModel)
        OutputSchema = Union[types.JsonSchema, types.TextSchema, types.AutoSchema, str]

        class TaskRunResource:
            def create(
                self,
                *,
                input: Union[str, Dict[str, object]],
                processor: str,
                metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
                source_policy: Optional[types.SourcePolicyParam] | Omit = ...,
                task_spec: Optional[types.TaskSpecParam] | Omit = ...,
                extra_headers: Headers | None = None,
                extra_query: Query | None = None,
                extra_body: Body | None = None,
                timeout: float | httpx.Timeout | None | NotGiven = ...,
            ) -> types.TaskRun:
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
            ) -> types.TaskRun:
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
            ) -> types.TaskRunResult:
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
            ) -> types.TaskRunResult: ...

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
            ) -> types.ParsedTaskRunResult[OutputT]: ...

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
            ) -> Union[types.TaskRunResult, types.ParsedTaskRunResult[OutputT]]:
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
                source_policy: Optional[types.SourcePolicyParam] | Omit = ...,
                task_spec: Optional[types.TaskSpecParam] | Omit = ...,
                extra_headers: Headers | None = None,
                extra_query: Query | None = None,
                extra_body: Body | None = None,
                timeout: float | httpx.Timeout | None | NotGiven = ...,
            ) -> types.TaskRun: ...

            async def retrieve(
                self,
                run_id: str,
                *,
                extra_headers: Headers | None = None,
                extra_query: Query | None = None,
                extra_body: Body | None = None,
                timeout: float | httpx.Timeout | None | NotGiven = ...,
            ) -> types.TaskRun: ...

            async def result(
                self,
                run_id: str,
                *,
                api_timeout: int | Omit = ...,
                extra_headers: Headers | None = None,
                extra_query: Query | None = None,
                extra_body: Body | None = None,
                timeout: float | httpx.Timeout | None | NotGiven = ...,
            ) -> types.TaskRunResult: ...

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
            ) -> types.TaskRunResult: ...

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
            ) -> types.ParsedTaskRunResult[OutputT]: ...

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
            ) -> Union[types.TaskRunResult, types.ParsedTaskRunResult[OutputT]]: ...

        # wrapper classes are exposed via client.with_raw_response / with_streaming_response
        class TaskRunResourceWithRawResponse: ...
        class AsyncTaskRunResourceWithRawResponse: ...
        class TaskRunResourceWithStreamingResponse: ...
        class AsyncTaskRunResourceWithStreamingResponse: ...

    class beta:
        class beta:
            class BetaResource:
                @property
                def task_run(self) -> resources.beta.task_run.TaskRunResource: ...
                @property
                def task_group(self) -> resources.beta.task_group.TaskGroupResource: ...
                @property
                def findall(self) -> resources.beta.findall.FindAllResource: ...

                def extract(
                    self,
                    *,
                    urls: Iterable[str],
                    betas: List[types.beta.ParallelBetaParam],
                    excerpts: Union[bool, types.beta.ExcerptSettingsParam] | Omit = ...,
                    fetch_policy: Optional[types.beta.FetchPolicyParam] | Omit = ...,
                    full_content: Union[bool, Dict[str, Optional[int]]] | Omit = ...,
                    objective: Optional[str] | Omit = ...,
                    search_queries: Optional[Iterable[str]] | Omit = ...,
                    extra_headers: Headers | None = None,
                    extra_query: Query | None = None,
                    extra_body: Body | None = None,
                    timeout: float | httpx.Timeout | None | NotGiven = ...,
                ) -> types.beta.ExtractResponse:
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
                    excerpts: types.beta.ExcerptSettingsParam | Omit = ...,
                    fetch_policy: Optional[types.beta.FetchPolicyParam] | Omit = ...,
                    max_chars_per_result: Optional[int] | Omit = ...,
                    max_results: Optional[int] | Omit = ...,
                    mode: Optional[Literal["one-shot", "agentic"]] | Omit = ...,
                    objective: Optional[str] | Omit = ...,
                    processor: Optional[Literal["base", "pro"]] | Omit = ...,
                    search_queries: Optional[Iterable[str]] | Omit = ...,
                    source_policy: Optional[types.SourcePolicyParam] | Omit = ...,
                    betas: List[types.beta.ParallelBetaParam] | Omit = ...,
                    extra_headers: Headers | None = None,
                    extra_query: Query | None = None,
                    extra_body: Body | None = None,
                    timeout: float | httpx.Timeout | None | NotGiven = ...,
                ) -> types.beta.SearchResult:
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
                @property
                def task_run(self) -> resources.beta.task_run.AsyncTaskRunResource: ...
                @property
                def task_group(self) -> resources.beta.task_group.AsyncTaskGroupResource: ...
                @property
                def findall(self) -> resources.beta.findall.AsyncFindAllResource: ...

                async def extract(self, *, urls: Iterable[str], betas: List[types.beta.ParallelBetaParam], **kwargs: Any) -> types.beta.ExtractResponse: ...
                async def search(self, **kwargs: Any) -> types.beta.SearchResult: ...

            class BetaResourceWithRawResponse: ...
            class AsyncBetaResourceWithRawResponse: ...
            class BetaResourceWithStreamingResponse: ...
            class AsyncBetaResourceWithStreamingResponse: ...

        class task_run:
            class TaskRunResource:
                def create(
                    self,
                    *,
                    input: Union[str, Dict[str, object]],
                    processor: str,
                    enable_events: Optional[bool] | Omit = ...,
                    mcp_servers: Optional[Iterable[types.beta.McpServerParam]] | Omit = ...,
                    metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
                    source_policy: Optional[types.SourcePolicyParam] | Omit = ...,
                    task_spec: Optional[types.TaskSpecParam] | Omit = ...,
                    webhook: Optional[types.beta.WebhookParam] | Omit = ...,
                    betas: List[types.beta.ParallelBetaParam] | Omit = ...,
                    extra_headers: Headers | None = None,
                    extra_query: Query | None = None,
                    extra_body: Body | None = None,
                    timeout: float | httpx.Timeout | None | NotGiven = ...,
                ) -> types.TaskRun:
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
                ) -> Stream[types.beta.TaskRunEventsResponse]:
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
                    betas: List[types.beta.ParallelBetaParam] | Omit = ...,
                    extra_headers: Headers | None = None,
                    extra_query: Query | None = None,
                    extra_body: Body | None = None,
                    timeout: float | httpx.Timeout | None | NotGiven = ...,
                ) -> types.beta.BetaTaskRunResult:
                    """
                    Retrieves a run result by run_id, blocking until the run is completed.

                    Args:
                      betas: Optional header to specify the beta version(s) to enable.

                      extra_headers: Send extra headers

                      extra_query: Add additional query parameters to the request

                      extra_body: Add additional JSON properties to the request

                      timeout: Override the client-level default timeout for this request, in seconds
                    """

            class AsyncTaskRunResource:
                async def create(self, **kwargs: Any) -> types.TaskRun: ...
                async def events(self, run_id: str, **kwargs: Any) -> AsyncStream[types.beta.TaskRunEventsResponse]: ...
                async def result(self, run_id: str, **kwargs: Any) -> types.beta.BetaTaskRunResult: ...

            class TaskRunResourceWithRawResponse: ...
            class AsyncTaskRunResourceWithRawResponse: ...
            class TaskRunResourceWithStreamingResponse: ...
            class AsyncTaskRunResourceWithStreamingResponse: ...

        class task_group:
            # only top-level signatures to keep size manageable
            class TaskGroupResource: ...
            class AsyncTaskGroupResource: ...

        class findall:
            class FindAllResource: ...
            class AsyncFindAllResource: ...


# Re-exported top-level
# (matches parallel/__init__.py exports)
__all__: List[str]
```

---

If you want, I can also:
1) **Auto-generate this stub** programmatically from your repository (AST-based) so it stays in sync with future releases, or  
2) Expand the stub to include **every single `types.beta.*` FindAll schema / events / task group methods** (I kept the file shorter by not inlining all FindAll resource method docstrings + types, but it’s straightforward to add).