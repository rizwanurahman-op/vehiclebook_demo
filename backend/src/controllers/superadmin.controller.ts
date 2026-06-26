import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth.middleware";
import { User } from "../models/user.model";
import { Vehicle } from "../models/vehicle.model";
import { ConsignmentVehicle } from "../models/consignment-vehicle.model";
import { Lender } from "../models/lender.model";
import { Investment } from "../models/investment.model";
import { Repayment } from "../models/repayment.model";
import { apiResponse } from "../utils/api-response";
import { NotFoundError, ConflictError } from "../utils/api-error";
import { initializeCounters } from "../services/counter.service";

// ── Shared admin selector fields ─────────────────────────────────────────────
const ADMIN_SELECT = "_id username email businessName phone plan isActive isSuspended createdAt updatedAt";

// ── List all admins ──────────────────────────────────────────────────────────
export const listAdmins = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const admins = await User.find({ role: "admin" })
            .select(ADMIN_SELECT)
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(apiResponse(200, "Admins fetched", admins));
    } catch (error) { next(error); }
};

// ── Get single admin ─────────────────────────────────────────────────────────
export const getAdminById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const admin = await User.findOne({ _id: id, role: "admin" })
            .select(ADMIN_SELECT);
        if (!admin) throw new NotFoundError("Admin");
        res.status(200).json(apiResponse(200, "Admin fetched", admin));
    } catch (error) { next(error); }
};

// ── Create admin ─────────────────────────────────────────────────────────────
export const createAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { username, email, password, businessName, phone, plan } = req.body;

        // Uniqueness checks
        const existing = await User.findOne({
            $or: [{ username: username?.toLowerCase() }, { email: email?.toLowerCase() }],
        });
        if (existing) throw new ConflictError("Username or email already in use");

        const passwordHash = await bcrypt.hash(password, 10);
        const admin = await User.create({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            passwordHash,
            role: "admin",
            businessName,
            phone,
            plan: plan || "free",
            isActive: true,
            isSuspended: false,
        });

        // Initialize admin's counter sequences
        await initializeCounters(admin._id.toString());

        res.status(201).json(apiResponse(201, "Admin created successfully", {
            _id: admin._id,
            username: admin.username,
            email: admin.email,
            businessName: admin.businessName,
            phone: admin.phone,
            plan: admin.plan,
            isActive: admin.isActive,
            isSuspended: admin.isSuspended,
            createdAt: admin.createdAt,
            updatedAt: admin.updatedAt,
        }));
    } catch (error) { next(error); }
};

// ── Update admin ─────────────────────────────────────────────────────────────
export const updateAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { username, email, password, businessName, phone, plan } = req.body;

        const admin = await User.findOne({ _id: id, role: "admin" });
        if (!admin) throw new NotFoundError("Admin");

        if (username && username.toLowerCase() !== admin.username) {
            const conflict = await User.findOne({ username: username.toLowerCase() });
            if (conflict) throw new ConflictError("Username already in use");
            admin.username = username.toLowerCase();
        }
        if (email && email.toLowerCase() !== admin.email) {
            const conflict = await User.findOne({ email: email.toLowerCase() });
            if (conflict) throw new ConflictError("Email already in use");
            admin.email = email.toLowerCase();
        }
        if (password && password.trim()) {
            admin.passwordHash = await bcrypt.hash(password, 10);
        }
        if (businessName !== undefined) admin.businessName = businessName;
        if (phone !== undefined) admin.phone = phone;
        if (plan !== undefined) admin.plan = plan;

        await admin.save();

        res.status(200).json(apiResponse(200, "Admin updated successfully", {
            _id: admin._id,
            username: admin.username,
            email: admin.email,
            businessName: admin.businessName,
            phone: admin.phone,
            plan: admin.plan,
            isActive: admin.isActive,
            isSuspended: admin.isSuspended,
            createdAt: admin.createdAt,
            updatedAt: admin.updatedAt,
        }));
    } catch (error) { next(error); }
};

// ── Delete admin (cascade) ────────────────────────────────────────────────────
export const deleteAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const admin = await User.findOne({ _id: id, role: "admin" });
        if (!admin) throw new NotFoundError("Admin");

        const adminObjectId = new mongoose.Types.ObjectId(id as string);
        // Cascade-delete all data owned by this admin
        await Promise.all([
            Vehicle.deleteMany({ adminId: adminObjectId }),
            ConsignmentVehicle.deleteMany({ adminId: adminObjectId }),
            Lender.deleteMany({ adminId: adminObjectId }),
            Investment.deleteMany({ adminId: adminObjectId }),
            Repayment.deleteMany({ adminId: adminObjectId }),
            // Delete viewers that belong to this admin
            User.deleteMany({ adminId: adminObjectId, role: "viewer" }),
        ]);

        await User.findByIdAndDelete(id);
        res.status(200).json(apiResponse(200, "Admin and all their data deleted successfully"));
    } catch (error) { next(error); }
};

// ── Suspend admin ─────────────────────────────────────────────────────────────
export const suspendAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const admin = await User.findOneAndUpdate(
            { _id: id, role: "admin" },
            { isActive: false, isSuspended: true },
            { new: true }
        ).select(ADMIN_SELECT);
        if (!admin) throw new NotFoundError("Admin");
        res.status(200).json(apiResponse(200, "Admin account suspended", admin));
    } catch (error) { next(error); }
};

// ── Reactivate admin ──────────────────────────────────────────────────────────
export const activateAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const admin = await User.findOneAndUpdate(
            { _id: id, role: "admin" },
            { isActive: true, isSuspended: false },
            { new: true }
        ).select(ADMIN_SELECT);
        if (!admin) throw new NotFoundError("Admin");
        res.status(200).json(apiResponse(200, "Admin account activated", admin));
    } catch (error) { next(error); }
};

// ── Global dashboard stats ────────────────────────────────────────────────────
export const getGlobalDashboard = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const [
            admins,
            totalUsers,
            totalVehicles,
            totalLenders,
            totalInvestments,
            totalRepayments,
            totalConsignments,
        ] = await Promise.all([
            User.find({ role: "admin" }).select(ADMIN_SELECT).sort({ createdAt: -1 }).lean(),
            User.countDocuments({ role: "viewer" }),
            Vehicle.countDocuments({ isActive: true }),
            Lender.countDocuments({ isActive: true }),
            Investment.countDocuments(),
            Repayment.countDocuments(),
            ConsignmentVehicle.countDocuments({ isActive: true }),
        ]);

        const totalAdmins = admins.length;
        const activeAdmins = admins.filter(a => a.isActive && !a.isSuspended).length;
        const suspendedAdmins = admins.filter(a => a.isSuspended).length;

        res.status(200).json(apiResponse(200, "Global dashboard fetched", {
            totalAdmins,
            activeAdmins,
            suspendedAdmins,
            totalUsers,
            totalVehicles,
            totalLenders,
            totalInvestments,
            totalRepayments,
            totalConsignments,
            admins,
        }));
    } catch (error) { next(error); }
};

// ── Per-admin stats ───────────────────────────────────────────────────────────
export const getAdminStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const adminOid = new mongoose.Types.ObjectId(id as string);

        const [vehicles, lenders, investments, repayments, consignments, users] = await Promise.all([
            Vehicle.countDocuments({ adminId: adminOid, isActive: true }),
            Lender.countDocuments({ adminId: adminOid }),
            Investment.countDocuments({ adminId: adminOid }),
            Repayment.countDocuments({ adminId: adminOid }),
            ConsignmentVehicle.countDocuments({ adminId: adminOid, isActive: true }),
            User.countDocuments({ adminId: adminOid, role: "viewer" }),
        ]);

        res.status(200).json(apiResponse(200, "Admin stats fetched", {
            vehicles, lenders, investments, repayments, consignments, users,
        }));
    } catch (error) { next(error); }
};
