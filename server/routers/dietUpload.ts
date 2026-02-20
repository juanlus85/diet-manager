import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { createDietUpload, getDietUploads, updateDietUpload, createMenuDay } from "../db";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

export const dietUploadRouter = router({
  listUploads: protectedProcedure.query(({ ctx }) => getDietUploads(ctx.user.id)),

  // Subir imagen o PDF en base64 y extraer dieta con LLM
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
      // 1. Subir archivo a S3
      const buffer = Buffer.from(input.fileBase64, "base64");
      const key = `diet-uploads/${ctx.user.id}/${nanoid()}-${input.fileName}`;
      const { url: fileUrl } = await storagePut(key, buffer, input.mimeType);

      // 2. Crear registro en DB con estado pending
      const uploadId = await createDietUpload({
        userId: ctx.user.id,
        fileName: input.fileName,
        fileUrl,
        fileType: input.fileType,
        status: "pending",
      });

      // 3. Extraer texto con LLM
      try {
        const messages: Parameters<typeof invokeLLM>[0]["messages"] = [
          {
            role: "system",
            content: `Eres un asistente especializado en extraer información de dietas médicas.
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
Extrae todos los días que encuentres en el documento.`,
          },
          {
            role: "user",
            content:
              input.fileType === "image"
                ? [
                    {
                      type: "image_url" as const,
                      image_url: { url: fileUrl, detail: "high" as const },
                    },
                    {
                      type: "text" as const,
                      text: "Por favor, extrae todos los menús diarios de esta imagen de dieta médica.",
                    },
                  ]
                : [
                    {
                      type: "file_url" as const,
                      file_url: {
                        url: fileUrl,
                        mime_type: "application/pdf" as const,
                      },
                    },
                    {
                      type: "text" as const,
                      text: "Por favor, extrae todos los menús diarios de este PDF de dieta médica.",
                    },
                  ],
          },
        ];

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
