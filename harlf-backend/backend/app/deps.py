from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import settings
from app.db import get_db
from app.models import User
from app.security import decode_token


def current_user(
    token: str | None = Cookie(default=None, alias=settings.COOKIE_NAME),
    db: Session = Depends(get_db),
):
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in.")

    user_id = decode_token(token)
    user = db.get(User, user_id) if user_id else None

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Sign in again.")

    return user
