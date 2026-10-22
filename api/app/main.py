from fastapi import FastAPI
from sqlalchemy import text

from app.auth import router as auth_router
from app.db import SessionLocal
from app.pocs.router import router as pocs_router
from app.procedimentos.router import router as procedimentos_router
from app.users import router as users_router

app = FastAPI(title="POC Control")
app.include_router(auth_router)
app.include_router(procedimentos_router)
app.include_router(pocs_router)
app.include_router(users_router)


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
