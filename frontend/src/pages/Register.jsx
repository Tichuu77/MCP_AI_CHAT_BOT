import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });
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
      const response = await api.post("/auth/register", form);
      login(response.data);
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Registration failed. Please check your details and try again.");
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
          <p className="showcase-eyebrow">Make room for ideas</p>
          <h1>A workspace that thinks with you.</h1>
          <p>
            Create your account and bring your questions, plans, and
            conversations together in one place.
          </p>
          <div className="showcase-points">
            <div className="showcase-point"><span className="showcase-check">✓</span>Your conversations, all in one place</div>
            <div className="showcase-point"><span className="showcase-check">✓</span>A workspace for your organization</div>
            <div className="showcase-point"><span className="showcase-check">✓</span>Ready whenever inspiration strikes</div>
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
            <p className="eyebrow">Get started</p>
            <h2>Create your account</h2>
            <p>Set up your profile and organization to get started.</p>
          </div>

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="register-name">Your name</label>
              <input
                id="register-name"
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Alex Morgan"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="register-email">Work email</label>
              <input
                id="register-email"
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
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                name="password"
                autoComplete="new-password"
                placeholder="Create a password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="register-organization">Organization name</label>
              <input
                id="register-organization"
                type="text"
                name="organizationName"
                autoComplete="organization"
                placeholder="Your team or company"
                value={form.organizationName}
                onChange={handleChange}
                required
              />
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button className="button button-primary button-full auth-submit" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <button className="text-button" type="button" onClick={() => navigate("/login")}>
              Sign in
            </button>
          </p>
        </div>
      </section>
    </main>
  );
};

export default Register;
