import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", form);
      login(response.data);
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Login failed. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-showcase" aria-label="About AI Chat">
        <a className="brand brand-on-dark" href="/">
          <span className="brand-mark">A</span>
          <span className="brand-name">AI Chat</span>
        </a>

        <div className="showcase-copy">
          <p className="showcase-eyebrow">A clearer way to think</p>
          <h1>Your ideas, in conversation.</h1>
          <p>
            Get helpful answers, explore new ideas, and keep every conversation
            organized in one calm workspace.
          </p>
          <div className="showcase-points">
            <div className="showcase-point"><span className="showcase-check">✓</span>Start a conversation in seconds</div>
            <div className="showcase-point"><span className="showcase-check">✓</span>Pick up right where you left off</div>
            <div className="showcase-point"><span className="showcase-check">✓</span>Keep your workspace in one place</div>
          </div>
        </div>

        <p className="showcase-caption">A thoughtful space for your next big idea.</p>
      </section>

      <section className="auth-content">
        <div className="auth-card">
          <a className="brand" href="/">
            <span className="brand-mark">A</span>
            <span className="brand-name">AI Chat</span>
          </a>

          <div className="auth-heading">
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in to your account</h2>
            <p>Enter your details below to continue to your workspace.</p>
          </div>

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button className="button button-primary button-full auth-submit" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="auth-switch">
            New to AI Chat?{" "}
            <button className="text-button" type="button" onClick={() => navigate("/register")}>
              Create an account
            </button>
          </p>
        </div>
      </section>
    </main>
  );
};

export default Login;
