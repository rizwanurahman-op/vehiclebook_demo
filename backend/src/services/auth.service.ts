import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";
import { User, IUser } from "../models/user.model";
import { env } from "../config/env";
import { ApiError, ConflictError, NotFoundError, UnauthorizedError, ForbiddenError } from "../utils/api-error";
import { sendPasswordResetEmail } from "./email.service";
import { initializeCounters } from "./counter.service";

interface RegisterInput {
    username: string;
    email: string;
    password: string;
}

interface LoginInput {
    usernameOrEmail: string;
    password: string;
}

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

const generateTokens = (userId: string, role: string, adminId?: string): TokenPair => {
    // Include adminId in JWT payload so resolveAdminScope can read it for viewers
    const payload: Record<string, string> = { userId, role };
    if (adminId) payload.adminId = adminId;

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRY as jwt.SignOptions["expiresIn"],
    });
    const refreshToken = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRY as jwt.SignOptions["expiresIn"],
    });
    return { accessToken, refreshToken };
};

// Pre-computed dummy hash used to prevent timing-based username enumeration.
// When login fails because a user does not exist, we still run bcrypt.compare()
// against this dummy hash so the response time is indistinguishable from a real
// wrong-password failure. Without this, attackers can enumerate valid usernames
// by measuring response latency (user-not-found ~2ms vs wrong-password ~100ms).
// MUST be a valid bcrypt hash of cost 10 so bcrypt.compare() does real work.
const DUMMY_HASH = "$2a$10$8AhGXgCY9XXlArtwvsJqg.kIPgthEqQc7fAKXlPnwt/vQm7hjiqdW";

/**
 * Public registration is disabled. Admins are only created by the superadmin.
 * This stub is kept for the initial superadmin-seed bootstrap flow only.
 * @deprecated Use registerAdmin() called by superadmin instead.
 */
const register = async (data: RegisterInput): Promise<{ user: IUser; tokens: TokenPair }> => {
    // Allow this only if NO admin or superadmin exists at all (first-time bootstrap)
    const existingPrivileged = await User.findOne({ role: { $in: ["admin", "superadmin"] } });
    if (existingPrivileged) {
        throw new ConflictError("Registration is closed. Contact your SuperAdmin to create an account.");
    }

    const existingUser = await User.findOne({
        $or: [{ username: data.username }, { email: data.email }],
    });
    if (existingUser) {
        throw new ConflictError("Username or email already in use");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({
        username: data.username.toLowerCase(),
        email: data.email.toLowerCase(),
        passwordHash,
        role: "admin",
    });

    // Initialize per-admin counters for this new admin
    await initializeCounters(user._id.toString());

    const tokens = generateTokens(user._id.toString(), user.role);
    await User.updateOne(
        { _id: user._id },
        { $set: { refreshToken: tokens.refreshToken, refreshTokenFamily: crypto.randomUUID() } }
    );

    return { user, tokens };
};

/**
 * SuperAdmin creates a new Admin account.
 */
interface CreateAdminInput {
    username: string;
    email: string;
    password: string;
    businessName?: string;
    phone?: string;
    plan?: "free" | "pro" | "enterprise";
}

const registerAdmin = async (data: CreateAdminInput): Promise<IUser> => {
    const existingUser = await User.findOne({
        $or: [
            { username: data.username.toLowerCase() },
            { email: data.email.toLowerCase() },
        ],
    });
    if (existingUser) {
        throw new ConflictError("Username or email already in use");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({
        username: data.username.toLowerCase(),
        email: data.email.toLowerCase(),
        passwordHash,
        role: "admin",
        businessName: data.businessName,
        phone: data.phone,
        plan: data.plan ?? "free",
        isActive: true,
    });

    // Initialize per-admin ID counters (VH-00001, L001, etc.) for this new admin
    await initializeCounters(user._id.toString());

    return user;
};

/**
 * SuperAdmin suspends an admin account (soft deactivation — data is preserved).
 */
const suspendAdmin = async (adminId: string): Promise<void> => {
    const admin = await User.findById(adminId);
    if (!admin) throw new NotFoundError("Admin");
    if (admin.role !== "admin") throw new ForbiddenError("Can only suspend admin accounts");

    await User.updateOne({ _id: adminId }, { $set: { isActive: false, isSuspended: true } });
    // Wipe refresh token so the admin is immediately logged out
    await User.updateOne({ _id: adminId }, { $set: { refreshToken: null, refreshTokenFamily: null } });
};

/**
 * SuperAdmin reactivates a suspended admin.
 */
const reactivateAdmin = async (adminId: string): Promise<void> => {
    const admin = await User.findById(adminId);
    if (!admin) throw new NotFoundError("Admin");
    if (admin.role !== "admin") throw new ForbiddenError("Can only reactivate admin accounts");

    await User.updateOne({ _id: adminId }, { $set: { isActive: true, isSuspended: false } });
};

const login = async (data: LoginInput): Promise<{ user: IUser; tokens: TokenPair }> => {
    const user = await User.findOne({
        $or: [{ username: data.usernameOrEmail.toLowerCase() }, { email: data.usernameOrEmail.toLowerCase() }],
    }).select("+passwordHash +refreshToken");

    // SECURITY: Always run bcrypt.compare() even when user not found.
    const passwordToCheck = user ? (user.passwordHash || DUMMY_HASH) : DUMMY_HASH;
    const isValid = await bcrypt.compare(data.password, passwordToCheck);

    if (!user || !isValid) throw new UnauthorizedError("Invalid credentials");

    // Check if admin is suspended (viewers of a suspended admin are also blocked)
    if (user.role === "admin" && !user.isActive) {
        throw new UnauthorizedError("Your account has been suspended. Contact the SuperAdmin.");
    }
    if (user.role === "viewer" && user.adminId) {
        const ownerAdmin = await User.findById(user.adminId).select("isActive");
        if (ownerAdmin && !ownerAdmin.isActive) {
            throw new UnauthorizedError("Your account is unavailable. Contact the administrator.");
        }
    }

    // For viewers, embed their owning adminId into the JWT so resolveAdminScope can read it
    const adminIdForToken = user.role === "viewer" ? user.adminId?.toString() : undefined;
    const tokens = generateTokens(user._id.toString(), user.role, adminIdForToken);

    await User.updateOne(
        { _id: user._id },
        { $set: { refreshToken: tokens.refreshToken, refreshTokenFamily: crypto.randomUUID() } }
    );

    return { user, tokens };
};

const refreshAccessToken = async (refreshToken: string): Promise<TokenPair> => {
    let decoded: { userId: string };
    try {
        decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
    } catch {
        throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const user = await User.findById(decoded.userId).select("+refreshToken +refreshTokenFamily");
    if (!user) {
        throw new UnauthorizedError("User not found");
    }

    // Check suspension during token refresh too
    if (user.role === "admin" && !user.isActive) {
        throw new UnauthorizedError("Account suspended");
    }

    // ── Reuse detection ───────────────────────────────────────────────────────
    if (user.refreshToken !== refreshToken) {
        console.warn(`[Auth] Refresh token reuse detected for userId=${user._id} — wiping session`);
        await User.updateOne(
            { _id: user._id },
            { $set: { refreshToken: null, refreshTokenFamily: null } }
        );
        throw new UnauthorizedError("Refresh token reuse detected. Please log in again.");
    }

    const adminIdForToken = user.role === "viewer" ? user.adminId?.toString() : undefined;
    const newTokens = generateTokens(user._id.toString(), user.role, adminIdForToken);

    await User.updateOne(
        { _id: user._id },
        { $set: { refreshToken: newTokens.refreshToken } }
    );

    return newTokens;
};

const logout = async (userId: string): Promise<void> => {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
};

const logoutByRefreshToken = async (refreshToken: string): Promise<void> => {
    await User.updateOne({ refreshToken }, { $set: { refreshToken: null } });
};

const getMe = async (userId: string): Promise<IUser> => {
    const user = await User.findById(userId).select("-passwordHash -refreshToken");
    if (!user) throw new NotFoundError("User");
    return user;
};

interface UpdateProfileInput {
    username?: string;
    email?: string;
    businessName?: string;
    phone?: string;
}

const updateProfile = async (userId: string, data: UpdateProfileInput): Promise<IUser> => {
    if (data.username || data.email) {
        const orConditions: Array<Record<string, string>> = [];
        if (data.username) orConditions.push({ username: data.username.toLowerCase() });
        if (data.email) orConditions.push({ email: data.email.toLowerCase() });

        const conflict = await User.findOne({
            _id: { $ne: userId },
            $or: orConditions,
        });
        if (conflict) throw new ConflictError("Username or email is already in use");
    }

    const updateData: Record<string, string> = {};
    if (data.username) updateData.username = data.username.toLowerCase();
    if (data.email) updateData.email = data.email.toLowerCase();
    if (data.businessName) updateData.businessName = data.businessName;
    if (data.phone) updateData.phone = data.phone;

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-passwordHash -refreshToken");
    if (!user) throw new NotFoundError("User");
    return user;
};

interface ChangePasswordInput {
    currentPassword: string;
    newPassword: string;
}

const changePassword = async (userId: string, data: ChangePasswordInput): Promise<void> => {
    const user = await User.findById(userId).select("+passwordHash");
    if (!user) throw new NotFoundError("User");

    const isValid = await user.comparePassword(data.currentPassword);
    if (!isValid) throw new UnauthorizedError("Current password is incorrect");

    const newHash = await bcrypt.hash(data.newPassword, 10);
    await User.updateOne({ _id: user._id }, { $set: { passwordHash: newHash } });
};

/**
 * Generate a password reset token, store its hash in DB, and send email.
 * SECURITY: Always returns success to prevent user enumeration.
 */
const forgotPassword = async (email: string): Promise<void> => {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        await new Promise(resolve => setTimeout(resolve, 200 + Math.floor(Math.random() * 200)));
        return;
    }

    const plainToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(plainToken).digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${env.CLIENT_URL}/auth/reset-password?token=${plainToken}`;

    try {
        await sendPasswordResetEmail(user.email, resetUrl);
    } catch (emailError) {
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();
        console.error("Failed to send password reset email:", emailError);
        throw new ApiError(500, "Failed to send reset email. Please try again later.");
    }
};

interface ResetPasswordInput {
    token: string;
    newPassword: string;
}

const resetPassword = async (data: ResetPasswordInput): Promise<void> => {
    const hashedToken = crypto.createHash("sha256").update(data.token).digest("hex");

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires +refreshToken +refreshTokenFamily");

    if (!user) {
        throw new ApiError(400, "Password reset token is invalid or has expired");
    }

    user.passwordHash = await bcrypt.hash(data.newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.refreshToken = null;
    user.refreshTokenFamily = null;
    await user.save();
};

const authService = {
    register,
    registerAdmin,
    suspendAdmin,
    reactivateAdmin,
    login,
    refreshAccessToken,
    logout,
    logoutByRefreshToken,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
};
export default authService;
