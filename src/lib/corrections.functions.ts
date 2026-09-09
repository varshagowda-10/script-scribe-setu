import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  wrong: z.string().trim().min(1).max(120),
  correct: z.string().trim().min(1).max(120),
});

/** Save a reader-supplied fix; it is reused on every later manuscript. */
export const submitCorrection = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    if (data.wrong === data.correct) return { saved: false };
    const { saveCorrection } = await import("@/services/corrections/corrections.server");
    await saveCorrection(data.wrong, data.correct);
    return { saved: true };
  });
