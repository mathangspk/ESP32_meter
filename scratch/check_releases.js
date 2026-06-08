print(JSON.stringify(
  db.firmware_releases.find({ version: "1.0.9" }).toArray(),
  null,
  2
));
