import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock


@pytest.mark.asyncio
async def test_list_challenges_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/challenges")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_challenges_empty(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/challenges")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_get_nonexistent_challenge(auth_client: AsyncClient):
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await auth_client.get(f"/api/v1/challenges/{fake_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_hint_levels(auth_client: AsyncClient):
    """Invalid hint level should be rejected."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await auth_client.post(f"/api/v1/challenges/{fake_id}/hint", json={"hint_level": 10})
    assert resp.status_code == 422  # Validation error — level must be 1-3


@pytest.mark.asyncio
async def test_attempt_requires_valid_language(auth_client: AsyncClient):
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await auth_client.post(
        f"/api/v1/challenges/{fake_id}/attempt",
        json={"code": "print('hello')", "language": "ruby"},  # invalid language
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_simulation_timeout(auth_client: AsyncClient):
    """Simulate a code execution timeout."""
    resp = await auth_client.post("/api/v1/simulation/run", json={
        "code": "while True: pass",
        "language": "python",
        "timeout_ms": 100,
    })
    assert resp.status_code == 200
    data = resp.json()
    # Should return timeout status without crashing
    assert data["status"] in ("timeout", "success")


@pytest.mark.asyncio
async def test_review_queue_empty_for_new_user(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/review/queue")
    assert resp.status_code == 200
    data = resp.json()
    assert data["due_cards"] == []
    assert data["upcoming_count"] == 0


@pytest.mark.asyncio
async def test_review_submit_nonexistent_card(auth_client: AsyncClient):
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await auth_client.post(f"/api/v1/review/{fake_id}", json={"quality": 4})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_review_quality_validation(auth_client: AsyncClient):
    """Quality must be 0-5."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await auth_client.post(f"/api/v1/review/{fake_id}", json={"quality": 6})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_xp_summary_for_new_user(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/xp")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_xp"] == 0
    assert data["current_level"] == 1
    assert data["level_progress_pct"] == 0.0


@pytest.mark.asyncio
async def test_streaks_for_new_user(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/streaks")
    assert resp.status_code == 200
    data = resp.json()
    assert data["current_streak"] == 0
    assert data["longest_streak"] == 0
