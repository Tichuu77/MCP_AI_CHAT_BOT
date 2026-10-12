import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Sidebar = ({ onNewConversation, creatingConversation = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();

  const initials = user?.name?.trim().charAt(0).toUpperCase() || "U";
  const roleLabel = user?.role ? user.role.toUpperCase() : "MEMBER";

  const canCreateConversation = hasPermission("conversation:create");
  const canViewOrganization =
    hasPermission("organization:read") || hasPermission("member:read");

  const isActive = (pathPrefix) => location.pathname.startsWith(pathPrefix);

  return (
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

      {canCreateConversation && onNewConversation && (
        <div className="sidebar-cta">
          <button
            className="button button-primary button-full"
            type="button"
            onClick={onNewConversation}
            disabled={creatingConversation}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {creatingConversation ? "Starting..." : "New Chat"}
          </button>
        </div>
      )}

      <nav className="sidebar-nav" aria-label="Main navigation">
        <p className="sidebar-section-label">Menu</p>

        <button
          className={`sidebar-link ${isActive("/dashboard") ? "sidebar-link-active" : ""}`}
          type="button"
          onClick={() => navigate("/dashboard")}
        >
          <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <span>Overview</span>
        </button>

        {canViewOrganization && (
          <button
            className={`sidebar-link ${isActive("/organization") ? "sidebar-link-active" : ""}`}
            type="button"
            onClick={() => navigate("/organization")}
          >
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Team &amp; Organization</span>
          </button>
        )}

        <button
          className={`sidebar-link ${isActive("/permissions") ? "sidebar-link-active" : ""}`}
          type="button"
          onClick={() => navigate("/permissions")}
        >
          <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Roles &amp; Permissions</span>
        </button>

        <button
          className={`sidebar-link ${isActive("/diagnostics") ? "sidebar-link-active" : ""}`}
          type="button"
          onClick={() => navigate("/diagnostics")}
        >
          <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span>System Status</span>
        </button>
      </nav>

      <div className="sidebar-bottom">
        <div className="account-card">
          <span className="account-avatar">{initials}</span>
          <div className="account-copy">
            <div className="account-name-row">
              <strong>{user?.name || "Your account"}</strong>
              <span className={`role-pill role-pill-${user?.role || "member"}`}>
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
  );
};

export default Sidebar;
