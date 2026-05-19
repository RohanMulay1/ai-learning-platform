import uuid
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from app.api.dependencies import get_current_user
from app.schemas.simulation import (
    SimulationRunRequest, SimulationRunResponse,
    DebugRequest, DebugResponse, StackFrame,
    VisualizationRequest, VisualizationResponse, VisualizationFrame,
)
from app.models.user import User

router = APIRouter(tags=["simulation"])


async def _safe_execute(code: str, language: str, timeout_ms: int) -> dict:
    """
    Sandboxed code execution. Production: use Pyodide (WASM) or containerized executor.
    For the interview demo we simulate execution results.
    """
    await asyncio.sleep(0.1)  # Simulate execution time
    return {
        "status": "success",
        "output": "Execution simulated. In production, Pyodide/Deno runs this safely.",
        "runtime_ms": 42,
        "memory_used_bytes": 1024 * 32,
    }


@router.post("/run", response_model=SimulationRunResponse)
async def run_code(
    body: SimulationRunRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        result = await asyncio.wait_for(
            _safe_execute(body.code, body.language, body.timeout_ms),
            timeout=body.timeout_ms / 1000 + 1,
        )
    except asyncio.TimeoutError:
        return SimulationRunResponse(
            execution_id=str(uuid.uuid4()),
            status="timeout",
            output="",
            runtime_ms=body.timeout_ms,
            error_message=f"Execution exceeded {body.timeout_ms}ms limit",
        )

    test_results = None
    if body.test_cases:
        test_results = [
            {"input": tc.input, "expected": tc.expected_output, "passed": True}
            for tc in body.test_cases
        ]

    return SimulationRunResponse(
        execution_id=str(uuid.uuid4()),
        status=result["status"],
        output=result["output"],
        runtime_ms=result["runtime_ms"],
        memory_used_bytes=result.get("memory_used_bytes"),
        test_results=test_results,
    )


@router.post("/debug", response_model=DebugResponse)
async def debug_code(
    body: DebugRequest,
    current_user: User = Depends(get_current_user),
):
    # Simulated step-through debugger
    initial = StackFrame(frame_number=0, function_name="main", variables={}, line=1)
    transitions = [
        {"line": bp, "variables": {"step": i}, "output_so_far": f"Reached line {bp}"}
        for i, bp in enumerate(body.breakpoints)
    ]
    return DebugResponse(initial_state=initial, transitions=transitions)


@router.post("/visualize", response_model=VisualizationResponse)
async def visualize_algorithm(
    body: VisualizationRequest,
    current_user: User = Depends(get_current_user),
):
    # Returns animation frames for known algorithms
    algorithm_info = {
        "binary_search": {"time": "O(log n)", "space": "O(1)"},
        "merge_sort": {"time": "O(n log n)", "space": "O(n)"},
        "bubble_sort": {"time": "O(n²)", "space": "O(1)"},
        "bfs": {"time": "O(V + E)", "space": "O(V)"},
    }.get(body.algorithm, {"time": "O(n)", "space": "O(1)"})

    frames = [
        VisualizationFrame(
            step=i,
            description=f"Step {i + 1}: {body.algorithm} iteration",
            data_state={"iteration": i, "comparisons": i * 2},
            highlighted_lines=[i + 1],
        )
        for i in range(5)
    ]

    return VisualizationResponse(
        frames=frames,
        time_complexity=algorithm_info["time"],
        space_complexity=algorithm_info["space"],
        algorithm_name=body.algorithm,
    )
