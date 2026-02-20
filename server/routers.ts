import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { menuRouter } from "./routers/menu";
import { healthRouter } from "./routers/health";
import { recipesRouter } from "./routers/recipes";
import { dietUploadRouter } from "./routers/dietUpload";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  menu: menuRouter,
  health: healthRouter,
  recipes: recipesRouter,
  dietUpload: dietUploadRouter,
});

export type AppRouter = typeof appRouter;
