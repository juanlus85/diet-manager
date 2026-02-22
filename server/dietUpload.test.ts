/**
 * dietUpload.test.ts — Verifica que el router de subida de dietas
 * no depende de S3 y puede procesar archivos directamente.
 *
 * El bug original: dietUpload.ts llamaba a storagePut() (S3 de Manus)
 * que devuelve 404 en VPS propio. Ahora:
 * - Imágenes: se envían como data URL base64 directamente a la IA
 * - PDFs: se extrae el texto con pdf-parse y se envía como texto plano
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock de invokeLLM para no hacer llamadas reales a la API
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: JSON.stringify({
            days: [
              {
                dayLabel: "Día 1",
                breakfast: "Café solo",
                lunch1: "Ensalada",
                lunch2: "Pollo a la plancha",
                dinner1: "Sopa de verduras",
                dinner2: "Tortilla francesa",
              },
            ],
          }),
        },
        finish_reason: "stop",
      },
    ],
  }),
}));

// Mock de db para no necesitar base de datos real
vi.mock("./db", () => ({
  createDietUpload: vi.fn().mockResolvedValue(42),
  getDietUploads: vi.fn().mockResolvedValue([]),
  updateDietUpload: vi.fn().mockResolvedValue(undefined),
  createMenuDay: vi.fn().mockResolvedValue({ id: 1 }),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { invokeLLM } from "./_core/llm";
import { createDietUpload } from "./db";

function createAuthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "local",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      passwordHash: null,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
  return { ctx };
}

// Imagen PNG mínima válida en base64 (1x1 pixel rojo)
const MINIMAL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";

describe("dietUpload.uploadAndExtract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restaurar el mock por defecto
    vi.mocked(invokeLLM).mockResolvedValue({
      id: "test",
      created: Date.now(),
      model: "gpt-4o-mini",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              days: [
                {
                  dayLabel: "Día 1",
                  breakfast: "Café solo",
                  lunch1: "Ensalada",
                  lunch2: "Pollo a la plancha",
                  dinner1: "Sopa de verduras",
                  dinner2: "Tortilla francesa",
                },
              ],
            }),
          },
          finish_reason: "stop",
        },
      ],
    });
    vi.mocked(createDietUpload).mockResolvedValue(42);
  });

  it("procesa una imagen sin llamar a S3 (usa data URL base64)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dietUpload.uploadAndExtract({
      fileBase64: MINIMAL_PNG_BASE64,
      fileName: "dieta.png",
      fileType: "image",
      mimeType: "image/png",
    });

    expect(result.status).toBe("processed");
    expect(result.extractedDays).toHaveLength(1);
    expect(result.extractedDays[0].dayLabel).toBe("Día 1");
    expect(result.extractedDays[0].lunch1).toBe("Ensalada");

    // Verificar que se llamó a la IA con data URL base64 (no URL de S3)
    expect(invokeLLM).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const userMessage = callArgs.messages[1];
    expect(Array.isArray(userMessage.content)).toBe(true);
    const imageContent = (userMessage.content as any[])[0];
    expect(imageContent.type).toBe("image_url");
    expect(imageContent.image_url.url).toMatch(/^data:image\/png;base64,/);
    // NO debe contener una URL de S3
    expect(imageContent.image_url.url).not.toMatch(/^https?:\/\//);
  });

  it("no llama a storagePut (no importa el módulo storage)", async () => {
    // Si el módulo storage se importara y fallara, el test fallaría
    // Este test verifica que el router funciona sin storage
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.dietUpload.uploadAndExtract({
        fileBase64: MINIMAL_PNG_BASE64,
        fileName: "test.jpg",
        fileType: "image",
        mimeType: "image/jpeg",
      })
    ).resolves.not.toThrow();
  });

  it("crea el registro en DB con fileUrl vacío (sin S3)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.dietUpload.uploadAndExtract({
      fileBase64: MINIMAL_PNG_BASE64,
      fileName: "dieta.png",
      fileType: "image",
      mimeType: "image/png",
    });

    expect(createDietUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        fileUrl: "", // Sin URL de S3
        fileName: "dieta.png",
        fileType: "image",
        status: "pending",
      })
    );
  });
});
