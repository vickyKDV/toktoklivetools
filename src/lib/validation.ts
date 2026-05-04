import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().email("Enter a valid email").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").toLowerCase(),
  password: z.string().min(1, "Password is required")
});

export const workspaceSchema = z.object({
  name: z.string().trim().min(2, "Workspace name is required").max(80),
  tiktokUsername: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((value) => value?.replace(/^@/, "") || null)
});
