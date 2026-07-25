import mongoose from "mongoose";
import { Expense, IExpense, ExpenseCategory } from "../models/expense.model";
import counterService from "./counter.service";
import { NotFoundError } from "../utils/api-error";
import { getPagination, buildPaginationMeta } from "../utils/pagination";

interface CreateExpenseInput {
    category: ExpenseCategory;
    date: string;
    amount: number;
    paymentMode: string;
    staffName?: string;
    referenceNo?: string;
    description?: string;
    notes?: string;
}

interface UpdateExpenseInput {
    category?: ExpenseCategory;
    date?: string;
    amount?: number;
    paymentMode?: string;
    staffName?: string;
    referenceNo?: string;
    description?: string;
    notes?: string;
}

interface ListExpensesQuery {
    page?: string;
    limit?: string;
    category?: string;
    paymentMode?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
}

const create = async (data: CreateExpenseInput, adminId: string): Promise<IExpense> => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const expenseId = await counterService.getNextId("expense", adminId);

    return Expense.create({
        ...data,
        expenseId,
        adminId: adminOid,
        date: new Date(data.date),
    });
};

const list = async (query: ListExpensesQuery, adminId: string) => {
    const { page, limit, skip } = getPagination(query);
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const filter: Record<string, unknown> = { adminId: adminOid, isActive: true };

    if (query.category) filter.category = query.category;
    if (query.paymentMode) filter.paymentMode = query.paymentMode;
    if (query.dateFrom || query.dateTo) {
        const dateFilter: Record<string, Date> = {};
        if (query.dateFrom) dateFilter.$gte = new Date(query.dateFrom);
        if (query.dateTo) dateFilter.$lte = new Date(new Date(query.dateTo).setHours(23, 59, 59, 999));
        filter.date = dateFilter;
    }
    if (query.search) {
        filter.$or = [
            { expenseId: { $regex: query.search, $options: "i" } },
            { description: { $regex: query.search, $options: "i" } },
            { staffName: { $regex: query.search, $options: "i" } },
            { referenceNo: { $regex: query.search, $options: "i" } },
        ];
    }

    const [expenses, total] = await Promise.all([
        Expense.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
        Expense.countDocuments(filter),
    ]);

    return { data: expenses, meta: buildPaginationMeta(total, page, limit) };
};

const getById = async (id: string, adminId: string): Promise<IExpense> => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const expense = await Expense.findOne({ _id: id, adminId: adminOid, isActive: true });
    if (!expense) throw new NotFoundError("Expense");
    return expense;
};

const update = async (id: string, data: UpdateExpenseInput, adminId: string): Promise<IExpense> => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const expense = await Expense.findOneAndUpdate(
        { _id: id, adminId: adminOid, isActive: true },
        { ...data, ...(data.date ? { date: new Date(data.date) } : {}) },
        { new: true, runValidators: true }
    );
    if (!expense) throw new NotFoundError("Expense");
    return expense;
};

const remove = async (id: string, adminId: string): Promise<void> => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const expense = await Expense.findOneAndUpdate(
        { _id: id, adminId: adminOid, isActive: true },
        { isActive: false },
        { new: true }
    );
    if (!expense) throw new NotFoundError("Expense");
};

const getStats = async (
    query: { category?: string; dateFrom?: string; dateTo?: string } = {},
    adminId: string
) => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const filter: Record<string, unknown> = { adminId: adminOid, isActive: true };
    if (query.category) filter.category = query.category;
    if (query.dateFrom || query.dateTo) {
        const dateFilter: Record<string, Date> = {};
        if (query.dateFrom) dateFilter.$gte = new Date(query.dateFrom);
        if (query.dateTo) dateFilter.$lte = new Date(new Date(query.dateTo).setHours(23, 59, 59, 999));
        filter.date = dateFilter;
    }

    const [totalAgg, byCategory, byMode] = await Promise.all([
        Expense.aggregate([
            { $match: filter },
            { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),
        Expense.aggregate([
            { $match: filter },
            { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),
        Expense.aggregate([
            { $match: filter },
            { $group: { _id: "$paymentMode", total: { $sum: "$amount" } } },
        ]),
    ]);

    const totalAmount = totalAgg[0]?.total ?? 0;
    const totalCount = totalAgg[0]?.count ?? 0;
    const categoryBreakdown = Object.fromEntries(byCategory.map(c => [c._id, { total: c.total, count: c.count }]));
    const modeBreakdown = Object.fromEntries(byMode.map(m => [m._id, m.total]));

    return { totalAmount, totalCount, categoryBreakdown, modeBreakdown };
};

const exportAll = async (query: ListExpensesQuery = {}, adminId: string) => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const filter: Record<string, unknown> = { adminId: adminOid, isActive: true };
    if (query.category && query.category !== "all") filter.category = query.category;
    if (query.paymentMode && query.paymentMode !== "all") filter.paymentMode = query.paymentMode;
    if (query.dateFrom || query.dateTo) {
        const dateFilter: Record<string, Date> = {};
        if (query.dateFrom) dateFilter.$gte = new Date(query.dateFrom);
        if (query.dateTo) dateFilter.$lte = new Date(new Date(query.dateTo).setHours(23, 59, 59, 999));
        filter.date = dateFilter;
    }
    if (query.search) {
        filter.$or = [
            { expenseId: { $regex: query.search, $options: "i" } },
            { description: { $regex: query.search, $options: "i" } },
            { staffName: { $regex: query.search, $options: "i" } },
            { referenceNo: { $regex: query.search, $options: "i" } },
        ];
    }

    const expenses = await Expense.find(filter).sort({ date: -1 }).lean();

    return expenses.map(e => ({
        "Expense ID": e.expenseId,
        "Date": new Date(e.date).toLocaleDateString("en-IN"),
        "Category": e.category,
        "Description": e.description || "",
        "Staff": e.staffName || "",
        "Amount (Rs.)": e.amount,
        "Payment Mode": e.paymentMode,
        "Reference No": e.referenceNo || "",
        "Notes": e.notes || "",
    }));
};

const expenseService = { create, list, getById, update, remove, getStats, exportAll };
export default expenseService;
