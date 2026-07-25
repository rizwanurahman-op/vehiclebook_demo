import { Router } from "express";
import { createStaff, listStaff, getStaff, updateStaff, deleteStaff, restoreStaff, getStaffStats } from "../controllers/staff.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate, isAdmin, resolveAdminScope } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { writeLimiter } from "../middleware/rate-limit.middleware";
import { createStaffSchema, updateStaffSchema } from "../schemas/staff.schema";

const router = Router();
router.use(authenticate);
router.use(resolveAdminScope);

router.get("/stats",         asyncHandler(getStaffStats));
router.get("/",              asyncHandler(listStaff));
router.post("/",             isAdmin, writeLimiter, validate(createStaffSchema), asyncHandler(createStaff));
router.get("/:id",           asyncHandler(getStaff));
router.patch("/:id/restore", isAdmin, writeLimiter, asyncHandler(restoreStaff));
router.patch("/:id",         isAdmin, writeLimiter, validate(updateStaffSchema), asyncHandler(updateStaff));
router.delete("/:id",        isAdmin, writeLimiter, asyncHandler(deleteStaff));

export default router;
