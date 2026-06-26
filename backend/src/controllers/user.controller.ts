import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/user.model";
import { apiResponse } from "../utils/api-response";
import { AuthRequest } from "../middleware/auth.middleware";
import { ConflictError, NotFoundError, ForbiddenError } from "../utils/api-error";

// GET /users — admin lists their own viewers (scoped by adminId)
export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const adminId = new mongoose.Types.ObjectId(req.user!.userId);
        const users = await User.find({ adminId, role: "viewer" })
            .select("_id username email role createdAt")
            .sort({ createdAt: -1 });
        res.status(200).json(apiResponse(200, "Users fetched", users));
    } catch (error) {
        next(error);
    }
};

// POST /users — admin creates a viewer account scoped to themselves
export const createViewer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { username, email, password } = req.body as { username: string; email: string; password: string };

        const existing = await User.findOne({
            $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
        });
        if (existing) throw new ConflictError("Username or email is already in use");

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.create({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            passwordHash,
            role: "viewer",
            // Scope the viewer to the requesting admin
            adminId: new mongoose.Types.ObjectId(req.user!.userId),
        });

        res.status(201).json(
            apiResponse(201, "Viewer account created", {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            })
        );
    } catch (error) {
        next(error);
    }
};

// DELETE /users/:id — admin deletes one of their own viewers
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        if (id === req.user!.userId) {
            throw new ForbiddenError("You cannot delete your own account");
        }

        const adminId = new mongoose.Types.ObjectId(req.user!.userId);
        // Admin can only delete viewers that belong to them
        const user = await User.findOne({ _id: id, adminId, role: "viewer" });
        if (!user) throw new NotFoundError("User");

        await User.findByIdAndDelete(id);
        res.status(200).json(apiResponse(200, "User deleted successfully"));
    } catch (error) {
        next(error);
    }
};

// GET /users/:id — admin gets one of their own viewers
export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const adminId = new mongoose.Types.ObjectId(req.user!.userId);
        const user = await User.findOne({ _id: id, adminId }).select("_id username email role createdAt");
        if (!user) throw new NotFoundError("User");
        res.status(200).json(apiResponse(200, "User fetched successfully", user));
    } catch (error) {
        next(error);
    }
};

// PUT /users/:id — admin updates one of their own viewer accounts
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { username, email, password } = req.body as {
            username?: string;
            email?: string;
            password?: string;
        };

        const adminId = new mongoose.Types.ObjectId(req.user!.userId);
        // Scope: admin can only update viewers that belong to them
        const user = await User.findOne({ _id: id, adminId, role: "viewer" });
        if (!user) throw new NotFoundError("User");

        if (username && username.toLowerCase() !== user.username) {
            const existing = await User.findOne({ username: username.toLowerCase() });
            if (existing) throw new ConflictError("Username is already in use");
            user.username = username.toLowerCase();
        }

        if (email && email.toLowerCase() !== user.email) {
            const existing = await User.findOne({ email: email.toLowerCase() });
            if (existing) throw new ConflictError("Email is already in use");
            user.email = email.toLowerCase();
        }

        if (password && password.trim() !== "") {
            user.passwordHash = await bcrypt.hash(password, 12);
        }

        await user.save();

        res.status(200).json(
            apiResponse(200, "User updated successfully", {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            })
        );
    } catch (error) {
        next(error);
    }
};
