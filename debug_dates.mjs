import { drizzle } from "drizzle-orm/mysql2";
import { scheduledDays } from "./drizzle/schema.ts";
import dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.DATABASE_URL);
const rows = await db.select({
  id: scheduledDays.id,
  scheduledDate: scheduledDays.scheduledDate
}).from(scheduledDays).limit(5);

console.log("=== Fechas en la BD ===");
rows.forEach(r => {
  console.log("id:", r.id);
  console.log("  scheduledDate raw:", r.scheduledDate);
  console.log("  type:", typeof r.scheduledDate);
  console.log("  instanceof Date:", r.scheduledDate instanceof Date);
  if (r.scheduledDate instanceof Date) {
    console.log("  toISOString():", r.scheduledDate.toISOString());
    console.log("  getFullYear/Month/Date (LOCAL):", r.scheduledDate.getFullYear(), r.scheduledDate.getMonth()+1, r.scheduledDate.getDate());
    console.log("  getUTCFullYear/Month/Date (UTC):", r.scheduledDate.getUTCFullYear(), r.scheduledDate.getUTCMonth()+1, r.scheduledDate.getUTCDate());
  }
});
process.exit(0);
