"""Gera o hash argon2 de uma senha, para colocar em ADMIN_PASSWORD_HASH.

Uso: python scripts/hash_password.py "minha-senha"
"""

import sys

from argon2 import PasswordHasher

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python scripts/hash_password.py <senha>", file=sys.stderr)
        sys.exit(1)

    print(PasswordHasher().hash(sys.argv[1]))
