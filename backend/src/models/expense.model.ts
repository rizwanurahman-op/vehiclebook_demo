import mongoose, { Schema, Document } from "mongoose";

export type ExpenseCategory =
    | "room_rent"
    | "electricity"
    | "water"
    | "staff_salary"
    | "maintenance"
    | "others";

export type ExpensePaymentMode = "Cash" | "Online" | "Cheque" | "UPI" | "Bank Transfer";

export interface IExpense extends Document {
    adminId: mongoose.Types.ObjectId;
    expenseId: string;
    category: ExpenseCategory;
    date: Date;
    amount: number;
    paymentMode: ExpensePaymentMode;
    staffName?: string;
    referenceNo?: string;
    description?: string;
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
    {
        adminId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        expenseId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        category: {
            type: String,
            enum: ["room_rent", "electricity", "water", "staff_salary", "maintenance", "others"],
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        paymentMode: {
            type: String,
            enum: ["Cash", "Online", "Cheque", "UPI", "Bank Transfer"],
            required: true,
        },
        staffName: {
            type: String,
            trim: true,
        },
        referenceNo: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

expenseSchema.index({ adminId: 1, category: 1 });
expenseSchema.index({ adminId: 1, date: -1 });
expenseSchema.index({ adminId: 1, isActive: 1, date: -1 });
expenseSchema.index({ createdAt: -1 });

export const Expense = mongoose.model<IExpense>("Expense", expenseSchema);
