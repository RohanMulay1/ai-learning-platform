import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "new@test.com",
        "password": "password123",
        "first_name": "New",
        "last_name": "User",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {"email": "dupe@test.com", "password": "password123"}
    await client.post("/api/v1/auth/register", json=payload)
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={"email": "login@test.com", "password": "password123"})
    resp = await client.post("/api/v1/auth/login", json={"email": "login@test.com", "password": "password123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={"email": "user2@test.com", "password": "password123"})
    resp = await client.post("/api/v1/auth/login", json={"email": "user2@test.com", "password": "WRONG"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 403  # No auth header


@pytest.mark.asyncio
async def test_me_returns_user(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@test.com"
    assert data["current_level"] == 1
    assert "current_streak" in data


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={"email": "refresh@test.com", "password": "password123"})
    refresh_token = reg.json()["refresh_token"]
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_invalid_token_rejected(client: AsyncClient):
    client.headers["Authorization"] = "Bearer invalidtoken123"
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
