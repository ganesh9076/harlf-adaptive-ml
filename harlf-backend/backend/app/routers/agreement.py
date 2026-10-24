from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import current_user
from app.models import AgreementAcceptance, User

router = APIRouter()
AGREEMENT_VERSION = "1.0"


class AcceptanceRequest(BaseModel):
    accepted: bool


@router.get("/status")
def agreement_status(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    record = db.scalar(
        select(AgreementAcceptance).where(
            AgreementAcceptance.user_id == user.id
        )
    )

    return {
        "required": (
            record is None
            or record.agreement_version != AGREEMENT_VERSION
        ),
        "version": AGREEMENT_VERSION,
        "acceptedAt": (
            record.accepted_at.isoformat() if record else None
        ),
    }


@router.post("/accept")
def accept_agreement(
    payload: AcceptanceRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if not payload.accepted:
        raise HTTPException(
            status_code=400,
            detail="You must accept the agreement to continue.",
        )

    record = db.scalar(
        select(AgreementAcceptance).where(
            AgreementAcceptance.user_id == user.id
        )
    )

    now = datetime.now(timezone.utc)

    if record is None:
        record = AgreementAcceptance(
            user_id=user.id,
            agreement_version=AGREEMENT_VERSION,
            accepted_at=now,
        )
        db.add(record)
    else:
        record.agreement_version = AGREEMENT_VERSION
        record.accepted_at = now

    db.commit()
    db.refresh(record)

    return {
        "accepted": True,
        "version": record.agreement_version,
        "acceptedAt": record.accepted_at.isoformat(),
    }