import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock context helpers ─────────────────────────────────────────────────────

function createAuthContext(userId = 1): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: `user${userId}@example.com`,
      name: `Test User ${userId}`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
  return { ctx };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeDefined();
    expect(user?.id).toBe(1);
    expect(user?.name).toBe("Test User 1");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

// ─── Menu router tests ────────────────────────────────────────────────────────

describe("menu router", () => {
  it("listMenuDays returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.menu.listMenuDays();
    expect(Array.isArray(result)).toBe(true);
  });

  it("listScheduledDays returns an array for a date range", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.menu.listScheduledDays({
      from: "2026-01-01",
      to: "2026-12-31",
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Health router tests ──────────────────────────────────────────────────────

describe("health router", () => {
  it("listWeightLogs returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.health.listWeightLogs();
    expect(Array.isArray(result)).toBe(true);
  });

  it("listWeightGoals returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.health.listWeightGoals();
    expect(Array.isArray(result)).toBe(true);
  });

  it("listActivityLogs returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.health.listActivityLogs();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getWeightStats returns stats object", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.health.getWeightStats();
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });
});

// ─── Recipes router tests ─────────────────────────────────────────────────────

describe("recipes router", () => {
  it("listRecipes returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.recipes.listRecipes();
    expect(Array.isArray(result)).toBe(true);
  });

  it("listIngredients returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.recipes.listIngredients();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Shopping router tests ────────────────────────────────────────────────────

describe("shopping router (via recipes)", () => {
  it("getShoppingList returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.recipes.getShoppingList();
    expect(Array.isArray(result)).toBe(true);
  });
});
