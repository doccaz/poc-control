from app.crypto import decrypt_secret
from app.models import User


def resolve_api_key(user: User | None) -> str | None:
    """Chave pessoal do Gemini do usuário, se ele tiver cadastrado uma (pra billing cair na
    conta dele). Se não tiver (ou a descriptografia falhar), volta None e quem chamar usa a
    chave compartilhada do .env como fallback."""
    if user is None or not user.gemini_api_key_encrypted:
        return None
    return decrypt_secret(user.gemini_api_key_encrypted)
