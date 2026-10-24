
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from app.ml_engine import (
    FEATURES,
    MODEL_META,
    _load_symbol_prices,
    _models,
    _split,
    build_features,
    evaluate_models,
)

HORIZONS = {7, 30, 90}
INTERVAL_Z_80 = 1.2815515655446004


def build_forecast(
    symbol: str = "NVDA",
    horizon: int = 30,
    period: str = "5Y",
    model_choice: str = "auto",
    refresh: bool = False,
) -> dict[str, Any]:
    """Evaluate/select a model, then recursively forecast future daily returns."""
    symbol = symbol.strip().upper()
    period = period.strip().upper()
    model_choice = model_choice.strip().lower()

    if horizon not in HORIZONS:
        raise ValueError("Horizon must be 7, 30 or 90 trading sessions.")

    # Reuse the established Arena evaluation and its chronological selection.
    evaluation = evaluate_models(symbol=symbol, period=period, use_cache=not refresh)
    available = {item["id"] for item in evaluation["models"]}
    if model_choice == "auto":
        selected_id = evaluation["champion"]
        selection_method = "Arena validation winner"
    else:
        if model_choice not in available:
            raise ValueError(
                f"Model '{model_choice}' is unavailable for this evaluation. "
                f"Available models: {', '.join(sorted(available))}."
            )
        selected_id = model_choice
        selection_method = "Manual model selection"

    series = _load_symbol_prices(symbol, period)
    features = build_features(series)
    target = series.shift(-1).div(series).sub(1).rename("target")
    dataset = features.join(target, how="left").replace([np.inf, -np.inf], np.nan)
    dataset = dataset.dropna(subset=[*FEATURES, "target"])

    if len(dataset) < 100:
        raise ValueError("Not enough usable history to build a forward forecast.")

    train_slice, validation_slice, _test_slice = _split(len(dataset))
    X = dataset[FEATURES].to_numpy(dtype=float)
    y = dataset["target"].to_numpy(dtype=float)

    # Estimate error using only a chronological validation block, not training fit.
    validation_model = _models()[selected_id]
    validation_model.fit(X[train_slice], y[train_slice])
    validation_pred = np.asarray(
        validation_model.predict(X[validation_slice]), dtype=float
    )
    validation_actual = y[validation_slice]
    residuals = validation_actual - validation_pred
    residuals = residuals[np.isfinite(residuals)]
    if len(residuals) < 2:
        raise ValueError("Not enough validation predictions to estimate uncertainty.")

    residual_std = float(np.std(residuals, ddof=1))
    if not np.isfinite(residual_std):
        residual_std = 0.0

    # Refit on every labelled historical observation for forward inference.
    model = _models()[selected_id]
    model.fit(X, y)

    latest_price = float(series.iloc[-1])
    current_price = latest_price
    working_prices = series.copy()
    forecast_rows: list[dict[str, Any]] = []
    future_dates = pd.bdate_range(
        start=series.index[-1] + pd.Timedelta(days=1), periods=horizon
    )

    for step, date in enumerate(future_dates, start=1):
        latest_features = build_features(working_prices)
        if latest_features.empty:
            raise ValueError("Unable to calculate the latest forecast features.")
        X_next = latest_features[FEATURES].iloc[[-1]].to_numpy(dtype=float)
        predicted_return = float(np.asarray(model.predict(X_next)).reshape(-1)[0])
        if not np.isfinite(predicted_return):
            raise ValueError("The selected model produced a non-finite forecast.")
        # Keep recursive compounding from producing a non-positive price.
        predicted_return = max(predicted_return, -0.95)

        current_price *= 1.0 + predicted_return
        band = INTERVAL_Z_80 * residual_std * np.sqrt(step)
        lower_price = current_price * float(np.exp(-band))
        upper_price = current_price * float(np.exp(band))

        forecast_rows.append(
            {
                "step": step,
                "date": date.strftime("%Y-%m-%d"),
                "predictedDailyReturnPct": round(predicted_return * 100, 4),
                "predictedPrice": round(current_price, 4),
                "lowerPrice": round(lower_price, 4),
                "upperPrice": round(upper_price, 4),
                "cumulativeReturnPct": round((current_price / latest_price - 1) * 100, 4),
            }
        )
        working_prices = pd.concat(
            [working_prices, pd.Series([current_price], index=[date])]
        )

    # Recent, genuinely out-of-sample validation predictions for the comparison chart.
    validation_dates = dataset.index[validation_slice]
    backtest_start = max(0, len(validation_dates) - 100)
    backtest_rows = []
    for i in range(backtest_start, len(validation_dates)):
        backtest_rows.append(
            {
                "date": validation_dates[i].strftime("%Y-%m-%d"),
                "actualReturnPct": round(float(validation_actual[i]) * 100, 4),
                "predictedReturnPct": round(float(validation_pred[i]) * 100, 4),
            }
        )

    selected_meta = MODEL_META[selected_id]
    selected_metrics = next(
        item for item in evaluation["models"] if item["id"] == selected_id
    )
    universe = evaluation["universe"]
    symbol_currency = {
        "^BSESN": "INR", "^NSEI": "INR", "^NSEBANK": "INR",
        "000001.SS": "CNY", "^FCHI": "EUR", "^STOXX50E": "EUR",
        "^FTSE": "GBP", "^HSI": "HKD", "^KS11": "KRW",
    }
    currency = "INR" if universe == "india_large_cap" else symbol_currency.get(symbol, "USD")
    currency_symbol = {"INR": "₹", "EUR": "€", "GBP": "£", "HKD": "HK$", "CNY": "¥", "KRW": "₩", "USD": "$"}.get(currency, "$")

    return {
        "symbol": symbol,
        "name": evaluation["name"],
        "universe": universe,
        "period": period,
        "horizon": horizon,
        "source": evaluation["source"],
        "asOf": series.index[-1].strftime("%Y-%m-%d"),
        "currency": currency,
        "currencySymbol": currency_symbol,
        "latestPrice": round(latest_price, 4),
        "expectedPrice": forecast_rows[-1]["predictedPrice"],
        "expectedReturnPct": forecast_rows[-1]["cumulativeReturnPct"],
        "terminalRange": {
            "lowerPrice": forecast_rows[-1]["lowerPrice"],
            "upperPrice": forecast_rows[-1]["upperPrice"],
        },
        "availableModels": [
            {"id": item["id"], "name": item["name"], "short": item["short"]}
            for item in evaluation["models"]
        ],
        "model": {
            "id": selected_id,
            **selected_meta,
            "selectionMethod": selection_method,
            "arenaRank": selected_metrics.get("rank"),
            "arenaScore": selected_metrics.get("arenaScore"),
            "validationMaePct": round(float(selected_metrics["mae"]) * 100, 4),
            "validationRmsePct": round(float(selected_metrics["rmse"]) * 100, 4),
            "validationR2": round(float(selected_metrics["r2"]), 4),
            "directionalAccuracyPct": round(
                float(selected_metrics["directionalAccuracy"]), 2
            ),
        },
        "uncertainty": {
            "method": "Approximate 80% range from chronological validation residual volatility",
            "dailyResidualStdPct": round(residual_std * 100, 4),
            "note": (
                "The range is an approximate error-based band, not a calibrated "
                "probability or guarantee. Recursive forecasts can compound model error."
            ),
        },
        "historicalPrices": [
            {"date": date.strftime("%Y-%m-%d"), "price": round(float(price), 4)}
            for date, price in series.iloc[-90:].items()
        ],
        "forecast": forecast_rows,
        "validationBacktest": backtest_rows,
        "validation": evaluation["validation"],
        "computedAt": evaluation["computedAt"],
    }
