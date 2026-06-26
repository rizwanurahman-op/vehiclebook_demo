import { Router } from "express";
import { authenticate, resolveAdminScope } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { exportLimiter } from "../middleware/rate-limit.middleware";
import { getSalesRegister, exportSalesRegister } from "../controllers/sales.controller";

const router = Router();
router.use(authenticate);
router.use(resolveAdminScope);

router.get("/", asyncHandler(getSalesRegister));
router.get("/export", exportLimiter, asyncHandler(exportSalesRegister));

export default router;
