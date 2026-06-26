import mongoose from "mongoose";
import { Lender, ILender } from "../models/lender.model";
import { Investment } from "../models/investment.model";
import { Repayment } from "../models/repayment.model";
import counterService from "./counter.service";
import { NotFoundError } from "../utils/api-error";
import { getPagination, buildPaginationMeta } from "../utils/pagination";

interface CreateLenderInput {
    name: string;
    phone?: string;
    address?: string;
    remarks?: string;
}

interface UpdateLenderInput {
    name?: string;
    phone?: string;
    address?: string;
    remarks?: string;
    isActive?: boolean;
}

interface ListLendersQuery {
    page?: string;
    limit?: string;
    search?: string;
    status?: "active" | "inactive" | "all";
}

const create = async (data: CreateLenderInput, adminId: string): Promise<ILender> => {
    const lenderId = await counterService.getNextId("lender", adminId);
    return await Lender.create({ ...data, lenderId, adminId: new mongoose.Types.ObjectId(adminId) });
};

const list = async (query: ListLendersQuery, adminId: string) => {
    const { page, limit, skip } = getPagination(query);
    const filter: Record<string, unknown> = { adminId: new mongoose.Types.ObjectId(adminId) };

    if (query.status === "active") filter.isActive = true;
    else if (query.status === "inactive") filter.isActive = false;
    else filter.isActive = { $ne: false };

    if (query.status === "all") delete filter.isActive;

    if (query.search) {
        filter.$or = [
            { name: { $regex: query.search, $options: "i" } },
            { lenderId: { $regex: query.search, $options: "i" } },
            { phone: { $regex: query.search, $options: "i" } },
        ];
    }

    const [lenders, total] = await Promise.all([
        Lender.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Lender.countDocuments(filter),
    ]);

    const lenderIds = lenders.map(l => l._id);
    const [investmentAggs, principalAggs, profitAggs] = await Promise.all([
        Investment.aggregate([
            { $match: { adminId: new mongoose.Types.ObjectId(adminId), lender: { $in: lenderIds } } },
            { $group: { _id: "$lender", totalBorrowed: { $sum: "$amountReceived" } } },
        ]),
        Repayment.aggregate([
            { $match: { adminId: new mongoose.Types.ObjectId(adminId), lender: { $in: lenderIds }, repaymentType: { $in: ["Principal", null, undefined] } } },
            { $group: { _id: "$lender", totalRepaid: { $sum: "$amountPaid" } } },
        ]),
        Repayment.aggregate([
            { $match: { adminId: new mongoose.Types.ObjectId(adminId), lender: { $in: lenderIds }, repaymentType: "Profit" } },
            { $group: { _id: "$lender", totalProfit: { $sum: "$amountPaid" } } },
        ]),
    ]);

    const investMap = new Map(investmentAggs.map(a => [a._id.toString(), a.totalBorrowed]));
    const repayMap = new Map(principalAggs.map(a => [a._id.toString(), a.totalRepaid]));
    const profitMap = new Map(profitAggs.map(a => [a._id.toString(), a.totalProfit]));

    const enriched = lenders.map(l => {
        const totalBorrowed = investMap.get(l._id.toString()) ?? 0;
        const totalRepaid = repayMap.get(l._id.toString()) ?? 0;
        const totalProfit = profitMap.get(l._id.toString()) ?? 0;
        return { ...l, totalBorrowed, totalRepaid, totalProfit, balancePayable: totalBorrowed - totalRepaid };
    });

    return { data: enriched, meta: buildPaginationMeta(total, page, limit) };
};

const getById = async (id: string, adminId: string) => {
    const lender = await Lender.findOne({ _id: id, adminId: new mongoose.Types.ObjectId(adminId) }).lean();
    if (!lender) throw new NotFoundError("Lender");

    const adminOid = new mongoose.Types.ObjectId(adminId);
    const [investAgg, principalAgg, profitAgg] = await Promise.all([
        Investment.aggregate([
            { $match: { adminId: adminOid, lender: lender._id } },
            { $group: { _id: null, totalBorrowed: { $sum: "$amountReceived" } } },
        ]),
        Repayment.aggregate([
            { $match: { adminId: adminOid, lender: lender._id, repaymentType: { $in: ["Principal", null] } } },
            { $group: { _id: null, totalRepaid: { $sum: "$amountPaid" } } },
        ]),
        Repayment.aggregate([
            { $match: { adminId: adminOid, lender: lender._id, repaymentType: "Profit" } },
            { $group: { _id: null, totalProfit: { $sum: "$amountPaid" } } },
        ]),
    ]);

    const totalBorrowed = investAgg[0]?.totalBorrowed ?? 0;
    const totalRepaid = principalAgg[0]?.totalRepaid ?? 0;
    const totalProfit = profitAgg[0]?.totalProfit ?? 0;

    return { ...lender, totalBorrowed, totalRepaid, totalProfit, balancePayable: totalBorrowed - totalRepaid };
};

const update = async (id: string, data: UpdateLenderInput, adminId: string): Promise<ILender> => {
    const lender = await Lender.findOneAndUpdate(
        { _id: id, adminId: new mongoose.Types.ObjectId(adminId) },
        data,
        { new: true, runValidators: true }
    );
    if (!lender) throw new NotFoundError("Lender");
    return lender;
};

const softDelete = async (id: string, adminId: string): Promise<ILender> => {
    const lender = await Lender.findOneAndUpdate(
        { _id: id, adminId: new mongoose.Types.ObjectId(adminId) },
        { isActive: false },
        { new: true }
    );
    if (!lender) throw new NotFoundError("Lender");
    return lender;
};

const restore = async (id: string, adminId: string): Promise<ILender> => {
    const lender = await Lender.findOneAndUpdate(
        { _id: id, adminId: new mongoose.Types.ObjectId(adminId) },
        { isActive: true },
        { new: true }
    );
    if (!lender) throw new NotFoundError("Lender");
    return lender;
};

const hardDelete = async (id: string, adminId: string): Promise<void> => {
    const lender = await Lender.findOneAndDelete({ _id: id, adminId: new mongoose.Types.ObjectId(adminId) });
    if (!lender) throw new NotFoundError("Lender");
};

const exportAll = async (adminId: string, query: { status?: string; search?: string; dateFrom?: string; dateTo?: string } = {}) => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const filter: Record<string, unknown> = { adminId: adminOid };
    if (query.status === "active") filter.isActive = true;
    else if (query.status === "inactive") filter.isActive = false;

    if (query.search) {
        filter.$or = [
            { name: { $regex: query.search, $options: "i" } },
            { lenderId: { $regex: query.search, $options: "i" } },
            { phone: { $regex: query.search, $options: "i" } },
        ];
    }

    const txDateFilter: Record<string, Date> = {};
    if (query.dateFrom) txDateFilter.$gte = new Date(query.dateFrom);
    if (query.dateTo) txDateFilter.$lte = new Date(new Date(query.dateTo).setHours(23, 59, 59, 999));
    const hasDateFilter = Object.keys(txDateFilter).length > 0;

    const lenders = await Lender.find(filter).sort({ createdAt: -1 }).lean();
    const lenderIds = lenders.map(l => l._id);

    const investMatch: Record<string, unknown> = { adminId: adminOid, lender: { $in: lenderIds } };
    const repayMatch: Record<string, unknown> = { adminId: adminOid, lender: { $in: lenderIds } };
    if (hasDateFilter) { investMatch.date = txDateFilter; repayMatch.date = txDateFilter; }

    const [investAggs, principalAggs, profitAggs] = await Promise.all([
        Investment.aggregate([{ $match: investMatch }, { $group: { _id: "$lender", totalBorrowed: { $sum: "$amountReceived" } } }]),
        Repayment.aggregate([{ $match: { ...repayMatch, repaymentType: { $in: ["Principal", null] } } }, { $group: { _id: "$lender", totalRepaid: { $sum: "$amountPaid" } } }]),
        Repayment.aggregate([{ $match: { ...repayMatch, repaymentType: "Profit" } }, { $group: { _id: "$lender", totalProfit: { $sum: "$amountPaid" } } }]),
    ]);

    const investMap = new Map(investAggs.map(a => [a._id.toString(), a.totalBorrowed]));
    const repayMap = new Map(principalAggs.map(a => [a._id.toString(), a.totalRepaid]));
    const profitMap = new Map(profitAggs.map(a => [a._id.toString(), a.totalProfit]));

    return lenders.map(l => {
        const totalBorrowed = investMap.get(l._id.toString()) ?? 0;
        const totalRepaid = repayMap.get(l._id.toString()) ?? 0;
        const totalProfit = profitMap.get(l._id.toString()) ?? 0;
        const balancePayable = totalBorrowed - totalRepaid;
        return {
            lenderId: l.lenderId, name: l.name, phone: l.phone || "", address: l.address || "",
            remarks: l.remarks || "", totalBorrowed, totalRepaid, totalProfit, balancePayable,
            isActive: l.isActive,
            "Lender ID": l.lenderId, "Name": l.name, "Phone": l.phone || "", "Address": l.address || "",
            "Remarks": l.remarks || "", "Total Borrowed (Rs.)": totalBorrowed,
            "Total Repaid (Rs.)": totalRepaid, "Total Profit Paid (Rs.)": totalProfit,
            "Balance Payable (Rs.)": balancePayable, "Status": l.isActive !== false ? "Active" : "Inactive",
        };
    });
};

const getStats = async (adminId: string, query: { status?: string; search?: string; dateFrom?: string; dateTo?: string } = {}) => {
    const adminOid = new mongoose.Types.ObjectId(adminId);
    const lenderFilter: Record<string, unknown> = { adminId: adminOid };
    if (query.status === "active") lenderFilter.isActive = true;
    else if (query.status === "inactive") lenderFilter.isActive = false;
    if (query.search) {
        lenderFilter.$or = [
            { name: { $regex: query.search, $options: "i" } },
            { lenderId: { $regex: query.search, $options: "i" } },
            { phone: { $regex: query.search, $options: "i" } },
        ];
    }

    const txDateFilter: Record<string, Date> = {};
    if (query.dateFrom) txDateFilter.$gte = new Date(query.dateFrom);
    if (query.dateTo) txDateFilter.$lte = new Date(new Date(query.dateTo).setHours(23, 59, 59, 999));

    const lenders = await Lender.find(lenderFilter).lean();
    const lenderIds = lenders.map(l => l._id);

    const investMatch: Record<string, unknown> = { adminId: adminOid, lender: { $in: lenderIds } };
    const repayMatch: Record<string, unknown> = { adminId: adminOid, lender: { $in: lenderIds } };
    if (Object.keys(txDateFilter).length) { investMatch.date = txDateFilter; repayMatch.date = txDateFilter; }

    const [investAggs, principalAggs, profitAggs] = await Promise.all([
        Investment.aggregate([{ $match: investMatch }, { $group: { _id: "$lender", totalBorrowed: { $sum: "$amountReceived" } } }]),
        Repayment.aggregate([{ $match: { ...repayMatch, repaymentType: { $in: ["Principal", null] } } }, { $group: { _id: "$lender", totalRepaid: { $sum: "$amountPaid" } } }]),
        Repayment.aggregate([{ $match: { ...repayMatch, repaymentType: "Profit" } }, { $group: { _id: "$lender", totalProfit: { $sum: "$amountPaid" } } }]),
    ]);

    const investMap = new Map(investAggs.map(a => [a._id.toString(), a.totalBorrowed]));
    const repayMap = new Map(principalAggs.map(a => [a._id.toString(), a.totalRepaid]));
    const profitMap = new Map(profitAggs.map(a => [a._id.toString(), a.totalProfit]));

    const enriched = lenders.map(l => ({
        ...l,
        totalBorrowed: investMap.get(l._id.toString()) ?? 0,
        totalRepaid: repayMap.get(l._id.toString()) ?? 0,
        totalProfit: profitMap.get(l._id.toString()) ?? 0,
        balancePayable: (investMap.get(l._id.toString()) ?? 0) - (repayMap.get(l._id.toString()) ?? 0),
    }));

    const totalBorrowed = enriched.reduce((s, l) => s + l.totalBorrowed, 0);
    const totalRepaid = enriched.reduce((s, l) => s + l.totalRepaid, 0);
    const totalProfit = enriched.reduce((s, l) => s + l.totalProfit, 0);
    const balancePayable = enriched.reduce((s, l) => s + l.balancePayable, 0);
    const activeCount = lenders.filter(l => l.isActive !== false).length;
    const inactiveCount = lenders.length - activeCount;
    const paidOffCount = enriched.filter(l => l.balancePayable <= 0).length;
    return { totalLenders: lenders.length, totalBorrowed, totalRepaid, totalProfit, balancePayable, activeCount, inactiveCount, paidOffCount };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lenderService: Record<string, (...args: any[]) => any> = { create, list, getById, update, softDelete, restore, hardDelete, exportAll, getStats };
export default lenderService;
