from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_admin_user
from app.models import User
from app.security import hash_password

router = APIRouter(prefix="/api/users", tags=["users"], dependencies=[Depends(get_current_admin_user)])


class UsuarioCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    is_admin: bool = False


class UsuarioOut(BaseModel):
    id: str
    email: str
    is_admin: bool
    created_at: datetime
    ultimo_login: datetime | None


@router.get("", response_model=list[UsuarioOut])
def listar_usuarios(db: Session = Depends(get_db)):
    usuarios = db.query(User).order_by(User.created_at).all()
    return [
        UsuarioOut(
            id=str(u.id),
            email=u.email,
            is_admin=u.is_admin,
            created_at=u.created_at,
            ultimo_login=u.ultimo_login,
        )
        for u in usuarios
    ]


@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def criar_usuario(payload: UsuarioCreate, db: Session = Depends(get_db)):
    existente = db.query(User).filter(User.email == payload.email).first()
    if existente is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe um usuário com esse e-mail")

    usuario = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        is_admin=payload.is_admin,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    return UsuarioOut(
        id=str(usuario.id),
        email=usuario.email,
        is_admin=usuario.is_admin,
        created_at=usuario.created_at,
        ultimo_login=usuario.ultimo_login,
    )
