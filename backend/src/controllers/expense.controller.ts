import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import expenseService from "../services/expense.service";
import { apiResponse } from "../utils/api-response";

export const createExpense = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const expense = await expenseService.create(req.body, req.adminId!);
        res.status(201).json(apiResponse(201, "Expense recorded successfully", expense));
    } catch (error) { next(error); }
};

export const listExpenses = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, meta } = await expenseService.list(req.query as Record<string, string>, req.adminId!);
        res.status(200).json(apiResponse(200, "Expenses fetched successfully", data, meta));
    } catch (error) { next(error); }
};

export const getExpense = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const expense = await expenseService.getById(req.params.id as string, req.adminId!);
        res.status(200).json(apiResponse(200, "Expense fetched successfully", expense));
    } catch (error) { next(error); }
};

export const updateExpense = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const expense = await expenseService.update(req.params.id as string, req.body, req.adminId!);
        res.status(200).json(apiResponse(200, "Expense updated successfully", expense));
    } catch (error) { next(error); }
};

export const deleteExpense = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        await expenseService.remove(req.params.id as string, req.adminId!);
        res.status(200).json(apiResponse(200, "Expense deleted successfully"));
    } catch (error) { next(error); }
};

export const getExpenseStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { category, dateFrom, dateTo } = req.query as Record<string, string>;
        const stats = await expenseService.getStats({ category, dateFrom, dateTo }, req.adminId!);
        res.status(200).json(apiResponse(200, "Expense stats fetched", stats));
    } catch (error) { next(error); }
};

export const exportExpenses = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { format = "csv", category, paymentMode, dateFrom, dateTo, search } = req.query as Record<string, string>;
        const timestamp = new Date().toISOString().slice(0, 10);
        const data = await expenseService.exportAll({ category, paymentMode, dateFrom, dateTo, search }, req.adminId!);

        const esc = (x: unknown) => {
            const s = String(x ?? "");
            return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        };

        if (format === "pdf") {
            // Simple CSV fallback for PDF (no puppeteer dependency needed for now)
            const headers = Object.keys(data[0] ?? {});
            const rows = data.map(row => headers.map(h => esc((row as Record<string, unknown>)[h])).join(","));
            const csv = [headers.map(esc).join(","), ...rows].join("\r\n");
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="expenses_${timestamp}.csv"`);
            res.status(200).send("\uFEFF" + csv);
            return;
        }

        const headers = Object.keys(data[0] ?? {});
        const rows = data.map(row => headers.map(h => esc((row as Record<string, unknown>)[h])).join(","));
        const csv = [headers.map(esc).join(","), ...rows].join("\r\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="expenses_${timestamp}.csv"`);
        res.status(200).send("\uFEFF" + csv);
    } catch (error) { next(error); }
};
