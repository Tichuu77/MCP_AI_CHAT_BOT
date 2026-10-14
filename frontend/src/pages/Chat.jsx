import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { MarkdownMessage } from "../components/MarkdownMessage.jsx";
import { ArtifactPanel } from "../components/ArtifactPanel.jsx";

const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [error, setError] = useState("");

  const canCreateConversation = hasPermission("conversation:create");
  const canUpdateConversation = hasPermission("conversation:update");
  const canDeleteConversation = hasPermission("conversation:delete");
  const canReadMembers = hasPermission("member:read");

  const loadConversation = async () => {
    setError("");
    try {
      const [convRes, listRes, artifactsRes] = await Promise.all([
        api.get(`/conversations/${conversationId}`),
        api.get("/conversations").catch(() => ({ data: { conversations: [] } })),
        api
          .get(`/artifacts/conversation/${conversationId}`)
          .catch(() => ({ data: { data: [] } })),
      ]);
      setConversation(convRes.data.conversation);
      setTitleInput(convRes.data.conversation.title || "");
      setConversations(listRes.data.conversations || []);

      const loadedArtifacts = artifactsRes.data?.data || [];
      setArtifacts(loadedArtifacts);
      if (loadedArtifacts.length > 0) {
        setActiveArtifact(loadedArtifacts[0]);
      } else {
        setActiveArtifact(null);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not load this conversation. Please try again."
      );
    }
  };

  useEffect(() => {
    setConversation(null);
    setEditingTitle(false);
    setArtifacts([]);
    setActiveArtifact(null);
    loadConversation();
  }, [conversationId]);

  const sendMessage = async (event, presetText) => {
    if (event) event.preventDefault();
    const textToSend = (presetText ?? message).trim();
    if (!textToSend || loading) return;

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await api.post(`/chats/${conversationId}`, {
        message: textToSend,
      });

      setConversation((previous) => ({
        ...previous,
        messages: [
          ...previous.messages,
          { role: "user", content: textToSend },
          { role: "assistant", content: response.data.message },
        ],
      }));

      // If new or updated artifacts were generated, add/update in state & open active panel
      if (response.data?.artifacts?.length > 0) {
        const newOrUpdated = response.data.artifacts;
        setArtifacts((prev) => {
          const map = new Map(prev.map((a) => [a.identifier, a]));
          for (const art of newOrUpdated) {
            map.set(art.identifier, art);
          }
          return Array.from(map.values());
        });
        setActiveArtifact(newOrUpdated[0]);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Your message could not be sent. Please try again."
      );
      if (!presetText) setMessage(textToSend);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!canCreateConversation) return;
    try {
      const res = await api.post("/conversations", { title: "New AI Chat" });
      navigate(`/chat/${res.data.conversation._id}`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not create a new conversation."
      );
    }
  };

  const handleRename = async () => {
    if (!titleInput.trim() || !canUpdateConversation) {
      setEditingTitle(false);
      return;
    }
    try {
      const res = await api.patch(`/conversations/${conversationId}`, {
        title: titleInput.trim(),
      });
      setConversation((prev) => ({
        ...prev,
        title: res.data.conversation.title,
      }));
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId
            ? { ...c, title: res.data.conversation.title }
            : c
        )
      );
      setEditingTitle(false);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not rename this conversation."
      );
    }
  };

  const handleDelete = async () => {
    if (!canDeleteConversation) return;
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await api.delete(`/conversations/${conversationId}`);
      navigate("/dashboard");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not delete this conversation."
      );
    }
  };

  if (!conversation) {
    return (
      <main className="loading-state" role={error ? "alert" : "status"}>
        <div className="loading-box">
          <p>{error || "Loading conversation..."}</p>
          {error && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => navigate("/dashboard")}
            >
              ← Back to Overview
            </button>
          )}
        </div>
      </main>
    );
  }

  const initials = user?.name?.trim().charAt(0).toUpperCase() || "U";
  const roleLabel = user?.role ? user.role.toUpperCase() : "MEMBER";

  const quickPrompts = [
    "Who am I and what is my role?",
    ...(canReadMembers ? ["List all members in my organization"] : []),
  ];

  return (
    <div className={`chat-layout ${activeArtifact ? "chat-layout-split" : ""}`}>
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <a
            className="brand"
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              navigate("/dashboard");
            }}
          >
            <span className="brand-mark">A</span>
            <div className="brand-text">
              <span className="brand-name">AI Chat</span>
              <span className="brand-sub">
                {user?.organizationName || "Workspace"}
              </span>
            </div>
          </a>
        </div>

        <div className="sidebar-cta">
          <button
            className="button button-secondary button-full button-sm"
            type="button"
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Overview
          </button>
          {canCreateConversation && (
            <button
              className="button button-primary button-full button-sm"
              type="button"
              onClick={handleCreateNew}
            >
              ＋ New Chat
            </button>
          )}
        </div>

        <p className="sidebar-section-label">Conversations</p>
        <div className="chat-history-list">
          {conversations.map((item) => (
            <button
              key={item._id}
              type="button"
              className={`sidebar-link ${
                item._id === conversationId ? "sidebar-link-active" : ""
              }`}
              onClick={() => navigate(`/chat/${item._id}`)}
            >
              <span className="truncate">
                {item.title || "Untitled conversation"}
              </span>
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="account-card">
            <span className="account-avatar">{initials}</span>
            <div className="account-copy">
              <div className="account-name-row">
                <strong>{user?.name || "Your account"}</strong>
                <span
                  className={`role-pill role-pill-${user?.role || "member"}`}
                >
                  {roleLabel}
                </span>
              </div>
              <span>{user?.email || "Signed in"}</span>
            </div>
          </div>
          <button
            className="button button-secondary button-full button-sm"
            type="button"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="chat-main">
        <header className="chat-header">
          <div className="chat-header-title">
            {editingTitle ? (
              <div className="conv-edit-inline">
                <input
                  type="text"
                  className="clean-input clean-input-sm"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                />
                <button
                  type="button"
                  className="button button-primary button-sm"
                  onClick={handleRename}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="button button-secondary button-sm"
                  onClick={() => setEditingTitle(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <h1>{conversation.title || "New conversation"}</h1>
                <p>AI Workspace Assistant</p>
              </div>
            )}
          </div>

          <div className="row-actions">
            {artifacts.length > 0 && (
              <button
                type="button"
                className={`ghost-action-btn ${
                  activeArtifact ? "ghost-action-btn-active" : ""
                }`}
                onClick={() =>
                  setActiveArtifact(activeArtifact ? null : artifacts[0])
                }
              >
                📁 Artifacts ({artifacts.length})
              </button>
            )}
            {canUpdateConversation && !editingTitle && (
              <button
                type="button"
                className="ghost-action-btn"
                onClick={() => {
                  setTitleInput(conversation.title || "");
                  setEditingTitle(true);
                }}
              >
                Rename
              </button>
            )}
            {canDeleteConversation && (
              <button
                type="button"
                className="ghost-action-btn ghost-action-danger"
                onClick={handleDelete}
              >
                Delete
              </button>
            )}
          </div>
        </header>

        {artifacts.length > 0 && (
          <div className="chat-artifact-bar">
            <span className="artifact-bar-label">Artifacts:</span>
            <div className="artifact-bar-chips">
              {artifacts.map((art) => (
                <button
                  key={art._id || art.identifier}
                  type="button"
                  className={`artifact-chip ${
                    activeArtifact?._id === art._id ? "active" : ""
                  }`}
                  onClick={() => setActiveArtifact(art)}
                >
                  📄 {art.title}{" "}
                  <span className="artifact-chip-ver">v{art.version}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <section
          className="messages"
          aria-label="Conversation messages"
          aria-live="polite"
        >
          <div className="messages-inner">
            {conversation.messages.length === 0 ? (
              <div className="chat-empty">
                <span className="empty-state-icon" aria-hidden="true">
                  ✦
                </span>
                <h2>How can I help you today?</h2>
                <p>
                  Ask any question or try one of the workspace prompts below.
                </p>
                <div className="quick-prompt-row">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="prompt-pill"
                      onClick={() => sendMessage(null, prompt)}
                      disabled={loading}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              conversation.messages.map((msg, index) => (
                <article
                  key={`${msg.role}-${index}`}
                  className={`message ${
                    msg.role === "user" ? "user-message" : "assistant-message"
                  }`}
                >
                  <strong>{msg.role === "user" ? "You" : "AI Assistant"}</strong>
                  {msg.role === "user" ? (
                    <p>{msg.content}</p>
                  ) : (
                    <MarkdownMessage content={msg.content} />
                  )}
                </article>
              ))
            )}
            {loading && (
              <article className="message assistant-message" role="status">
                <strong>AI Assistant</strong>
                <p>Thinking...</p>
              </article>
            )}
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </section>

        <div className="chat-input-wrap">
          <form className="chat-input" onSubmit={(e) => sendMessage(e)}>
            <input
              type="text"
              aria-label="Message"
              placeholder="Write a message..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={loading}
            />
            <button
              className="button button-primary"
              type="submit"
              disabled={loading || !message.trim()}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </main>

      {/* Claude-style Artifact side panel */}
      {activeArtifact && (
        <ArtifactPanel
          artifact={activeArtifact}
          onClose={() => setActiveArtifact(null)}
        />
      )}
    </div>
  );
};

export default Chat;
