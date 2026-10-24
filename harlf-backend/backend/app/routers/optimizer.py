
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.deps import current_user
from app.optimizer_engine import optimize_portfolio


router = APIRouter(
    prefix="/optimizer",
    tags=["Portfolio Optimizer"],
    dependencies=[Depends(current_user)],
)


class OptimizationRequest(BaseModel):
    assets: list[str] = Field(min_length=2, max_length=20)
    objective: Literal["max_sharpe", "min_risk", "max_return"] = "max_sharpe"
    risk_preference: Literal[
        "conservative", "balanced", "aggressive"
    ] = "balanced"
    period: Literal["2Y", "5Y", "10Y", "MAX"] = "5Y"
    universe: Literal[
    "us_tech_6",
    "india_large_cap",
    "paper_14",
] = "us_tech_6"
    max_weight: float = Field(default=0.60, gt=0, le=1)

    @field_validator("assets")
    @classmethod
    def validate_assets(cls, assets):
        cleaned = [asset.strip().upper() for asset in assets]

        if any(not asset for asset in cleaned):
            raise ValueError("Asset symbols cannot be empty.")

        if len(set(cleaned)) != len(cleaned):
            raise ValueError("Duplicate asset symbols are not allowed.")

        return cleaned


@router.post("/run")
def run_optimization(request: OptimizationRequest):
    try:
        return optimize_portfolio(
            assets=request.assets,
            objective=request.objective,
            risk_preference=request.risk_preference,
            period=request.period,
            universe=request.universe,
            max_weight=request.max_weight,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail="Historical market data is unavailable. Refresh market data and try again.",
        ) from exc
    except Exception as exc:
        # Log the full error server-side; don't expose internals to clients.
        import logging
        logging.getLogger(__name__).exception("Portfolio optimization failed")
        raise HTTPException(
            status_code=500,
            detail="Portfolio optimization failed. Check backend logs.",
        ) from exc
