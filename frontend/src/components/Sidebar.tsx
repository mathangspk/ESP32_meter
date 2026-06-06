import { useLocation, useNavigate } from "react-router-dom";
import { type User } from "../api";

export function Sidebar({
  user,
  onLogout,
  isOpen,
  onClose,
}: {
  user: User;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const links = [
    { path: "/", label: "Dashboard", icon: "⊞" },
    { path: "/devices", label: "Devices", icon: "⚡" },
    ...(user.systemRole === "platform_admin" ? [{ path: "/users", label: "Users", icon: "👥" }] : []),
  ];

  const handleLinkClick = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <nav className={`sidebar${isOpen ? " open" : ""}`}>
      <div className="sidebar-logo">⚡ Meter Admin</div>
      {links.map((l) => (
        <div
          key={l.path}
          className={`sidebar-link${location.pathname === l.path ? " active" : ""}`}
          onClick={() => handleLinkClick(l.path)}
        >
          <span>{l.icon}</span>
          <span>{l.label}</span>
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: 13, marginBottom: 8, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
