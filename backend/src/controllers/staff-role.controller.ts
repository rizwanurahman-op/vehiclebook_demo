import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import staffRoleService from "../services/staff-role.service";
import { apiResponse } from "../utils/api-response";

export const listRoles = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const includeInactive = req.query.includeInactive === "true";
        const roles = await staffRoleService.list(req.adminId!, includeInactive);
        res.status(200).json(apiResponse(200, "Staff roles fetched", roles));
    } catch (error) { next(error); }
};

export const createRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const role = await staffRoleService.create(req.body.name as string, req.adminId!);
        res.status(201).json(apiResponse(201, "Staff role created", role));
    } catch (error) { next(error); }
};

export const updateRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const role = await staffRoleService.update(req.params.id as string, req.body, req.adminId!);
        res.status(200).json(apiResponse(200, "Staff role updated", role));
    } catch (error) { next(error); }
};

export const deleteRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        await staffRoleService.remove(req.params.id as string, req.adminId!);
        res.status(200).json(apiResponse(200, "Staff role deleted"));
    } catch (error) { next(error); }
};
