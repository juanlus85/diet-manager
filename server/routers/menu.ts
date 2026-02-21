import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createMenuDay,
  createScheduledDay,
  deleteMenuDay,
  deleteScheduledDay,
  getDayIngredients,
  getMenuDayById,
  getMenuDays,
  getScheduledDays,
  reorderScheduledDays,
  setIngredientAvailability,
  updateMenuDay,
  updateScheduledDay,
  upsertDayIngredient,
} from "../db";

export const menuRouter = router({
  // ─── Menu Days (Historial) ──────────────────────────────────────────────────
  listMenuDays: protectedProcedure.query(({ ctx }) => getMenuDays(ctx.user.id)),

  getMenuDay: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getMenuDayById(input.id)),

  createMenuDay: protectedProcedure
    .input(
      z.object({
        breakfast: z.string().optional(),
        lunch1: z.string().min(1),
        lunch2: z.string().optional(),
        dinner1: z.string().min(1),
        dinner2: z.string().optional(),
        notes: z.string().optional(),
        source: z.enum(["manual", "ocr", "imported"]).optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      createMenuDay({
        userId: ctx.user.id,
        lunch1: input.lunch1,
        lunch2: input.lunch2 ?? null,
        dinner1: input.dinner1,
        dinner2: input.dinner2 ?? null,
        breakfast: input.breakfast ?? null,
        notes: input.notes ?? null,
        source: input.source ?? "manual",
        contentHash: "", // will be computed in createMenuDay
      })
    ),

  updateMenuDay: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        breakfast: z.string().optional(),
        lunch1: z.string().optional(),
        lunch2: z.string().optional(),
        dinner1: z.string().optional(),
        dinner2: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateMenuDay(id, data);
    }),

  deleteMenuDay: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteMenuDay(input.id)),

  // ─── Scheduled Days (Calendario) ───────────────────────────────────────────
  listScheduledDays: protectedProcedure
    .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
    .query(({ ctx, input }) => getScheduledDays(ctx.user.id, input.from, input.to)),

  scheduleDay: protectedProcedure
    .input(
      z.object({
        menuDayId: z.number(),
        scheduledDate: z.string(), // YYYY-MM-DD
        sortOrder: z.number().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      createScheduledDay({
        userId: ctx.user.id,
        menuDayId: input.menuDayId,
        scheduledDate: input.scheduledDate,
        sortOrder: input.sortOrder ?? 0,
        status: "pending",
      })
    ),

  updateScheduledDay: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "completed", "skipped"]).optional(),
        notes: z.string().optional(),
        scheduledDate: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, scheduledDate, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (scheduledDate) data.scheduledDate = scheduledDate;
      return updateScheduledDay(id, data as Parameters<typeof updateScheduledDay>[1]);
    }),

  deleteScheduledDay: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteScheduledDay(input.id)),

  reorderScheduledDays: protectedProcedure
    .input(
      z.array(
        z.object({
          id: z.number(),
          sortOrder: z.number(),
          scheduledDate: z.string(),
        })
      )
    )
    .mutation(({ input }) => reorderScheduledDays(input)),

  // ─── Ingredientes por día ───────────────────────────────────────────────────
  getDayIngredients: protectedProcedure
    .input(z.object({ scheduledDayId: z.number() }))
    .query(({ input }) => getDayIngredients(input.scheduledDayId)),

  setIngredientAvailability: protectedProcedure
    .input(z.object({ id: z.number(), isAvailable: z.boolean() }))
    .mutation(({ input }) => setIngredientAvailability(input.id, input.isAvailable)),

  saveDayIngredients: protectedProcedure
    .input(
      z.object({
        scheduledDayId: z.number(),
        ingredients: z.array(
          z.object({
            ingredientName: z.string(),
            isAvailable: z.boolean(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      for (const ing of input.ingredients) {
        await upsertDayIngredient({
          userId: ctx.user.id,
          scheduledDayId: input.scheduledDayId,
          ingredientName: ing.ingredientName,
          isAvailable: ing.isAvailable,
        });
      }
    }),
});
