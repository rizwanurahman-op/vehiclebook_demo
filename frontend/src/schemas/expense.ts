import { z } from "zod";

export const expenseCategories = [
    "room_rent",
    "electricity",
    "water",
    "staff_salary",
    "maintenance",
    "others",
] as const;

export const expensePaymentModes = ["Cash", "Online", "Cheque", "UPI", "Bank Transfer"] as const;

export const createExpenseSchema = z.object({
    category: z.enum(expenseCategories, { message: "Category is required" }),
    date: z.string().min(1, "Date is required"),
    amount: z.number({ message: "Amount is required" }).min(0, "Amount must be 0 or more"),
    paymentMode: z.enum(expensePaymentModes, { message: "Payment mode is required" }),
    staffName: z.string().optional().or(z.literal("")),
    referenceNo: z.string().optional().or(z.literal("")),
    description: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateExpenseFormData = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseFormData = z.infer<typeof updateExpenseSchema>;
