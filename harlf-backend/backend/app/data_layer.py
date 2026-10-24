import argparse
import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from app.settings import DATA_DIR, DEFAULT_START
from app.universes import UNIVERSES

TRADING_DAYS = 252


def asset_names(universe):
    return {ticker: info[0] for ticker, info in UNIVERSES[universe].items()}


def asset_classes(universe):
    return {ticker: info[1] for ticker, info in UNIVERSES[universe].items()}


def download_prices(tickers, start, end=None):
    import yfinance as yf

    tickers = list(tickers)
    raw = yf.download(
        tickers,
        start=start,
        end=end,
        auto_adjust=True,
        progress=False,
        group_by="column",
        threads=True,
    )
    if raw is None or raw.empty:
        raise RuntimeError("yfinance returned no data. Check your internet connection.")

    if isinstance(raw.columns, pd.MultiIndex):
        close = raw["Close"].copy()
    else:
        close = raw[["Close"]].copy()
        close.columns = [tickers[0]]

    if getattr(close.index, "tz", None) is not None:
        close.index = close.index.tz_localize(None)

    return close.dropna(axis=1, how="all")


def clean_prices(
    prices,
    max_gap=5,
    min_span_coverage=0.85,
    max_start_delay_days=180,
    max_end_gap_days=30,
    extreme_move=0.35,
):
    report = {
        "requested": list(prices.columns),
        "dropped": {},
        "nonpositive_fixed": {},
        "extreme_moves": [],
    }

    df = prices.copy().sort_index()
    df = df[~df.index.duplicated(keep="last")]
    df = df.dropna(how="all")

    bad = df <= 0
    for col in df.columns[bad.any().values]:
        report["nonpositive_fixed"][col] = int(bad[col].sum())
    df = df.mask(bad)

    first_index = df.index[0]
    last_index = df.index[-1]

    for col in df.columns:
        series = df[col]
        first_valid = series.first_valid_index()
        last_valid = series.last_valid_index()

        if first_valid is None:
            report["dropped"][col] = "no valid prices"
            continue
        if (first_valid - first_index).days > max_start_delay_days:
            report["dropped"][col] = f"history starts late ({first_valid.date()})"
            continue
        if (last_index - last_valid).days > max_end_gap_days:
            report["dropped"][col] = f"data ends early ({last_valid.date()})"
            continue

        span = series.loc[first_valid:last_valid]
        coverage = span.notna().mean()
        if coverage < min_span_coverage:
            report["dropped"][col] = f"only {coverage:.0%} of days have prices"

    df = df.drop(columns=list(report["dropped"]))
    if df.empty:
        raise RuntimeError("No assets left after cleaning.")

    df = df.ffill(limit=max_gap).dropna(how="any")

    moves = df.pct_change().abs().stack()
    big = moves[moves > extreme_move].sort_values(ascending=False).head(10)
    report["extreme_moves"] = [
        (str(date.date()), ticker, round(float(value), 3))
        for (date, ticker), value in big.items()
    ]

    report["kept"] = list(df.columns)
    report["rows"] = int(len(df))
    report["start"] = str(df.index[0].date())
    report["end"] = str(df.index[-1].date())
    return df, report


def compute_returns(prices, log=False):
    if log:
        return np.log(prices / prices.shift(1)).dropna()
    return prices.pct_change().dropna()


def summarize(prices):
    returns = compute_returns(prices)
    table = pd.DataFrame(
        {
            "first_date": prices.apply(lambda s: s.first_valid_index().date()),
            "last_price": prices.iloc[-1].round(2),
            "ann_return_%": (returns.mean() * TRADING_DAYS * 100).round(2),
            "ann_vol_%": (returns.std() * np.sqrt(TRADING_DAYS) * 100).round(2),
        }
    )
    table["sharpe"] = (table["ann_return_%"] / table["ann_vol_%"]).round(2)
    return table


def _cache_path(universe):
    return DATA_DIR / f"prices_{universe}.csv"


def _meta_path(universe):
    return DATA_DIR / f"prices_{universe}.json"


def _write_cache(universe, prices, report):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    prices.to_csv(_cache_path(universe))
    meta = dict(report)
    meta["downloaded_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    _meta_path(universe).write_text(json.dumps(meta, indent=2))


def _read_cache(universe):
    return pd.read_csv(_cache_path(universe), index_col=0, parse_dates=True)


def get_meta(universe):
    path = _meta_path(universe)
    if not path.exists():
        return None
    return json.loads(path.read_text())


def load_cached(universe):
    if universe not in UNIVERSES:
        raise ValueError(f"Unknown universe '{universe}'.")
    if not _cache_path(universe).exists():
        raise FileNotFoundError(universe)
    return _read_cache(universe)


def refresh_all(start=DEFAULT_START, end=None):
    for universe in UNIVERSES:
        try:
            prices = get_prices(universe, start, end, refresh=True)
            print(f"{universe}: {prices.shape[0]} rows, {prices.shape[1]} assets")
        except Exception as exc:
            print(f"{universe}: failed ({exc})")


def get_prices(universe="paper_14", start=DEFAULT_START, end=None, refresh=False):
    if universe not in UNIVERSES:
        raise ValueError(f"Unknown universe '{universe}'. Choose from {list(UNIVERSES)}.")

    if _cache_path(universe).exists() and not refresh:
        return _read_cache(universe)

    tickers = list(UNIVERSES[universe])
    try:
        raw = download_prices(tickers, start, end)
    except Exception as exc:
        if _cache_path(universe).exists():
            print(f"Download failed ({exc}). Using cached data.")
            return _read_cache(universe)
        raise

    prices, report = clean_prices(raw)
    report["missing_from_download"] = [t for t in tickers if t not in raw.columns]
    _write_cache(universe, prices, report)
    return prices


def main():
    parser = argparse.ArgumentParser(description="Download, clean and cache market prices.")
    parser.add_argument("--universe", default="paper_14", choices=list(UNIVERSES))
    parser.add_argument("--start", default=DEFAULT_START)
    parser.add_argument("--end", default=None)
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()

    if args.all:
        refresh_all(args.start, args.end)
        return

    prices = get_prices(args.universe, args.start, args.end, args.refresh)
    meta = get_meta(args.universe) or {}

    print(f"\nUniverse: {args.universe}")
    print(f"Rows: {len(prices)}   Range: {prices.index[0].date()} to {prices.index[-1].date()}")
    print(f"Assets kept ({prices.shape[1]}): {', '.join(prices.columns)}")

    if meta.get("downloaded_at"):
        print(f"Downloaded at: {meta['downloaded_at']}")
    if meta.get("missing_from_download"):
        print(f"Not returned by Yahoo: {meta['missing_from_download']}")
    for ticker, reason in meta.get("dropped", {}).items():
        print(f"Dropped {ticker}: {reason}")
    for ticker, count in meta.get("nonpositive_fixed", {}).items():
        print(f"Fixed {count} non-positive price(s) in {ticker}")
    if meta.get("extreme_moves"):
        print("Largest one-day moves (date, ticker, change):")
        for item in meta["extreme_moves"][:5]:
            print(f"  {item[0]}  {item[1]}  {item[2]:.1%}")

    print("\nPer-asset summary:")
    print(summarize(prices).to_string())

    print("\nCorrelation of daily returns:")
    print(compute_returns(prices).corr().round(2).to_string())


if __name__ == "__main__":
    main()
