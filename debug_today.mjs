import { drizzle } from "drizzle-orm/mysql2";
import { scheduledDays, menuDays } from "./drizzle/schema.ts";
import { eq, and, gte, lte } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

// Simular exactamente lo que hace el frontend
// El usuario está en UTC+1 (España), son las ~10:00 AM del sábado 21 de febrero
// new Date() en el navegador = 2026-02-21T09:00:00Z (UTC)
const now = new Date(); // En el servidor sandbox
console.log("=== Fecha actual del servidor ===");
console.log("now:", now.toISOString());
console.log("getUTCDate:", now.getUTCDate(), "getUTCMonth+1:", now.getUTCMonth()+1, "getUTCFullYear:", now.getUTCFullYear());
console.log("getDate (local):", now.getDate(), "getMonth+1:", now.getMonth()+1, "getFullYear:", now.getFullYear());

// formatDate con getUTC (como está en el frontend ahora)
function formatDateUTC(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const todayStr = formatDateUTC(now);
console.log("\n=== viewDateStr (hoy en UTC) ===");
console.log("todayStr:", todayStr);

// Simular el from/to que envía el frontend
const from = formatDateUTC(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000));
const to = formatDateUTC(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000));
console.log("from:", from, "to:", to);

// Consultar la BD con el mismo filtro que usa el backend
const rows = await db.select({
  scheduled: scheduledDays,
  menu: menuDays,
}).from(scheduledDays)
  .leftJoin(menuDays, eq(scheduledDays.menuDayId, menuDays.id))
  .where(and(
    gte(scheduledDays.scheduledDate, new Date(from + "T00:00:00Z")),
    lte(scheduledDays.scheduledDate, new Date(to + "T23:59:59Z"))
  ))
  .orderBy(scheduledDays.scheduledDate);

console.log("\n=== Días devueltos por la BD ===");
rows.forEach(r => {
  const d = r.scheduled.scheduledDate;
  const utcStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
  const match = utcStr === todayStr ? " ← HOY" : "";
  console.log(`id:${r.scheduled.id} scheduledDate:${d.toISOString()} → UTC:${utcStr}${match} | lunch1:${r.menu?.lunch1}`);
});

process.exit(0);
