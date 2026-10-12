import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Sidebar from "../components/Sidebar.jsx";

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

const Organization = () => {
  const navigate = useNavigate();
  const { user, hasPermission, hasRole } = useAuth();

  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Add Member modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingMember, setCreatingMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    password: "",
    role: "member",
    managerId: "",
  });

  // Edit Member modal state
  const [editingMember, setEditingMember] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    managerId: "",
  });

  const isAdmin = hasRole("admin");
  const isManager = hasRole("manager");
  const canReadOrg = hasPermission("organization:read");
  const canReadMembers = hasPermission("member:read");
  const canCreateMember = hasPermission("member:create");
  const canUpdateMember = hasPermission("member:update");
  const canDeleteMember = hasPermission("member:delete");

  const currentUserId = user?.id || user?._id;

  const loadData = async () => {
    setError("");
    setLoading(true);
    try {
      const tasks = [];
      if (canReadOrg) {
        tasks.push(
          api
            .get("/organization/me")
            .then((res) => setOrganization(res.data.organization))
        );
      }
      if (canReadMembers) {
        tasks.push(
          api
            .get("/organization/members")
            .then((res) => setMembers(res.data.members || []))
        );
      }
      await Promise.all(tasks);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Failed to load organization details. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canReadOrg, canReadMembers]);

  const managers = members.filter((m) => m.role === "manager");

  const canManageTargetMember = (target) => {
    if (target._id === currentUserId) return false;
    if (isAdmin) return true;
    if (isManager && target.managerId === currentUserId) return true;
    return false;
  };

  const handleCreateMember = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMsg("");
    setCreatingMember(true);

    try {
      const payload = {
        name: newMember.name,
        email: newMember.email,
        password: newMember.password,
        role: isAdmin ? newMember.role : "member",
        managerId:
          isAdmin && newMember.role === "member" && newMember.managerId
            ? newMember.managerId
            : null,
      };

      const res = await api.post("/organization/members", payload);
      setSuccessMsg(res.data.message || "Member added successfully.");
      setNewMember({
        name: "",
        email: "",
        password: "",
        role: "member",
        managerId: "",
      });
      setShowAddModal(false);
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to create member."));
    } finally {
      setCreatingMember(false);
    }
  };

  const handleStartEdit = (member) => {
    setEditingMember(member);
    setEditForm({
      name: member.name,
      email: member.email,
      managerId: member.managerId || "",
    });
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editingMember) return;
    setError("");
    setSuccessMsg("");
    setSavingEdit(true);
    try {
      const payload = {
        name: editForm.name,
        email: editForm.email,
        ...(isAdmin ? { managerId: editForm.managerId || null } : {}),
      };
      const res = await api.patch(
        `/organization/members/${editingMember._id}`,
        payload
      );
      setSuccessMsg(res.data.message || "Member updated.");
      setEditingMember(null);
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to update member."));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRoleChange = async (userId, nextRole) => {
    setError("");
    setSuccessMsg("");
    try {
      const res = await api.patch(`/organization/members/${userId}/role`, {
        role: nextRole,
      });
      setSuccessMsg(res.data.message || "Member role updated.");
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to update member role."));
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from the organization?`)) return;
    setError("");
    setSuccessMsg("");
    try {
      const res = await api.delete(`/organization/members/${userId}`);
      setSuccessMsg(res.data.message || "Member removed.");
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to remove member."));
    }
  };

  const getManagerName = (managerId) => {
    if (!managerId) return "Direct to Admin";
    const found = members.find((m) => m._id === managerId);
    return found ? found.name : "Assigned Manager";
  };

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="app-main">
        <div className="page-container">
          <header className="page-header">
            <div>
              <p className="page-eyebrow">Team &amp; Workspace Directory</p>
              <h1>
                {organization?.name || user?.organizationName || "Organization"}
              </h1>
            </div>
            {canCreateMember && (
              <button
                className="button button-primary"
                type="button"
                onClick={() => setShowAddModal(true)}
              >
                <span aria-hidden="true">＋</span>
                Add Member
              </button>
            )}
          </header>

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

          {/* Clean 3-Card Organization Summary */}
          {canReadOrg && organization && (
            <section className="summary-strip" aria-label="Organization summary">
              <div className="summary-card">
                <span className="summary-label">Organization Name</span>
                <strong className="summary-value">{organization.name}</strong>
                <span className="summary-sub">Active workspace</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Team Size</span>
                <strong className="summary-value">
                  {organization.memberCount ?? members.length} Members
                </strong>
                <span className="summary-sub">
                  {managers.length} Manager(s) •{" "}
                  {members.filter((m) => m.role === "member").length} Member(s)
                </span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Created</span>
                <strong className="summary-value">
                  {organization.createdAt
                    ? new Date(organization.createdAt).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )
                    : "—"}
                </strong>
                <span className="summary-sub">
                  Your role: {user?.role?.toUpperCase()}
                </span>
              </div>
            </section>
          )}

          {/* Team Directory Card */}
          <section className="surface-card" aria-labelledby="members-heading">
            <div className="card-header-bar">
              <div>
                <h2 id="members-heading">Team Members</h2>
                <p className="section-sub">
                  Manage roles, reporting managers, and individual RBAC access
                </p>
              </div>
              {!loading && (
                <span className="count-pill">{members.length} members</span>
              )}
            </div>

            {!canReadMembers ? (
              <div className="empty-state">
                <h3>Member directory restricted</h3>
                <p>
                  You need the <code>member:read</code> permission to view team
                  members.
                </p>
              </div>
            ) : loading ? (
              <div className="loading-state">
                Loading organization members...
              </div>
            ) : members.length === 0 ? (
              <div className="empty-state">
                <h3>No members found</h3>
              </div>
            ) : (
              <div className="table-container">
                <table className="clean-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Role</th>
                      <th>Reports To</th>
                      <th>Permissions</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const isSelf = member._id === currentUserId;
                      const canManage = canManageTargetMember(member);
                      const initial =
                        member.name?.trim().charAt(0).toUpperCase() || "U";

                      return (
                        <tr key={member._id}>
                          <td>
                            <div className="user-cell">
                              <span className="user-cell-avatar">{initial}</span>
                              <div className="user-cell-info">
                                <strong>
                                  {member.name}
                                  {isSelf && (
                                    <span className="self-badge">You</span>
                                  )}
                                </strong>
                                <span>{member.email}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            {isAdmin && !isSelf && member.role !== "admin" ? (
                              <select
                                className="clean-select clean-select-sm"
                                value={member.role}
                                onChange={(e) =>
                                  handleRoleChange(member._id, e.target.value)
                                }
                                aria-label={`Change role for ${member.name}`}
                              >
                                <option value="member">Member</option>
                                <option value="manager">Manager</option>
                              </select>
                            ) : (
                              <span
                                className={`role-pill role-pill-${member.role}`}
                              >
                                {member.role.toUpperCase()}
                              </span>
                            )}
                          </td>

                          <td>
                            <span className="cell-secondary">
                              {member.role === "admin"
                                ? "Workspace Owner"
                                : member.role === "manager"
                                  ? "Admin"
                                  : getManagerName(member.managerId)}
                            </span>
                          </td>

                          <td>
                            {member.role === "admin" ? (
                              <span className="status-pill status-pill-purple">
                                Full Access
                              </span>
                            ) : (
                              <div className="pill-row">
                                {member.allow?.length > 0 && (
                                  <span className="status-pill status-pill-green">
                                    +{member.allow.length} allowed
                                  </span>
                                )}
                                {member.deny?.length > 0 && (
                                  <span className="status-pill status-pill-red">
                                    -{member.deny.length} denied
                                  </span>
                                )}
                                {(!member.allow || member.allow.length === 0) &&
                                  (!member.deny || member.deny.length === 0) && (
                                    <span className="status-pill status-pill-gray">
                                      Role Default
                                    </span>
                                  )}
                              </div>
                            )}
                          </td>

                          <td className="text-right">
                            {canManage ? (
                              <div className="row-actions">
                                {canUpdateMember && (
                                  <button
                                    type="button"
                                    className="ghost-action-btn"
                                    onClick={() => handleStartEdit(member)}
                                  >
                                    Edit
                                  </button>
                                )}
                                {canUpdateMember && member.role !== "admin" && (
                                  <button
                                    type="button"
                                    className="ghost-action-btn"
                                    onClick={() =>
                                      navigate(
                                        `/permissions?tab=overrides&userId=${member._id}`
                                      )
                                    }
                                  >
                                    Permissions
                                  </button>
                                )}
                                {canDeleteMember && (
                                  <button
                                    type="button"
                                    className="ghost-action-btn ghost-action-danger"
                                    onClick={() =>
                                      handleRemoveMember(
                                        member._id,
                                        member.name
                                      )
                                    }
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="cell-secondary">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Add Member Modal */}
      {showAddModal && canCreateMember && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-member-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="add-member-title">Add Team Member</h2>
                <p className="section-sub">
                  {isAdmin
                    ? "Create a Manager or Member account in your organization."
                    : "Create a Member account assigned to your team."}
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <form className="modal-form" onSubmit={handleCreateMember}>
              <div className="form-field">
                <label htmlFor="member-name">Full Name</label>
                <input
                  id="member-name"
                  type="text"
                  placeholder="Alex Rivera"
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="member-email">Email Address</label>
                <input
                  id="member-email"
                  type="email"
                  placeholder="alex@company.com"
                  value={newMember.email}
                  onChange={(e) =>
                    setNewMember({ ...newMember, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="member-password">Initial Password</label>
                <input
                  id="member-password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newMember.password}
                  onChange={(e) =>
                    setNewMember({ ...newMember, password: e.target.value })
                  }
                  required
                />
              </div>

              {isAdmin && (
                <div className="form-row-2">
                  <div className="form-field">
                    <label htmlFor="member-role">Role</label>
                    <select
                      id="member-role"
                      className="clean-select"
                      value={newMember.role}
                      onChange={(e) =>
                        setNewMember({ ...newMember, role: e.target.value })
                      }
                    >
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>

                  {newMember.role === "member" && (
                    <div className="form-field">
                      <label htmlFor="member-manager">Reports To</label>
                      <select
                        id="member-manager"
                        className="clean-select"
                        value={newMember.managerId}
                        onChange={(e) =>
                          setNewMember({
                            ...newMember,
                            managerId: e.target.value,
                          })
                        }
                      >
                        <option value="">Direct to Admin</option>
                        {managers.map((mgr) => (
                          <option key={mgr._id} value={mgr._id}>
                            {mgr.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={creatingMember}
                >
                  {creatingMember ? "Creating..." : "Create Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div
          className="modal-backdrop"
          onClick={() => setEditingMember(null)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-member-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="edit-member-title">Edit Member</h2>
                <p className="section-sub">
                  Update profile details for {editingMember.name}
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingMember(null)}
              >
                ✕
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSaveEdit}>
              <div className="form-field">
                <label htmlFor="edit-name">Full Name</label>
                <input
                  id="edit-name"
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="edit-email">Email Address</label>
                <input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  required
                />
              </div>

              {isAdmin && editingMember.role === "member" && (
                <div className="form-field">
                  <label htmlFor="edit-manager">Reports To</label>
                  <select
                    id="edit-manager"
                    className="clean-select"
                    value={editForm.managerId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, managerId: e.target.value })
                    }
                  >
                    <option value="">Direct to Admin</option>
                    {managers.map((mgr) => (
                      <option key={mgr._id} value={mgr._id}>
                        {mgr.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setEditingMember(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organization;
