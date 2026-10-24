import re
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import settings
from app.db import get_db
from app.deps import current_user
from app.models import User
from app.security import DUMMY_HASH, create_token, hash_password, verify_password

router = APIRouter()

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _clean_email(value):
    value = value.strip().lower()
    if not EMAIL_PATTERN.match(value):
        raise ValueError("Enter a valid email address.")
    return value


class RegisterIn(BaseModel):
    name: str = Field(default="", max_length=120)
    email: str = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    remember: bool = True

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        return _clean_email(value)


class LoginIn(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(max_length=128)
    remember: bool = True

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        return value.strip().lower()


class UserOut(BaseModel):
    id: int
    name: str
    email: str

    model_config = {"from_attributes": True}


def _start_session(response, user, remember):
    lifetime = (
        timedelta(days=settings.REMEMBER_DAYS)
        if remember
        else timedelta(hours=settings.SESSION_HOURS)
    )
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=create_token(user.id, lifetime),
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=int(lifetime.total_seconds()) if remember else None,
        path="/",
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, response: Response, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")

    user = User(
        email=payload.email,
        name=payload.name.strip() or payload.email.split("@")[0],
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")

    _start_session(response, user, payload.remember)
    return user


@router.post("/login", response_model=UserOut)
def login(payload: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    stored_hash = user.password_hash if user else DUMMY_HASH
    password_ok = verify_password(payload.password, stored_hash)

    if not user or not password_ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect.")

    _start_session(response, user, payload.remember)
    return user


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(settings.COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user
