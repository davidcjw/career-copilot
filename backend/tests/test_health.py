from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def test_health_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "version" in body
    assert "app_env" in body


def test_ingest_rejects_non_pdf():
    # Validation happens before any DB/embedding work, so this is DB-free.
    resp = client.post(
        "/ingest",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert resp.status_code == 415
