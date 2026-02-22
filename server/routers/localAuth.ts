/**
 * localAuth.ts — Autenticación local usuario/contraseña
 * Para despliegue en VPS propio sin Manus OAuth.
 *
 * Procedimientos:
 *   - auth.register  → crea cuenta nueva (email + contraseña + nombre)
 *   - auth.login     → inicia sesión, devuelve cookie JWT
 *   - auth.logout    → borra la cookie de sesión
 *   - auth.me        → devuelve el usuario autenticado (o null)
 */
import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { sdk } from "../_core/sdk";

export const localAuthRouter = router({
  /** Registrar una cuenta nueva */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email no válido"),
        password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
        name: z.string().min(1, "El nombre es obligatorio").max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

      // Comprobar si el email ya está registrado
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este email ya está registrado. Usa otro o inicia sesión.",
        });
      }

      // Hash de la contraseña
      const passwordHash = await bcrypt.hash(input.password, 12);

      // openId único para usuarios locales
      const openId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      await db.insert(users).values({
        openId,
        email: input.email,
        name: input.name,
        passwordHash,
        loginMethod: "local",
        lastSignedIn: new Date(),
      });

      return { ok: true, message: "Cuenta creada correctamente. Ya puedes iniciar sesión." };
    }),

  /** Iniciar sesión */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      // Mensaje genérico para no revelar si el email existe
      const invalidError = new TRPCError({
        code: "UNAUTHORIZED",
        message: "Email o contraseña incorrectos.",
      });

      if (!user || !user.passwordHash) throw invalidError;

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) throw invalidError;

      // Actualizar lastSignedIn
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

      // Crear token JWT usando jose (compatible con sdk.verifySession)
      // appId usa "local" cuando VITE_APP_ID no está configurado en VPS
      const token = await sdk.signSession(
        {
          openId: user.openId,
          appId: process.env.VITE_APP_ID || "local",
          name: user.name || "",
        },
        { expiresInMs: ONE_YEAR_MS }
      );

      // Establecer cookie de sesión
      ctx.res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: ONE_YEAR_MS,
        path: "/",
      });

      return {
        ok: true,
        user: { name: user.name, email: user.email, role: user.role },
      };
    }),

  /** Cerrar sesión */
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, { path: "/" });
    return { ok: true };
  }),

  /** Obtener el usuario actual (null si no autenticado) */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.user.role,
    };
  }),

  /** Cambiar contraseña (usuario autenticado) */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!user?.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta cuenta no tiene contraseña local." });
      }

      const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "La contraseña actual no es correcta." });
      }

      const newHash = await bcrypt.hash(input.newPassword, 12);
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

      return { ok: true };
    }),
});
