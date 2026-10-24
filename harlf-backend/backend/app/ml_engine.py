from __future__ import annotations

import logging
import threading
import time
from collections import OrderedDict
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR

from app.data_layer import get_prices, load_cached
from app.universes import UNIVERSES

try:
    from xgboost import XGBRegressor
except ImportError:
    XGBRegressor = None


log = logging.getLogger(__name__)

MODEL_META = {
    "lr": {
        "name": "Linear Regression",
        "short": "LR",
        "color": "#38BDF8",
        "version": "OLS",
    },
    "rf": {
        "name": "Random Forest",
        "short": "RF",
        "color": "#22D3EE",
        "version": "300 trees",
    },
    "xgb": {
        "name": "XGBoost",
        "short": "XGB",
        "color": "#34D399",
        "version": "gradient boosting",
    },
    "svr": {
        "name": "Support Vector Regression",
        "short": "SVR",
        "color": "#818CF8",
        "version": "RBF kernel",
    },
}

FEATURES = [
    "ret_1",
    "ret_5",
    "ret_21",
    "ma_gap_5",
    "ma_gap_20",
    "vol_20",
    "vol_60",
    "momentum_20",
    "rsi_14",
]

VALID_PERIODS = {
    "2Y": 504,
    "5Y": 1260,
    "10Y": 2520,
}

MIN_PRICES = 250
MIN_ROWS = 100
TRADING_DAYS = 252

# Arena Score weights.
ARENA_WEIGHTS = {
    "mae": 0.35,
    "rmse": 0.35,
    "r2": 0.20,
    "direction": 0.10,
}

R2_FLOOR = -0.1

# Proposed custom penalties, not standard statistical metrics.
NEGATIVE_R2_PENALTY_CAP = 20.0
WEAK_DIRECTION_THRESHOLD = 55.0
WEAK_DIRECTION_PENALTY_FACTOR = 0.5

_CACHE_MAX = 32
_CACHE: OrderedDict[tuple, dict[str, Any]] = OrderedDict()
_CACHE_LOCK = threading.Lock()
_TRAIN_LOCK = threading.Lock()


# ---------------------------------------------------------------------------
# Result cache
# ---------------------------------------------------------------------------

def _cache_get(key: tuple) -> dict[str, Any] | None:
    with _CACHE_LOCK:
        hit = _CACHE.get(key)

        if hit is not None:
            _CACHE.move_to_end(key)

        return hit


def _cache_put(key: tuple, value: dict[str, Any]) -> None:
    with _CACHE_LOCK:
        _CACHE[key] = value
        _CACHE.move_to_end(key)

        while len(_CACHE) > _CACHE_MAX:
            _CACHE.popitem(last=False)


def clear_cache() -> None:
    """Clear cached model evaluations after market data is refreshed."""
    with _CACHE_LOCK:
        _CACHE.clear()


# ---------------------------------------------------------------------------
# Data validation and loading
# ---------------------------------------------------------------------------


def _validate_symbol(symbol: str) -> str:
    symbol = symbol.strip().upper()

    supported_symbols = {
        ticker
        for assets in UNIVERSES.values()
        for ticker in assets
    }

    if symbol not in supported_symbols:
        raise ValueError(f"Unsupported symbol: {symbol}")

    return symbol


def _validate_period(period: str) -> str:
    period = period.strip().upper()

    if period not in {*VALID_PERIODS, "MAX"}:
        raise ValueError("Period must be 2Y, 5Y, 10Y or MAX.")

    return period


def _load_symbol_prices(symbol: str, period: str) -> pd.Series:
    # Find the universe containing this symbol.
    universe_id = next(
        (
            name
            for name, assets in UNIVERSES.items()
            if symbol in assets
        ),
        None,
    )

    if universe_id is None:
        raise ValueError(f"Unsupported symbol: {symbol}")

    try:
        prices = load_cached(universe_id)
    except FileNotFoundError:
        prices = get_prices(universe_id, refresh=True)

    # If this symbol is not in the cache, refresh that universe.
    if symbol not in prices.columns:
        prices = get_prices(universe_id, refresh=True)

    if symbol not in prices.columns:
        raise ValueError(
            f"No market data is available for {symbol}. "
            f"Check whether {universe_id} contains downloaded historical prices."
        )

    series = pd.to_numeric(prices[symbol], errors="coerce")
    series = series.replace([np.inf, -np.inf], np.nan).dropna()
    series = series[~series.index.duplicated(keep="last")].sort_index()

    if period != "MAX":
        series = series.tail(VALID_PERIODS[period])

    if len(series) < MIN_PRICES:
        raise ValueError(
            f"Not enough historical observations for {symbol}. "
            f"At least {MIN_PRICES} valid daily prices are required."
        )

    return series.astype(float)


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------

def _rsi(series: pd.Series, window: int = 14) -> pd.Series:
    delta = series.diff()

    avg_gain = delta.clip(lower=0).ewm(
        alpha=1 / window,
        adjust=False,
        min_periods=window,
    ).mean()

    avg_loss = (-delta.clip(upper=0)).ewm(
        alpha=1 / window,
        adjust=False,
        min_periods=window,
    ).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - 100 / (1 + rs)

    # Continuous gains -> RSI 100; completely flat -> neutral RSI 50.
    rsi = rsi.mask((avg_loss == 0) & (avg_gain > 0), 100.0)
    rsi = rsi.mask((avg_loss == 0) & (avg_gain == 0), 50.0)

    return rsi


def build_features(series: pd.Series) -> pd.DataFrame:
    """Build features using only prices available on each date."""
    returns = series.pct_change(fill_method=None)

    frame = pd.DataFrame(
        {
            "ret_1": returns,
            "ret_5": series.pct_change(5, fill_method=None),
            "ret_21": series.pct_change(21, fill_method=None),
            "ma_gap_5": series / series.rolling(5).mean() - 1,
            "ma_gap_20": series / series.rolling(20).mean() - 1,
            "vol_20": returns.rolling(20).std() * np.sqrt(TRADING_DAYS),
            "vol_60": returns.rolling(60).std() * np.sqrt(TRADING_DAYS),
            "momentum_20": series / series.shift(20) - 1,
            "rsi_14": _rsi(series) / 100.0,
        },
        index=series.index,
    )

    return frame.replace([np.inf, -np.inf], np.nan).dropna()


def _split(n: int) -> tuple[slice, slice, slice]:
    """Chronological 70/15/15 split; no shuffling."""
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    if train_end == 0 or val_end <= train_end or n <= val_end:
        raise ValueError(
            "Insufficient data for train, validation and test splits."
        )

    return (
        slice(0, train_end),
        slice(train_end, val_end),
        slice(val_end, n),
    )


# ---------------------------------------------------------------------------
# Model definitions
# ---------------------------------------------------------------------------

def _models() -> dict[str, Any]:
    models: dict[str, Any] = {
        "lr": LinearRegression(),

        "rf": RandomForestRegressor(
            n_estimators=300,
            max_depth=8,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=-1,
        ),

        # Scaling is fitted on training data only through the Pipeline.
        "svr": Pipeline(
            [
                ("scale", StandardScaler()),
                (
                    "svr",
                    SVR(
                        C=2.0,
                        epsilon=0.001,
                        gamma="scale",
                        kernel="rbf",
                    ),
                ),
            ]
        ),
    }

    if XGBRegressor is not None:
        models["xgb"] = XGBRegressor(
            n_estimators=250,
            max_depth=4,
            learning_rate=0.04,
            subsample=0.85,
            colsample_bytree=0.9,
            objective="reg:squarederror",
            random_state=42,
            n_jobs=2,
            tree_method="hist",
        )

    return models


# ---------------------------------------------------------------------------
# Evaluation metrics
# ---------------------------------------------------------------------------

def _regression_metrics(
    actual: np.ndarray,
    pred: np.ndarray,
) -> dict[str, float]:
    if len(actual) == 0 or len(actual) != len(pred):
        raise ValueError("Actual and predicted arrays must have equal nonzero length.")

    err = actual - pred

    mae = float(np.mean(np.abs(err)))
    rmse = float(np.sqrt(np.mean(err ** 2)))

    ss_res = float(np.dot(err, err))
    centered = actual - actual.mean()
    ss_tot = float(np.dot(centered, centered))

    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0

    return {
        "mae": mae,
        "rmse": rmse,
        "r2": float(r2),
    }


def _directional_accuracy(
    actual: np.ndarray,
    pred: np.ndarray,
) -> float:
    return float(np.mean(np.sign(actual) == np.sign(pred)) * 100)


def _r2_component(r2: float) -> float:
    """Map R² to a bounded 0-100 score component."""
    return float(
        np.clip((r2 - R2_FLOOR) / (1.0 - R2_FLOOR), 0, 1) * 100
    )


def _validation_indicator(direction: float, r2: float) -> float:
    """
    Heuristic validation score, not a calibrated probability of correctness.
    """
    return round(
        0.6 * direction + 0.4 * _r2_component(r2),
        1,
    )


def _fit_one(
    model_id: str,
    model: Any,
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_eval: np.ndarray,
    n_val: int,
    n_test: int,
) -> tuple | None:
    start = time.perf_counter()

    try:
        model.fit(X_train, y_train)
        pred = np.asarray(model.predict(X_eval), dtype=float)
    except Exception:
        log.exception("Model %s failed during fit/predict", model_id)
        return None

    if not np.isfinite(pred).all():
        log.warning("Model %s produced non-finite predictions", model_id)
        return None

    train_ms = int((time.perf_counter() - start) * 1000)

    return (
        pred[:n_val],
        pred[n_val:n_val + n_test],
        float(pred[-1]),
        train_ms,
    )


# ---------------------------------------------------------------------------
# Arena scoring
# ---------------------------------------------------------------------------

def _calculate_arena_scores(
    results: list[dict[str, Any]],
) -> None:
    """
    Score models relative to each other, with custom penalties for:
    - negative validation R²
    - directional accuracy below the configured threshold

    This is a project-specific ranking score, not a statistical metric.
    """
    mae = np.array([r["mae"] for r in results], dtype=float)
    rmse = np.array([r["rmse"] for r in results], dtype=float)
    direction = np.array(
        [r["directionalAccuracy"] for r in results],
        dtype=float,
    )
    r2_values = np.array([r["r2"] for r in results], dtype=float)

    best_mae = max(float(mae.min()), 1e-12)
    best_rmse = max(float(rmse.min()), 1e-12)

    mae_score = np.clip(best_mae / np.maximum(mae, 1e-12) * 100, 0, 100)
    rmse_score = np.clip(
        best_rmse / np.maximum(rmse, 1e-12) * 100,
        0,
        100,
    )

    r2_score = np.array(
        [_r2_component(float(value)) for value in r2_values]
    )

    base_score = (
        ARENA_WEIGHTS["mae"] * mae_score
        + ARENA_WEIGHTS["rmse"] * rmse_score
        + ARENA_WEIGHTS["r2"] * r2_score
        + ARENA_WEIGHTS["direction"] * direction
    )

    negative_r2_penalty = np.where(
        r2_values < 0,
        np.minimum(
            NEGATIVE_R2_PENALTY_CAP,
            np.abs(r2_values) * 100,
        ),
        0.0,
    )

    weak_direction_penalty = np.where(
        direction < WEAK_DIRECTION_THRESHOLD,
        (WEAK_DIRECTION_THRESHOLD - direction)
        * WEAK_DIRECTION_PENALTY_FACTOR,
        0.0,
    )

    final_score = np.clip(
        base_score - negative_r2_penalty - weak_direction_penalty,
        0,
        100,
    )

    for item, score in zip(results, final_score):
        item["arenaScore"] = round(float(score), 1)
        item["beatsBaseline"] = bool(
            item["rmse"] < item["baseline"]["rmse"]
        )


# ---------------------------------------------------------------------------
# Main evaluation
# ---------------------------------------------------------------------------

def _compute(
    series: pd.Series,
    symbol: str,
    period: str,
) -> dict[str, Any]:
    features = build_features(series)

    if features.empty or features.index[-1] != series.index[-1]:
        raise ValueError(
            "Could not construct features for the latest available price."
        )

    next_return = series.shift(-1) / series - 1

    dataset = features.assign(
        target=next_return.reindex(features.index)
    ).dropna(subset=["target"])

    if len(dataset) < MIN_ROWS:
        raise ValueError("Not enough usable rows after feature engineering.")

    tr, va, te = _split(len(dataset))

    X = dataset[FEATURES].to_numpy(dtype=float)
    y = dataset["target"].to_numpy(dtype=float)

    X_train, y_train = X[tr], y[tr]
    X_val, y_val = X[va], y[va]
    X_test, y_test = X[te], y[te]

    latest_x = features[FEATURES].iloc[[-1]].to_numpy(dtype=float)
    latest_price = float(series.iloc[-1])

    X_eval = np.vstack([X_val, X_test, latest_x])
    n_val = len(X_val)
    n_test = len(X_test)

    # Zero-return baseline on validation data.
    zero_pred = np.zeros_like(y_val)

    baseline_metrics = _regression_metrics(y_val, zero_pred)

    results: list[dict[str, Any]] = []

    for model_id, model in _models().items():
        fitted = _fit_one(
            model_id,
            model,
            X_train,
            y_train,
            X_eval,
            n_val,
            n_test,
        )

        if fitted is None:
            continue

        val_pred, test_pred, latest_pred, train_ms = fitted

        val_metrics = _regression_metrics(y_val, val_pred)
        test_metrics = _regression_metrics(y_test, test_pred)

        direction = _directional_accuracy(y_val, val_pred)
        indicator = _validation_indicator(direction, val_metrics["r2"])

        rmse_improvement = (
            (baseline_metrics["rmse"] - val_metrics["rmse"])
            / baseline_metrics["rmse"]
            * 100
            if baseline_metrics["rmse"] > 0
            else 0.0
        )

        results.append(
            {
                "id": model_id,
                **MODEL_META[model_id],
                "status": "TRAINED",
                "trainState": "Trained · chronological split",

                # Validation metrics used for model ranking.
                **val_metrics,
                "directionalAccuracy": direction,
                "validationIndicator": indicator,
                "confidence": indicator,

                # Latest next-session return prediction, in percent.
                "prediction": latest_pred * 100,
                "predictedPrice": latest_price * (1 + latest_pred),
                "latestPrice": latest_price,

                "trainMs": train_ms,

                # Final holdout metrics; not used for champion selection.
                "test": test_metrics,

                "baseline": baseline_metrics,
                "rmseImprovementPct": round(
                    float(rmse_improvement),
                    2,
                ),
                "beatsBaseline": bool(
                    val_metrics["rmse"] < baseline_metrics["rmse"]
                ),
            }
        )

    if not results:
        raise ValueError("No model produced valid evaluation results.")

    _calculate_arena_scores(results)

    results.sort(
        key=lambda item: item["arenaScore"],
        reverse=True,
    )

    for rank, item in enumerate(results, start=1):
        item["rank"] = rank

    val_index = dataset.index[va]

    universe_id = next(
        (
            uid
            for uid, assets in UNIVERSES.items()
            if symbol in assets
        ),
        None,
    )

    if universe_id is None:
        raise ValueError(f"Unsupported symbol: {symbol}")

    return {
        "symbol": symbol,
        "name": UNIVERSES[universe_id][symbol][0],
        "universe": universe_id,
        "period": period,
        "source": f"HARLF market data cache ({universe_id})",
        "latestPrice": latest_price,
        "latestPriceDate": series.index[-1].strftime("%Y-%m-%d"),
        "computedAt": datetime.now(timezone.utc).isoformat(
            timespec="seconds"
        ),
        "dataset": {
            "rows": int(len(dataset)),
            "start": dataset.index[0].strftime("%Y-%m-%d"),
            "end": dataset.index[-1].strftime("%Y-%m-%d"),
            "trainRows": int(tr.stop - tr.start),
            "validationRows": int(n_val),
            "testRows": int(n_test),
            "split": "70% train · 15% validation · 15% test",
            "target": "next-session return",
            "features": FEATURES,
        },

        "validation": {
            "start": val_index[0].strftime("%Y-%m-%d"),
            "end": val_index[-1].strftime("%Y-%m-%d"),
        },

        "baseline": baseline_metrics,

        "scoreNote": (
            "Arena Score is a relative composite ranking with custom "
            "penalties for negative validation R² and directional accuracy "
            "below 55%. It is not a percentage accuracy measure. "
            "Validation Indicator is a heuristic, not a probability. "
            "Test metrics are reported separately and are not used to "
            "select the champion."
        ),

        "models": results,
        "champion": results[0]["id"],
        "predictionSpread": {
            item["short"]: round(item["prediction"], 4)
            for item in results
        },
    }


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def evaluate_models(
    symbol: str = "NVDA",
    period: str = "5Y",
    use_cache: bool = True,
) -> dict[str, Any]:
    symbol = _validate_symbol(symbol)
    period = _validate_period(period)

    series = _load_symbol_prices(symbol, period)

    key = (
        symbol,
        period,
        series.index[-1].isoformat(),
        round(float(series.iloc[-1]), 6),
        len(series),
    )

    if use_cache:
        hit = _cache_get(key)
        if hit is not None:
            return hit

    with _TRAIN_LOCK:
        if use_cache:
            hit = _cache_get(key)
            if hit is not None:
                return hit

        result = _compute(series, symbol, period)
        _cache_put(key, result)

    return result
