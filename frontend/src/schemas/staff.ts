import { z } from "zod";

export const createStaffSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Max 100 characters"),
    role: z.string().min(1, "Role is required"),
    phone: z.string().optional().or(z.literal("")),
    monthlySalary: z.number({ message: "Salary must be a number" }).min(0, "Must be 0 or more"),
    joiningDate: z.string().optional().or(z.literal("")),
    remarks: z.string().optional().or(z.literal("")),
});

export const updateStaffSchema = createStaffSchema.partial().extend({
    isActive: z.boolean().optional(),
});

export type CreateStaffFormData = z.infer<typeof createStaffSchema>;
export type UpdateStaffFormData = z.infer<typeof updateStaffSchema>;
