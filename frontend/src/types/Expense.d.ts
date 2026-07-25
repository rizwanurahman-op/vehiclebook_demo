type ExpenseCategory =
    | "room_rent"
    | "electricity"
    | "water"
    | "staff_salary"
    | "maintenance"
    | "others";

type ExpensePaymentMode = "Cash" | "Online" | "Cheque" | "UPI" | "Bank Transfer";

interface IExpense {
    _id: string;
    expenseId: string;
    category: ExpenseCategory;
    date: string;
    amount: number;
    paymentMode: ExpensePaymentMode;
    staffName?: string;
    referenceNo?: string;
    description?: string;
    notes?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface ExpenseCategoryBreakdown {
    total: number;
    count: number;
}

interface ExpenseStats {
    totalAmount: number;
    totalCount: number;
    categoryBreakdown: Partial<Record<ExpenseCategory, ExpenseCategoryBreakdown>>;
    modeBreakdown: Record<string, number>;
}
