import { useEffect, useState } from "react";
import { api, type Device, type User } from "../../api";

export function DeviceDetailControls({ device, user }: { device: Device; user?: User }) {
  const [releases, setReleases] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredReleases = releases.filter((rel: any) => !device.boardType || rel.boardType === device.boardType);

  useEffect(() => {
    api.releases().then((data) => {
      setReleases(data);
      const compat = data.filter((rel: any) => !device.boardType || rel.boardType === device.boardType);
      if (compat.length > 0) setSelectedVersion(compat[0].version);
    }).catch(console.error);
  }, [device.boardType]);

  const handleReboot = async () => {
    if (!confirm("Bạn có chắc chắn muốn khởi động lại thiết bị này không?")) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.deviceAction(device.serialNumber, "reboot");
      setMessage({ type: "success", text: res.message || "Đã gửi lệnh reboot thành công." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Khởi động lại thất bại." });
    } finally {
      setLoading(false);
    }
  };

  const handleOta = async () => {
    if (!selectedVersion) return;
    if (!confirm(`Bạn có chắc chắn muốn cập nhật firmware lên phiên bản ${selectedVersion}?`)) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.deviceOta(device.serialNumber, selectedVersion);
      setMessage({ type: "success", text: `Đã kích hoạt cập nhật OTA thành công. Job ID: ${res.jobId}` });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Cập nhật OTA thất bại." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="control-grid">
      {message && (
        <div className="alert-error" style={{
          background: message.type === "success" ? "var(--success-glow)" : "var(--danger-glow)",
          color: message.type === "success" ? "var(--success)" : "var(--danger)",
          border: `1px solid ${message.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
        }}>{message.text}</div>
      )}
      <div className="control-action-card">
        <div className="control-title">Khởi động lại (Reboot)</div>
        <div className="control-description">Gửi lệnh khởi động lại thiết bị thông qua hệ thống MQTT.</div>
        <button className="btn-danger" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={handleReboot} disabled={loading}>
          {loading ? "Đang gửi..." : "Khởi động lại ngay"}
        </button>
      </div>
      {user?.systemRole === "platform_admin" ? (
        <div className="control-action-card">
          <div className="control-title">Cập nhật Firmware từ xa (OTA)</div>
          <div className="control-description">Nâng cấp hoặc chuyển đổi phiên bản hệ điều hành của thiết bị thông qua OTA.</div>
          <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
            <select value={selectedVersion} onChange={(e) => setSelectedVersion(e.target.value)} style={{ width: "200px" }} disabled={loading || filteredReleases.length === 0}>
              {filteredReleases.length === 0 ? <option>Không tìm thấy firmware</option> : filteredReleases.map((rel) => <option key={rel.version} value={rel.version}>{rel.version} ({rel.boardType})</option>)}
            </select>
            <button className="btn-primary" onClick={handleOta} disabled={loading || !selectedVersion}>{loading ? "Đang cập nhật..." : "Cập nhật ngay"}</button>
          </div>
        </div>
      ) : (
        <div className="control-action-card" style={{ opacity: 0.7 }}>
          <div className="control-title">Cập nhật Firmware từ xa (OTA)</div>
          <div className="control-description" style={{ color: "var(--danger)" }}>Tính năng này chỉ dành cho quản trị viên hệ thống.</div>
        </div>
      )}
    </div>
  );
}
