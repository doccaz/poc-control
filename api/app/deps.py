from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.security import read_session_cookie

SESSION_COOKIE_NAME = "poc_control_session"


def get_current_user(
    poc_control_session: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    if poc_control_session is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Não autenticado")

    user_id = read_session_cookie(poc_control_session)
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão inválida ou expirada")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuário não encontrado")

    return user


def get_current_admin_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Apenas administradores podem fazer isso")
    return user
