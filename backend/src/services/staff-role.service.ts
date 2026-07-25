import mongoose from "mongoose";
import { StaffRole, IStaffRole } from "../models/staff-role.model";
import { Staff } from "../models/staff.model";
import { NotFoundError, ApiError, ConflictError } from "../utils/api-error";

const list = async (adminId: string, includeInactive = false): Promise<IStaffRole[]> => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const filter: Record<string, unknown> = { adminId: adminOid };
    if (!includeInactive) filter.isActive = true;
    return StaffRole.find(filter).sort({ name: 1 }).lean() as unknown as IStaffRole[];
};

const create = async (name: string, adminId: string): Promise<IStaffRole> => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const existing = await StaffRole.findOne({
        adminId: adminOid,
        name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (existing) throw new ConflictError(`Role "${name}" already exists`);
    return StaffRole.create({ adminId: adminOid, name: name.trim(), isActive: true });
};

const update = async (
    id: string,
    data: { name?: string; isActive?: boolean },
    adminId: string
): Promise<IStaffRole> => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const role = await StaffRole.findOne({ _id: id, adminId: adminOid });
    if (!role) throw new NotFoundError("Staff Role");

    if (data.name && data.name !== role.name) {
        const existing = await StaffRole.findOne({
            adminId: adminOid,
            name: { $regex: `^${data.name.trim()}$`, $options: "i" },
            _id: { $ne: id },
        });
        if (existing) throw new ConflictError(`Role "${data.name}" already exists`);
        // Cascade rename to all staff under this admin
        await Staff.updateMany({ adminId: adminOid, role: role.name }, { role: data.name.trim() });
    }

    const updated = await StaffRole.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!updated) throw new NotFoundError("Staff Role");
    return updated;
};

const remove = async (id: string, adminId: string): Promise<void> => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const role = await StaffRole.findOne({ _id: id, adminId: adminOid });
    if (!role) throw new NotFoundError("Staff Role");

    const usageCount = await Staff.countDocuments({ adminId: adminOid, role: role.name, isActive: true });
    if (usageCount > 0) {
        throw new ApiError(400, `Cannot delete role "${role.name}" — ${usageCount} active staff member(s) are using it`);
    }

    await StaffRole.findByIdAndDelete(id);
};

const staffRoleService = { list, create, update, remove };
export default staffRoleService;
