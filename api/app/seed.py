from app.config import settings
from app.db import SessionLocal
from app.models import User


def seed_admin_user() -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == settings.admin_email).first()
        if user is None:
            user = User(email=settings.admin_email, password_hash=settings.admin_password_hash)
            db.add(user)
        elif user.password_hash != settings.admin_password_hash:
            user.password_hash = settings.admin_password_hash
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin_user()
