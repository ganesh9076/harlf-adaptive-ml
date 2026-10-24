import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login, register } from "../auth";
import "./Login.css";

function Hierarchy() {
  const models = ["Linear Regression", "Random Forest", "XGBoost", "SVR"];
  const ys = [48, 108, 168, 228];

  return (
    <svg
      className="hierarchy"
      viewBox="0 0 440 276"
      role="img"
      aria-label="Four ML models feed a meta-level selector, which feeds the portfolio allocation"
    >
      {ys.map((y) => (
        <path
          key={y}
          d={`M158 ${y} C 200 ${y}, 200 138, 242 138`}
          className="link"
        />
      ))}
      <path d="M318 138 L 352 138" className="link link-strong" />

      {models.map((name, i) => (
        <g key={name} transform={`translate(0 ${ys[i] - 18})`}>
          <rect x="0" y="0" width="158" height="36" rx="8" className="node" />
          <circle cx="18" cy="18" r="3.5" className="dot" />
          <text x="32" y="22" className="node-text">
            {name}
          </text>
        </g>
      ))}

      <g transform="translate(242 108)">
        <rect width="76" height="60" rx="10" className="node node-meta" />
        <text x="38" y="26" textAnchor="middle" className="meta-text">
          Meta
        </text>
        <text x="38" y="43" textAnchor="middle" className="meta-sub">
          selector
        </text>
      </g>

      <g transform="translate(352 108)">
        <rect width="88" height="60" rx="10" className="node" />
        <text x="44" y="26" textAnchor="middle" className="node-text">
          Weights
        </text>
        <text x="44" y="43" textAnchor="middle" className="meta-sub">
          14 assets
        </text>
      </g>
    </svg>
  );
}

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL;
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD;
const HAS_DEMO = Boolean(DEMO_EMAIL && DEMO_PASSWORD);

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from?.pathname || "/";

  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    if (mode === "signup" && password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        await register(name, email, password, remember);
      } else {
        await login(email, password, remember);
      }
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || "Sign in failed. Try again.");
      setLoading(false);
    }
  }

  function switchMode() {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError("");
    setPassword("");
  }

  function fillDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError("");
  }

  return (
    <main className="login">
      <section className="login-brand" aria-hidden="false">
        <div className="brand-mark">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
            <circle cx="16" cy="6" r="3" fill="currentColor" />
            <circle cx="6" cy="25" r="3" fill="currentColor" />
            <circle cx="26" cy="25" r="3" fill="currentColor" />
            <path
              d="M16 9 L16 18 M16 18 L7.5 23 M16 18 L24.5 23"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          <div>
            <span className="brand-name">HARLF</span>
            <span className="brand-sub">Adaptive ML intelligence</span>
          </div>
        </div>

        <div className="brand-body">
          <h1>From market signals to adaptive allocation.</h1>
          <p>
            Four models predict returns. A meta-level selector keeps the best
            one. The optimizer turns that into portfolio weights.
          </p>
          <Hierarchy />
        </div>

        <p className="brand-foot">
          Trained on historical data. Compared against an equal-weight
          portfolio.
        </p>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit} noValidate>
          <header>
            <h2>{mode === "signin" ? "Sign in" : "Create account"}</h2>
            <p>
              {mode === "signin"
                ? "Use your account to open the dashboard."
                : "Register with your email to open the dashboard."}
            </p>
          </header>

          {mode === "signup" && (
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(error)}
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder={mode === "signin" ? "Enter your password" : "At least 8 characters"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(error)}
              />
              <button
                type="button"
                className="toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="row">
            <label className="check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Keep me signed in</span>
            </label>
          </div>

          <div className="error" role="alert" aria-live="polite">
            {error}
          </div>

          <button type="submit" className="submit" disabled={loading}>
            {loading
              ? mode === "signin" ? "Signing in" : "Creating account"
              : mode === "signin" ? "Sign in" : "Create account"}
          </button>

          <p className="switch">
            {mode === "signin" ? "New here?" : "Already have an account?"}
            <button type="button" onClick={switchMode}>
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </p>

          {mode === "signin" && HAS_DEMO && (
            <div className="demo">
              <span>Want a quick look? Use the shared demo account.</span>
              <button type="button" onClick={fillDemo}>
                Fill demo account
              </button>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
