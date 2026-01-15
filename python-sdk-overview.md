Yes — but I can’t produce a *single* `.pyi` that “summarizes the entire footprint” *and* “include doc-comments 1:1” from the entire tree in one response here: your SDK is large enough that the resulting stub would be many thousands of lines and will exceed typical message limits.

What I *can* do immediately is:

1) Provide a **complete, accurate, single-file `.pyi` that covers the public API surface an LLM needs** (client entrypoints, resources, core types, key beta types, and exceptions), with **docstrings copied 1:1 wherever they exist in the shown sources**.

2) Also provide a **small script** you can run locally to generate the *full* monolithic `.pyi` from your checkout (so you get everything, including all docstrings, without truncation).

Below is (A) a practical monolithic `.pyi` focused on the public surface, and (B) a generator script that will create an exhaustive monolithic `.pyi` from the repo.

---

## A) `parallel_api.pyi` (single-file “LLM footprint” stub)

> This captures the key public API: `Parallel/AsyncParallel`, resources (`task_run`, `beta`, plus beta subresources), `types` re-exports, and exceptions/constants.  
> Docstrings included **only where present in your snippets** (most public docstrings are in the resource methods).

```pyi
# parallel_api.pyi
# Monolithic stub summarizing the Parallel Python SDK public API footprint.
# (Generated manually from provided source listing.)

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
from datetime import date, datetime

import httpx
import pydantic

# ---------------------------------------------------------------------------
# Package metadata
# ---------------------------------------------------------------------------

__title__: str
__version__: str

# ---------------------------------------------------------------------------
# Common exported helper types (from parallel._types)
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
    def __bool__(self) -> bool: ...
    def __repr__(self) -> str: ...

not_given: NotGiven
NOT_GIVEN: NotGiven  # backwards compatibility alias

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
    def __bool__(self) -> bool: ...

omit: Omit

NoneType: Type[None]

Transport = httpx.BaseTransport
Timeout = httpx.Timeout
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

# ---------------------------------------------------------------------------
# Base model type exported as parallel.BaseModel
# ---------------------------------------------------------------------------

class BaseModel(pydantic.BaseModel):
    def to_dict(
        self,
        *,
        mode: str = "python",
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
# Exceptions exported from parallel._exceptions
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
# Constants exported from parallel._constants
# ---------------------------------------------------------------------------

DEFAULT_TIMEOUT: httpx.Timeout
DEFAULT_MAX_RETRIES: int
DEFAULT_CONNECTION_LIMITS: httpx.Limits

# ---------------------------------------------------------------------------
# Types (public models & params)
# ---------------------------------------------------------------------------

# shared models
class Warning(BaseModel):
    """Human-readable message for a task."""
    message: str
    type: str
    detail: Optional[Dict[str, object]] = None

class ErrorObject(BaseModel):
    """An error message."""
    message: str
    ref_id: str
    detail: Optional[Dict[str, object]] = None

class ErrorResponse(BaseModel):
    """Response object used for non-200 status codes."""
    error: ErrorObject
    type: str

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

class TextSchema(BaseModel):
    """Text description for a task input or output."""
    description: Optional[str] = None
    type: Optional[str] = None

class JsonSchema(BaseModel):
    """JSON schema for a task input or output."""
    json_schema: Dict[str, object]
    type: Optional[str] = None

class AutoSchema(BaseModel):
    """Auto schema for a task input or output."""
    type: Optional[str] = None

OutputSchema = Union[JsonSchema, TextSchema, AutoSchema, str]
InputSchema = Union[str, JsonSchema, TextSchema, None]

class TaskSpec(BaseModel):
    """Specification for a task.

    Auto output schemas can be specified by setting `output_schema={"type":"auto"}`. Not
    specifying a TaskSpec is the same as setting an auto output schema.

    For convenience bare strings are also accepted as input or output schemas.
    """
    output_schema: OutputSchema
    input_schema: Optional[InputSchema] = None

class TaskRun(BaseModel):
    """Status of a task run."""
    created_at: Optional[str] = None
    is_active: bool
    modified_at: Optional[str] = None
    processor: str
    run_id: str
    status: str
    error: Optional[ErrorObject] = None
    metadata: Optional[Dict[str, Union[str, float, bool]]] = None
    task_group_id: Optional[str] = None
    warnings: Optional[List[Warning]] = None

class TaskRunTextOutput(BaseModel):
    """Output from a task that returns text."""
    basis: List[FieldBasis]
    content: str
    type: str
    beta_fields: Optional[Dict[str, object]] = None

class TaskRunJsonOutput(BaseModel):
    """Output from a task that returns JSON."""
    basis: List[FieldBasis]
    content: Dict[str, object]
    type: str
    beta_fields: Optional[Dict[str, object]] = None
    output_schema: Optional[Dict[str, object]] = None

TaskRunResultOutput = Union[TaskRunTextOutput, TaskRunJsonOutput]

class TaskRunResult(BaseModel):
    """Result of a task run."""
    output: TaskRunResultOutput
    run: TaskRun

# ---- Parsed result generic wrapper
_OutputT = TypeVar("_OutputT", bound=pydantic.BaseModel)

class ParsedTaskRunTextOutput(TaskRunTextOutput, Generic[_OutputT]):
    parsed: None
    """The parsed output from the task run."""

class ParsedTaskRunJsonOutput(TaskRunJsonOutput, Generic[_OutputT]):
    parsed: Optional[_OutputT] = None
    """The parsed output from the task run."""

class ParsedTaskRunResult(TaskRunResult, Generic[_OutputT]):
    output: Union[ParsedTaskRunTextOutput[_OutputT], ParsedTaskRunJsonOutput[_OutputT]]
    """The parsed output from the task run."""

# ---- Params typed dicts (representative; full set is large)
class SourcePolicy(TypedDict, total=False):
    after_date: Union[str, date, None]
    exclude_domains: Sequence[str]
    include_domains: Sequence[str]

class TaskRunCreateParams(TypedDict, total=False):
    input: Union[str, Dict[str, object]]
    processor: str
    metadata: Optional[Dict[str, Union[str, float, bool]]]
    source_policy: Optional[SourcePolicy]
    task_spec: Optional[Dict[str, object]]

class TaskRunResultParams(TypedDict, total=False):
    api_timeout: int  # alias "timeout" in wire form

# ---------------------------------------------------------------------------
# Streaming primitives (SSE)
# ---------------------------------------------------------------------------

_T_co = TypeVar("_T_co", covariant=True)

class Stream(Generic[_T_co]):
    response: httpx.Response
    def __iter__(self) -> Iterator[_T_co]: ...
    def __next__(self) -> _T_co: ...
    def close(self) -> None: ...
    def __enter__(self) -> "Stream[_T_co]": ...
    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

class AsyncStream(Generic[_T_co]):
    response: httpx.Response
    def __aiter__(self) -> AsyncIterator[_T_co]: ...
    async def __anext__(self) -> _T_co: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> "AsyncStream[_T_co]": ...
    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: Any) -> None: ...

# ---------------------------------------------------------------------------
# Resources: /v1/tasks/runs
# ---------------------------------------------------------------------------

class TaskRunResource:
    def create(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        source_policy: Optional[SourcePolicy] | Omit = ...,
        task_spec: Optional[Dict[str, object]] | Omit = ...,
        extra_headers: Mapping[str, str] | None = ...,
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
        extra_headers: Mapping[str, str] | None = ...,
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
        extra_headers: Mapping[str, str] | None = ...,
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
        extra_headers: Mapping[str, str] | None = ...,
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
        output: Type[_OutputT],
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> ParsedTaskRunResult[_OutputT]: ...

    def execute(
        self,
        *,
        input: Union[str, Dict[str, object]],
        processor: str,
        metadata: Optional[Dict[str, Union[str, float, bool]]] | Omit = ...,
        output: Optional[OutputSchema] | Type[_OutputT] | Omit = ...,
        extra_headers: Mapping[str, str] | None = ...,
        extra_query: Query | None = ...,
        extra_body: Body | None = ...,
        timeout: float | httpx.Timeout | None | NotGiven = ...,
    ) -> Union[TaskRunResult, ParsedTaskRunResult[_OutputT]]:
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
    async def result(self, run_id: str, *, api_timeout: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskRunResult: ...
    @overload
    async def execute(self, *, input: Union[str, Dict[str, object]], processor: str, metadata: Any = ..., output: Optional[OutputSchema] | Omit = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> TaskRunResult: ...
    @overload
    async def execute(self, *, input: Union[str, Dict[str, object]], processor: str, metadata: Any = ..., output: Type[_OutputT], extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> ParsedTaskRunResult[_OutputT]: ...
    async def execute(self, *, input: Union[str, Dict[str, object]], processor: str, metadata: Any = ..., output: Optional[OutputSchema] | Type[_OutputT] | Omit = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> Union[TaskRunResult, ParsedTaskRunResult[_OutputT]]: ...

# ---------------------------------------------------------------------------
# Beta API (high level)
# ---------------------------------------------------------------------------

# Beta header values
ParallelBetaParam = Union[
    str,
]

class BetaResource:
    # subresources
    @property
    def task_run(self) -> "BetaTaskRunResource": ...
    @property
    def task_group(self) -> "TaskGroupResource": ...
    @property
    def findall(self) -> "FindAllResource": ...

    def search(self, *, excerpts: Any = ..., fetch_policy: Any = ..., max_chars_per_result: Any = ..., max_results: Any = ..., mode: Any = ..., objective: Any = ..., processor: Any = ..., search_queries: Any = ..., source_policy: Any = ..., betas: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> "SearchResult":
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

    def extract(self, *, urls: Sequence[str], betas: List[ParallelBetaParam], excerpts: Any = ..., fetch_policy: Any = ..., full_content: Any = ..., objective: Any = ..., search_queries: Any = ..., extra_headers: Any = ..., extra_query: Any = ..., extra_body: Any = ..., timeout: Any = ...) -> "ExtractResponse":
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

class AsyncBetaResource:
    @property
    def task_run(self) -> "AsyncBetaTaskRunResource": ...
    @property
    def task_group(self) -> "AsyncTaskGroupResource": ...
    @property
    def findall(self) -> "AsyncFindAllResource": ...
    async def search(self, **kwargs: Any) -> "SearchResult": ...
    async def extract(self, **kwargs: Any) -> "ExtractResponse": ...

# ---------------------------------------------------------------------------
# Beta TaskRun / TaskGroup / FindAll (names simplified)
# ---------------------------------------------------------------------------

class TaskRunEventsResponse(BaseModel): ...
class TaskGroupEventsResponse(BaseModel): ...
class TaskGroupGetRunsResponse(BaseModel): ...
class FindAllEventsResponse(BaseModel): ...

class BetaTaskRunResult(BaseModel): ...

class BetaTaskRunResource:
    def create(self, **kwargs: Any) -> TaskRun: ...
    def events(self, run_id: str, **kwargs: Any) -> Stream[TaskRunEventsResponse]: ...
    def result(self, run_id: str, **kwargs: Any) -> BetaTaskRunResult: ...

class AsyncBetaTaskRunResource:
    async def create(self, **kwargs: Any) -> TaskRun: ...
    async def events(self, run_id: str, **kwargs: Any) -> AsyncStream[TaskRunEventsResponse]: ...
    async def result(self, run_id: str, **kwargs: Any) -> BetaTaskRunResult: ...

class TaskGroupResource:
    def create(self, **kwargs: Any) -> Any: ...
    def retrieve(self, task_group_id: str, **kwargs: Any) -> Any: ...
    def add_runs(self, task_group_id: str, **kwargs: Any) -> Any: ...
    def events(self, task_group_id: str, **kwargs: Any) -> Stream[TaskGroupEventsResponse]: ...
    def get_runs(self, task_group_id: str, **kwargs: Any) -> Stream[TaskGroupGetRunsResponse]: ...

class AsyncTaskGroupResource:
    async def create(self, **kwargs: Any) -> Any: ...
    async def retrieve(self, task_group_id: str, **kwargs: Any) -> Any: ...
    async def add_runs(self, task_group_id: str, **kwargs: Any) -> Any: ...
    async def events(self, task_group_id: str, **kwargs: Any) -> AsyncStream[TaskGroupEventsResponse]: ...
    async def get_runs(self, task_group_id: str, **kwargs: Any) -> AsyncStream[TaskGroupGetRunsResponse]: ...

class FindAllResource:
    def create(self, **kwargs: Any) -> Any: ...
    def retrieve(self, findall_id: str, **kwargs: Any) -> Any: ...
    def cancel(self, findall_id: str, **kwargs: Any) -> object: ...
    def enrich(self, findall_id: str, **kwargs: Any) -> Any: ...
    def events(self, findall_id: str, **kwargs: Any) -> Stream[FindAllEventsResponse]: ...
    def extend(self, findall_id: str, **kwargs: Any) -> Any: ...
    def ingest(self, **kwargs: Any) -> Any: ...
    def result(self, findall_id: str, **kwargs: Any) -> Any: ...
    def schema(self, findall_id: str, **kwargs: Any) -> Any: ...

class AsyncFindAllResource:
    async def create(self, **kwargs: Any) -> Any: ...
    async def retrieve(self, findall_id: str, **kwargs: Any) -> Any: ...
    async def cancel(self, findall_id: str, **kwargs: Any) -> object: ...
    async def enrich(self, findall_id: str, **kwargs: Any) -> Any: ...
    async def events(self, findall_id: str, **kwargs: Any) -> AsyncStream[FindAllEventsResponse]: ...
    async def extend(self, findall_id: str, **kwargs: Any) -> Any: ...
    async def ingest(self, **kwargs: Any) -> Any: ...
    async def result(self, findall_id: str, **kwargs: Any) -> Any: ...
    async def schema(self, findall_id: str, **kwargs: Any) -> Any: ...

# ---------------------------------------------------------------------------
# Client entrypoints: Parallel / AsyncParallel
# ---------------------------------------------------------------------------

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
    ) -> None:
        """Construct a new async AsyncParallel client instance.

        This automatically infers the `api_key` argument from the `PARALLEL_API_KEY` environment variable if it is not provided.
        """

    @property
    def task_run(self) -> AsyncTaskRunResource: ...

    @property
    def beta(self) -> AsyncBetaResource: ...

    def copy(self, **kwargs: Any) -> "AsyncParallel": ...
    with_options: Any

Client = Parallel
AsyncClient = AsyncParallel

# ---------------------------------------------------------------------------
# Optional: lazy resources module proxy (parallel.resources)
# ---------------------------------------------------------------------------

# Exposed at runtime as `parallel.resources` via a lazy proxy; type here:
class resources:
    TaskRunResource: Type[TaskRunResource]
    AsyncTaskRunResource: Type[AsyncTaskRunResource]
    # beta resources are available under resources.beta
    class beta:
        BetaResource: Type[BetaResource]
        AsyncBetaResource: Type[AsyncBetaResource]
        TaskRunResource: Type[BetaTaskRunResource]
        AsyncTaskRunResource: Type[AsyncBetaTaskRunResource]
        TaskGroupResource: Type[TaskGroupResource]
        AsyncTaskGroupResource: Type[AsyncTaskGroupResource]
        FindAllResource: Type[FindAllResource]
        AsyncFindAllResource: Type[AsyncFindAllResource]
```

If you want, I can expand this stub to include **every single `types/*` model and param TypedDict** (not just the “representative” ones above) — but it will be huge and should be delivered as a file artifact, not inline.

---

## B) Generator script to build an exhaustive single-file `.pyi` (recommended)

Run this in your repo root; it will:
- Walk `src/parallel`
- Parse each `.py` file
- Extract public classes/functions and docstrings
- Emit a monolithic `.pyi` with docstrings copied exactly

If you want, I can tailor it to include *private* too.

```py
# tools/gen_monolithic_pyi.py
from __future__ import annotations

import ast
import os
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
PKG = ROOT / "src" / "parallel"

def iter_py_files(root: Path) -> Iterable[Path]:
    for p in root.rglob("*.py"):
        # skip generated caches
        if "__pycache__" in p.parts:
            continue
        yield p

def is_public_name(name: str) -> bool:
    return not name.startswith("_")

def indent(s: str, n: int) -> str:
    pad = " " * n
    return "\n".join(pad + line if line else line for line in s.splitlines())

def docstring_block(ds: str | None, ind: int) -> str:
    if not ds:
        return ""
    # Copy 1:1 content inside triple quotes (no reflow).
    return indent(f'"""\n{ds}\n"""\n', ind)

def stub_for_function(fn: ast.FunctionDef | ast.AsyncFunctionDef, ind: int) -> str:
    # We intentionally do not attempt perfect signatures here; we preserve args names.
    # You can enhance with type comments/annotations if desired.
    args = []
    a = fn.args
    # positional-only
    for x in getattr(a, "posonlyargs", []):
        args.append(f"{x.arg}: Any")
    for x in a.args:
        if x.arg == "self":
            args.append("self")
        else:
            args.append(f"{x.arg}: Any")
    if a.vararg:
        args.append(f"*{a.vararg.arg}: Any")
    elif a.kwonlyargs:
        args.append("*")
    for x in a.kwonlyargs:
        args.append(f"{x.arg}: Any")
    if a.kwarg:
        args.append(f"**{a.kwarg.arg}: Any")
    prefix = "async def" if isinstance(fn, ast.AsyncFunctionDef) else "def"
    sig = f"{prefix} {fn.name}({', '.join(args)}) -> Any: ..."
    out = indent(sig + "\n", ind)
    out += docstring_block(ast.get_docstring(fn), ind)
    return out

def stub_for_class(cls: ast.ClassDef, ind: int) -> str:
    bases = []
    for b in cls.bases:
        try:
            bases.append(ast.unparse(b))
        except Exception:
            bases.append("object")
    base_part = f"({', '.join(bases)})" if bases else ""
    out = indent(f"class {cls.name}{base_part}:\n", ind)
    out += docstring_block(ast.get_docstring(cls), ind + 4)

    body_lines = []
    for node in cls.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and is_public_name(node.name):
            body_lines.append(stub_for_function(node, ind + 4).rstrip())
        # You can add support for Assign/AnnAssign here if you want class attrs.
    if not body_lines:
        body_lines = [indent("pass", ind + 4)]
    out += "\n".join(body_lines) + "\n"
    return out

def main() -> None:
    out_path = ROOT / "parallel_monolithic.pyi"
    chunks: list[str] = []
    chunks.append("# parallel_monolithic.pyi\n")
    chunks.append("from __future__ import annotations\n")
    chunks.append("from typing import Any\n\n")

    for py in sorted(iter_py_files(PKG)):
        rel = py.relative_to(ROOT)
        src = py.read_text(encoding="utf-8")
        try:
            mod = ast.parse(src)
        except SyntaxError:
            continue

        # Module header
        chunks.append(f"\n# --- {rel.as_posix()} ---\n")

        # (Optional) module docstring
        mdoc = ast.get_docstring(mod)
        if mdoc:
            chunks.append(f'"""\n{mdoc}\n"""\n\n')

        for node in mod.body:
            if isinstance(node, ast.ClassDef) and is_public_name(node.name):
                chunks.append(stub_for_class(node, 0))
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and is_public_name(node.name):
                chunks.append(stub_for_function(node, 0))

    out_path.write_text("".join(chunks), encoding="utf-8")
    print(f"Wrote {out_path}")

if __name__ == "__main__":
    main()
```

Run:
```bash
python tools/gen_monolithic_pyi.py
```

This produces `parallel_monolithic.pyi` containing docstrings copied verbatim from your sources.

---

### Quick question (so I can give you the exact file you want)
Do you want the monolithic `.pyi` to include:
1) **Only public API** (recommended for LLMs), or
2) **Everything including `_utils`, `_base_client`, internal helpers**, etc?

If you answer that, I can adjust the generator (filters + better signatures) and/or output a more complete single `.pyi` tailored to your goal.