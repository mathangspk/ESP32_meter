import { useEffect, useState } from "react";
import { api, type Device, type User } from "../../api";
import { DeviceDetailInfo } from "./DeviceDetailInfo";
import { DeviceDetailAnalytics } from "./DeviceDetailAnalytics";
import { DeviceDetailControls } from "./DeviceDetailControls";

export function DeviceDetailModal({ device, user, onClose, onDeviceUpdated }: { device: Device; user?: User; onClose: () => void; onDeviceUpdated?: (updated: Device) => void }) {
  const [tab, setTab] = useState<"info" | "analytics" | "controls">("info");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(device.displayName ?? device.serialNumber);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    setEditName(device.displayName ?? device.serialNumber);
    setIsEditingName(false);
  }, [device]);

  const handleRename = async () => {
    if (!editName.trim()) return;
    setRenaming(true);
    try {
      const updated = await api.renameDevice(device.deviceId, editName.trim());
      setIsEditingName(false);
      if (onDeviceUpdated) onDeviceUpdated(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Đổi tên thất bại");
    } finally {
      setRenaming(false);
    }
  };

  const tabs = [
    { id: "info", label: "Thông tin" },
    { id: "analytics", label: "Phân tích" },
    { id: "controls", label: "Điều khiển" }
  ] as const;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 780 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, minHeight: 38 }}>
          {isEditingName ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, marginRight: 16 }}>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={renaming} maxLength={50} autoFocus style={{ fontSize: "1.1rem", fontWeight: 600, padding: "4px 10px", flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", outline: "none" }} onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setIsEditingName(false);
                  setEditName(device.displayName ?? device.serialNumber);
                }
              }} />
              <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 13 }} onClick={handleRename} disabled={renaming || !editName.trim()}>{renaming ? "Đang lưu..." : "Lưu"}</button>
              <button className="btn-ghost" style={{ padding: "6px 14px", fontSize: 13 }} onClick={() => { setIsEditingName(false); setEditName(device.displayName ?? device.serialNumber); }} disabled={renaming}>Hủy</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="modal-title" style={{ margin: 0 }}>{device.displayName ?? device.serialNumber}</div>
              <button className="btn-ghost" style={{ fontSize: 12, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4, opacity: 0.8, border: "1px dashed var(--border)", borderRadius: 4, cursor: "pointer" }} onClick={() => setIsEditingName(true)}>✏️ Đổi tên</button>
            </div>
          )}
          <button className="btn-ghost" onClick={onClose} disabled={isEditingName && renaming}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
          {tabs.map((t) => (
            <button key={t.id} className={`modal-tab-button${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {tab === "info" && <DeviceDetailInfo device={device} />}
        {tab === "analytics" && <DeviceDetailAnalytics device={device} />}
        {tab === "controls" && <DeviceDetailControls device={device} user={user} />}
      </div>
    </div>
  );
}
