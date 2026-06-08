import { mongoService } from "./src/mongodb";

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoService.connect();

  console.log("Triggering on-demand rollup and hourly breakdown for June 7th...");
  const breakdownJune7 = await mongoService.getHourlyBreakdown("7B34E3EC", "2026-06-07");
  console.log("June 7th dataStatus:", breakdownJune7?.dataStatus);
  console.log("June 7th total hours:", breakdownJune7?.hours.length);

  console.log("Triggering on-demand rollup and hourly breakdown for June 8th...");
  const breakdownJune8 = await mongoService.getHourlyBreakdown("7B34E3EC", "2026-06-08");
  console.log("June 8th dataStatus:", breakdownJune8?.dataStatus);
  console.log("June 8th total hours:", breakdownJune8?.hours.length);

  await mongoService.close();
  console.log("Done.");
}

main().catch(console.error);
