import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Sidebar from "../components/Sidebar.jsx";

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, permissions, hasPermission } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [error, setError] = useState("");

  const canCreateConversation = hasPermission("conversation:create");
  const canReadConversation = hasPermission("conversation:read");
  const canUpdateConversation = hasPermission("conversation:update");
  const canDeleteConversation = hasPermission("conversation:delete");
  const canReadOrg = hasPermission("organization:read");

  const loadWorkspace = async () => {
    setError("");
    setLoadingConversations(true);
    try {
      const tasks = [];
      if (canReadConversation) {
        tasks.push(
          api
            .get("/conversations")
            .then((res) => setConversations(res.data.conversations || []))
        );
      } else {
        setConversations([]);
      }

      if (canReadOrg) {
        tasks.push(
          api
            .get("/organization/me")
            .then((res) => setOrganization(res.data.organization))
            .catch(() => {})
        );
      }

      await Promise.all(tasks);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Could not load your workspace data. Please try again."
        )
      );
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, [canReadConversation, canReadOrg]);

  const createConversation = async (customTitle) => {
    if (!canCreateConversation) return;
    setError("");
    try {
      setLoading(true);
      const titleToUse =
        typeof customTitle === "string" && customTitle.trim()
          ? customTitle.trim()
          : newTitle.trim() || "New AI Chat";
      const response = await api.post("/conversations", {
        title: titleToUse,
      });
      setNewTitle("");
      navigate(`/chat/${response.data.conversation._id}`);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Could not start a chat. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRenameConversation = async (conversationId) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }
    setError("");
    try {
      const response = await api.patch(`/conversations/${conversationId}`, {
        title: editingTitle.trim(),
      });
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId ? response.data.conversation : c
        )
      );
      setEditingId(null);
      setEditingTitle("");
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Could not rename this conversation.")
      );
    }
  };

  const handleDeleteConversation = async (event, conversationId) => {
    event.stopPropagation();
    setError("");
    try {
      await api.delete(`/conversations/${conversationId}`);
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Could not delete this conversation.")
      );
    }
  };

  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";

  return (
    <div className="app-shell">
      <Sidebar
        onNewConversation={() => createConversation()}
        creatingConversation={loading}
      />

      <main className="app-main">
        <div className="page-container">
          <header className="page-header">
            <div>
              <p className="page-eyebrow">
                {organization?.name || user?.organizationName || "Workspace"}
              </p>
              <h1>Welcome back, {firstName}</h1>
            </div>
            <div className="page-header-meta">
              <span className={`role-pill role-pill-${user?.role || "member"}`}>
                {user?.role?.toUpperCase() || "MEMBER"}
              </span>
            </div>
          </header>

          {/* Clean Start Conversation Banner */}
          <section className="hero-banner">
            <div className="hero-banner-content">
              <h2>Start a new AI conversation</h2>
              <p>
                Ask questions, brainstorm ideas, or run organization MCP tools
                with your workspace assistant.
              </p>

              {canCreateConversation ? (
                <form
                  className="hero-search-bar"
                  onSubmit={(e) => {
                    e.preventDefault();
                    createConversation(newTitle);
                  }}
                >
                  <input
                    type="text"
                    placeholder="Give your conversation a title (optional)..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    className="button button-light"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Starting..." : "Start Chat"}
                    <span aria-hidden="true">→</span>
                  </button>
                </form>
              ) : (
                <p className="hero-restricted-badge">
                  Requires <code>conversation:create</code> permission
                </p>
              )}
            </div>
          </section>

          {/* 3 Clean Summary Cards */}
          <section className="summary-strip" aria-label="Workspace summary">
            <div className="summary-card">
              <span className="summary-label">Organization</span>
              <strong className="summary-value">
                {organization?.name || user?.organizationName || "Workspace"}
              </strong>
              <span className="summary-sub">
                {organization?.memberCount
                  ? `${organization.memberCount} team member(s)`
                  : "Active organization"}
              </span>
            </div>

            <div className="summary-card">
              <span className="summary-label">Access Level</span>
              <strong className="summary-value text-capitalize">
                {user?.role || "Member"}
              </strong>
              <span className="summary-sub">
                {user?.role === "admin"
                  ? "Full administrative privileges"
                  : `${permissions.length} active permission(s)`}
              </span>
            </div>

            <div className="summary-card">
              <span className="summary-label">Conversations</span>
              <strong className="summary-value">{conversations.length}</strong>
              <span className="summary-sub">Saved in your workspace</span>
            </div>
          </section>

          {/* Recent Conversations Section */}
          <section className="content-section" aria-labelledby="recent-heading">
            <div className="section-bar">
              <div>
                <h2 id="recent-heading">Recent Conversations</h2>
                <p className="section-sub">
                  Pick up right where you left off
                </p>
              </div>
              {!loadingConversations && (
                <span className="count-pill">{conversations.length} total</span>
              )}
            </div>

            {error && (
              <p className="inline-error mb-16" role="alert">
                {error}
              </p>
            )}

            {!canReadConversation ? (
              <div className="empty-state">
                <h3>Conversation access restricted</h3>
                <p>
                  Your account requires the <code>conversation:read</code>{" "}
                  permission to view conversations.
                </p>
              </div>
            ) : loadingConversations ? (
              <div className="loading-state" role="status">
                Loading your conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon" aria-hidden="true">
                  ✦
                </span>
                <h3>No conversations yet</h3>
                <p>
                  Start your first AI conversation above and it will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="conversation-grid">
                {conversations.map((conversation) => (
                  <div
                    className="conv-item"
                    key={conversation._id}
                    onClick={() => {
                      if (editingId !== conversation._id) {
                        navigate(`/chat/${conversation._id}`);
                      }
                    }}
                  >
                    <div className="conv-item-left">
                      <span className="conv-avatar" aria-hidden="true">
                        ✦
                      </span>
                      <div className="conv-info">
                        {editingId === conversation._id ? (
                          <div
                            className="conv-edit-inline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="clean-input clean-input-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleRenameConversation(conversation._id);
                                } else if (e.key === "Escape") {
                                  setEditingId(null);
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="button button-primary button-sm"
                              onClick={() =>
                                handleRenameConversation(conversation._id)
                              }
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="button button-secondary button-sm"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <strong className="conv-title">
                              {conversation.title || "Untitled conversation"}
                            </strong>
                            <span className="conv-date">
                              Updated{" "}
                              {new Date(
                                conversation.updatedAt
                              ).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {editingId !== conversation._id && (
                      <div
                        className="conv-item-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canUpdateConversation && (
                          <button
                            type="button"
                            className="ghost-action-btn"
                            title="Rename"
                            onClick={() => {
                              setEditingId(conversation._id);
                              setEditingTitle(conversation.title || "");
                            }}
                          >
                            Rename
                          </button>
                        )}
                        {canDeleteConversation && (
                          <button
                            type="button"
                            className="ghost-action-btn ghost-action-danger"
                            title="Delete"
                            onClick={(e) =>
                              handleDeleteConversation(e, conversation._id)
                            }
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
