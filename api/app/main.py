from fastapi import FastAPI
from sqlalchemy import text

from app.auth import router as auth_router
from app.db import SessionLocal

app = FastAPI(title="POC Control")
app.include_router(auth_router)


@app.get("/api/health")
def health():
    db_status = "ok"
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"
    finally:
        db.close()

    return {"status": "ok", "db": db_status}
