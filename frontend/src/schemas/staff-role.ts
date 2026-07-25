import { z } from "zod";

export const createStaffRoleSchema = z.object({
    name: z.string().min(1, "Role name is required").max(50, "Max 50 characters"),
});

export const updateStaffRoleSchema = createStaffRoleSchema.partial();

export type CreateStaffRoleFormData = z.infer<typeof createStaffRoleSchema>;
export type UpdateStaffRoleFormData = z.infer<typeof updateStaffRoleSchema>;
