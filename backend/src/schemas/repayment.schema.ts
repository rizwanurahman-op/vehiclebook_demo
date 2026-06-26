import { z } from "zod";

const paymentModes = ["Cash", "Online", "Cheque", "UPI"] as const;
const repaymentTypes = ["Principal", "Profit"] as const;

export const createRepaymentSchema = z.object({
    date: z.string().min(1, "Date is required"),
    lender: z.string().min(1, "Lender is required"),
    amountPaid: z.preprocess(
        (v) => (v === null || v === undefined || v === "" ? 0 : Number(v)),
        z.number().min(0, { message: "Amount must be 0 or greater" })
    ),
    mode: z.enum(paymentModes),
    repaymentType: z.enum(repaymentTypes).default("Principal"),
    referenceNo: z.string().optional(),
    remarks: z.string().optional(),
});

export const updateRepaymentSchema = z.object({
    date: z.string().optional(),
    amountPaid: z.preprocess(
        (v) => (v === null || v === undefined || v === "" ? undefined : Number(v)),
        z.number().min(0).optional()
    ),
    mode: z.enum(paymentModes).optional(),
    repaymentType: z.enum(repaymentTypes).optional(),
    referenceNo: z.string().optional(),
    remarks: z.string().optional(),
});

export type CreateRepaymentInput = z.infer<typeof createRepaymentSchema>;
export type UpdateRepaymentInput = z.infer<typeof updateRepaymentSchema>;
