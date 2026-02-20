import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  date,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Perfil de salud
  targetWeight: float("targetWeight"),
  initialWeight: float("initialWeight"),
  height: float("height"), // cm
  birthDate: date("birthDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Ingredientes ─────────────────────────────────────────────────────────────
export const ingredients = mysqlTable("ingredients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 50 }), // gramos, unidades, ml, etc.
  category: varchar("category", { length: 100 }), // carnes, verduras, lácteos, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Ingredient = typeof ingredients.$inferSelect;
export type InsertIngredient = typeof ingredients.$inferInsert;

// ─── Recetas ──────────────────────────────────────────────────────────────────
export const recipes = mysqlTable("recipes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  mealType: mysqlEnum("mealType", ["almuerzo", "cena", "desayuno", "snack"]).notNull(),
  instructions: text("instructions"),
  // Lista de ingredientes como JSON: [{ingredientId, name, quantity, unit}]
  ingredientsList: json("ingredientsList").$type<
    Array<{ ingredientId?: number; name: string; quantity?: string; unit?: string }>
  >(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = typeof recipes.$inferInsert;

// ─── Días de Menú (Historial) ─────────────────────────────────────────────────
// Cada fila es un "día completo" único (almuerzo + cena). No se permiten duplicados exactos.
export const menuDays = mysqlTable("menu_days", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Almuerzo: puede tener 2 platos
  lunch1: varchar("lunch1", { length: 500 }).notNull(),
  lunch2: varchar("lunch2", { length: 500 }),
  // Cena: puede tener 2 platos
  dinner1: varchar("dinner1", { length: 500 }).notNull(),
  dinner2: varchar("dinner2", { length: 500 }),
  // Desayuno opcional
  breakfast: varchar("breakfast", { length: 500 }),
  // Hash para detección de duplicados
  contentHash: varchar("contentHash", { length: 64 }).notNull(),
  // Notas adicionales
  notes: text("notes"),
  // Origen: manual, ocr, importado
  source: mysqlEnum("source", ["manual", "ocr", "imported"]).default("manual").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MenuDay = typeof menuDays.$inferSelect;
export type InsertMenuDay = typeof menuDays.$inferInsert;

// ─── Días Programados en Calendario ──────────────────────────────────────────
// Asocia un menuDay a una fecha concreta en el calendario del usuario
export const scheduledDays = mysqlTable("scheduled_days", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  menuDayId: int("menuDayId").notNull(),
  scheduledDate: date("scheduledDate").notNull(),
  // Orden para drag & drop (dentro del mismo día o semana)
  sortOrder: int("sortOrder").default(0).notNull(),
  // Estado del día
  status: mysqlEnum("status", ["pending", "completed", "skipped"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledDay = typeof scheduledDays.$inferSelect;
export type InsertScheduledDay = typeof scheduledDays.$inferInsert;

// ─── Disponibilidad de Ingredientes por Día ───────────────────────────────────
export const dayIngredients = mysqlTable("day_ingredients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  scheduledDayId: int("scheduledDayId").notNull(),
  ingredientName: varchar("ingredientName", { length: 255 }).notNull(),
  isAvailable: boolean("isAvailable").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DayIngredient = typeof dayIngredients.$inferSelect;
export type InsertDayIngredient = typeof dayIngredients.$inferInsert;

// ─── Lista de la Compra ───────────────────────────────────────────────────────
export const shoppingList = mysqlTable("shopping_list", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  ingredientName: varchar("ingredientName", { length: 255 }).notNull(),
  quantity: varchar("quantity", { length: 100 }),
  isPurchased: boolean("isPurchased").default(false).notNull(),
  scheduledDayId: int("scheduledDayId"), // opcional: de qué día viene
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShoppingItem = typeof shoppingList.$inferSelect;
export type InsertShoppingItem = typeof shoppingList.$inferInsert;

// ─── Registros de Peso ────────────────────────────────────────────────────────
export const weightLogs = mysqlTable("weight_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weight: float("weight").notNull(), // kg
  logDate: date("logDate").notNull(),
  // Objetivo de peso para esa fecha (según plan del endocrino)
  targetWeight: float("targetWeight"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WeightLog = typeof weightLogs.$inferSelect;
export type InsertWeightLog = typeof weightLogs.$inferInsert;

// ─── Objetivos de Peso ────────────────────────────────────────────────────────
export const weightGoals = mysqlTable("weight_goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  targetDate: date("targetDate").notNull(),
  targetWeight: float("targetWeight").notNull(),
  label: varchar("label", { length: 255 }), // "20 abril", "20 mayo", etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WeightGoal = typeof weightGoals.$inferSelect;
export type InsertWeightGoal = typeof weightGoals.$inferInsert;

// ─── Registros de Actividad Física ───────────────────────────────────────────
export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  logDate: date("logDate").notNull(),
  activityType: varchar("activityType", { length: 255 }).notNull(), // "Gimnasio 1h", "Baloncesto", etc.
  duration: int("duration"), // minutos
  intensity: mysqlEnum("intensity", ["baja", "media", "alta"]).default("media"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

// ─── Dietas Subidas (archivos originales) ─────────────────────────────────────
export const dietUploads = mysqlTable("diet_uploads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }),
  fileUrl: text("fileUrl"), // URL en S3
  fileType: mysqlEnum("fileType", ["image", "pdf"]).notNull(),
  rawText: text("rawText"), // texto extraído por OCR/LLM
  // Días extraídos como JSON
  extractedDays: json("extractedDays").$type<
    Array<{
      dayLabel: string;
      breakfast?: string;
      lunch1: string;
      lunch2?: string;
      dinner1: string;
      dinner2?: string;
    }>
  >(),
  status: mysqlEnum("status", ["pending", "processed", "error"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DietUpload = typeof dietUploads.$inferSelect;
export type InsertDietUpload = typeof dietUploads.$inferInsert;
