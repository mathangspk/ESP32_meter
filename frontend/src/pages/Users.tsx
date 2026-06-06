import { useEffect, useState } from "react";
import { api, type User } from "../api";
import { CreateUserModal } from "./users/CreateUserModal";

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
        <div className="table-responsive">
          <table>
            <thead>
              <tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.userId}>
                  <td style={{ fontWeight: 500 }}>{u.displayName ?? "—"}</td>
                  <td style={{ color: "var(--muted)", fontFamily: "monospace" }}>{u.username}</td>
                  <td><span className={`badge badge-${u.systemRole === "platform_admin" ? "blue" : "gray"}`}>{u.systemRole === "platform_admin" ? "Admin" : "User"}</span></td>
                  <td><span className={`badge badge-${u.status === "active" ? "green" : "red"}`}>{u.status === "active" ? "Active" : "Suspended"}</span></td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => toggleStatus(u)}>{u.status === "active" ? "Suspend" : "Activate"}</button>
                      <button className="btn-danger" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => handleDelete(u.userId)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </>
  );
}
