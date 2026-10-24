# HARLF – Adaptive ML Portfolio Optimization System

HARLF (Hierarchical Adaptive Reinforcement Learning Framework Inspired) is an intelligent portfolio optimization and market forecasting platform built with **React**, **FastAPI**, and **Machine Learning**. It combines multiple prediction models with a meta-level model selector to provide explainable investment insights, return forecasting, and portfolio intelligence through a modern interactive dashboard.

---

## Features

- Real-time Portfolio Intelligence Dashboard
- Market Intelligence for Multiple Assets
- Multi-Model Prediction Engine
- Meta-Level Model Selector
- Return Forecasting
- Portfolio Allocation Suggestions
- Performance Evaluation Metrics
- Interactive Charts and Analytics
- Modern Cyber-Themed UI

---

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- Tailwind CSS
- React Router

### Backend
- FastAPI
- Python
- SQLAlchemy
- JWT Authentication

### Machine Learning
- Linear Regression
- Random Forest
- XGBoost
- Support Vector Regression (SVR)
- Meta-Level Model Selection

### Data Sources
- Yahoo Finance
- Historical Market Datasets

---

## Project Structure

```
harlf-adaptive-ml/
│
├── harlf-app/                 # React Frontend
│   ├── src/
│   ├── public/
│   └── package.json
│
├── harlf-backend/
│   └── backend/
│       ├── app/
│       ├── data/
│       ├── requirements.txt
│       └── Dockerfile
│
└── .gitignore
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/ganesh9076/harlf-adaptive-ml.git
cd harlf-adaptive-ml
```

---

### Frontend Setup

```bash
cd harlf-app
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

### Backend Setup

```bash
cd ../harlf-backend/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs at:

```
http://127.0.0.1:8000
```

---

## Environment Variables

Create a `.env` file inside the backend directory.

```env
JWT_SECRET_KEY=your_secret_key
DATABASE_URL=your_database_url
```

> Never commit actual `.env` files to GitHub.

---

## Machine Learning Pipeline

HARLF evaluates multiple ML models on historical market data.

- Linear Regression
- Random Forest
- XGBoost
- SVR

A lightweight meta-level selector chooses the most suitable model based on evaluation performance.

Evaluation metrics include:

- MAE
- RMSE
- R² Score
- Directional Accuracy
- Confidence Score

---

## Dashboard Highlights

- Live Market Intelligence
- Asset Explorer
- Model Arena
- Return Forecasting
- Portfolio Optimizer
- Performance Analytics
- Meta-Level Intelligence

---


## Future Enhancements

- Live Trading API Integration
- Explainable AI (XAI)
- Advanced Portfolio Risk Analysis
- Multi-Market Support
- Cloud-Based Model Training
- Automated Model Retraining

---

## Authors

* **Ganesh Palav** — GitHub: https://github.com/ganesh9076
* **Aditya Bankar** — GitHub: https://github.com/Aditya-Bankar
* **Aditya Gupta** — GitHub: https://github.com/adityagupta2841
* **Pratik Jingare** — GitHub: https://github.com/pratikjingare-ctrl

---

## License

This project is developed for educational and research purposes.
