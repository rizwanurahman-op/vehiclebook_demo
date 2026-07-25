import { z } from "zod";

export const createStaffSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name must be under 100 characters"),
    role: z.string().min(1, "Role is required"),
    phone: z.string().optional(),
    monthlySalary: z.preprocess(
        (v) => (v === null || v === undefined || v === "" ? 0 : Number(v)),
        z.number().min(0, "Salary must be 0 or more").default(0)
    ),
    joiningDate: z.string().optional(),
    remarks: z.string().optional(),
});

export const updateStaffSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    role: z.string().min(1).optional(),
    phone: z.string().optional(),
    monthlySalary: z.preprocess(
        (v) => (v === null || v === undefined || v === "" ? undefined : Number(v)),
        z.number().min(0).optional()
    ),
    joiningDate: z.string().optional(),
    isActive: z.boolean().optional(),
    remarks: z.string().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
