import { useState } from "react";
import { api, type User } from "../api";

export default function Login({ onLogin }: { onLogin: (user: User, token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api.login(username, password);
      onLogin(user, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ width: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Meter Dashboard</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Sign in to continue</div>
        </div>
        {error && <div className="alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
