
from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from scipy.optimize import minimize

from app.ml_engine import _load_symbol_prices
from app.universes import UNIVERSES

log = logging.getLogger(__name__)

TRADING_DAYS = 252
RISK_FREE_RATE = 0.0

VALID_OBJECTIVES = {"max_sharpe", "min_risk", "max_return"}
VALID_RISKS = {"conservative", "balanced", "aggressive"}
VALID_PERIODS = {"2Y", "5Y", "10Y", "MAX"}


def optimize_portfolio(
    assets,
    objective="max_sharpe",
    risk_preference="balanced",
    period="5Y",
    universe="us_tech_6",
    max_weight=0.60,
):
    """
    Optimize a long-only portfolio using historical daily prices.

    Objectives:
        max_sharpe: maximize the estimated Sharpe ratio
        min_risk: minimize portfolio variance
        max_return: maximize estimated annualized return

    Risk preferences:
        conservative: minimize risk
        balanced: use the selected objective
        aggressive: maximize estimated return
    """

    # 1. Validate universe
    if universe not in UNIVERSES:
        raise ValueError(f"Unsupported universe: {universe}")

    # 2. Validate and normalize asset symbols
    if not isinstance(assets, (list, tuple)) or len(assets) < 2:
        raise ValueError("Select at least two assets.")

    assets = [
        str(symbol).strip().upper()
        for symbol in assets
    ]

    if any(not symbol for symbol in assets):
        raise ValueError("Asset symbols cannot be empty.")

    if len(set(assets)) != len(assets):
        raise ValueError("Duplicate assets are not allowed.")

    unsupported = [
        symbol
        for symbol in assets
        if symbol not in UNIVERSES[universe]
    ]

    if unsupported:
        raise ValueError(
            f"These assets do not belong to {universe}: "
            + ", ".join(unsupported)
        )

    # 3. Validate optimization settings
    if objective not in VALID_OBJECTIVES:
        raise ValueError(
            "Objective must be max_sharpe, min_risk, or max_return."
        )

    if risk_preference not in VALID_RISKS:
        raise ValueError(
            "Risk preference must be conservative, balanced, or aggressive."
        )

    if period not in VALID_PERIODS:
        raise ValueError("Period must be 2Y, 5Y, 10Y, or MAX.")

    try:
        max_weight = float(max_weight)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            "Maximum weight must be a valid number."
        ) from exc

    if not np.isfinite(max_weight) or not 0 < max_weight <= 1:
        raise ValueError(
            "Maximum weight must be greater than 0 and at most 1."
        )

    n_assets = len(assets)

    if n_assets * max_weight < 1.0 - 1e-9:
        minimum_assets = int(np.ceil(1.0 / max_weight))
        raise ValueError(
            f"A maximum weight of {max_weight:.0%} requires at least "
            f"{minimum_assets} selected assets."
        )

    # 4. Load historical prices
    price_series = {}

    for symbol in assets:
        try:
            series = _load_symbol_prices(
                symbol=symbol,
                period=period,
            )
        except (ValueError, FileNotFoundError) as exc:
            raise ValueError(
                f"Could not load historical prices for {symbol}: {exc}"
            ) from exc

        if series is None:
            raise ValueError(
                f"No historical prices are available for {symbol}."
            )

        # Support Series or DataFrame responses.
        if isinstance(series, pd.DataFrame):
            if "Adj Close" in series.columns:
                series = series["Adj Close"]
            elif "Close" in series.columns:
                series = series["Close"]
            elif symbol in series.columns:
                series = series[symbol]
            else:
                raise ValueError(
                    f"Could not find a price column for {symbol}."
                )

        series = pd.to_numeric(
            pd.Series(series),
            errors="coerce",
        )

        series = series.replace(
            [np.inf, -np.inf],
            np.nan,
        ).dropna()

        series = series[
            ~series.index.duplicated(keep="last")
        ].sort_index()

        series = series[series > 0]

        if len(series) < 100:
            raise ValueError(
                f"Insufficient historical data for {symbol}; "
                "at least 100 valid prices are required."
            )

        price_series[symbol] = series.astype(float)

    # 5. Align dates shared by all selected assets
    prices_df = pd.concat(
        price_series,
        axis=1,
        join="inner",
    ).sort_index()

    prices_df = prices_df.replace(
        [np.inf, -np.inf],
        np.nan,
    ).dropna()

    if len(prices_df) < 100:
        raise ValueError(
            "Not enough overlapping historical dates for the selected assets."
        )

    # 6. Calculate daily returns
    returns = prices_df.pct_change(fill_method=None)

    returns = returns.replace(
        [np.inf, -np.inf],
        np.nan,
    ).dropna()

    if len(returns) < 99:
        raise ValueError("Insufficient usable daily returns.")

    mean_returns = (
        returns.mean().to_numpy(dtype=float) * TRADING_DAYS
    )

    covariance = (
        returns.cov().to_numpy(dtype=float) * TRADING_DAYS
    )

    covariance = (covariance + covariance.T) / 2
    covariance += np.eye(n_assets) * 1e-10

    if not (
        np.isfinite(mean_returns).all()
        and np.isfinite(covariance).all()
    ):
        raise ValueError(
            "Historical data produced invalid return or risk estimates."
        )

    # 7. Set portfolio constraints
    initial_weights = np.full(
        n_assets,
        1.0 / n_assets,
    )

    bounds = [
        (0.0, max_weight)
        for _ in range(n_assets)
    ]

    constraints = [
        {
            "type": "eq",
            "fun": lambda weights: float(np.sum(weights) - 1.0),
        }
    ]

    # 8. Determine the effective objective
    if risk_preference == "conservative":
        effective_objective = "min_risk"
    elif risk_preference == "aggressive":
        effective_objective = "max_return"
    else:
        effective_objective = objective

    # 9. Portfolio calculations
    def portfolio_return(weights):
        return float(weights @ mean_returns)

    def portfolio_variance(weights):
        variance = float(weights @ covariance @ weights)
        return max(variance, 0.0)

    def portfolio_volatility(weights):
        return float(np.sqrt(portfolio_variance(weights)))

    def portfolio_sharpe(weights):
        volatility = portfolio_volatility(weights)

        if volatility < 1e-10:
            return -1e6

        return (
            portfolio_return(weights) - RISK_FREE_RATE
        ) / volatility

    # 10. Define objective function
    if effective_objective == "min_risk":
        objective_function = portfolio_variance
    elif effective_objective == "max_return":
        objective_function = lambda weights: -portfolio_return(weights)
    else:
        objective_function = lambda weights: -portfolio_sharpe(weights)

    # 11. Run optimization
    result = minimize(
        objective_function,
        initial_weights,
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
        options={
            "maxiter": 2000,
            "ftol": 1e-10,
        },
    )

    if not result.success:
        log.warning(
            "Portfolio optimization failed: %s",
            result.message,
        )
        raise ValueError(
            "Optimization did not converge. Try selecting more assets "
            "or increasing the maximum weight."
        )

    # 12. Validate optimized weights
    weights = np.asarray(result.x, dtype=float)

    if not np.isfinite(weights).all():
        raise ValueError("Optimizer returned non-finite weights.")

    if np.any(weights < -1e-7):
        raise ValueError("Optimizer returned negative portfolio weights.")

    if np.any(weights > max_weight + 1e-7):
        raise ValueError(
            "Optimizer returned weights above the maximum allowed."
        )

    if not np.isclose(weights.sum(), 1.0, atol=1e-6):
        raise ValueError("Optimizer returned invalid portfolio weights.")

    # Clip tiny floating-point deviations and normalize.
    weights = np.clip(weights, 0.0, max_weight)
    weights /= weights.sum()

    if np.any(weights > max_weight + 1e-7):
        raise ValueError(
            "Normalized weights exceed the maximum allowed."
        )

    weight_map = {
        asset: round(float(weight), 8)
        for asset, weight in zip(assets, weights)
    }

    # 13. Equal-weight benchmark
    equal_weights = np.full(
        n_assets,
        1.0 / n_assets,
    )

    # 14. Calculate annualized portfolio metrics
    def metrics(portfolio_weights):
        annual_return = portfolio_return(portfolio_weights)
        volatility = portfolio_volatility(portfolio_weights)

        sharpe = (
            (annual_return - RISK_FREE_RATE) / volatility
            if volatility > 1e-10
            else 0.0
        )

        return {
            "expected_annual_return": round(
                annual_return, 6
            ),
            "annualized_volatility": round(
                volatility, 6
            ),
            "sharpe_ratio": round(
                float(sharpe), 4
            ),
        }

    # 15. Return results to the frontend
    return {
        "success": True,
        "universe": universe,
        "period": period,
        "objective": objective,
        "risk_preference": risk_preference,
        "effective_objective": effective_objective,
        "assets": assets,
        "weights": weight_map,
        "metrics": metrics(weights),
        "equal_weight_metrics": metrics(equal_weights),
        "observations": int(len(returns)),
        "start_date": str(prices_df.index[0].date()),
        "end_date": str(prices_df.index[-1].date()),
        "constraints": {
            "long_only": True,
            "max_weight": max_weight,
            "weights_sum": round(
                float(sum(weight_map.values())),
                6,
            ),
        },
        "method": "Mean-variance optimization using SLSQP",
        "note": (
            "Returns and risk are historical estimates, not guaranteed "
            "future performance. Estimates may be sensitive to the "
            "selected date range."
        ),
    }
