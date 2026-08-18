/**
 * dietUpload.test.ts — Verifica que el router de subida de dietas
 * no depende de S3 y puede procesar archivos directamente.
 *
 * Bugs corregidos:
 * v3.3: dietUpload.ts llamaba a storagePut() (S3 de Manus) → 404 en VPS.
 *       Ahora procesa archivos directamente sin S3.
 * v3.4: (1) json_schema strict con campos opcionales → error 400 de OpenAI.
 *           Solución: usar response_format: { type: "json_object" }.
 *       (2) require() dinámico de pdf-parse → error de bundler esbuild.
 *           Solución: import estático de PDFParse desde "pdf-parse".
 * v3.5: PDF escaneado (sin texto seleccionable) → 0 días sin error.
 *       Solución: detectar texto vacío y usar pdftoppm para convertir a imágenes.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { execFile } from "child_process";

// Mock de child_process para simular pdftoppm
vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

// Mock de util.promisify para que devuelva una función que resuelve
vi.mock("util", () => ({
  promisify: vi.fn((fn) => {
    if (fn === execFile) {
      return vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    }
    return vi.fn();
  }),
}));

// Mock de fs/promises para simular operaciones de archivos temporales
vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue(["page-1.png"]),
  readFile: vi.fn().mockResolvedValue(Buffer.from("fake-png-data")),
  rm: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

// Mock de pdf-parse para no necesitar archivos PDF reales en los tests
vi.mock("pdf-parse", () => ({
  PDFParse: vi.fn().mockImplementation(() => ({
    getText: vi.fn().mockResolvedValue({
      text: "",  // Simular PDF escaneado (sin texto)
      pages: [],
    }),
  })),
}));

// Mock de invokeLLM para no hacer llamadas reales a la API
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
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
                dinner2: "",
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
  getOrAssignDietImportBatch: vi.fn().mockResolvedValue(2),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { invokeLLM } from "./_core/llm";
import { createDietUpload, createMenuDay, getOrAssignDietImportBatch } from "./db";

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

// PDF mínimo en base64 (texto simple)
const MINIMAL_PDF_BASE64 = Buffer.from("%PDF-1.0\n1 0 obj<</Type/Catalog>>endobj\n%%EOF").toString("base64");

describe("dietUpload.uploadAndExtract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
                  dinner2: "",
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

  it("usa json_object (no json_schema strict) para evitar error 400 de OpenAI con campos opcionales", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.dietUpload.uploadAndExtract({
      fileBase64: MINIMAL_PNG_BASE64,
      fileName: "dieta.png",
      fileType: "image",
      mimeType: "image/png",
    });

    expect(invokeLLM).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    // Debe usar json_object, NO json_schema (que falla con campos opcionales en strict mode)
    expect(callArgs.response_format).toEqual({ type: "json_object" });
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

  it("procesa un PDF escaneado usando pdftoppm para convertir a imágenes", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // El mock de pdf-parse devuelve texto vacío (PDF escaneado)
    // El mock de fs/promises.readdir devuelve ["page-1.png"]
    const result = await caller.dietUpload.uploadAndExtract({
      fileBase64: MINIMAL_PDF_BASE64,
      fileName: "dieta.pdf",
      fileType: "pdf",
      mimeType: "application/pdf",
    });

    expect(result.status).toBe("processed");
    expect(result.extractedDays).toHaveLength(1);

    // Para PDFs escaneados, el contenido del mensaje debe ser array con imágenes
    expect(invokeLLM).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const userMessage = callArgs.messages[1];
    // El contenido debe ser un array (imágenes de páginas)
    expect(Array.isArray(userMessage.content)).toBe(true);
    const firstContent = (userMessage.content as any[])[0];
    expect(firstContent.type).toBe("image_url");
    expect(firstContent.image_url.url).toMatch(/^data:image\/png;base64,/);
  });

  it("normaliza campos opcionales vacíos a undefined en los días extraídos", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dietUpload.uploadAndExtract({
      fileBase64: MINIMAL_PNG_BASE64,
      fileName: "dieta.png",
      fileType: "image",
      mimeType: "image/png",
    });

    // dinner2 era "" en el mock → debe ser undefined
    expect(result.extractedDays[0].dinner2).toBeUndefined();
    // lunch2 tenía valor → debe conservarse
    expect(result.extractedDays[0].lunch2).toBe("Pollo a la plancha");
  });

  it("asigna códigos consecutivos por documento al confirmar los menús", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    vi.mocked(createMenuDay)
      .mockResolvedValueOnce({ id: 10, isDuplicate: false })
      .mockResolvedValueOnce({ id: 11, isDuplicate: false });

    const result = await caller.dietUpload.confirmExtractedDays({
      uploadId: 42,
      days: [
        { dayLabel: "Día 1", lunch1: "Ensalada", dinner1: "Sopa" },
        { dayLabel: "Día 2", lunch1: "Pollo", dinner1: "Crema" },
      ],
    });

    expect(getOrAssignDietImportBatch).toHaveBeenCalledWith(1, 42);
    expect(createMenuDay).toHaveBeenNthCalledWith(1, expect.objectContaining({ importBatch: 2, menuCode: "2-A" }));
    expect(createMenuDay).toHaveBeenNthCalledWith(2, expect.objectContaining({ importBatch: 2, menuCode: "2-B" }));
    expect(result.map((item) => item.menuCode)).toEqual(["2-A", "2-B"]);
  });
});
