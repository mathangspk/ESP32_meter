import { MongoBaseService } from "./mongodb.base";
import { TelemetryPayload, OtaStatusPayload, FirmwareReleaseRequest } from "./types";
import { OtaRepo } from "./db/ota.repo";

export class MongoTelemetryService extends MongoBaseService {
  insertTelemetry(payload: TelemetryPayload) { return this.telemetryRepo.insertTelemetry(payload); }
  upsertDeviceState(payload: TelemetryPayload) { return this.telemetryRepo.upsertDeviceState(payload); }
  markRecovered(deviceId: string, sentAt: Date) { return this.telemetryRepo.markRecovered(deviceId, sentAt); }
  clearOfflinePending(deviceId: string) { return this.telemetryRepo.clearOfflinePending(deviceId); }
  markOfflinePending(detectionCutoff: Date) { return this.telemetryRepo.markOfflinePending(detectionCutoff); }
  markOffline(deviceId: string, sentAt: Date) { return this.telemetryRepo.markOffline(deviceId, sentAt); }
  getDevicesToAlert(alertCutoff: Date) { return this.telemetryRepo.getDevicesToAlert(alertCutoff); }
  getRecentTelemetry(serialNumber: string, limit?: number) { return this.telemetryRepo.getRecentTelemetry(serialNumber, limit); }
  rollupTelemetryForDevice(serialNumber: string, deviceId: string, startHour: Date, endHour: Date) {
    return this.telemetryRepo.rollupTelemetryForDevice(serialNumber, deviceId, startHour, endHour);
  }

  createOtaJob(job: Parameters<OtaRepo["createOtaJob"]>[0]) { return this.otaRepo.createOtaJob(job); }
  markOtaJobPublished(jobId: string) { return this.otaRepo.markOtaJobPublished(jobId); }
  markOtaJobFailed(jobId: string, message: string) { return this.otaRepo.markOtaJobFailed(jobId, message); }
  recordOtaStatus(payload: OtaStatusPayload) { return this.otaRepo.recordOtaStatus(payload); }
  getOtaJob(jobId: string) { return this.otaRepo.getOtaJob(jobId); }
  getOtaJobs(limit?: number) { return this.otaRepo.getOtaJobs(limit); }
  createFirmwareRelease(input: FirmwareReleaseRequest) { return this.otaRepo.createFirmwareRelease(input); }
  getFirmwareReleases(limit?: number) { return this.otaRepo.getFirmwareReleases(limit); }
  evaluateFirmwarePolicyForDevice(identifier: string) { return this.otaRepo.evaluateFirmwarePolicyForDevice(identifier); }
  getFirmwareReleaseForDevice(identifier: string, version: string) { return this.otaRepo.getFirmwareReleaseForDevice(identifier, version); }
  evaluateFirmwarePolicyForFleet(limit?: number) { return this.otaRepo.evaluateFirmwarePolicyForFleet(limit); }
}
