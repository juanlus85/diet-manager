import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { createDietUpload, getDietUploads, updateDietUpload, createMenuDay } from "../db";

/**
 * Extrae texto de un PDF en base64 usando pdf-parse.
 * Importación dinámica para evitar problemas con el bundler.
 */
async function extractPdfText(base64: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const buffer = Buffer.from(base64, "base64");
  const data = await pdfParse(buffer);
  return data.text ?? "";
}

export const dietUploadRouter = router({
  listUploads: protectedProcedure.query(({ ctx }) => getDietUploads(ctx.user.id)),

  /**
   * Recibe imagen o PDF en base64 y extrae la dieta con LLM.
   * No usa S3: las imágenes se envían como data URL base64 directamente a la IA,
   * y los PDFs se procesan extrayendo el texto con pdf-parse.
   */
  uploadAndExtract: protectedProcedure
    .input(
      z.object({
        fileBase64: z.string(), // base64 del archivo
        fileName: z.string(),
        fileType: z.enum(["image", "pdf"]),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Crear registro en DB con estado pending (sin URL de S3)
      const uploadId = await createDietUpload({
        userId: ctx.user.id,
        fileName: input.fileName,
        fileUrl: "", // Sin almacenamiento externo en VPS
        fileType: input.fileType,
        status: "pending",
      });

      try {
        let messages: Parameters<typeof invokeLLM>[0]["messages"];

        const systemPrompt = `Eres un asistente especializado en extraer información de dietas médicas.
Analiza la imagen o documento y extrae los menús diarios.
Devuelve un JSON con el siguiente formato exacto:
{
  "days": [
    {
      "dayLabel": "Día Primero",
      "breakfast": "Café solo, té o infusiones",
      "lunch1": "Primer plato del almuerzo",
      "lunch2": "Segundo plato del almuerzo (si existe)",
      "dinner1": "Primer plato de la cena",
      "dinner2": "Segundo plato de la cena (si existe)"
    }
  ]
}
Si no hay desayuno específico, omite el campo breakfast.
Si solo hay un plato en almuerzo o cena, omite el campo lunch2 o dinner2.
Extrae todos los días que encuentres en el documento.`;

        if (input.fileType === "image") {
          // Imágenes: enviar como data URL base64 directamente (compatible con OpenAI)
          const dataUrl = `data:${input.mimeType};base64,${input.fileBase64}`;
          messages = [
            { role: "system", content: systemPrompt },
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
          // PDFs: extraer texto con pdf-parse y enviarlo como texto plano
          const pdfText = await extractPdfText(input.fileBase64);
          if (!pdfText.trim()) {
            throw new Error("No se pudo extraer texto del PDF. Asegúrate de que el PDF contiene texto seleccionable (no es una imagen escaneada).");
          }
          messages = [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Por favor, extrae todos los menús diarios de este documento de dieta médica:\n\n${pdfText}`,
            },
          ];
        }

        const response = await invokeLLM({
          messages,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "diet_extraction",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        dayLabel: { type: "string" },
                        breakfast: { type: "string" },
                        lunch1: { type: "string" },
                        lunch2: { type: "string" },
                        dinner1: { type: "string" },
                        dinner2: { type: "string" },
                      },
                      required: ["dayLabel", "lunch1", "dinner1"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["days"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent));
        const extractedDays = parsed.days ?? [];

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
