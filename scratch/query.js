const stats = db.telemetry.aggregate([
  { $match: { serialNumber: "7B34E3EC" } },
  {
    $group: {
      _id: null,
      minTime: { $min: "$timestamp" },
      maxTime: { $max: "$timestamp" },
      totalCount: { $sum: 1 }
    }
  }
]).toArray();

print("Overall raw telemetry stats for 7B34E3EC:");
print(JSON.stringify(stats, null, 2));

const june5stats = db.telemetry.aggregate([
  { $match: { serialNumber: "7B34E3EC", timestamp: { $gte: new Date("2026-06-05T00:00:00Z"), $lt: new Date("2026-06-06T00:00:00Z") } } },
  {
    $group: {
      _id: { $hour: "$timestamp" },
      count: { $sum: 1 }
    }
  },
  { $sort: { "_id": 1 } }
]).toArray();

print("June 5th raw telemetry counts by hour:");
print(JSON.stringify(june5stats, null, 2));
