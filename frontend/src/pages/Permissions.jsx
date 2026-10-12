import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Sidebar from "../components/Sidebar.jsx";

const PERMISSION_GROUPS = [
  {
    category: "Team & Members",
    items: [
      { key: "member:create", label: "Create Members" },
      { key: "member:read", label: "View Members" },
      { key: "member:update", label: "Update Members & Overrides" },
      { key: "member:delete", label: "Remove Members" },
    ],
  },
  {
    category: "Organization",
    items: [{ key: "organization:read", label: "Read Organization Profile" }],
  },
  {
    category: "Conversations",
    items: [
      { key: "conversation:create", label: "Create Conversations" },
      { key: "conversation:read", label: "Read Conversations" },
      { key: "conversation:update", label: "Rename Conversations" },
      { key: "conversation:delete", label: "Delete Conversations" },
    ],
  },
  {
    category: "Summaries & Analytics",
    items: [
      { key: "summary:read", label: "Read Team Summaries" },
      { key: "summary:self", label: "Read Personal Summary" },
      { key: "compare:read", label: "Compare Metrics" },
    ],
  },
];

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

const Permissions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    permissions,
    permissionDetails,
    hasRole,
    hasPermission,
    refreshProfile,
  } = useAuth();

  const isAdmin = hasRole("admin");
  const isManager = hasRole("manager");
  const canReadMembers = hasPermission("member:read");
  const canUpdateMembers = hasPermission("member:update");

  // Active top-level tab: "my-access" | "roles" | "overrides"
  const initialTab =
    searchParams.get("tab") ||
    (searchParams.get("userId") ? "overrides" : "my-access");
  const [activeTab, setActiveTab] = useState(initialTab);

  const [roleMatrix, setRoleMatrix] = useState({
    manager: [],
    member: [],
  });
  const [selectedRoleTab, setSelectedRoleTab] = useState("manager");
  const [savingRole, setSavingRole] = useState(false);

  const [members, setMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(
    searchParams.get("userId") || ""
  );
  const [targetUserPerm, setTargetUserPerm] = useState(null);
  const [userAllow, setUserAllow] = useState([]);
  const [userDeny, setUserDeny] = useState([]);
  const [savingUserPerm, setSavingUserPerm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const currentUserId = user?.id || user?._id;

  const loadRoleAndMembers = async () => {
    if (!canReadMembers) return;
    setLoading(true);
    setError("");
    try {
      const [rolesRes, membersRes] = await Promise.all([
        api.get("/permissions/roles"),
        api.get("/organization/members"),
      ]);

      setRoleMatrix({
        manager: rolesRes.data.roles?.manager || [],
        member: rolesRes.data.roles?.member || [],
      });

      const allMembers = membersRes.data.members || [];
      const eligible = allMembers.filter((m) => {
        if (m.role === "admin") return false;
        if (isAdmin) return true;
        if (isManager) return m.managerId === currentUserId;
        return false;
      });
      setMembers(eligible);

      const paramUserId = searchParams.get("userId");
      if (paramUserId && eligible.some((m) => m._id === paramUserId)) {
        setSelectedUserId(paramUserId);
      } else if (eligible.length > 0 && !selectedUserId) {
        setSelectedUserId(eligible[0]._id);
      }
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Could not load RBAC configuration.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoleAndMembers();
  }, [canReadMembers, isAdmin, isManager]);

  useEffect(() => {
    if (!selectedUserId || !canReadMembers) {
      setTargetUserPerm(null);
      return;
    }

    const fetchUserPermissions = async () => {
      try {
        const res = await api.get(`/permissions/users/${selectedUserId}`);
        setTargetUserPerm(res.data);
        setUserAllow(res.data.allow || []);
        setUserDeny(res.data.deny || []);
      } catch (requestError) {
        setError(
          getErrorMessage(requestError, "Could not load member permissions.")
        );
      }
    };

    fetchUserPermissions();
  }, [selectedUserId, canReadMembers]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError("");
    setSuccessMsg("");
    const nextParams = { tab };
    if (tab === "overrides" && selectedUserId) {
      nextParams.userId = selectedUserId;
    }
    setSearchParams(nextParams);
  };

  const toggleRolePermission = (role, permKey) => {
    if (!isAdmin) return;
    setRoleMatrix((prev) => {
      const current = new Set(prev[role] || []);
      if (current.has(permKey)) {
        current.delete(permKey);
      } else {
        current.add(permKey);
      }
      return {
        ...prev,
        [role]: [...current],
      };
    });
  };

  const handleSaveRolePermissions = async () => {
    if (!isAdmin) return;
    setError("");
    setSuccessMsg("");
    setSavingRole(true);
    try {
      const res = await api.put(`/permissions/roles/${selectedRoleTab}`, {
        permissions: roleMatrix[selectedRoleTab],
      });
      setSuccessMsg(
        res.data.message || `Updated ${selectedRoleTab} role permissions.`
      );
      await refreshProfile();
      if (selectedUserId) {
        const userRes = await api.get(`/permissions/users/${selectedUserId}`);
        setTargetUserPerm(userRes.data);
      }
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Failed to update role permissions.")
      );
    } finally {
      setSavingRole(false);
    }
  };

  const getOverrideState = (permKey) => {
    if (userDeny.includes(permKey)) return "deny";
    if (userAllow.includes(permKey)) return "allow";
    return "inherit";
  };

  const setOverrideState = (permKey, mode) => {
    setUserAllow((prev) => prev.filter((p) => p !== permKey));
    setUserDeny((prev) => prev.filter((p) => p !== permKey));

    if (mode === "allow") {
      setUserAllow((prev) => [...new Set([...prev, permKey])]);
    } else if (mode === "deny") {
      setUserDeny((prev) => [...new Set([...prev, permKey])]);
    }
  };

  const handleSaveUserOverrides = async () => {
    if (!selectedUserId) return;
    setError("");
    setSuccessMsg("");
    setSavingUserPerm(true);
    try {
      const res = await api.put(`/permissions/users/${selectedUserId}`, {
        allow: userAllow,
        deny: userDeny,
      });
      setTargetUserPerm((prev) => ({
        ...prev,
        permissions: res.data.permissions,
        allow: res.data.allow,
        deny: res.data.deny,
      }));
      setSuccessMsg(res.data.message || "User permission overrides saved.");
      await refreshProfile();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Failed to update user permission overrides."
        )
      );
    } finally {
      setSavingUserPerm(false);
    }
  };

  const computePreviewEffective = () => {
    if (!targetUserPerm) return [];
    const base = new Set(targetUserPerm.rolePermissions || []);
    userAllow.forEach((p) => base.add(p));
    userDeny.forEach((p) => base.delete(p));
    return [...base];
  };

  const previewEffective = computePreviewEffective();

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="app-main">
        <div className="page-container">
          <header className="page-header">
            <div>
              <p className="page-eyebrow">Access Control &amp; Security</p>
              <h1>Roles &amp; Permissions</h1>
            </div>
            <span className={`role-pill role-pill-${user?.role}`}>
              {user?.role?.toUpperCase()}
            </span>
          </header>

          {/* Clean Top-Level Navigation Tabs */}
          <div className="page-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "my-access"}
              className={`page-tab ${
                activeTab === "my-access" ? "page-tab-active" : ""
              }`}
              onClick={() => switchTab("my-access")}
            >
              My Access
            </button>

            {canReadMembers && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "roles"}
                className={`page-tab ${
                  activeTab === "roles" ? "page-tab-active" : ""
                }`}
                onClick={() => switchTab("roles")}
              >
                Role Defaults
              </button>
            )}

            {canReadMembers && canUpdateMembers && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "overrides"}
                className={`page-tab ${
                  activeTab === "overrides" ? "page-tab-active" : ""
                }`}
                onClick={() => switchTab("overrides")}
              >
                Member Overrides
              </button>
            )}
          </div>

          {error && (
            <p className="inline-error mb-20" role="alert">
              {error}
            </p>
          )}
          {successMsg && (
            <p className="inline-success mb-20" role="status">
              {successMsg}
            </p>
          )}

          {/* TAB 1: MY ACCESS */}
          {activeTab === "my-access" && (
            <section className="surface-card" aria-label="My permissions">
              <div className="card-header-bar">
                <div>
                  <h2>My Effective Permissions</h2>
                  <p className="section-sub">
                    Permissions active for your{" "}
                    <strong className="text-capitalize">{user?.role}</strong>{" "}
                    account
                  </p>
                </div>
                <span className="status-pill status-pill-green">
                  {user?.role === "admin"
                    ? "All 12 Permissions"
                    : `${permissions.length} of 12 Active`}
                </span>
              </div>

              <div className="category-grid">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.category} className="category-card">
                    <h3 className="category-title">{group.category}</h3>
                    <div className="permission-list">
                      {group.items.map((item) => {
                        const active = hasPermission(item.key);
                        const isAllow =
                          permissionDetails?.allow?.includes(item.key);
                        const isDeny =
                          permissionDetails?.deny?.includes(item.key);

                        return (
                          <div
                            key={item.key}
                            className={`permission-row ${
                              active
                                ? "permission-row-on"
                                : "permission-row-off"
                            }`}
                          >
                            <span className="permission-dot" />
                            <div className="permission-row-text">
                              <strong>{item.label}</strong>
                              <code>{item.key}</code>
                            </div>
                            {isAllow && (
                              <span className="status-pill status-pill-green">
                                +Allow
                              </span>
                            )}
                            {isDeny && (
                              <span className="status-pill status-pill-red">
                                -Deny
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB 2: ROLE DEFAULTS */}
          {activeTab === "roles" && canReadMembers && (
            <section
              className="surface-card"
              aria-label="Organization role permissions"
            >
              <div className="card-header-bar">
                <div>
                  <h2>Role Default Permissions</h2>
                  <p className="section-sub">
                    {isAdmin
                      ? "Configure default capabilities for Managers and Members across your organization."
                      : "View default capabilities assigned to each role (Admin required to edit)."}
                  </p>
                </div>

                <div className="segmented-control">
                  <button
                    type="button"
                    className={`segment-btn ${
                      selectedRoleTab === "manager" ? "segment-btn-active" : ""
                    }`}
                    onClick={() => setSelectedRoleTab("manager")}
                  >
                    Manager ({roleMatrix.manager?.length || 0})
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${
                      selectedRoleTab === "member" ? "segment-btn-active" : ""
                    }`}
                    onClick={() => setSelectedRoleTab("member")}
                  >
                    Member ({roleMatrix.member?.length || 0})
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="loading-state">Loading role permissions...</div>
              ) : (
                <>
                  <div className="category-grid">
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.category} className="category-card">
                        <h3 className="category-title">{group.category}</h3>
                        <div className="permission-list">
                          {group.items.map((item) => {
                            const checked = (
                              roleMatrix[selectedRoleTab] || []
                            ).includes(item.key);
                            return (
                              <label
                                key={item.key}
                                className={`permission-toggle-row ${
                                  !isAdmin ? "readonly" : ""
                                }`}
                              >
                                <div className="permission-row-text">
                                  <strong>{item.label}</strong>
                                  <code>{item.key}</code>
                                </div>
                                <input
                                  type="checkbox"
                                  className="clean-checkbox"
                                  checked={checked}
                                  disabled={!isAdmin}
                                  onChange={() =>
                                    toggleRolePermission(
                                      selectedRoleTab,
                                      item.key
                                    )
                                  }
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isAdmin && (
                    <div className="card-footer-bar">
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={handleSaveRolePermissions}
                        disabled={savingRole}
                      >
                        {savingRole
                          ? "Saving..."
                          : `Save ${selectedRoleTab.toUpperCase()} Defaults`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* TAB 3: MEMBER OVERRIDES */}
          {activeTab === "overrides" && canReadMembers && canUpdateMembers && (
            <section
              className="surface-card"
              aria-label="Member permission overrides"
            >
              <div className="card-header-bar">
                <div>
                  <h2>Member Permission Overrides</h2>
                  <p className="section-sub">
                    Grant (<code>+Allow</code>) or revoke (<code>-Deny</code>)
                    individual permissions for a specific team member.
                  </p>
                </div>

                {members.length > 0 && (
                  <div className="member-picker">
                    <label htmlFor="override-member-select">Member:</label>
                    <select
                      id="override-member-select"
                      className="clean-select"
                      value={selectedUserId}
                      onChange={(e) => {
                        setSelectedUserId(e.target.value);
                        setSearchParams({
                          tab: "overrides",
                          userId: e.target.value,
                        });
                      }}
                    >
                      {members.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.role.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {members.length === 0 ? (
                <div className="empty-state">
                  <h3>No eligible members found</h3>
                  <p>
                    Add a Manager or Member on the Team &amp; Organization page
                    to configure custom overrides.
                  </p>
                </div>
              ) : !targetUserPerm ? (
                <div className="loading-state">Loading user permissions...</div>
              ) : (
                <>
                  <div className="table-container">
                    <table className="clean-table">
                      <thead>
                        <tr>
                          <th>Permission</th>
                          <th>Role Default ({targetUserPerm.user?.role})</th>
                          <th>Override Setting</th>
                          <th className="text-right">Effective Access</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PERMISSION_GROUPS.flatMap((g) => g.items).map(
                          (item) => {
                            const inRoleDefault = (
                              targetUserPerm.rolePermissions || []
                            ).includes(item.key);
                            const state = getOverrideState(item.key);
                            const isEffective = previewEffective.includes(
                              item.key
                            );

                            return (
                              <tr key={item.key}>
                                <td>
                                  <div className="permission-row-text">
                                    <strong>{item.label}</strong>
                                    <code>{item.key}</code>
                                  </div>
                                </td>
                                <td>
                                  <span
                                    className={`status-pill ${
                                      inRoleDefault
                                        ? "status-pill-green"
                                        : "status-pill-gray"
                                    }`}
                                  >
                                    {inRoleDefault
                                      ? "Included"
                                      : "Not Included"}
                                  </span>
                                </td>
                                <td>
                                  <div className="segmented-control segmented-sm">
                                    <button
                                      type="button"
                                      className={`segment-btn ${
                                        state === "inherit"
                                          ? "segment-btn-active"
                                          : ""
                                      }`}
                                      onClick={() =>
                                        setOverrideState(item.key, "inherit")
                                      }
                                    >
                                      Default
                                    </button>
                                    <button
                                      type="button"
                                      className={`segment-btn ${
                                        state === "allow"
                                          ? "segment-btn-allow"
                                          : ""
                                      }`}
                                      onClick={() =>
                                        setOverrideState(item.key, "allow")
                                      }
                                    >
                                      + Allow
                                    </button>
                                    <button
                                      type="button"
                                      className={`segment-btn ${
                                        state === "deny"
                                          ? "segment-btn-deny"
                                          : ""
                                      }`}
                                      onClick={() =>
                                        setOverrideState(item.key, "deny")
                                      }
                                    >
                                      - Deny
                                    </button>
                                  </div>
                                </td>
                                <td className="text-right">
                                  <span
                                    className={`status-pill ${
                                      isEffective
                                        ? "status-pill-green"
                                        : "status-pill-red"
                                    }`}
                                  >
                                    {isEffective ? "Granted" : "Denied"}
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="card-footer-bar">
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={handleSaveUserOverrides}
                      disabled={savingUserPerm}
                    >
                      {savingUserPerm
                        ? "Saving..."
                        : `Save Overrides for ${targetUserPerm.user?.name}`}
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default Permissions;
