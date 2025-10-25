import { z } from "zod";
export const formSchema = z.object({
  title: z.string().min(2, "Title is required"),
  curator: z
    .string()
    .min(32, "Curator must be a valid wallet address")
    .regex(/^([1-9A-HJ-NP-Za-km-z]{32,44})$/, "Curator address looks invalid"), // permissive base58-ish check
  curatorShare: z.number().min(0).max(100),
  streamPrice: z.number().min(0, "Stream price must be >= 0"),
  buyPrice: z.number().min(0, "Buy price must be >= 0"),
  imageUrl: z.string().url("Enter a valid image URL"),
});

export type FormValues = z.infer<typeof formSchema>;
