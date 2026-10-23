import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


def _fernet() -> Fernet:
    # deriva uma chave Fernet (32 bytes, url-safe base64) do SESSION_SECRET já existente,
    # pra não precisar de mais um segredo no .env só pra isso.
    chave = hashlib.sha256(settings.session_secret.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(chave))


def encrypt_secret(valor: str) -> str:
    return _fernet().encrypt(valor.encode()).decode()


def decrypt_secret(token: str) -> str | None:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return None
