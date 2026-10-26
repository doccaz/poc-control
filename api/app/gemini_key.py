from app.crypto import decrypt_secret
from app.models import User


def resolve_api_key(user: User | None) -> str | None:
    """Chave pessoal do Gemini do usuário, se ele tiver cadastrado uma (pra billing cair na
    conta dele). Se não tiver (ou a descriptografia falhar), volta None e quem chamar usa a
    chave compartilhada do .env como fallback."""
    if user is None or not user.gemini_api_key_encrypted:
        return None
    return decrypt_secret(user.gemini_api_key_encrypted)


def resolve_model(user: User | None) -> str | None:
    """Modelo de texto do Gemini escolhido pelo usuário (ver Minha conta). Nulo se ele não
    tiver fixado um — quem chamar usa o default do servidor (gemini.py:_TEXT_MODEL). Cada chave
    de API pode ter acesso a um conjunto diferente de modelos, por isso isso não é um enum."""
    if user is None or not user.gemini_model:
        return None
    return user.gemini_model
