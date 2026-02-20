import { and, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  activityLogs,
  dayIngredients,
  dietUploads,
  ingredients,
  InsertUser,
  menuDays,
  recipes,
  scheduledDays,
  shoppingList,
  users,
  weightGoals,
  weightLogs,
  type InsertActivityLog,
  type InsertDayIngredient,
  type InsertDietUpload,
  type InsertIngredient,
  type InsertMenuDay,
  type InsertRecipe,
  type InsertScheduledDay,
  type InsertShoppingItem,
  type InsertWeightGoal,
  type InsertWeightLog,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import crypto from "crypto";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function updateUserProfile(
  userId: number,
  data: { targetWeight?: number; initialWeight?: number; height?: number; birthDate?: string }
) {
  const db = await getDb();
  if (!db) return;
  const { birthDate, ...rest } = data;
  const updateData: Partial<typeof users.$inferInsert> = { ...rest };
  if (birthDate) (updateData as Record<string, unknown>).birthDate = new Date(birthDate);
  await db.update(users).set(updateData).where(eq(users.id, userId));
}

// ─── Menu Days ────────────────────────────────────────────────────────────────
export function computeMenuHash(day: {
  breakfast?: string | null;
  lunch1: string;
  lunch2?: string | null;
  dinner1: string;
  dinner2?: string | null;
}): string {
  const str = [
    (day.breakfast ?? "").trim().toLowerCase(),
    (day.lunch1 ?? "").trim().toLowerCase(),
    (day.lunch2 ?? "").trim().toLowerCase(),
    (day.dinner1 ?? "").trim().toLowerCase(),
    (day.dinner2 ?? "").trim().toLowerCase(),
  ].join("|");
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 64);
}

export async function getMenuDays(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(menuDays).where(eq(menuDays.userId, userId)).orderBy(desc(menuDays.createdAt));
}

export async function getMenuDayById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(menuDays).where(eq(menuDays.id, id)).limit(1);
  return result[0];
}

export async function createMenuDay(data: InsertMenuDay): Promise<{ id: number; isDuplicate: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const hash = computeMenuHash(data);
  // Check for duplicate
  const existing = await db
    .select()
    .from(menuDays)
    .where(and(eq(menuDays.userId, data.userId), eq(menuDays.contentHash, hash)))
    .limit(1);

  if (existing.length > 0) {
    return { id: existing[0].id, isDuplicate: true };
  }

  const result = await db.insert(menuDays).values({ ...data, contentHash: hash });
  return { id: Number(result[0].insertId), isDuplicate: false };
}

export async function updateMenuDay(id: number, data: Partial<InsertMenuDay>) {
  const db = await getDb();
  if (!db) return;
  if (data.lunch1 || data.dinner1) {
    // Recompute hash if content changed
    const existing = await getMenuDayById(id);
    if (existing) {
      const merged = { ...existing, ...data };
      data.contentHash = computeMenuHash(merged);
    }
  }
  await db.update(menuDays).set(data).where(eq(menuDays.id, id));
}

export async function deleteMenuDay(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(menuDays).where(eq(menuDays.id, id));
}

// ─── Scheduled Days ───────────────────────────────────────────────────────────
export async function getScheduledDays(userId: number, from?: string, to?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(scheduledDays.userId, userId)];
  if (from) conditions.push(gte(scheduledDays.scheduledDate, new Date(from)));
  if (to) conditions.push(lte(scheduledDays.scheduledDate, new Date(to)));
  return db
    .select({
      scheduled: scheduledDays,
      menu: menuDays,
    })
    .from(scheduledDays)
    .leftJoin(menuDays, eq(scheduledDays.menuDayId, menuDays.id))
    .where(and(...conditions))
    .orderBy(scheduledDays.scheduledDate, scheduledDays.sortOrder);
}

export async function createScheduledDay(data: InsertScheduledDay) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(scheduledDays).values(data);
  return Number(result[0].insertId);
}

export async function updateScheduledDay(id: number, data: Partial<InsertScheduledDay>) {
  const db = await getDb();
  if (!db) return;
  await db.update(scheduledDays).set(data).where(eq(scheduledDays.id, id));
}

export async function deleteScheduledDay(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(scheduledDays).where(eq(scheduledDays.id, id));
}

export async function reorderScheduledDays(updates: Array<{ id: number; sortOrder: number; scheduledDate: string }>) {
  const db = await getDb();
  if (!db) return;
  for (const u of updates) {
    await db
      .update(scheduledDays)
      .set({ sortOrder: u.sortOrder, scheduledDate: new Date(u.scheduledDate) as unknown as Date })
      .where(eq(scheduledDays.id, u.id));
  }
}

// ─── Day Ingredients ──────────────────────────────────────────────────────────
export async function getDayIngredients(scheduledDayId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dayIngredients).where(eq(dayIngredients.scheduledDayId, scheduledDayId));
}

export async function upsertDayIngredient(data: InsertDayIngredient) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(dayIngredients)
    .values(data)
    .onDuplicateKeyUpdate({ set: { isAvailable: data.isAvailable } });
}

export async function setIngredientAvailability(id: number, isAvailable: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(dayIngredients).set({ isAvailable }).where(eq(dayIngredients.id, id));
}

// ─── Shopping List ────────────────────────────────────────────────────────────
export async function getShoppingList(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shoppingList).where(eq(shoppingList.userId, userId)).orderBy(shoppingList.createdAt);
}

export async function addShoppingItem(data: InsertShoppingItem) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(shoppingList).values(data);
  return Number(result[0].insertId);
}

export async function toggleShoppingItem(id: number, isPurchased: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(shoppingList).set({ isPurchased }).where(eq(shoppingList.id, id));
}

export async function deleteShoppingItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(shoppingList).where(eq(shoppingList.id, id));
}

export async function clearPurchasedItems(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(shoppingList)
    .where(and(eq(shoppingList.userId, userId), eq(shoppingList.isPurchased, true)));
}

// ─── Weight Logs ──────────────────────────────────────────────────────────────
export async function getWeightLogs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(weightLogs).where(eq(weightLogs.userId, userId)).orderBy(weightLogs.logDate);
}

export async function addWeightLog(data: InsertWeightLog) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(weightLogs).values(data);
  return Number(result[0].insertId);
}

export async function updateWeightLog(id: number, data: Partial<InsertWeightLog>) {
  const db = await getDb();
  if (!db) return;
  await db.update(weightLogs).set(data).where(eq(weightLogs.id, id));
}

export async function deleteWeightLog(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(weightLogs).where(eq(weightLogs.id, id));
}

// ─── Weight Goals ─────────────────────────────────────────────────────────────
export async function getWeightGoals(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(weightGoals).where(eq(weightGoals.userId, userId)).orderBy(weightGoals.targetDate);
}

export async function addWeightGoal(data: InsertWeightGoal) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(weightGoals).values(data);
  return Number(result[0].insertId);
}

export async function deleteWeightGoal(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(weightGoals).where(eq(weightGoals.id, id));
}

// ─── Activity Logs ────────────────────────────────────────────────────────────
export async function getActivityLogs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityLogs).where(eq(activityLogs.userId, userId)).orderBy(activityLogs.logDate);
}

export async function addActivityLog(data: InsertActivityLog) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(activityLogs).values(data);
  return Number(result[0].insertId);
}

export async function deleteActivityLog(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(activityLogs).where(eq(activityLogs.id, id));
}

// ─── Ingredients ──────────────────────────────────────────────────────────────
export async function getIngredients(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ingredients).where(eq(ingredients.userId, userId)).orderBy(ingredients.name);
}

export async function createIngredient(data: InsertIngredient) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(ingredients).values(data);
  return Number(result[0].insertId);
}

export async function deleteIngredient(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(ingredients).where(eq(ingredients.id, id));
}

// ─── Recipes ──────────────────────────────────────────────────────────────────
export async function getRecipes(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recipes).where(eq(recipes.userId, userId)).orderBy(recipes.name);
}

export async function createRecipe(data: InsertRecipe) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(recipes).values(data);
  return Number(result[0].insertId);
}

export async function updateRecipe(id: number, data: Partial<InsertRecipe>) {
  const db = await getDb();
  if (!db) return;
  await db.update(recipes).set(data).where(eq(recipes.id, id));
}

export async function deleteRecipe(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(recipes).where(eq(recipes.id, id));
}

// ─── Diet Uploads ─────────────────────────────────────────────────────────────
export async function getDietUploads(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dietUploads).where(eq(dietUploads.userId, userId)).orderBy(desc(dietUploads.createdAt));
}

export async function createDietUpload(data: InsertDietUpload) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(dietUploads).values(data);
  return Number(result[0].insertId);
}

export async function updateDietUpload(id: number, data: Partial<InsertDietUpload>) {
  const db = await getDb();
  if (!db) return;
  await db.update(dietUploads).set(data).where(eq(dietUploads.id, id));
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export async function getWeightStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const logs = await db
    .select()
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(weightLogs.logDate);

  if (logs.length === 0) return null;

  const first = logs[0];
  const last = logs[logs.length - 1];
  const totalLost = first.weight - last.weight;

  // Weekly stats
  const weeklyStats: Array<{ week: string; lost: number }> = [];
  for (let i = 1; i < logs.length; i++) {
    const diff = logs[i - 1].weight - logs[i].weight;
    const dateVal = logs[i].logDate;
    weeklyStats.push({ week: dateVal instanceof Date ? dateVal.toISOString().slice(0, 10) : String(dateVal), lost: diff });
  }

  return {
    initialWeight: first.weight,
    currentWeight: last.weight,
    totalLost,
    weeklyStats,
    logs,
  };
}
