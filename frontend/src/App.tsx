import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api, type User } from "./api";
import Dashboard from "./pages/dashboard";
import Devices from "./pages/devices";
import Login from "./pages/Login";
import Users from "./pages/Users";

function Sidebar({ user, onLogout }: { user: User; onLogout: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const links = [
    { path: "/", label: "Dashboard", icon: "⊞" },
    { path: "/devices", label: "Devices", icon: "⚡" },
    ...(user.systemRole === "platform_admin" ? [{ path: "/users", label: "Users", icon: "👥" }] : []),
  ];
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">⚡ Meter Admin</div>
      {links.map((l) => (
        <div
          key={l.path}
          className={`sidebar-link${location.pathname === l.path ? " active" : ""}`}
          onClick={() => navigate(l.path)}
        >
          <span>{l.icon}</span>
          <span>{l.label}</span>
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: 13, marginBottom: 8, color: "var(--muted)" }}>
          {user.displayName ?? user.username}
          {user.systemRole === "platform_admin" && (
            <span className="badge badge-blue" style={{ marginLeft: 6 }}>Admin</span>
          )}
        </div>
        <button className="btn-ghost" style={{ width: "100%", fontSize: 13 }} onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

function AuthedApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <>
      <Sidebar user={user} onLogout={onLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/devices" element={<Devices user={user} />} />
          {user.systemRole === "platform_admin" && <Route path="/users" element={<Users />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    api.me().then(setUser).catch(() => localStorage.removeItem("token")).finally(() => setLoading(false));
  }, []);

  const handleLogin = (u: User, token: string) => {
    localStorage.setItem("token", token);
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--muted)" }}>Loading…</div>;

  return (
    <BrowserRouter>
      {user ? (
        <AuthedApp user={user} onLogout={handleLogout} />
      ) : (
        <Routes>
          <Route path="*" element={<Login onLogin={handleLogin} />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
