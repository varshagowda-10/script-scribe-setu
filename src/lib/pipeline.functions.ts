import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runPipeline } from "@/services/pipeline.server";

const inputSchema = z.object({
  imageHash: z.string().min(16),
  imageDataUrl: z.string().startsWith("data:image/"),
  ocrText: z.string(),
  ocrConfidence: z.number().nullable(),
  ocrCandidates: z
    .array(
      z.object({
        label: z.string(),
        text: z.string(),
        confidence: z.number().nullable(),
      }),
    )
    .max(4)
    .optional(),
  imageVariants: z.array(z.string().startsWith("data:image/")).max(2).optional(),
});

export const processManuscript = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => runPipeline(data));
