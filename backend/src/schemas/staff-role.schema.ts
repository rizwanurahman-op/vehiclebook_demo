import { z } from "zod";

export const createStaffRoleSchema = z.object({
    name: z.string().min(1, "Role name is required").max(50, "Role name must be under 50 characters"),
});

export const updateStaffRoleSchema = z.object({
    name: z.string().min(1, "Role name is required").max(50, "Role name must be under 50 characters").optional(),
    isActive: z.boolean().optional(),
});

export type CreateStaffRoleInput = z.infer<typeof createStaffRoleSchema>;
export type UpdateStaffRoleInput = z.infer<typeof updateStaffRoleSchema>;
