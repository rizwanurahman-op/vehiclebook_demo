import { Router } from "express";
import {
    createExpense, listExpenses, getExpense,
    updateExpense, deleteExpense, getExpenseStats, exportExpenses,
} from "../controllers/expense.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate, isAdmin, resolveAdminScope } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { exportLimiter, writeLimiter } from "../middleware/rate-limit.middleware";
import { createExpenseSchema, updateExpenseSchema } from "../schemas/expense.schema";

const router = Router();
router.use(authenticate);
router.use(resolveAdminScope);

router.get("/stats",  asyncHandler(getExpenseStats));
router.get("/export", exportLimiter, asyncHandler(exportExpenses));
router.get("/",       asyncHandler(listExpenses));
router.post("/",      isAdmin, writeLimiter, validate(createExpenseSchema), asyncHandler(createExpense));
router.get("/:id",    asyncHandler(getExpense));
router.patch("/:id",  isAdmin, writeLimiter, validate(updateExpenseSchema), asyncHandler(updateExpense));
router.delete("/:id", isAdmin, writeLimiter, asyncHandler(deleteExpense));

export default router;
