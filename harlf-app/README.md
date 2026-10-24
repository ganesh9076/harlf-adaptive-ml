# HARLF — Adaptive ML Portfolio Intelligence

Premium dark-mode React frontend for an AI-powered portfolio analysis & optimization
platform, architected for a future Python/FastAPI backend (Linear Regression,
Random Forest, XGBoost, SVR, meta-level model selection, forecasting, optimization).

> From market signals to adaptive allocation.
> **All data is simulated demo data** — clearly labeled throughout the UI.

## Stack

React 18 · Vite · Tailwind CSS · Framer Motion · Recharts · Lucide React · react-router-dom

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
```

## Pages

| Route | Workspace |
|---|---|
| `/` | Dashboard — executive metrics, hero performance chart |
| `/market` | Market Intelligence — asset selector, price chart, indicators |
| `/explorer` | Asset Explorer — sortable-style universe table with sparklines |
| `/models` | ML Model Lab — four base learners + arena bars |
| `/arena` | Model Arena — champion banner, metric face-off, radar |
| `/meta` | Meta-Level Selector — interactive hierarchy + live competition |
| `/forecast` | Return Forecast — historical vs predicted + confidence band |
| `/optimizer` | Portfolio Optimizer — config, run animation, donut allocation |
| `/allocation` | Allocation — drift monitoring + interactive sliders |
| `/performance` | Performance — backtest, drawdown, risk-return map, verdict |
| `/settings` | Settings — API endpoint, model engine toggles, system status |

## Architecture

```
src/
├── api/services.js      # API-ready async services (mock bodies → fetch later)
├── data/mock.js         # deterministic seeded mock data, 1:1 with endpoints
├── hooks.js             # simulated loading, count-up, toast system
├── components/          # Sidebar, Navbar, CommandPalette, StatCard, charts…
└── pages/               # one file per workspace
```

Press **⌘K / Ctrl-K** anywhere for the command palette.
Sidebar collapses to an animated drawer on mobile; all charts are responsive.

## Intelligence ML integration

The ML Models and Model Arena pages are now connected to the FastAPI backend.

Flow:

`Market Intelligence selected stock -> shared selected asset -> /api/ml/evaluate -> LR / RF / XGBoost / SVR -> Model Arena`

The backend uses the shared `us_tech_6` universe in `harlf-backend/backend/app/universes.py` and the market price cache. The four models use the same chronological 70% train / 15% validation / 15% test split. The Arena selects its champion from validation metrics instead of using hard-coded demo values.

The backend dependencies include `scikit-learn` and `xgboost`.

### ML API

- `GET /api/ml/evaluate?symbol=NVDA&period=5Y`
- `GET /api/ml/models?symbol=NVDA&period=5Y`
- `GET /api/ml/arena?symbol=NVDA&period=5Y`
