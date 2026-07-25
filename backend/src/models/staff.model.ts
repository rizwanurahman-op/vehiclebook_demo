import mongoose, { Schema, Document } from "mongoose";

export interface IStaff extends Document {
    adminId: mongoose.Types.ObjectId;
    staffId: string;
    name: string;
    role: string; // denormalized role name (e.g. "Technician")
    phone?: string;
    monthlySalary: number;
    joiningDate?: Date;
    isActive: boolean;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const staffSchema = new Schema<IStaff>(
    {
        adminId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        staffId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        role: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        monthlySalary: {
            type: Number,
            default: 0,
            min: 0,
        },
        joiningDate: {
            type: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        remarks: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

staffSchema.index({ adminId: 1, name: 1 });
staffSchema.index({ adminId: 1, role: 1 });
staffSchema.index({ adminId: 1, isActive: 1 });
staffSchema.index({ createdAt: -1 });

export const Staff = mongoose.model<IStaff>("Staff", staffSchema);
