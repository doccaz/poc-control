import logging

from fastapi import FastAPI
from sqlalchemy import text

from app.auth import router as auth_router
from app.db import SessionLocal
from app.pocs.router import router as pocs_router
from app.procedimentos.router import router as procedimentos_router
from app.users import router as users_router

# Sem isso, logger.warning/info/exception dos nossos módulos (app.gemini, app.pocs.tasks etc.)
# não aparecem em `docker logs` — o root logger do Python não tem handler por padrão, e o
# logging do uvicorn não propaga pros loggers da aplicação sozinho. Foi assim que um 503 real
# do Gemini na extração de uma PoC ficou invisível nos logs (só o traceback.exception ia pro
# "void"); isso garante que INFO pra cima sempre vá pro stdout do container.
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

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
