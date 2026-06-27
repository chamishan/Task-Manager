import { z } from "zod";

export const suggestSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
});
