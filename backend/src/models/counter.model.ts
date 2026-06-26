import mongoose, { Schema, Document } from "mongoose";

export interface ICounter extends Document {
    name: string;
    adminId: mongoose.Types.ObjectId;
    seq: number;
    prefix: string;
    padding: number;
}

const counterSchema = new Schema<ICounter>({
    name: { type: String, required: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    seq: { type: Number, default: 0 },
    prefix: { type: String, required: true },
    padding: { type: Number, required: true },
});

// Per-admin counter: composite unique key on (name, adminId)
counterSchema.index({ name: 1, adminId: 1 }, { unique: true });

export const Counter = mongoose.model<ICounter>("Counter", counterSchema);
