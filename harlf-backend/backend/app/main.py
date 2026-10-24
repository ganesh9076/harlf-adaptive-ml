from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app import models, settings
from app.db import Base, SessionLocal, engine
from app.models import User
from app.routers import auth, data, ml
from app.security import hash_password
from app.routers import auth, data, ml, agreement
from app.routers import optimizer

def seed_demo_user():
    if not (settings.DEMO_EMAIL and settings.DEMO_PASSWORD):
        return
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == settings.DEMO_EMAIL)):
            return
        db.add(
            User(
                email=settings.DEMO_EMAIL,
                name="Demo analyst",
                password_hash=hash_password(settings.DEMO_PASSWORD),
            )
        )
        db.commit()


@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(bind=engine)
    seed_demo_user()
    yield


app = FastAPI(
    title="HARLF API",
    lifespan=lifespan,
    docs_url=None if settings.IS_PROD else "/docs",
    redoc_url=None,
    openapi_url=None if settings.IS_PROD else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(data.router, prefix="/api/data", tags=["data"])
app.include_router(ml.router, prefix="/api/ml", tags=["ml"])
app.include_router(optimizer.router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok"}

app.include_router(
    agreement.router,
    prefix="/api/agreement",
    tags=["agreement"],
)