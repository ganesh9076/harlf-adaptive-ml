

from datetime import datetime, timezone

import numpy as np
import pandas as pd
import yfinance as yf

from fastapi import APIRouter, Depends, HTTPException

from app.data_layer import get_meta, load_cached
from app.deps import current_user
from app.universes import UNIVERSES


router = APIRouter(dependencies=[Depends(current_user)])


# --------------------------------------------------
# 1. Available market universes
# --------------------------------------------------

@router.get("/universes")
def universes():
    """Return available asset universes and their assets."""

    return [
        {
            "id": universe_id,
            "assets": [
                {
                    "ticker": ticker,
                    "name": info[0],
                    "class": info[1],
                }
                for ticker, info in assets.items()
            ],
        }
        for universe_id, assets in UNIVERSES.items()
    ]


# --------------------------------------------------
# 2. Cached historical prices
# --------------------------------------------------

@router.get("/prices")
def prices(universe: str = "paper_14"):
    """Return previously downloaded historical prices."""

    if universe not in UNIVERSES:
        raise HTTPException(
            status_code=404,
            detail="Unknown market universe.",
        )

    try:
        frame = load_cached(universe)
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Market data is not loaded yet. Run the data refresh job.",
        )

    meta = get_meta(universe) or {}

    return {
        "universe": universe,
        "dates": [
            date.strftime("%Y-%m-%d")
            for date in frame.index
        ],
        "series": {
            ticker: frame[ticker].round(4).tolist()
            for ticker in frame.columns
        },
        "meta": {
            "start": meta.get("start"),
            "end": meta.get("end"),
            "downloaded_at": meta.get("downloaded_at"),
            "dropped": meta.get("dropped", {}),
        },
    }


# --------------------------------------------------
# 3. Extract price or volume series from yfinance
# --------------------------------------------------

def _price_series(frame, field, symbol):
    """Support single-level and MultiIndex yfinance columns."""

    if frame is None or frame.empty:
        return pd.Series(dtype=float)

    if isinstance(frame.columns, pd.MultiIndex):
        for level in range(frame.columns.nlevels):
            if field in frame.columns.get_level_values(level):
                result = frame.xs(
                    field,
                    axis=1,
                    level=level,
                )

                if isinstance(result, pd.DataFrame):
                    if symbol in result.columns:
                        return result[symbol].dropna()

                    if result.shape[1] > 0:
                        return result.iloc[:, 0].dropna()

                    return pd.Series(dtype=float)

                return result.dropna()

    if field in frame.columns:
        result = frame[field]

        if isinstance(result, pd.DataFrame):
            result = result.iloc[:, 0]

        return result.dropna()

    return pd.Series(dtype=float)


# --------------------------------------------------
# 4. Market Intelligence endpoint
# --------------------------------------------------


# --------------------------------------------------
# 4. Market Intelligence endpoint
# --------------------------------------------------

@router.get("/market-intelligence")
def market_intelligence(symbol: str = "NVDA"):
    """Fetch market prices and calculate technical indicators."""

    symbol = symbol.strip().upper()

    # Search across every configured universe.
    assets = {}
    for universe_assets in UNIVERSES.values():
        assets.update(universe_assets)

    if symbol not in assets:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported symbol. Available symbols: {list(assets)}",
        )

    asset_name = assets[symbol][0]

    # Yahoo Finance symbols for Indian equities and indices.
    is_indian = (
        symbol.endswith(".NS")
        or symbol.endswith(".BO")
        or symbol in {"^NSEI", "^BSESN", "^NSEBANK"}
    )
    currency = "INR" if is_indian else "USD"
    currency_symbol = "₹" if is_indian else "$"

    try:
        intraday = yf.download(
            symbol,
            period="1d",
            interval="5m",
            auto_adjust=True,
            progress=False,
            threads=False,
            timeout=15,
        )

        daily = yf.download(
            symbol,
            period="3mo",
            interval="1d",
            auto_adjust=True,
            progress=False,
            threads=False,
            timeout=15,
        )

        closes = _price_series(daily, "Close", symbol)
        volumes = _price_series(daily, "Volume", symbol)
        intraday_closes = _price_series(intraday, "Close", symbol)

        if closes.empty:
            raise HTTPException(
                status_code=503,
                detail=f"No daily prices are available for {symbol}.",
            )

        use_intraday = not intraday_closes.empty

        current_price = float(
            intraday_closes.iloc[-1] if use_intraday else closes.iloc[-1]
        )

        previous_close = float(
            closes.iloc[-2] if len(closes) >= 2 else closes.iloc[-1]
        )

        daily_change = (
            (current_price / previous_close - 1) * 100
            if previous_close else 0.0
        )

        returns = closes.pct_change().dropna()
        volatility = (
            float(returns.tail(30).std() * np.sqrt(252) * 100)
            if len(returns) >= 2 else 0.0
        )

        moving_average = float(closes.tail(50).mean())

        changes = closes.diff()
        gains = changes.clip(lower=0)
        losses = -changes.clip(upper=0)

        avg_gain = gains.ewm(
            alpha=1 / 14, min_periods=14, adjust=False
        ).mean().iloc[-1]

        avg_loss = losses.ewm(
            alpha=1 / 14, min_periods=14, adjust=False
        ).mean().iloc[-1]

        if pd.isna(avg_gain) or pd.isna(avg_loss):
            rsi = None
        elif avg_loss == 0:
            rsi = 100.0 if avg_gain > 0 else 50.0
        else:
            rsi = float(100 - 100 / (1 + avg_gain / avg_loss))

        base_index = max(0, len(closes) - 30)
        trend_base = float(closes.iloc[base_index])
        trend = (
            (float(closes.iloc[-1]) / trend_base - 1) * 100
            if trend_base else 0.0
        )

        history = [
            {
                "date": timestamp.isoformat(),
                "price": round(float(price), 4),
            }
            for timestamp, price in closes.items()
        ]

        price_timestamp = (
            intraday_closes.index[-1] if use_intraday else closes.index[-1]
        )

        latest_volume = (
            int(volumes.iloc[-1])
            if not volumes.empty and pd.notna(volumes.iloc[-1])
            else None
        )

        return {
            "symbol": symbol,
            "name": asset_name,
            "currency": currency,
            "currencySymbol": currency_symbol,

            "currentPrice": round(current_price, 4),
            "previousClose": round(previous_close, 4),
            "dailyChangePercent": round(daily_change, 3),

            "volume": latest_volume,
            "volumeType": "daily",

            "volatility30d": round(volatility, 2),
            "movingAverage50d": round(moving_average, 4),
            "rsi14": round(rsi, 2) if rsi is not None else None,
            "trend30dPercent": round(trend, 3),

            "history": history,
            "priceTimestamp": price_timestamp.isoformat(),
            "fetchedAt": datetime.now(timezone.utc).isoformat(),

            "source": "Yahoo Finance",
            "dataType": "intraday" if use_intraday else "latest_daily",
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=502,
            detail=(
                f"Market data provider failed for {symbol}. "
                "Check your internet connection and try again."
            ),
        )
