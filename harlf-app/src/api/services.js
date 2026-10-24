
const API_BASE_URL = "/api";

// Common API request function
async function apiRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      "Cannot connect to the backend. Make sure FastAPI is running."
    );
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    // Response may not contain JSON.
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }

    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : `Request failed with status ${response.status}.`
    );
  }

  return data;
}

// Fetch real market intelligence from FastAPI
export async function getMarketIntelligence(symbol) {
  if (!symbol) {
    throw new Error("Please select a stock symbol.");
  }

  const params = new URLSearchParams({ symbol });

  return apiRequest(
    `/data/market-intelligence?${params.toString()}`
  );
}

// Available market universes and their supported assets.
export async function getMarketUniverses() {
  return apiRequest("/data/universes");
}

// Cached historical adjusted closing prices used for reproducible analytics.
export async function getHistoricalPrices(universe = "us_tech_6") {
  const params = new URLSearchParams({ universe });
  return apiRequest(`/data/prices?${params.toString()}`);
}

// Data-backed forward return forecast using the backend ML evaluation engine.
export async function getReturnForecast(
  symbol = "NVDA",
  horizon = 30,
  period = "5Y",
  model = "auto",
  refresh = false,
) {
  const params = new URLSearchParams({
    symbol,
    horizon: String(horizon),
    period,
    model,
    refresh: String(refresh),
  });
  return apiRequest(`/ml/forecast?${params.toString()}`);
}


// The following services retain your existing mock-backed behaviour.
// Keep these exports compatible with the imports used by your other pages.

export const getDashboardData = (...args) =>
  USE_MOCK ? mock.getDashboardData(...args) : apiRequest("/dashboard");

export const getPortfolio = (...args) =>
  USE_MOCK ? mock.getPortfolio(...args) : apiRequest("/portfolio");

export const getPredictions = (...args) =>
  USE_MOCK ? mock.getPredictions(...args) : apiRequest("/predictions");

export const getModelPerformance = (...args) =>
  USE_MOCK
    ? mock.getModelPerformance(...args)
    : apiRequest("/models/performance");

export const getRiskAnalysis = (...args) =>
  USE_MOCK ? mock.getRiskAnalysis(...args) : apiRequest("/risk");

export const getTransactions = (...args) =>
  USE_MOCK ? mock.getTransactions(...args) : apiRequest("/transactions");

export async function getMLEvaluation(
  symbol = "NVDA",
  period = "5Y",
  refresh = false
) {
  const params = new URLSearchParams({
    symbol,
    period,
    refresh: String(refresh),
  });

  return apiRequest(`/ml/evaluate?${params.toString()}`);
}


export async function getAgreementStatus() {
  return apiRequest("/agreement/status");
}

export async function acceptAgreement() {
  return apiRequest("/agreement/accept", {
    method: "POST",
    body: JSON.stringify({ accepted: true }),
  });
}


export async function runOptimization(payload) {
  return apiRequest("/optimizer/run", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
