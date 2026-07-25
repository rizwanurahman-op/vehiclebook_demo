import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import staffService from "../services/staff.service";
import { apiResponse } from "../utils/api-response";

export const createStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const staff = await staffService.create(req.body, req.adminId!);
        res.status(201).json(apiResponse(201, "Staff member created successfully", staff));
    } catch (error) { next(error); }
};

export const listStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, meta } = await staffService.list(req.query as Record<string, string>, req.adminId!);
        res.status(200).json(apiResponse(200, "Staff fetched successfully", data, meta));
    } catch (error) { next(error); }
};

export const getStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const staff = await staffService.getById(req.params.id as string, req.adminId!);
        res.status(200).json(apiResponse(200, "Staff fetched successfully", staff));
    } catch (error) { next(error); }
};

export const updateStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const staff = await staffService.update(req.params.id as string, req.body, req.adminId!);
        res.status(200).json(apiResponse(200, "Staff updated successfully", staff));
    } catch (error) { next(error); }
};

export const deleteStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        await staffService.remove(req.params.id as string, req.adminId!);
        res.status(200).json(apiResponse(200, "Staff deactivated successfully"));
    } catch (error) { next(error); }
};

export const restoreStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const staff = await staffService.restore(req.params.id as string, req.adminId!);
        res.status(200).json(apiResponse(200, "Staff member restored successfully", staff));
    } catch (error) { next(error); }
};

export const getStaffStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const stats = await staffService.getStats(req.adminId!);
        res.status(200).json(apiResponse(200, "Staff stats fetched", stats));
    } catch (error) { next(error); }
};
