import { Vehicle } from "../models/vehicle.model";
import { ConsignmentVehicle } from "../models/consignment-vehicle.model";

export interface UnifiedSaleRecord {
    _id: string;
    source: "vehicle" | "consignment";
    refId: string;           // VH-xxxxx or CS-xxxxx
    saleType?: string;       // park_sale | finance_sale (consignments only)
    vehicleType: string;
    make: string;
    model: string;
    registrationNo: string;
    dateSold: Date | null;
    soldTo: string;
    soldToPhone?: string;
    soldPrice: number;
    totalInvestment: number;
    receivedAmount: number;
    balanceAmount: number;
    profitLoss: number;
    profitLossPercentage: number;
    saleStatus: string;      // fully_received | balance_pending | cashback_pending | etc.
    nocStatus?: string;      // vehicle only
    isExchange: boolean;
    isFromExchange: boolean;
    daysToSell: number | null;
    // Cash-back (over-trade: exchange value > sold price)
    buyerCashBackDue: number;
    buyerCashBackBalance: number;
}

export interface SalesStats {
    totalSales: number;
    totalRevenue: number;
    totalReceived: number;
    totalBalance: number;
    totalProfit: number;
    pendingCount: number;
    cashbackCount: number;      // sales where shop owes buyer cash-back
    totalCashbackOwed: number;  // total cash-back still owed to buyers
    exchangeCount: number;
    vehicleSales: number;
    consignmentSales: number;
}

interface SalesQuery {
    source?: string;       // "vehicle" | "consignment" | ""
    saleStatus?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    isExchange?: string;
    page?: number;
    limit?: number;
}

export const getSales = async (query: SalesQuery, adminId: string) => {
    const { source, saleStatus, search, dateFrom, dateTo, isExchange, page = 1, limit = 20 } = query;
    const adminOid = new (await import("mongoose")).Types.ObjectId(adminId);

    const records: UnifiedSaleRecord[] = [];

    // ── Phase 2: Vehicles ─────────────────────────────────────
    if (!source || source === "vehicle") {
        const vMatch: Record<string, unknown> = {
            isActive: true,
            adminId: adminOid,
            status: { $in: ["sold", "sold_pending"] },
        };

        if (saleStatus && saleStatus !== "all") {
            vMatch.saleStatus = saleStatus;
        }
        if (search) {
            const trimmed = search.trim();
            if (trimmed) {
                const words = trimmed.split(/\s+/);
                const escWord = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                if (words.length === 1) {
                    const re = new RegExp(escWord(words[0]), "i");
                    vMatch.$or = [
                        { make: re }, { model: re }, { registrationNo: re },
                        { soldTo: re }, { vehicleId: re },
                    ];
                } else {
                    vMatch.$and = words.map((w) => {
                        const re = new RegExp(escWord(w), "i");
                        return { $or: [{ make: re }, { model: re }] };
                    });
                }
            }
        }
        if (dateFrom || dateTo) {
            const df: Record<string, Date> = {};
            if (dateFrom) df.$gte = new Date(dateFrom);
            if (dateTo) df.$lte = new Date(dateTo);
            vMatch.dateSold = df;
        }
        if (isExchange === "true") vMatch.isExchange = true;

        const vehicles = await Vehicle.find(vMatch)
            .select("vehicleId vehicleType make model registrationNo dateSold soldTo soldToPhone soldPrice totalInvestment receivedAmount balanceAmount profitLoss profitLossPercentage saleStatus nocStatus isExchange isFromExchange daysToSell buyerCashBackDue buyerCashBackBalance")
            .sort({ dateSold: -1 })
            .lean();

        for (const v of vehicles) {
            records.push({
                _id: (v._id as { toString(): string }).toString(),
                source: "vehicle",
                refId: v.vehicleId,
                vehicleType: v.vehicleType,
                make: v.make,
                model: v.model,
                registrationNo: v.registrationNo,
                dateSold: v.dateSold || null,
                soldTo: v.soldTo || "—",
                soldToPhone: v.soldToPhone,
                soldPrice: v.soldPrice || 0,
                totalInvestment: v.totalInvestment,
                receivedAmount: v.receivedAmount,
                balanceAmount: v.balanceAmount,
                profitLoss: v.profitLoss,
                profitLossPercentage: v.profitLossPercentage,
                saleStatus: v.saleStatus || "pending",
                nocStatus: v.nocStatus,
                isExchange: v.isExchange || false,
                isFromExchange: v.isFromExchange || false,
                daysToSell: v.daysToSell ?? null,
                buyerCashBackDue: (v as any).buyerCashBackDue || 0,
                buyerCashBackBalance: (v as any).buyerCashBackBalance || 0,
            });
        }
    }

    // ── Phase 3: Consignments ─────────────────────────────────
    if (!source || source === "consignment") {
        const cMatch: Record<string, unknown> = {
            isActive: true,
            adminId: adminOid,
            status: { $in: ["sold", "sold_pending"] },
        };

        if (saleStatus && saleStatus !== "all") {
            // Map vehicle sale status names to consignment equivalents
            const statusMap: Record<string, string> = {
                fully_received: "fully_closed",
                balance_pending: "partial",
            };
            cMatch.settlementStatus = statusMap[saleStatus] || saleStatus;
        }
        if (search) {
            const trimmed = search.trim();
            if (trimmed) {
                const words = trimmed.split(/\s+/);
                const escWord = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                if (words.length === 1) {
                    const re = new RegExp(escWord(words[0]), "i");
                    cMatch.$or = [
                        { make: re }, { model: re }, { registrationNo: re },
                        { soldTo: re }, { consignmentId: re },
                    ];
                } else {
                    cMatch.$and = words.map((w) => {
                        const re = new RegExp(escWord(w), "i");
                        return { $or: [{ make: re }, { model: re }] };
                    });
                }
            }
        }
        if (dateFrom || dateTo) {
            const df: Record<string, Date> = {};
            if (dateFrom) df.$gte = new Date(dateFrom);
            if (dateTo) df.$lte = new Date(dateTo);
            cMatch.dateSold = df;
        }
        if (isExchange === "true") cMatch.isExchange = true;

        const consignments = await ConsignmentVehicle.find(cMatch)
            .select("consignmentId saleType vehicleType make model registrationNo dateSold soldTo soldToPhone soldPrice totalInvestment receivedAmount buyerBalance buyerCashBackDue buyerCashBackBalance netProfit profitLossPercentage settlementStatus isExchange isFromExchange daysInShop")
            .sort({ dateSold: -1 })
            .lean();

        for (const c of consignments) {
            const balance = c.buyerBalance ?? 0;
            const received = c.receivedAmount ?? 0;
            const cashBackDue = (c as any).buyerCashBackDue || 0;
            const cashBackBalance = (c as any).buyerCashBackBalance || 0;

            // Map consignment settlement to unified saleStatus label
            let saleStatus = "pending";
            if (c.settlementStatus === "fully_closed") saleStatus = "fully_received";
            else if (cashBackBalance > 0) saleStatus = "cashback_pending";
            else if (c.settlementStatus === "open") saleStatus = "balance_pending";

            records.push({
                _id: (c._id as { toString(): string }).toString(),
                source: "consignment",
                refId: c.consignmentId,
                saleType: c.saleType,
                vehicleType: c.vehicleType,
                make: c.make,
                model: c.model,
                registrationNo: c.registrationNo,
                dateSold: c.dateSold || null,
                soldTo: c.soldTo || "—",
                soldToPhone: c.soldToPhone,
                soldPrice: c.soldPrice || 0,
                totalInvestment: c.totalInvestment,
                receivedAmount: received,
                balanceAmount: balance,
                profitLoss: c.netProfit || 0,
                profitLossPercentage: c.profitLossPercentage || 0,
                saleStatus,
                isExchange: c.isExchange || false,
                isFromExchange: c.isFromExchange || false,
                daysToSell: c.daysInShop ?? null,
                buyerCashBackDue: cashBackDue,
                buyerCashBackBalance: cashBackBalance,
            });
        }
    }

    // Sort all records by date descending
    records.sort((a, b) => {
        const da = a.dateSold ? new Date(a.dateSold).getTime() : 0;
        const db = b.dateSold ? new Date(b.dateSold).getTime() : 0;
        return db - da;
    });

    // Stats across ALL results (pre-pagination)
    const stats: SalesStats = {
        totalSales: records.length,
        totalRevenue: records.reduce((s, r) => s + r.soldPrice, 0),
        // totalReceived: cap per-record at soldPrice to avoid over-counting exchange surplus in summary
        totalReceived: records.reduce((s, r) => s + Math.min(r.receivedAmount, r.soldPrice), 0),
        totalBalance: records.reduce((s, r) => s + r.balanceAmount, 0),
        totalProfit: records.reduce((s, r) => s + r.profitLoss, 0),
        pendingCount: records.filter(r => r.balanceAmount > 0).length,
        cashbackCount: records.filter(r => r.buyerCashBackBalance > 0).length,
        totalCashbackOwed: records.reduce((s, r) => s + (r.buyerCashBackBalance || 0), 0),
        exchangeCount: records.filter(r => r.isExchange).length,
        vehicleSales: records.filter(r => r.source === "vehicle").length,
        consignmentSales: records.filter(r => r.source === "consignment").length,
    };

    // Paginate
    const total = records.length;
    const skip = (page - 1) * limit;
    const paged = records.slice(skip, skip + limit);

    return {
        data: paged,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats,
    };
};
