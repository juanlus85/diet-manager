import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addActivityLog,
  addWeightGoal,
  addWeightLog,
  deleteActivityLog,
  deleteWeeklyGoal,
  deleteWeightGoal,
  deleteWeightLog,
  generateWeeklyGoals,
  getActivityLogs,
  getWeeklyGoals,
  getWeightGoals,
  getWeightLogs,
  getWeightStats,
  updateUserProfile,
  updateWeightLog,
  upsertWeeklyGoal,
} from "../db";

export const healthRouter = router({
  // ─── Peso ───────────────────────────────────────────────────────────────────
  listWeightLogs: protectedProcedure.query(({ ctx }) => getWeightLogs(ctx.user.id)),

  addWeightLog: protectedProcedure
    .input(
      z.object({
        weight: z.number().positive(),
        logDate: z.string(), // YYYY-MM-DD
        targetWeight: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      addWeightLog({
        userId: ctx.user.id,
        weight: input.weight,
        logDate: input.logDate as unknown as Date,
        targetWeight: input.targetWeight ?? null,
        notes: input.notes ?? null,
      })
    ),

  updateWeightLog: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        weight: z.number().positive().optional(),
        logDate: z.string().optional(),
        targetWeight: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, logDate, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (logDate) data.logDate = new Date(logDate);
      return updateWeightLog(id, data as Parameters<typeof updateWeightLog>[1]);
    }),

  deleteWeightLog: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteWeightLog(input.id)),

  // ─── Objetivos de peso (hitos) ──────────────────────────────────────────────
  listWeightGoals: protectedProcedure.query(({ ctx }) => getWeightGoals(ctx.user.id)),

  addWeightGoal: protectedProcedure
    .input(
      z.object({
        targetDate: z.string(),
        targetWeight: z.number().positive(),
        label: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      addWeightGoal({
        userId: ctx.user.id,
        targetDate: input.targetDate as unknown as Date,
        targetWeight: input.targetWeight,
        label: input.label ?? null,
      })
    ),

  deleteWeightGoal: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteWeightGoal(input.id)),

  // ─── Objetivos semanales ────────────────────────────────────────────────────
  listWeeklyGoals: protectedProcedure.query(({ ctx }) => getWeeklyGoals(ctx.user.id)),

  upsertWeeklyGoal: protectedProcedure
    .input(
      z.object({
        weekDate: z.string(), // YYYY-MM-DD
        targetWeight: z.number().positive(),
        notes: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      upsertWeeklyGoal({
        userId: ctx.user.id,
        weekDate: new Date(input.weekDate + "T12:00:00Z") as unknown as Date,
        targetWeight: input.targetWeight,
        notes: input.notes ?? null,
      })
    ),

  deleteWeeklyGoal: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteWeeklyGoal(input.id)),

  generateWeeklyGoals: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        startWeight: z.number().positive(),
        endDate: z.string(),
        endWeight: z.number().positive(),
        intervalDays: z.number().min(1).max(30).default(7),
      })
    )
    .mutation(({ ctx, input }) =>
      generateWeeklyGoals(
        ctx.user.id,
        input.startDate,
        input.startWeight,
        input.endDate,
        input.endWeight,
        input.intervalDays
      )
    ),

  // ─── Actividad física ───────────────────────────────────────────────────────
  listActivityLogs: protectedProcedure.query(({ ctx }) => getActivityLogs(ctx.user.id)),

  addActivityLog: protectedProcedure
    .input(
      z.object({
        logDate: z.string(),
        activityType: z.string().min(1),
        duration: z.number().optional(),
        intensity: z.enum(["baja", "media", "alta"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      addActivityLog({
        userId: ctx.user.id,
        logDate: input.logDate as unknown as Date,
        activityType: input.activityType,
        duration: input.duration ?? null,
        intensity: input.intensity ?? "media",
        notes: input.notes ?? null,
      })
    ),

  deleteActivityLog: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteActivityLog(input.id)),

  // ─── Estadísticas ───────────────────────────────────────────────────────────
  getWeightStats: protectedProcedure.query(({ ctx }) => getWeightStats(ctx.user.id)),

  // ─── Perfil del usuario ─────────────────────────────────────────────────────
  updateProfile: protectedProcedure
    .input(
      z.object({
        targetWeight: z.number().optional(),
        initialWeight: z.number().optional(),
        height: z.number().optional(),
        birthDate: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => updateUserProfile(ctx.user.id, input)),
});
