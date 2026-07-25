import { z } from "zod";

const expenseCategories = ["room_rent", "electricity", "water", "staff_salary", "maintenance", "others"] as const;
const expensePaymentModes = ["Cash", "Online", "Cheque", "UPI", "Bank Transfer"] as const;

export const createExpenseSchema = z.object({
    category: z.enum(expenseCategories, { message: "Invalid category" }),
    date: z.string().min(1, "Date is required"),
    amount: z.preprocess(
        (v) => (v === null || v === undefined || v === "" ? 0 : Number(v)),
        z.number().min(0, { message: "Amount must be 0 or greater" })
    ),
    paymentMode: z.enum(expensePaymentModes, { message: "Payment mode is required" }),
    staffName: z.string().trim().optional(),
    referenceNo: z.string().trim().optional(),
    description: z.string().trim().optional(),
    notes: z.string().trim().optional(),
});

export const updateExpenseSchema = z.object({
    category: z.enum(expenseCategories).optional(),
    date: z.string().optional(),
    amount: z.preprocess(
        (v) => (v === null || v === undefined || v === "" ? undefined : Number(v)),
        z.number().min(0).optional()
    ),
    paymentMode: z.enum(expensePaymentModes).optional(),
    staffName: z.string().trim().optional(),
    referenceNo: z.string().trim().optional(),
    description: z.string().trim().optional(),
    notes: z.string().trim().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
