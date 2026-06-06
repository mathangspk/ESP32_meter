import { useEffect, useState } from "react";
import { api, type User, type Tenant, type Site, type Device } from "../../api";
import { styles } from "./deviceStyles";

export function ClaimDeviceModal({ user, onClose, onDeviceClaimed }: { user?: User; onClose: () => void; onDeviceClaimed: (device: Device) => void }) {
  const [serialNumber, setSerialNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState(user?.defaultTenantId ?? "");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedOwnerUserId, setSelectedOwnerUserId] = useState(user?.userId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user?.systemRole === "platform_admin";

  useEffect(() => {
    if (isAdmin) {
      api.tenants().then(setTenants).catch(console.error);
      api.users().then(setUsers).catch(console.error);
    }
  }, [isAdmin]);

  useEffect(() => {
    const tId = isAdmin ? selectedTenantId : user?.defaultTenantId;
    if (tId) {
      api.sites(tId).then((data) => {
        setSites(data);
        setSelectedSiteId(data.length > 0 ? data[0].siteId : "");
      }).catch(console.error);
    }
  }, [selectedTenantId, isAdmin, user?.defaultTenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber.trim() || !displayName.trim() || !selectedSiteId) return setError("Vui lòng điền đầy đủ thông tin.");
    const tId = isAdmin ? selectedTenantId : user?.defaultTenantId;
    const ownerId = isAdmin ? selectedOwnerUserId : user?.userId;
    if (!tId || !ownerId) return setError("Không tìm thấy thông tin Tenant hoặc Người sở hữu.");
    setLoading(true); setError(null);
    try {
      const device = await api.claimDevice({ serialNumber: serialNumber.trim(), tenantId: tId, siteId: selectedSiteId, ownerUserId: ownerId, displayName: displayName.trim() });
      onDeviceClaimed(device);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim thiết bị thất bại.");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 500 }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div className="modal-title" style={{ margin: 0 }}>🔌 Claim Thiết bị mới</div>
          <button className="btn-ghost" onClick={onClose} disabled={loading}>✕</button>
        </div>
        {error && <div className="alert-error" style={styles.alertError}>⚠️ {error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>SỐ SERIAL THIẾT BỊ</label>
            <input type="text" placeholder="Ví dụ: 004A936C" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} disabled={loading} required style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>TÊN THIẾT BỊ (DISPLAY NAME)</label>
            <input type="text" placeholder="Ví dụ: Phòng Server, Tầng 1..." value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={loading} required style={styles.input} />
          </div>
          {isAdmin && (
            <>
              <div style={styles.formGroup}>
                <label style={styles.label}>CHỌN TENANT (ADMIN ONLY)</label>
                <select value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)} disabled={loading} style={styles.select}>
                  <option value="">-- Chọn Tenant --</option>
                  {tenants.map((t) => <option key={t.tenantId} value={t.tenantId}>{t.name} ({t.tenantId})</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>CHỌN NGƯỜI SỞ HỮU (ADMIN ONLY)</label>
                <select value={selectedOwnerUserId} onChange={(e) => setSelectedOwnerUserId(e.target.value)} disabled={loading} style={styles.select}>
                  <option value="">-- Chọn Người sở hữu --</option>
                  {users.map((u) => <option key={u.userId} value={u.userId}>{u.displayName ?? u.username} ({u.userId})</option>)}
                </select>
              </div>
            </>
          )}
          <div style={styles.formGroup}>
            <label style={styles.label}>VỊ TRÍ LẮP ĐẶT (SITE)</label>
            <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)} disabled={loading || sites.length === 0} style={styles.select}>
              {sites.length === 0 ? <option value="">-- Không có Vị trí/Site nào --</option> : sites.map((s) => <option key={s.siteId} value={s.siteId}>{s.name} ({s.siteId})</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={loading || !selectedSiteId}>{loading ? "Đang xử lý..." : "Claim Thiết bị"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
