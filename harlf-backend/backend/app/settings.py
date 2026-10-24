import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

ENV = os.getenv("ENV", "development")
IS_PROD = ENV == "production"

_DEV_SECRET = "dev-only-secret-change-me"
SECRET_KEY = os.getenv("SECRET_KEY", _DEV_SECRET)
if IS_PROD and (SECRET_KEY == _DEV_SECRET or len(SECRET_KEY) < 32):
    raise RuntimeError("Set SECRET_KEY to a random string of at least 32 characters in production.")

_db_url = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'harlf.db'}")
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql://", 1)
DATABASE_URL = _db_url

COOKIE_NAME = "harlf_token"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true" if IS_PROD else "false").lower() == "true"
SESSION_HOURS = 12
REMEMBER_DAYS = 30

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
DEFAULT_START = os.getenv("DATA_START", "2010-01-01")

DEMO_EMAIL = os.getenv("DEMO_EMAIL", "").strip().lower()
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "")
