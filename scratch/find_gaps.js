const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://mongodb:27017');
  await client.connect();
  const db = client.db('esp32_power_monitor');
  const collection = db.collection('telemetry');
  
  console.log("Fetching telemetry for 7B34E3EC...");
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000);
  const records = await collection.find(
    { deviceId: '7B34E3EC', timestamp: { $gte: cutoff } },
    { projection: { timestamp: 1 }, sort: { timestamp: 1 } }
  ).toArray();
  
  console.log(`Found ${records.length} records since ${cutoff.toISOString()}. Analyzing gaps > 20 seconds...`);
  let gapsCount = 0;
  for (let i = 1; i < records.length; i++) {
    const prev = records[i-1].timestamp.getTime();
    const curr = records[i].timestamp.getTime();
    const diff = (curr - prev) / 1000;
    if (diff > 20) {
      gapsCount++;
      console.log(`Gap of ${diff.toFixed(1)}s at ${records[i-1].timestamp.toISOString()} -> ${records[i].timestamp.toISOString()}`);
    }
  }
  console.log(`Total gaps found: ${gapsCount}`);
  await client.close();
}

main().catch(console.error);
