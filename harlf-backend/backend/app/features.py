import argparse

import numpy as np
import pandas as pd

from app.data_layer import load_cached
from app.universes import UNIVERSES

TRADING_DAYS = 252
DEFAULT_HORIZON = 21

FEATURES = [
    "ret_1",
    "ret_5",
    "ret_21",
    "ret_63",
    "vol_21",
    "vol_63",
    "sharpe_63",
    "sortino_63",
    "dd_63",
    "mdd_63",
    "calmar_63",
    "ma_gap_63",
    "mkt_ret_21",
    "rel_ret_21",
]


def _clean(frame):
    return frame.replace([np.inf, -np.inf], np.nan)


def _feature_frames(prices):
    returns = prices.pct_change()
    frames = {}

    for n in (1, 5, 21, 63):
        frames[f"ret_{n}"] = prices.pct_change(n)

    for n in (21, 63):
        frames[f"vol_{n}"] = returns.rolling(n).std() * np.sqrt(TRADING_DAYS)

    mean_63 = returns.rolling(63).mean()
    std_63 = returns.rolling(63).std()
    downside_63 = (returns.clip(upper=0) ** 2).rolling(63).mean() ** 0.5
    frames["sharpe_63"] = mean_63 / std_63 * np.sqrt(TRADING_DAYS)
    frames["sortino_63"] = mean_63 / downside_63 * np.sqrt(TRADING_DAYS)

    drawdown = prices / prices.rolling(63).max() - 1
    frames["dd_63"] = drawdown
    frames["mdd_63"] = drawdown.rolling(63).min()
    frames["calmar_63"] = (frames["ret_63"] * TRADING_DAYS / 63) / frames["mdd_63"].abs()

    frames["ma_gap_63"] = prices / prices.rolling(63).mean() - 1

    market = frames["ret_21"].mean(axis=1)
    frames["mkt_ret_21"] = pd.DataFrame(
        np.repeat(market.values[:, None], prices.shape[1], axis=1),
        index=prices.index,
        columns=prices.columns,
    )
    frames["rel_ret_21"] = frames["ret_21"].sub(market, axis=0)

    return {name: _clean(frame) for name, frame in frames.items()}


def _to_long(frame):
    frame = frame.rename_axis(index="date", columns="ticker")
    return frame.unstack().reorder_levels(["date", "ticker"]).sort_index()


def build_panel(prices, horizon=DEFAULT_HORIZON):
    frames = _feature_frames(prices)
    frames["target"] = prices.shift(-horizon) / prices - 1
    panel = pd.concat({name: _to_long(frame) for name, frame in frames.items()}, axis=1)
    return panel[FEATURES + ["target"]]


def training_frame(panel):
    return panel.dropna()


def latest_features(panel):
    features = panel[FEATURES].dropna()
    last_date = features.index.get_level_values("date").max()
    return features.xs(last_date, level="date")


def _sorted_dates(frame):
    return frame.index.get_level_values("date").unique().sort_values()


def split_by_date(frame, test_fraction=0.2, embargo=DEFAULT_HORIZON):
    dates = _sorted_dates(frame)
    cut = int(len(dates) * (1 - test_fraction))
    train_dates = dates[: max(cut - embargo, 0)]
    test_dates = dates[cut:]
    row_dates = frame.index.get_level_values("date")
    return frame[row_dates.isin(train_dates)], frame[row_dates.isin(test_dates)]


def walk_forward_splits(frame, n_splits=5, min_train_fraction=0.5, embargo=DEFAULT_HORIZON):
    dates = _sorted_dates(frame)
    total = len(dates)
    first_test = int(total * min_train_fraction)
    block = (total - first_test) // n_splits
    row_dates = frame.index.get_level_values("date")

    for i in range(n_splits):
        start = first_test + i * block
        end = total if i == n_splits - 1 else start + block
        train_dates = dates[: max(start - embargo, 0)]
        test_dates = dates[start:end]
        yield frame[row_dates.isin(train_dates)], frame[row_dates.isin(test_dates)]


def main():
    parser = argparse.ArgumentParser(description="Build the feature panel and inspect it.")
    parser.add_argument("--universe", default="paper_14", choices=list(UNIVERSES))
    parser.add_argument("--horizon", type=int, default=DEFAULT_HORIZON)
    args = parser.parse_args()

    prices = load_cached(args.universe)
    panel = build_panel(prices, args.horizon)
    frame = training_frame(panel)
    train, test = split_by_date(frame, embargo=args.horizon)

    dates = frame.index.get_level_values("date")
    print(f"\nUniverse: {args.universe}   Horizon: {args.horizon} trading days")
    print(f"Assets: {prices.shape[1]}   Price rows: {len(prices)}")
    print(f"Usable samples: {len(frame)}   Range: {dates.min().date()} to {dates.max().date()}")
    print(f"Features ({len(FEATURES)}): {', '.join(FEATURES)}")

    train_dates = train.index.get_level_values("date")
    test_dates = test.index.get_level_values("date")
    print(f"\nTrain: {len(train)} samples, {train_dates.min().date()} to {train_dates.max().date()}")
    print(f"Test:  {len(test)} samples, {test_dates.min().date()} to {test_dates.max().date()}")

    target = frame["target"]
    print(f"\nTarget (forward {args.horizon}-day return): mean {target.mean():.4f}, std {target.std():.4f}")
    print(f"Share of positive targets: {(target > 0).mean():.1%}")

    print("\nRank correlation of each feature with the target:")
    print(frame[FEATURES].corrwith(target, method="spearman").sort_values().round(3).to_string())

    print("\nLatest feature row per asset (used for forecasting):")
    print(latest_features(panel).round(3).to_string())


if __name__ == "__main__":
    main()
