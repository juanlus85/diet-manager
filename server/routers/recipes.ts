import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addShoppingItem,
  clearPurchasedItems,
  createIngredient,
  createRecipe,
  deleteIngredient,
  deleteRecipe,
  deleteShoppingItem,
  getIngredients,
  getRecipes,
  getShoppingList,
  toggleShoppingItem,
  updateRecipe,
} from "../db";

export const recipesRouter = router({
  // ─── Ingredientes ───────────────────────────────────────────────────────────
  listIngredients: protectedProcedure.query(({ ctx }) => getIngredients(ctx.user.id)),

  createIngredient: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        unit: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      createIngredient({
        userId: ctx.user.id,
        name: input.name,
        unit: input.unit ?? null,
        category: input.category ?? null,
      })
    ),

  deleteIngredient: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteIngredient(input.id)),

  // ─── Recetas ────────────────────────────────────────────────────────────────
  listRecipes: protectedProcedure.query(({ ctx }) => getRecipes(ctx.user.id)),

  createRecipe: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        mealType: z.enum(["almuerzo", "cena", "desayuno", "snack"]),
        instructions: z.string().optional(),
        ingredientsList: z
          .array(
            z.object({
              ingredientId: z.number().optional(),
              name: z.string(),
              quantity: z.string().optional(),
              unit: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      createRecipe({
        userId: ctx.user.id,
        name: input.name,
        description: input.description ?? null,
        mealType: input.mealType,
        instructions: input.instructions ?? null,
        ingredientsList: input.ingredientsList ?? null,
      })
    ),

  updateRecipe: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        mealType: z.enum(["almuerzo", "cena", "desayuno", "snack"]).optional(),
        instructions: z.string().optional(),
        ingredientsList: z
          .array(
            z.object({
              ingredientId: z.number().optional(),
              name: z.string(),
              quantity: z.string().optional(),
              unit: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateRecipe(id, data);
    }),

  deleteRecipe: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteRecipe(input.id)),

  // ─── Lista de la compra ─────────────────────────────────────────────────────
  getShoppingList: protectedProcedure.query(({ ctx }) => getShoppingList(ctx.user.id)),

  addShoppingItem: protectedProcedure
    .input(
      z.object({
        ingredientName: z.string().min(1),
        quantity: z.string().optional(),
        scheduledDayId: z.number().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      addShoppingItem({
        userId: ctx.user.id,
        ingredientName: input.ingredientName,
        quantity: input.quantity ?? null,
        scheduledDayId: input.scheduledDayId ?? null,
        isPurchased: false,
      })
    ),

  toggleShoppingItem: protectedProcedure
    .input(z.object({ id: z.number(), isPurchased: z.boolean() }))
    .mutation(({ input }) => toggleShoppingItem(input.id, input.isPurchased)),

  deleteShoppingItem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteShoppingItem(input.id)),

  clearPurchasedItems: protectedProcedure.mutation(({ ctx }) => clearPurchasedItems(ctx.user.id)),
});
