import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { menuRouter } from "./routers/menu";
import { healthRouter } from "./routers/health";
import { recipesRouter } from "./routers/recipes";
import { dietUploadRouter } from "./routers/dietUpload";
import { localAuthRouter } from "./routers/localAuth";
export const appRouter = router({
  system: systemRouter,
  // auth: incluye tanto el login local como el me/logout compatible con el frontend existente
  auth: localAuthRouter,
  menu: menuRouter,
  health: healthRouter,
  recipes: recipesRouter,
  dietUpload: dietUploadRouter,
});

export type AppRouter = typeof appRouter;
