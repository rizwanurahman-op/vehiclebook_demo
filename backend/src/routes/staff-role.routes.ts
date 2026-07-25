import { Router } from "express";
import { listRoles, createRole, updateRole, deleteRole } from "../controllers/staff-role.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate, isAdmin, resolveAdminScope } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { writeLimiter } from "../middleware/rate-limit.middleware";
import { createStaffRoleSchema, updateStaffRoleSchema } from "../schemas/staff-role.schema";

const router = Router();
router.use(authenticate);
router.use(resolveAdminScope);

router.get("/",       asyncHandler(listRoles));
router.post("/",      isAdmin, writeLimiter, validate(createStaffRoleSchema), asyncHandler(createRole));
router.patch("/:id",  isAdmin, writeLimiter, validate(updateStaffRoleSchema), asyncHandler(updateRole));
router.delete("/:id", isAdmin, writeLimiter, asyncHandler(deleteRole));

export default router;
