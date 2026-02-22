import { z } from "zod";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readdir, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { createDietUpload, getDietUploads, updateDietUpload, createMenuDay } from "../db";
// Import estático para evitar "Dynamic require is not supported" en esbuild
import { PDFParse } from "pdf-parse";

const execFileAsync = promisify(execFile);

const SYSTEM_PROMPT = `Eres un asistente especializado en extraer información de dietas médicas.
Analiza la imagen o documento y extrae los menús diarios.
Devuelve un JSON con el siguiente formato exacto:
{
  "days": [
    {
      "dayLabel": "Día Primero",
      "breakfast": "Café solo, té o infusiones (o cadena vacía si no hay desayuno)",
      "lunch1": "Primer plato del almuerzo",
      "lunch2": "Segundo plato del almuerzo (o cadena vacía si no hay)",
      "dinner1": "Primer plato de la cena",
      "dinner2": "Segundo plato de la cena (o cadena vacía si no hay)"
    }
  ]
}
Todos los campos son obligatorios. Si no hay desayuno o segundo plato, usa cadena vacía "".
Extrae todos los días que encuentres en el documento.`;

/**
 * Extrae texto de un PDF en base64 usando pdf-parse v2.
 * getText() llama a load() internamente (load es private en los tipos).
 */
async function extractPdfText(base64: string): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text ?? "";
}

/**
 * Convierte un PDF en base64 a imágenes PNG usando pdftoppm (poppler-utils).
 * Devuelve array de data URLs base64 (una por página, máximo 6 páginas).
 */
async function pdfToImages(base64: string): Promise<string[]> {
  const tmpDir = join(tmpdir(), `diet-pdf-${Date.now()}`);
  const pdfPath = join(tmpDir, "input.pdf");
  const outPrefix = join(tmpDir, "page");

  try {
    // Crear directorio temporal y escribir el PDF
    await rm(tmpDir, { recursive: true, force: true });
    const { mkdir } = await import("fs/promises");
    await mkdir(tmpDir, { recursive: true });
    await writeFile(pdfPath, Buffer.from(base64, "base64"));

    // Convertir PDF a PNG con pdftoppm (máximo 6 páginas, 150 DPI)
    await execFileAsync("pdftoppm", [
      "-png",
      "-r", "150",
      "-l", "6",
      pdfPath,
      outPrefix,
    ]);

    // Leer los archivos PNG generados
    const files = (await readdir(tmpDir))
      .filter((f) => f.endsWith(".png"))
      .sort();

    const images: string[] = [];
    for (const file of files) {
      const imgBuffer = await readFile(join(tmpDir, file));
      images.push(`data:image/png;base64,${imgBuffer.toString("base64")}`);
    }

    return images;
  } finally {
    // Limpiar archivos temporales
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export const dietUploadRouter = router({
  listUploads: protectedProcedure.query(({ ctx }) => getDietUploads(ctx.user.id)),

  /**
   * Recibe imagen o PDF en base64 y extrae la dieta con LLM.
   * - Imágenes: data URL base64 directamente a la IA.
   * - PDFs con texto: pdf-parse extrae el texto y se envía como texto plano.
   * - PDFs escaneados (sin texto): pdftoppm convierte a imágenes y se envían a la IA con visión.
   */
  uploadAndExtract: protectedProcedure
    .input(
      z.object({
        fileBase64: z.string(),
        fileName: z.string(),
        fileType: z.enum(["image", "pdf"]),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const uploadId = await createDietUpload({
        userId: ctx.user.id,
        fileName: input.fileName,
        fileUrl: "",
        fileType: input.fileType,
        status: "pending",
      });

      try {
        let messages: Parameters<typeof invokeLLM>[0]["messages"];

        if (input.fileType === "image") {
          // Imágenes: enviar como data URL base64 directamente
          const dataUrl = `data:${input.mimeType};base64,${input.fileBase64}`;
          messages = [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "image_url" as const,
                  image_url: { url: dataUrl, detail: "high" as const },
                },
                {
                  type: "text" as const,
                  text: "Por favor, extrae todos los menús diarios de esta imagen de dieta médica.",
                },
              ],
            },
          ];
        } else {
          // PDFs: intentar primero extraer texto
          const pdfText = await extractPdfText(input.fileBase64);

          if (pdfText.trim().length > 50) {
            // PDF con texto seleccionable: enviar como texto plano
            messages = [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: `Por favor, extrae todos los menús diarios de este documento de dieta médica:\n\n${pdfText}`,
              },
            ];
          } else {
            // PDF escaneado (sin texto): convertir páginas a imágenes con pdftoppm
            const pageImages = await pdfToImages(input.fileBase64);

            if (pageImages.length === 0) {
              throw new Error(
                "No se pudo procesar el PDF. Asegúrate de que el archivo no está dañado o protegido."
              );
            }

            // Enviar todas las páginas como imágenes a la IA
            const imageContent = pageImages.map((dataUrl) => ({
              type: "image_url" as const,
              image_url: { url: dataUrl, detail: "high" as const },
            }));

            messages = [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: [
                  ...imageContent,
                  {
                    type: "text" as const,
                    text: `Por favor, extrae todos los menús diarios de este PDF de dieta médica (${pageImages.length} página${pageImages.length > 1 ? "s" : ""}).`,
                  },
                ],
              },
            ];
          }
        }

        const response = await invokeLLM({
          messages,
          response_format: { type: "json_object" },
        });

        const rawContent = response.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(
          typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent)
        );
        const rawDays: Array<Record<string, string>> = parsed.days ?? [];

        // Normalizar: convertir cadenas vacías en undefined para campos opcionales
        const extractedDays = rawDays.map((day) => ({
          dayLabel: day.dayLabel ?? "",
          breakfast: day.breakfast || undefined,
          lunch1: day.lunch1 ?? "",
          lunch2: day.lunch2 || undefined,
          dinner1: day.dinner1 ?? "",
          dinner2: day.dinner2 || undefined,
        }));

        await updateDietUpload(uploadId, {
          extractedDays,
          rawText: JSON.stringify(extractedDays),
          status: "processed",
        });

        return { uploadId, extractedDays, status: "processed" as const };
      } catch (err) {
        await updateDietUpload(uploadId, { status: "error" });
        throw err;
      }
    }),

  // Confirmar días extraídos y añadirlos al historial de menús
  confirmExtractedDays: protectedProcedure
    .input(
      z.object({
        days: z.array(
          z.object({
            dayLabel: z.string(),
            breakfast: z.string().optional(),
            lunch1: z.string(),
            lunch2: z.string().optional(),
            dinner1: z.string(),
            dinner2: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = [];
      for (const day of input.days) {
        const result = await createMenuDay({
          userId: ctx.user.id,
          breakfast: day.breakfast ?? null,
          lunch1: day.lunch1,
          lunch2: day.lunch2 ?? null,
          dinner1: day.dinner1,
          dinner2: day.dinner2 ?? null,
          notes: day.dayLabel,
          source: "ocr",
          contentHash: "",
        });
        results.push({ ...result, dayLabel: day.dayLabel });
      }
      return results;
    }),
});
