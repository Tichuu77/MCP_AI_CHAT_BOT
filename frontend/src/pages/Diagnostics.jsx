import { useState } from "react";
import api from "../services/api.js";
import Sidebar from "../components/Sidebar.jsx";

const ENDPOINTS = [
  {
    id: "health",
    title: "API Health Check",
    method: "GET",
    path: "/health",
    access: "Public",
    description: "Verifies the Express API server is reachable and healthy.",
  },
  {
    id: "profile",
    title: "Authenticated Profile Check",
    method: "GET",
    path: "/test/profile",
    access: "Authenticated",
    description: "Verifies your JWT token and returns decoded user context.",
  },
  {
    id: "management",
    title: "Management Role Gate",
    method: "GET",
    path: "/test/management",
    access: "Admin / Manager",
    description: "Tests RBAC middleware requireRole('admin', 'manager').",
  },
  {
    id: "admin",
    title: "Admin Role Gate",
    method: "GET",
    path: "/test/admin",
    access: "Admin Only",
    description: "Tests RBAC middleware requireRole('admin').",
  },
  {
    id: "mcp-test",
    title: "MCP Server Connectivity",
    method: "GET",
    path: "/chats/mcp-test",
    access: "Authenticated",
    description: "Tests stdio connection from backend to the MCP tool server.",
  },
  {
    id: "ai-mcp-test",
    title: "AI + MCP Tool Execution",
    method: "GET",
    path: "/chats/ai-mcp-test",
    access: "Authenticated",
    description:
      "Runs a test prompt through Ollama + MCP get_current_user_info tool.",
  },
];

const Diagnostics = () => {
  const [results, setResults] = useState({});
  const [runningId, setRunningId] = useState(null);

  const runCheck = async (endpoint) => {
    setRunningId(endpoint.id);
    try {
      const response = await api.get(endpoint.path);
      setResults((prev) => ({
        ...prev,
        [endpoint.id]: {
          ok: true,
          status: response.status,
          data: response.data,
        },
      }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [endpoint.id]: {
          ok: false,
          status: error.response?.status || 500,
          data: error.response?.data || { message: error.message },
        },
      }));
    } finally {
      setRunningId(null);
    }
  };

  const runAllFastChecks = async () => {
    for (const ep of ENDPOINTS.slice(0, 4)) {
      await runCheck(ep);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="app-main">
        <div className="page-container">
          <header className="page-header">
            <div>
              <p className="page-eyebrow">System Health &amp; RBAC Verification</p>
              <h1>System Status</h1>
            </div>
            <button
              type="button"
              className="button button-primary"
              onClick={runAllFastChecks}
              disabled={Boolean(runningId)}
            >
              Run All RBAC Checks
            </button>
          </header>

          <section className="diag-grid" aria-label="Diagnostic endpoints">
            {ENDPOINTS.map((ep) => {
              const res = results[ep.id];
              const isRunning = runningId === ep.id;

              return (
                <div key={ep.id} className="surface-card diag-card">
                  <div className="diag-top">
                    <div className="diag-meta-row">
                      <span className="method-pill">{ep.method}</span>
                      <code className="endpoint-code">/api{ep.path}</code>
                      <span className="status-pill status-pill-gray ml-auto">
                        {ep.access}
                      </span>
                    </div>
                    <h3>{ep.title}</h3>
                    <p className="section-sub">{ep.description}</p>
                  </div>

                  <div className="diag-footer">
                    <button
                      type="button"
                      className="button button-secondary button-sm"
                      onClick={() => runCheck(ep)}
                      disabled={isRunning}
                    >
                      {isRunning ? "Testing..." : "Test Endpoint"}
                    </button>
                    {res && (
                      <span
                        className={`status-pill ${
                          res.ok ? "status-pill-green" : "status-pill-red"
                        }`}
                      >
                        HTTP {res.status} • {res.ok ? "Passed" : "Blocked"}
                      </span>
                    )}
                  </div>

                  {res && (
                    <pre className="diag-console">
                      {JSON.stringify(res.data, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Diagnostics;
