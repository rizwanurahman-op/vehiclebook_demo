import { Router } from "express";
import { authenticate, isSuperAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { validate } from "../middleware/validate.middleware";
import { createAdminSchema, updateAdminSchema } from "../schemas/superadmin.schema";
import {
    listAdmins,
    getAdminById,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    suspendAdmin,
    activateAdmin,
    getGlobalDashboard,
    getAdminStats,
} from "../controllers/superadmin.controller";

const router = Router();

// All superadmin routes require authentication + superadmin role
router.use(authenticate, isSuperAdmin);

// Global dashboard
router.get("/dashboard", asyncHandler(getGlobalDashboard));

// Admin CRUD
router.get("/admins", asyncHandler(listAdmins));
router.post("/admins", validate(createAdminSchema), asyncHandler(createAdmin));
router.get("/admins/:id", asyncHandler(getAdminById));
router.put("/admins/:id", validate(updateAdminSchema), asyncHandler(updateAdmin));
router.delete("/admins/:id", asyncHandler(deleteAdmin));

// Admin lifecycle
router.post("/admins/:id/suspend", asyncHandler(suspendAdmin));
router.post("/admins/:id/activate", asyncHandler(activateAdmin));

// Per-admin stats
router.get("/admins/:id/stats", asyncHandler(getAdminStats));

export default router;
