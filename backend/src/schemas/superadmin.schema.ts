import { z } from "zod";

export const createAdminSchema = z.object({
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username must be at most 30 characters")
        .regex(/^[a-z0-9_]+$/, "Username may only contain lowercase letters, numbers, and underscores"),
    email: z.string().email("Invalid email address"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(72, "Password too long"),
    businessName: z.string().min(1).max(100).optional(),
    phone: z.string().min(5).max(20).optional(),
    plan: z.enum(["free", "pro", "enterprise"]).optional(),
});

export const updateAdminSchema = z.object({
    username: z.string().min(3).max(30).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).max(72).optional(),
    businessName: z.string().min(1).max(100).optional(),
    phone: z.string().min(5).max(20).optional(),
    plan: z.enum(["free", "pro", "enterprise"]).optional(),
});
