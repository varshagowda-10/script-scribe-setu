import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runPipeline } from "@/services/pipeline.server";

const inputSchema = z.object({
  imageHash: z.string().min(16),
  imageDataUrl: z.string().startsWith("data:image/"),
  ocrText: z.string(),
  ocrConfidence: z.number().nullable(),
});

export const processManuscript = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => runPipeline(data));
