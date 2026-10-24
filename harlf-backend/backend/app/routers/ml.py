import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from app.deps import current_user
from app.ml_engine import evaluate_models
from app.forecast_engine import build_forecast

log = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(current_user)])


# /evaluate, /models and /arena all serve the same payload.
@router.get("/evaluate")
@router.get("/models")
@router.get("/arena")
def evaluate(
    symbol: str = Query("NVDA", min_length=1, max_length=30),
    period: str = Query("5Y", min_length=2, max_length=4),
    refresh: bool = Query(False, description="Bypass the result cache and retrain."),
):
    try:
        return evaluate_models(symbol=symbol, period=period, use_cache=not refresh)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail="Selected market data cache is not available. Run the market data refresh first.",
        ) from exc
    except Exception as exc:
        log.exception("ML evaluation failed for %s/%s", symbol, period)
        raise HTTPException(status_code=500, detail="ML evaluation failed. Check server logs.") from exc

@router.get("/forecast")
def forecast(
    symbol: str = Query("NVDA", min_length=1, max_length=30),
    horizon: int = Query(30, ge=7, le=90),
    period: str = Query("5Y", min_length=2, max_length=4),
    model: str = Query("auto", min_length=2, max_length=8),
    refresh: bool = Query(False, description="Bypass the model evaluation cache."),
):
    """Return a recursive forward forecast and a historical validation comparison."""
    try:
        return build_forecast(
            symbol=symbol,
            horizon=horizon,
            period=period,
            model_choice=model,
            refresh=refresh,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail="Selected market data cache is unavailable. Refresh the market data first.",
        ) from exc
    except Exception as exc:
        log.exception("Forecast failed for %s/%s", symbol, period)
        raise HTTPException(
            status_code=500,
            detail="Forecast generation failed. Check server logs.",
        ) from exc
