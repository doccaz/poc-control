import uuid

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import settings

_hasher = PasswordHasher()
_serializer = URLSafeTimedSerializer(settings.session_secret, salt="poc-control-session")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def create_session_cookie(user_id: uuid.UUID) -> str:
    return _serializer.dumps({"user_id": str(user_id)})


def read_session_cookie(token: str) -> uuid.UUID | None:
    try:
        data = _serializer.loads(token, max_age=settings.session_max_age_seconds)
    except (BadSignature, SignatureExpired):
        return None
    try:
        return uuid.UUID(data["user_id"])
    except (KeyError, ValueError, TypeError):
        return None
