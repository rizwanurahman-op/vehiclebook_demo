import { ConsignmentVehicle } from "../models/consignment-vehicle.model";

// ── Consignment List Exports ──────────────────────────────────────────────────

export interface ConsignmentListExportQuery {
    saleType?: string;
    vehicleType?: string;
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    format?: string;
}

const dINR = (n: number | null | undefined) =>
    n == null ? "—" : `Rs. ${Math.abs(n).toLocaleString("en-IN")}`;

const dFmt = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const dSl = (s: string | null | undefined) =>
    s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

const trunc = (s: string | null | undefined, max: number): string => {
    if (!s) return "—";
    return s.length > max ? s.slice(0, max - 1) + "." : s;
};

// ── Build MongoDB filter ──────────────────────────────────────────────────────
const buildFilter = (query: ConsignmentListExportQuery, adminId: string): Record<string, unknown> => {
    const { saleType, vehicleType, status, search, dateFrom, dateTo } = query;
    const mongoose = require("mongoose");
    const filter: Record<string, unknown> = { isActive: true, adminId: new mongoose.Types.ObjectId(adminId) };
    if (saleType) filter.saleType = saleType;
    if (vehicleType) filter.vehicleType = vehicleType;
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
        const df: Record<string, Date> = {};
        if (dateFrom) df.$gte = new Date(dateFrom);
        if (dateTo) df.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
        filter.dateReceived = df;
    }
    if (search) {
        const trimmed = search.trim();
        if (trimmed) {
            const re = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [
                { make: re }, { model: re }, { registrationNo: re },
                { consignmentId: re }, { previousOwner: re }, { soldTo: re },
            ];
        }
    }
    return filter;
};

// ── CSV Export ───────────────────────────────────────────────────────────────
export const exportConsignmentsCSV = async (query: ConsignmentListExportQuery, adminId: string): Promise<string> => {
    const filter = buildFilter(query, adminId);
    const vehicles = await ConsignmentVehicle.find(filter).sort({ dateReceived: -1 }).lean();

    const esc = (x: unknown) => {
        const s = String(x ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = [
        "Consignment ID", "Sale Type", "Vehicle Type", "Make", "Model", "Year",
        "Registration No", "Previous Owner", "Date Received",
        "Purchase Price", "Recon Cost", "Total Investment",
        "Status", "Settlement Status",
        "Date Sold", "Sold To", "Sold Price",
        "Net Profit", "P/L %",
        "Days in Shop", "From Exchange",
    ];

    const rows = vehicles.map((v) => [
        v.consignmentId,
        v.saleType === "park_sale" ? "Park Sale" : "Finance Sale",
        v.vehicleType === "two_wheeler" ? "Two Wheeler" : "Four Wheeler",
        v.make,
        v.model,
        v.year ?? "",
        v.registrationNo,
        v.previousOwner,
        dFmt(v.dateReceived),
        v.purchasePrice ?? "",
        v.totalReconCost ?? "",
        v.totalInvestment,
        dSl(v.status),
        dSl(v.settlementStatus),
        dFmt((v as any).dateSold),
        (v as any).soldTo ?? "",
        (v as any).soldPrice ?? "",
        (v as any).netProfit ?? "",
        (v as any).profitLossPercentage != null ? (v as any).profitLossPercentage.toFixed(1) + "%" : "",
        v.daysInShop != null ? v.daysInShop : "",
        (v as any).isFromExchange ? "Yes" : "No",
    ].map(esc).join(","));

    return [headers.map(esc).join(","), ...rows].join("\r\n");
};

// ── PDF Export ───────────────────────────────────────────────────────────────
export const exportConsignmentsPDF = async (
    query: ConsignmentListExportQuery,
    adminId: string,
    stats?: any
): Promise<Buffer> => {
    const filter = buildFilter(query, adminId);
    const vehicles = await ConsignmentVehicle.find(filter).sort({ dateReceived: -1 }).lean();

    const PDFDocument = (await import("pdfkit")).default;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 0, size: "A4", layout: "landscape", bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on("data", (c: Buffer) => chunks.push(c));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const PW = doc.page.width;
        const PH = doc.page.height;
        const MG = 28;
        const CW = PW - MG * 2;

        const C = {
            navy: "#0f172a", indigo: "#6366f1", green: "#16a34a",
            red: "#dc2626", amber: "#d97706", slate: "#64748b",
            violet: "#7c3aed", blue: "#2563eb",
            white: "#ffffff", border: "#e2e8f0", light: "#f8fafc",
            text: "#1e293b", muted: "#94a3b8",
        };

        const addFooter = () => {
            doc.moveTo(MG, PH - 18).lineTo(PW - MG, PH - 18)
                .strokeColor(C.border).lineWidth(0.5).stroke();
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text("VehicleBook -- Confidential. For internal use only.", MG, PH - 12, { lineBreak: false });
        };

        let Y = 0;

        const need = (h: number, redrawHeaderFn?: () => void) => {
            if (Y + h > PH - 30) {
                addFooter();
                doc.addPage({ margin: 0, size: "A4", layout: "landscape" });
                Y = MG;
                if (redrawHeaderFn) redrawHeaderFn();
            }
        };

        // ── HEADER ──────────────────────────────────────────────────────
        doc.rect(0, 0, PW, 52).fill(C.navy);
        doc.rect(0, 48, PW, 4).fill(C.indigo);
        doc.fontSize(18).font("Helvetica-Bold").fillColor(C.white).text("VehicleBook", MG, 10, { lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted).text("Inventory Management System", MG, 31, { lineBreak: false });

        const labelParts: string[] = ["Consignment Inventory Report"];
        if (query.saleType) labelParts.push(query.saleType === "park_sale" ? "· Park Sale" : "· Finance Sale");
        if (query.vehicleType) labelParts.push(query.vehicleType === "two_wheeler" ? "· Two Wheelers" : "· Four Wheelers");
        if (query.status) labelParts.push(`· ${dSl(query.status)}`);
        if (query.dateFrom || query.dateTo) {
            const range = [query.dateFrom && dFmt(query.dateFrom), query.dateTo && dFmt(query.dateTo)].filter(Boolean).join(" – ");
            labelParts.push(`· ${range}`);
        }
        doc.fontSize(12).font("Helvetica-Bold").fillColor(C.white)
            .text(labelParts.join(" "), MG, 11, { width: CW, align: "right", lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
            .text(
                `Generated: ${new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}  ·  ${vehicles.length} records`,
                MG, 29, { width: CW, align: "right", lineBreak: false },
            );

        Y = 56;

        // ── SUMMARY DASHBOARD (Matching UI Row 1, 2, 3) ────────────────
        if (stats) {
            const totalCount = stats.totalVehicles ?? vehicles.length;
            const inShop = stats.currentlyInShop ?? 0;
            const sold = stats.sold ?? 0;
            const reconCost = stats.totalReconCost ?? 0;
            const revenue = stats.totalRevenue ?? 0;
            const netProfit = stats.totalNetProfit ?? 0;
            const ps = stats.parkSale;
            const fs = stats.financeSale;

            // Row 1: 6 Summary cards
            const mW6 = CW / 6;
            const sH = 40;
            const row1Cards = [
                { label: "TOTAL",       value: String(totalCount), sub: `${ps?.total ?? 0} park · ${fs?.total ?? 0} finance`, accent: C.slate },
                { label: "IN SHOP",     value: String(inShop),     sub: `${ps?.inShop ?? 0} park · ${fs?.inShop ?? 0} finance`, accent: inShop > 0 ? C.amber : C.green },
                { label: "SOLD",        value: String(sold),       sub: `${ps?.sold ?? 0} park · ${fs?.sold ?? 0} finance`, accent: C.green },
                { label: "RECON SPENT", value: dINR(reconCost),   sub: "Workshop, parts, etc.", accent: C.indigo },
                { label: "TOTAL REVENUE", value: dINR(revenue),   sub: `From ${sold} sold vehicles`, accent: C.blue },
                { label: "NET PROFIT",  value: (netProfit >= 0 ? "+" : "") + dINR(netProfit), sub: `Avg margin: ${stats.avgMargin ?? 0}%`, accent: netProfit >= 0 ? C.green : C.red },
            ];

            row1Cards.forEach((m, i) => {
                const mx = MG + i * mW6;
                doc.rect(mx, Y, mW6 - 2, sH).fill(C.light).strokeColor(m.accent + "40").lineWidth(0.5).stroke();
                doc.rect(mx, Y, 3, sH).fill(m.accent);
                doc.fontSize(5.5).font("Helvetica-Bold").fillColor(m.accent)
                    .text(m.label, mx + 7, Y + 5, { width: mW6 - 16, lineBreak: false });
                doc.fontSize(8.5).font("Helvetica-Bold").fillColor(m.accent)
                    .text(m.value, mx + 7, Y + 15, { width: mW6 - 16, lineBreak: false });
                if (m.sub) {
                    doc.fontSize(4.8).font("Helvetica").fillColor(C.muted)
                        .text(m.sub, mx + 7, Y + 27, { width: mW6 - 16, lineBreak: false });
                }
            });
            Y += sH + 5;

            // Row 2: Domain split cards (Park Sale | Finance Sale)
            const splitW = CW / 2;
            const splitH = 36;
            [
                { title: "Park Sale", data: ps, payeeLabel: "Paid to Owner", payeeVal: ps?.totalPaidToOwner, payeeBal: ps?.totalOwnerBalance, color: C.violet },
                { title: "Finance Sale", data: fs, payeeLabel: "Paid to Finance", payeeVal: fs?.totalPaidToFinance, payeeBal: fs?.totalFinanceBalance, color: C.blue },
            ].forEach(({ title, data, payeeLabel, payeeVal, payeeBal, color }, si) => {
                const sx = MG + si * splitW;
                doc.rect(sx, Y, splitW - 2, splitH).fill(C.light).strokeColor(color + "40").lineWidth(0.5).stroke();
                doc.rect(sx, Y, 3, splitH).fill(color);
                doc.fontSize(6.5).font("Helvetica-Bold").fillColor(color)
                    .text(`${title} (${data?.total ?? 0} total · ${data?.inShop ?? 0} in shop · ${data?.sold ?? 0} sold)`, sx + 8, Y + 4, { lineBreak: false });
                
                const miniStats = [
                    { l: "Buyer Rcvd", v: dINR(data?.totalReceivedFromBuyers ?? 0) },
                    { l: payeeLabel,   v: dINR(payeeVal ?? 0) },
                    { l: "Recon Cost", v: dINR(data?.totalReconCost ?? 0) },
                    { l: "Net Profit", v: (data?.totalNetProfit ?? 0) >= 0 ? "+" + dINR(data?.totalNetProfit ?? 0) : dINR(data?.totalNetProfit ?? 0) },
                ];
                const mW = (splitW - 12) / 4;
                miniStats.forEach(({ l, v }, mi) => {
                    const mx = sx + 8 + mi * mW;
                    doc.fontSize(4.8).font("Helvetica").fillColor(C.muted)
                        .text(l, mx, Y + 15, { width: mW - 2, lineBreak: false });
                    doc.fontSize(6.5).font("Helvetica-Bold").fillColor(l === "Net Profit" ? color : C.text)
                        .text(v, mx, Y + 23, { width: mW - 2, lineBreak: false });
                });
            });
            Y += splitH + 5;

            // Row 3: Pending alerts strip (if any balances exist)
            const buyerBal = stats.totalBuyerBalance ?? 0;
            const cbBal = stats.totalBuyerCashBackBalance ?? 0;
            const payeeBal = stats.totalPayeeBalance ?? 0;
            if (buyerBal > 0 || cbBal > 0 || payeeBal > 0) {
                const alertItems = [
                    buyerBal > 0 && { label: `Pending from Buyers: ${dINR(buyerBal)} (${stats.pendingBuyerPayments?.count ?? 0} vehicles)`, color: C.amber },
                    cbBal > 0 && { label: `Cash-Back Owed: ${dINR(cbBal)} (${stats.pendingBuyerCashBackPayments?.count ?? 0} vehicles)`, color: C.violet },
                    payeeBal > 0 && { label: `Owed to Owner/Finance: ${dINR(payeeBal)} (${stats.pendingPayeePayments?.count ?? 0} vehicles)`, color: C.red },
                ].filter(Boolean) as { label: string; color: string }[];

                const aW = CW / alertItems.length;
                alertItems.forEach((a, i) => {
                    const ax = MG + i * aW;
                    doc.rect(ax, Y, aW - 2, 15).fill(a.color + "18").strokeColor(a.color + "60").lineWidth(0.4).stroke();
                    doc.rect(ax, Y, 3, 15).fill(a.color);
                    doc.fontSize(6).font("Helvetica-Bold").fillColor(a.color)
                        .text(a.label, ax + 8, Y + 4, { width: aW - 16, lineBreak: false });
                });
                Y += 20;
            }
        } else {
            // Basic summary band
            const totalInvested = vehicles.reduce((s, v) => s + (v.totalInvestment ?? 0), 0);
            const soldVehicles = vehicles.filter((v) => !!(v as any).dateSold);
            const totalRevenue = soldVehicles.reduce((s, v) => s + ((v as any).soldPrice ?? 0), 0);
            const totalProfit = soldVehicles.reduce((s, v) => s + ((v as any).netProfit ?? 0), 0);
            const inShopCount = vehicles.filter((v) => !["sold", "sold_pending", "returned"].includes(v.status)).length;

            const mW = CW / 4;
            [
                { label: "TOTAL CONSIGNMENTS", value: vehicles.length.toString(), accent: C.indigo },
                { label: inShopCount === 0 ? "IN SHOP (CLEAR)" : "IN SHOP", value: inShopCount.toString(), accent: inShopCount === 0 ? C.green : C.amber },
                { label: "TOTAL INVESTED",     value: dINR(totalInvested),          accent: C.slate },
                { label: "NET PROFIT (SOLD)",  value: dINR(totalProfit),            accent: totalProfit >= 0 ? C.green : C.red },
            ].forEach((m, i) => {
                const mx = MG + i * mW;
                doc.rect(mx, Y, mW - 3, 34).fill(C.light).strokeColor(m.accent + "40").lineWidth(0.5).stroke();
                doc.rect(mx, Y, 3, 34).fill(m.accent);
                doc.fontSize(5.5).font("Helvetica-Bold").fillColor(m.accent)
                    .text(m.label, mx + 8, Y + 5, { lineBreak: false });
                doc.fontSize(10).font("Helvetica-Bold").fillColor(m.accent)
                    .text(m.value, mx + 8, Y + 14, { lineBreak: false });
            });
            Y += 40;
        }

        // ── TABLE ────────────────────────────────────────────────────────
        const cols: [string, number, "left" | "right" | "center"][] = [
            ["#",            18, "center"],
            ["ID",           48, "left"],
            ["Sale Type",    54, "left"],
            ["Make / Model", 114, "left"],
            ["Reg No",       68, "left"],
            ["Received",     56, "left"],
            ["Invested",     62, "right"],
            ["Status",       70, "left"],
            ["Owner",        96, "left"],
            ["Sold Price",   64, "right"],
            ["Net P/L",      62, "right"],
        ];

        const ROW_H = 15;

        const statusColorMap: Record<string, string> = {
            received: C.slate, reconditioning: C.amber,
            ready_for_sale: C.green, sold: C.blue,
            sold_pending: C.amber, returned: C.red,
        };

        const drawHeader = () => {
            doc.rect(MG, Y, CW, 16).fill(C.navy);
            let hx = MG;
            cols.forEach(([label, w, align]) => {
                doc.fontSize(6).font("Helvetica-Bold").fillColor(C.white)
                    .text(label, hx + 3, Y + 5, { width: w - 6, align, lineBreak: false });
                hx += w;
            });
            Y += 16;
        };

        drawHeader();

        if (vehicles.length === 0) {
            need(24);
            doc.rect(MG, Y, CW, 24).fill(C.light);
            doc.fontSize(8).font("Helvetica").fillColor(C.muted)
                .text("No consignments match the selected filters.", MG + 10, Y + 8, { lineBreak: false });
            Y += 24;
        } else {
            vehicles.forEach((v, idx) => {
                need(ROW_H, drawHeader);

                const rowBg = idx % 2 === 0 ? C.light : C.white;
                doc.rect(MG, Y, CW, ROW_H).fill(rowBg);
                doc.moveTo(MG, Y + ROW_H).lineTo(MG + CW, Y + ROW_H)
                    .strokeColor(C.border).lineWidth(0.15).stroke();

                const textY = Y + 4;
                const netProfit = (v as any).netProfit ?? 0;
                const plColor = netProfit > 0 ? C.green : netProfit < 0 ? C.red : C.muted;
                const isSold = !!(v as any).dateSold;
                const saleTypeColor = v.saleType === "park_sale" ? C.violet : C.blue;

                let rx = MG;
                const cell = (text: string, colIdx: number, color?: string) => {
                    const [, w, align] = cols[colIdx];
                    doc.fontSize(6).font("Helvetica").fillColor(color ?? C.text)
                        .text(text, rx + 3, textY, { width: w - 6, align, lineBreak: false });
                    rx += w;
                };

                cell(`${idx + 1}`,                                                          0);
                cell(v.consignmentId ?? "—",                                               1);
                
                // Sale type with color
                const [, stW2] = cols[2];
                doc.fontSize(6.0).font("Helvetica-Bold").fillColor(saleTypeColor)
                    .text(v.saleType === "park_sale" ? "Park Sale" : "Finance Sale", rx + 3, textY, { width: stW2 - 6, lineBreak: false });
                rx += stW2;

                cell(trunc(`${v.make} ${v.model}${v.year ? " " + v.year : ""}`, 20),       3);
                cell(v.registrationNo,                                                      4);
                cell(dFmt(v.dateReceived),                                                  5, C.slate);
                cell(dINR(v.totalInvestment),                                               6);

                // Status with color
                const [, stW] = cols[7];
                doc.fontSize(6.0).font("Helvetica-Bold").fillColor(statusColorMap[v.status] ?? C.slate)
                    .text(dSl(v.status), rx + 3, textY, { width: stW - 6, lineBreak: false });
                rx += stW;

                // Owner (truncated)
                const [, ownerW] = cols[8];
                doc.fontSize(6.0).font("Helvetica").fillColor(C.text)
                    .text(trunc(v.previousOwner ?? "—", 16), rx + 3, textY, { width: ownerW - 6, lineBreak: false });
                rx += ownerW;

                // Sold Price
                const [, soldW] = cols[9];
                doc.fontSize(6.0).font("Helvetica").fillColor(isSold ? C.text : C.muted)
                    .text(isSold ? dINR((v as any).soldPrice) : "—", rx + 3, textY, { width: soldW - 6, align: "right", lineBreak: false });
                rx += soldW;

                // Net P/L
                const [, plW] = cols[10];
                doc.fontSize(6.0).font("Helvetica").fillColor(isSold ? plColor : C.muted)
                    .text(isSold ? (netProfit >= 0 ? "+" : "") + dINR(netProfit) : "—", rx + 3, textY, { width: plW - 6, align: "right", lineBreak: false });

                Y += ROW_H;
            });
        }

        // ── TOTALS ROW ───────────────────────────────────────────────────
        need(20);
        const totInvested = vehicles.reduce((s, v) => s + (v.totalInvestment ?? 0), 0);
        const soldVs = vehicles.filter((v) => !!(v as any).dateSold);
        const totRev = soldVs.reduce((s, v) => s + ((v as any).soldPrice ?? 0), 0);
        const totProf = soldVs.reduce((s, v) => s + ((v as any).netProfit ?? 0), 0);

        doc.rect(MG, Y, CW, 20).fill(C.navy);
        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.white)
            .text(
                `${vehicles.length} consignments  ·  Total Invested: ${dINR(totInvested)}  ·  Total Revenue: ${dINR(totRev)}  ·  Net P/L (sold): ${(totProf >= 0 ? "+" : "") + dINR(totProf)}`,
                MG + 8, Y + 6, { lineBreak: false },
            );
        Y += 20;

        addFooter();

        // Page numbers
        const range = doc.bufferedPageRange();
        for (let pg = 0; pg < range.count; pg++) {
            doc.switchToPage(range.start + pg);
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text(`Page ${pg + 1} of ${range.count}`, MG, PH - 12, { width: CW, align: "right", lineBreak: false });
        }

        doc.end();
    });
};
