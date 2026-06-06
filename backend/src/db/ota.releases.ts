import { Collection, Document } from "mongodb";
import { FirmwareReleaseRequest } from "../types";
import { FirmwareReleaseRecord, DeviceRecord } from "./types";

export async function createFirmwareRelease(
  firmwareReleases: Collection<FirmwareReleaseRecord>,
  input: FirmwareReleaseRequest,
): Promise<FirmwareReleaseRecord> {
  const now = new Date();
  const identityFilter: Document = { version: input.version };
  const releaseSet: Document = {
    severity: input.severity, supportStatus: input.supportStatus, isActive: true,
    releasedAt: input.releasedAt ? new Date(input.releasedAt) : now, updatedAt: now,
  };
  const releaseSetOnInsert: Document = {
    releaseId: `fw-${input.version}-${now.getTime()}`, version: input.version, createdAt: now,
  };

  for (const field of ["chipFamily", "chipModel", "boardType"] as const) {
    if (input[field]) {
      identityFilter[field] = input[field];
      releaseSetOnInsert[field] = input[field];
    } else {
      identityFilter[field] = { $exists: false };
    }
  }

  if (input.url) releaseSet.url = input.url;
  if (input.sha256) releaseSet.sha256 = input.sha256;
  if (input.notes) releaseSet.notes = input.notes;

  await firmwareReleases.updateOne(identityFilter, { $set: releaseSet, $setOnInsert: releaseSetOnInsert }, { upsert: true });

  const updatedRelease = await firmwareReleases.findOne(identityFilter);
  if (!updatedRelease) throw new Error("Failed to save firmware release");
  return updatedRelease;
}

export async function getFirmwareReleases(firmwareReleases: Collection<FirmwareReleaseRecord>, limit = 50): Promise<FirmwareReleaseRecord[]> {
  return firmwareReleases.find({ isActive: true }, { sort: { releasedAt: -1 }, limit }).toArray();
}

export async function getCompatibleFirmwareReleases(
  firmwareReleases: Collection<FirmwareReleaseRecord>,
  device: DeviceRecord,
): Promise<FirmwareReleaseRecord[]> {
  return firmwareReleases
    .find(
      {
        isActive: true,
        $and: [
          { $or: [{ chipFamily: { $exists: false } }, { chipFamily: device.chipFamily }] },
          { $or: [{ chipModel: { $exists: false } }, { chipModel: device.chipModel }] },
          { $or: [{ boardType: { $exists: false } }, { boardType: device.boardType }] },
        ],
      },
      { sort: { releasedAt: -1 } },
    )
    .toArray();
}

export async function bootstrapFirmwareRelease(
  firmwareReleases: Collection<FirmwareReleaseRecord>,
  version: string,
  boardType: string | undefined,
  now: Date,
): Promise<void> {
  const filter: Document = { version };
  const setOnInsert: Document = { releaseId: `fw-${version}-bootstrap`, version, releasedAt: now, createdAt: now };

  if (boardType) {
    filter.boardType = boardType;
    setOnInsert.boardType = boardType;
  } else {
    filter.boardType = { $exists: false };
  }

  await firmwareReleases.updateOne(
    filter,
    {
      $set: {
        severity: "optional", supportStatus: "supported", isActive: true, updatedAt: now,
        notes: "Bootstrap firmware release seeded for local and production control-plane startup.",
      },
      $setOnInsert: setOnInsert,
    },
    { upsert: true },
  );
}
