import mongoose, { Schema, Document } from "mongoose";

export interface IStaffRole extends Document {
    adminId: mongoose.Types.ObjectId;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const staffRoleSchema = new Schema<IStaffRole>(
    {
        adminId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Per-admin uniqueness: same role name can exist under different admins
staffRoleSchema.index({ adminId: 1, name: 1 }, { unique: true });
staffRoleSchema.index({ adminId: 1, isActive: 1 });

export const StaffRole = mongoose.model<IStaffRole>("StaffRole", staffRoleSchema);
