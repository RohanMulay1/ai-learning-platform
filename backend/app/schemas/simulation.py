from pydantic import BaseModel, Field
from typing import Literal


class TestCase(BaseModel):
    input: str
    expected_output: str


class SimulationRunRequest(BaseModel):
    code: str = Field(min_length=1)
    language: Literal["python", "javascript", "typescript"]
    test_cases: list[TestCase] | None = None
    timeout_ms: int = 5000
    memory_limit_mb: int = 256


class StackFrame(BaseModel):
    frame_number: int
    function_name: str
    variables: dict
    line: int


class SimulationRunResponse(BaseModel):
    execution_id: str
    status: Literal["success", "error", "timeout"]
    output: str
    runtime_ms: int
    memory_used_bytes: int | None = None
    test_results: list[dict] | None = None
    state_snapshots: list[StackFrame] | None = None
    error_message: str | None = None


class DebugRequest(BaseModel):
    code: str
    language: Literal["python", "javascript", "typescript"]
    breakpoints: list[int]


class DebugTransition(BaseModel):
    line: int
    variables: dict
    output_so_far: str


class DebugResponse(BaseModel):
    initial_state: StackFrame
    transitions: list[DebugTransition]


class VisualizationRequest(BaseModel):
    code: str
    language: Literal["python", "javascript", "typescript"]
    algorithm: str  # e.g. "binary_search", "merge_sort"


class VisualizationFrame(BaseModel):
    step: int
    description: str
    data_state: dict
    highlighted_lines: list[int]


class VisualizationResponse(BaseModel):
    frames: list[VisualizationFrame]
    time_complexity: str
    space_complexity: str
    algorithm_name: str
