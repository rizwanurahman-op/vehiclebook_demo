import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError, ForbiddenError } from "../utils/api-error";

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
        adminId?: string; // effective adminId decoded from JWT (set for viewers)
    };
    /** Resolved admin scope — used by all data controllers */
    adminId?: string;
}

/**
 * Authenticate middleware.
 *
 * Token resolution order:
 *  1. Authorization: Bearer <token>  ← primary (used by axios interceptor)
 *  2. vb_access_token cookie         ← fallback (httpOnly cookie set by backend on login/refresh)
 *
 * This dual-source approach means:
 * - Client-side API calls use the Authorization header (token in Zustand memory)
 * - Next.js middleware reads the httpOnly cookie (JS-inaccessible, XSS-safe)
 * - Both paths verify the SAME JWT with the SAME secret
 */
export const authenticate = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    let token: string | undefined;

    // 1. Try Authorization header first (preferred for API calls)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    }

    // 2. Fallback: httpOnly cookie (used by server-side renders & when header is absent)
    if (!token) {
        token = req.cookies?.vb_access_token;
    }

    if (!token) {
        throw new UnauthorizedError("No token provided");
    }

    try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
            userId: string;
            role: string;
            adminId?: string;
        };
        req.user = decoded;
        next();
    } catch {
        throw new UnauthorizedError("Invalid or expired token");
    }
};

/**
 * Checks that the requesting user is an admin (not viewer or superadmin-only route).
 */
export const isAdmin = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (req.user?.role !== "admin") {
        throw new UnauthorizedError("Admin access required");
    }
    next();
};

/**
 * Checks that the requesting user is a superadmin.
 */
export const isSuperAdmin = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (req.user?.role !== "superadmin") {
        throw new ForbiddenError("SuperAdmin access required");
    }
    next();
};

/**
 * Allows both admin and superadmin roles.
 */
export const isAdminOrSuperAdmin = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    const role = req.user?.role;
    if (role !== "admin" && role !== "superadmin") {
        throw new UnauthorizedError("Admin access required");
    }
    next();
};

/**
 * Resolves the effective adminId for data scoping and attaches it to req.adminId.
 *
 * Resolution logic:
 *   - superadmin:  reads adminId from query/param (for superadmin-scoped APIs)
 *   - admin:       req.user.userId IS the adminId
 *   - viewer:      req.user.adminId (embedded in JWT at login time)
 *
 * Must be called AFTER authenticate().
 * Throws 400 if superadmin does not supply an adminId via query/param.
 */
export const resolveAdminScope = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    const { role, userId, adminId: jwtAdminId } = req.user!;

    if (role === "admin") {
        req.adminId = userId;
    } else if (role === "viewer") {
        if (!jwtAdminId) throw new UnauthorizedError("Viewer token missing adminId — please log in again");
        req.adminId = jwtAdminId;
    } else if (role === "superadmin") {
        // Superadmin can pass adminId as query param or route param for scoped calls
        const scopedAdminId = (req.query.adminId as string) || (req.params.adminId as string);
        if (!scopedAdminId) throw new ForbiddenError("SuperAdmin must supply adminId to scope this request");
        req.adminId = scopedAdminId;
    } else {
        throw new UnauthorizedError("Unknown role");
    }

    next();
};
