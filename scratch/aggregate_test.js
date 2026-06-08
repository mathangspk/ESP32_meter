const hourStart = ISODate("2026-06-07T01:00:00.000Z");
const hourEnd = ISODate("2026-06-07T02:00:00.000Z");

const results = db.telemetry.aggregate([
  { $match: { serialNumber: "7B34E3EC", timestamp: { $gte: hourStart, $lt: hourEnd } } },
  { $sort: { timestamp: 1 } },
  {
    $group: {
      _id: null,
      firstEnergy: { $first: "$energy" },
      lastEnergy: { $last: "$energy" },
      firstTimestamp: { $first: "$timestamp" },
      lastTimestamp: { $last: "$timestamp" },
      avgPower: { $avg: "$power" },
      maxPower: { $max: "$power" },
      avgVoltage: { $avg: "$voltage" },
      minVoltage: { $min: "$voltage" },
      maxVoltage: { $max: "$voltage" },
      avgCurrent: { $avg: "$current" },
      sampleCount: { $sum: 1 },
    },
  },
]).toArray();

print("Aggregate result:", JSON.stringify(results));
