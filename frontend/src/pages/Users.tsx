import { useEffect, useState } from "react";
import { api, type CreateUserInput, type Tenant, type User } from "../api";

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateUserInput>({ username: "", password: "", displayName: "", systemRole: "user" });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.tenants().then(setTenants).catch(() => setTenants([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.createUser(form);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const set = (k: keyof CreateUserInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Create User</div>
        {error && <div className="alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input value={form.displayName} onChange={set("displayName")} required />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input value={form.username} onChange={set("username")} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" value={form.password} onChange={set("password")} required minLength={8} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select value={form.systemRole} onChange={(e) => {
                const role = e.target.value as CreateUserInput["systemRole"];
                setForm((f) => ({ ...f, systemRole: role, tenantId: role === "platform_admin" ? undefined : f.tenantId }));
              }}>
                <option value="user">User</option>
                <option value="platform_admin">Platform Admin</option>
              </select>
            </div>
          </div>
          {form.systemRole === "user" && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tenant (optional)</label>
                <select value={form.tenantId ?? ""} onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value || undefined }))}>
                  <option value="">— No tenant —</option>
                  {tenants.map((t) => (
                    <option key={t.tenantId} value={t.tenantId}>{t.name} ({t.tenantId})</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => api.users().then(setUsers).catch(console.error);

  useEffect(() => { load(); }, []);

  const handleDelete = async (userId: string) => {
    if (!confirm("Delete this user?")) return;
    await api.deleteUser(userId);
    load();
  };

  const toggleStatus = async (user: User) => {
    const status = user.status === "active" ? "suspended" : "active";
    await api.updateUser(user.userId, { status });
    load();
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New User</button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.userId}>
                <td style={{ fontWeight: 500 }}>{u.displayName ?? "—"}</td>
                <td style={{ color: "var(--muted)", fontFamily: "monospace" }}>{u.username}</td>
                <td>
                  {u.systemRole === "platform_admin" ? (
                    <span className="badge badge-blue">Admin</span>
                  ) : (
                    <span className="badge badge-gray">User</span>
                  )}
                </td>
                <td>
                  {u.status === "active" ? (
                    <span className="badge badge-green">Active</span>
                  ) : (
                    <span className="badge badge-red">Suspended</span>
                  )}
                </td>
                <td style={{ color: "var(--muted)", fontSize: 12 }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => toggleStatus(u)}>
                      {u.status === "active" ? "Suspend" : "Activate"}
                    </button>
                    <button className="btn-danger" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => handleDelete(u.userId)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </>
  );
}
