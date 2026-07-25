import mongoose from "mongoose";
import { Staff, IStaff } from "../models/staff.model";
import counterService from "./counter.service";
import { NotFoundError } from "../utils/api-error";
import { getPagination, buildPaginationMeta } from "../utils/pagination";

interface CreateStaffInput {
    name: string;
    role: string;
    phone?: string;
    monthlySalary?: number;
    joiningDate?: string;
    remarks?: string;
}

interface UpdateStaffInput {
    name?: string;
    role?: string;
    phone?: string;
    monthlySalary?: number;
    joiningDate?: string;
    isActive?: boolean;
    remarks?: string;
}

interface ListStaffQuery {
    page?: string;
    limit?: string;
    role?: string;
    isActive?: string;
    search?: string;
}

const create = async (data: CreateStaffInput, adminId: string): Promise<IStaff> => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const staffId = await counterService.getNextId("staff", adminId);
    return Staff.create({
        ...data,
        adminId: adminOid,
        staffId,
        monthlySalary: data.monthlySalary ?? 0,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
    });
};

const list = async (query: ListStaffQuery, adminId: string) => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const { page, limit, skip } = getPagination(query);
    const filter: Record<string, unknown> = { adminId: adminOid };

    if (query.role) filter.role = query.role;
    if (query.isActive !== undefined) filter.isActive = query.isActive === "true";
    if (query.search) {
        filter.$or = [
            { name: { $regex: query.search, $options: "i" } },
            { staffId: { $regex: query.search, $options: "i" } },
            { phone: { $regex: query.search, $options: "i" } },
            { role: { $regex: query.search, $options: "i" } },
        ];
    }

    const [staff, total] = await Promise.all([
        Staff.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Staff.countDocuments(filter),
    ]);

    return { data: staff, meta: buildPaginationMeta(total, page, limit) };
};

const getById = async (id: string, adminId: string): Promise<IStaff> => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const staff = await Staff.findOne({ _id: id, adminId: adminOid });
    if (!staff) throw new NotFoundError("Staff");
    return staff;
};

const update = async (id: string, data: UpdateStaffInput, adminId: string): Promise<IStaff> => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const updateData = {
        ...data,
        ...(data.joiningDate ? { joiningDate: new Date(data.joiningDate) } : {}),
    };
    const staff = await Staff.findOneAndUpdate(
        { _id: id, adminId: adminOid },
        updateData,
        { new: true, runValidators: true }
    );
    if (!staff) throw new NotFoundError("Staff");
    return staff;
};

const remove = async (id: string, adminId: string): Promise<void> => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const staff = await Staff.findOneAndUpdate(
        { _id: id, adminId: adminOid },
        { isActive: false },
        { new: true }
    );
    if (!staff) throw new NotFoundError("Staff");
};

const restore = async (id: string, adminId: string): Promise<IStaff> => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const staff = await Staff.findOneAndUpdate(
        { _id: id, adminId: adminOid },
        { isActive: true },
        { new: true }
    );
    if (!staff) throw new NotFoundError("Staff");
    return staff;
};

const getStats = async (adminId: string) => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const [total, active, salaryAgg] = await Promise.all([
        Staff.countDocuments({ adminId: adminOid }),
        Staff.countDocuments({ adminId: adminOid, isActive: true }),
        Staff.aggregate([
            { $match: { adminId: adminOid, isActive: true } },
            { $group: { _id: null, totalMonthlyPayroll: { $sum: "$monthlySalary" } } },
        ]),
    ]);
    const totalMonthlyPayroll = salaryAgg[0]?.totalMonthlyPayroll ?? 0;
    return { total, active, totalMonthlyPayroll };
};

const staffService = { create, list, getById, update, remove, restore, getStats };
export default staffService;
