import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "uptime_sec" in data
    assert data["fleet_size"] >= 1

@pytest.mark.asyncio
async def test_list_robots_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/robots")
    assert response.status_code == 200
    robots = response.json()
    assert isinstance(robots, list)
    assert any(r["id"] == "robot_alpha" for r in robots)

@pytest.mark.asyncio
async def test_environment_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/simulation/environment")
    assert response.status_code == 200
    data = response.json()
    assert "bounds" in data
    assert "obstacles" in data
    assert len(data["obstacles"]) > 0

@pytest.mark.asyncio
async def test_auth_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/auth/login", json={
            "username": "operator_alice",
            "password": "Password123!"
        })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["username"] == "operator_alice"
