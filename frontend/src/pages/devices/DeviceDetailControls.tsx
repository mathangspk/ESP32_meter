import { useEffect, useState } from "react";
import { api, type Device, type User } from "../../api";

export function DeviceDetailControls({ device, user, onDeviceUnclaimed }: { device: Device; user?: User; onDeviceUnclaimed?: (id: string) => void }) {
  const [releases, setReleases] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filtered = releases.filter((r) => !device.boardType || r.boardType === device.boardType);

  useEffect(() => {
    api.releases().then((data) => {
      setReleases(data);
      const compat = data.filter((r) => !device.boardType || r.boardType === device.boardType);
      if (compat.length > 0) setSelectedVersion(compat[0].version);
    }).catch(console.error);
  }, [device.boardType]);

  const handleAction = async (action: string, confirmTxt: string, successTxt: string, isUnclaim = false) => {
    if (!confirm(confirmTxt)) return;
    setLoading(true); setMsg(null);
    try {
      const res = await api.deviceAction(device.serialNumber, action);
      setMsg({ type: "success", text: res.message || successTxt });
      if (isUnclaim && onDeviceUnclaimed) onDeviceUnclaimed(device.deviceId);
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Thao tác thất bại." });
    } finally { setLoading(false); }
  };

  const handleOta = async () => {
    if (!selectedVersion || !confirm(`Bạn có chắc chắn muốn cập nhật lên ${selectedVersion}?`)) return;
    setLoading(true); setMsg(null);
    try {
      const res = await api.deviceOta(device.serialNumber, selectedVersion);
      setMsg({ type: "success", text: `Kích hoạt OTA thành công. Job ID: ${res.jobId}` });
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Cập nhật OTA thất bại." });
    } finally { setLoading(false); }
  };

  const alertStyle = msg?.type === "success" 
    ? { bg: "var(--success-glow)", col: "var(--success)", border: "1px solid rgba(16, 185, 129, 0.2)" }
    : { bg: "var(--danger-glow)", col: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.2)" };

  return (
    <div className="control-grid">
      {msg && (
        <div className="alert-error" style={{ background: alertStyle.bg, color: alertStyle.col, border: alertStyle.border }}>{msg.text}</div>
      )}
      <div className="control-action-card">
        <div className="control-title">Khởi động lại (Reboot)</div>
        <div className="control-description">Gửi lệnh khởi động lại thiết bị thông qua hệ thống MQTT.</div>
        <button className="btn-danger" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={() => handleAction("reboot", "Bạn có chắc chắn muốn khởi động lại thiết bị?", "Đã gửi lệnh reboot thành công.")} disabled={loading}>Khởi động lại ngay</button>
      </div>

      <div className="control-action-card">
        <div className="control-title">Hủy liên kết (Unclaim)</div>
        <div className="control-description">Xóa thiết bị khỏi tài khoản/tenant của bạn. Dữ liệu sẽ dừng theo dõi.</div>
        <button className="btn-danger" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={() => handleAction("remove", "Bạn có chắc chắn muốn hủy liên kết thiết bị này? Thiết bị sẽ bị xóa khỏi tài khoản của bạn.", "Hủy liên kết thành công.", true)} disabled={loading}>Hủy liên kết thiết bị</button>
      </div>

      {user?.systemRole === "platform_admin" ? (
        <div className="control-action-card" style={{ gridColumn: "span 2" }}>
          <div className="control-title">Cập nhật Firmware từ xa (OTA)</div>
          <div className="control-description">Nâng cấp hoặc chuyển đổi phiên bản hệ điều hành của thiết bị thông qua OTA.</div>
          <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
            <select value={selectedVersion} onChange={(e) => setSelectedVersion(e.target.value)} style={{ width: "200px" }} disabled={loading || filtered.length === 0}>
              {filtered.length === 0 ? <option>Không tìm thấy firmware</option> : filtered.map((r) => <option key={r.version} value={r.version}>{r.version} ({r.boardType})</option>)}
            </select>
            <button className="btn-primary" onClick={handleOta} disabled={loading || !selectedVersion}>Cập nhật ngay</button>
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
