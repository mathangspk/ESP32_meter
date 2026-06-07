import { useEffect, useState } from "react";
import { api, type Device, type Stats, type User } from "../../api";
import { DeviceDetail } from "../devices";
import { DashboardStatsCards } from "./DashboardStatsCards";
import { DashboardDeviceTable } from "./DashboardDeviceTable";

export function DashboardPage({ user }: { user?: User }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState<Device | null>(null);

  useEffect(() => {
    api.stats().then(setStats).catch(console.error);
    api.devices().then(setDevices).catch(console.error);
  }, []);

  const onlineDevices = devices.filter((d) => d.state?.isOffline === false);
  const totalPower = onlineDevices.reduce((sum, d) => sum + (d.state?.lastPower ?? 0), 0);
  const totalCurrent = onlineDevices.reduce((sum, d) => sum + (d.state?.lastCurrent ?? 0), 0);
  const avgVoltage = onlineDevices.length > 0 ? onlineDevices.reduce((sum, d) => sum + (d.state?.lastVoltage ?? 0), 0) / onlineDevices.length : 0;
  const totalCount = devices.length;
  const onlineCount = onlineDevices.length;
  const onlineRatio = totalCount > 0 ? (onlineCount / totalCount) * 100 : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Tổng quan thời gian thực về thiết bị và chỉ số hoạt động hệ thống</span>
        </div>
      </div>

      <DashboardStatsCards
        totalCount={totalCount}
        onlineCount={onlineCount}
        stats={stats}
        totalPower={totalPower}
        totalCurrent={totalCurrent}
        avgVoltage={avgVoltage}
        onlineRatio={onlineRatio}
      />

      <DashboardDeviceTable devices={devices} onSelectDevice={setSelected} />

      {selected && (
        <DeviceDetail
          device={selected}
          user={user}
          onClose={() => setSelected(null)}
          onDeviceUpdated={(updated: Device) => {
            setSelected((prev) => (prev ? { ...prev, displayName: updated.displayName } : null));
            setDevices((prev) => prev.map((d) => (d.deviceId === updated.deviceId ? { ...d, displayName: updated.displayName } : d)));
          }}
          onDeviceUnclaimed={(id) => {
            setSelected(null);
            setDevices((prev) => prev.filter((d) => d.deviceId !== id));
          }}
        />
      )}
    </>
  );
}
