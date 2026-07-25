// ── Consignment P&L Report PDF Export ────────────────────────────────────────
// Mirrors the complete Consignment Reports page:
//   Section A: Summary Overview (Sold Vehicles)
//   Section B: Park Sale vs Finance Sale Split
//   Section C: Open Settlements Table
//   Section D: Vehicle-wise P&L Table (Sold Vehicles)
//   Section E: Aging Report Table (Vehicles Still in Shop)
//   Section F: Avg Reconditioning Cost Breakdown
// Unicode-safe: only ASCII chars used (no Rs. ₹, —, ·)

/** ASCII-safe INR amount */
const dINR = (n: number | null | undefined): string => {
    if (n == null) return "-";
    const num = Math.abs(Math.round(n));
    let s = num.toString();
    if (s.length > 3) {
        const last3 = s.slice(-3);
        const rest = s.slice(0, -3);
        s = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
    }
    return `Rs. ${s}`;
};

/** ASCII-safe date: "21 May 2026" */
const dFmt = (d: Date | string | null | undefined): string => {
    if (!d) return "-";
    const dt = new Date(d);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${String(dt.getDate()).padStart(2,"0")} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
};

/** Slug to Title Case */
const dSl = (s: string | null | undefined): string =>
    s ? s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "-";

/** Truncate string */
const trunc = (s: string | null | undefined, max: number): string => {
    if (!s) return "-";
    return s.length > max ? s.slice(0, max - 1) + "." : s;
};

interface PLFilters {
    saleType?: string;
    dateFrom?: string;
    dateTo?: string;
}

export const exportConsignmentPLReportPDF = async (
    vehicles: any[],
    filters: PLFilters = {},
    reportData?: any
): Promise<Buffer> => {
    const openSettlements = reportData?.openSettlements ?? [];
    const agingReport     = reportData?.agingReport     ?? [];
    const costAnalysis    = reportData?.costAnalysis    ?? {};

    // ── Aggregates ─────────────────────────────────────────────────────────
    const totalInvested  = vehicles.reduce((s, v) => s + (v.totalInvestment ?? 0), 0);
    const totalRevenue   = vehicles.reduce((s, v) => s + (v.soldPrice       ?? 0), 0);
    const totalReceived  = vehicles.reduce((s, v) => s + Math.min(v.receivedAmount ?? v.soldPrice ?? 0, v.soldPrice ?? 0), 0);
    const totalBalance   = vehicles.reduce((s, v) => s + (v.buyerBalance    ?? 0), 0);
    const totalPaidOut   = vehicles.reduce((s, v) => s + (v.paidToPayee     ?? 0), 0);
    const totalProfit    = vehicles.reduce((s, v) => s + (v.netProfit       ?? 0), 0);
    const profitCount    = vehicles.filter(v => (v.netProfit ?? 0) >= 0).length;
    const lossCount      = vehicles.length - profitCount;
    const avgDays        = vehicles.filter(v => v.daysInShop != null)
        .reduce((s, v, _, a) => s + v.daysInShop / a.length, 0);
    const parkSaleCount  = vehicles.filter(v => v.saleType === "park_sale").length;
    const financeSaleCount = vehicles.length - parkSaleCount;

    const PDFDocument = (await import("pdfkit")).default;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 0, size: "A4", layout: "landscape", bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on("data", (c: Buffer) => chunks.push(c));
        doc.on("end",  () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const PW = doc.page.width;   // ~841.89
        const PH = doc.page.height;  // ~595.28
        const MG = 28;
        const CW = PW - MG * 2;

        const C = {
            navy:   "#0f172a", indigo: "#6366f1", green:  "#16a34a", red:    "#dc2626",
            amber:  "#d97706", orange: "#ea580c", cyan:   "#0891b2", violet: "#7c3aed",
            blue:   "#2563eb", slate:  "#64748b", white:  "#ffffff",
            border: "#e2e8f0", light:  "#f8fafc", text:   "#1e293b", muted:  "#94a3b8",
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

        const sectionHeader = (title: string, color: string, badge?: string) => {
            need(20);
            doc.rect(MG, Y, CW, 18).fill(color + "18").strokeColor(color + "60").lineWidth(0.5).stroke();
            doc.rect(MG, Y, 3, 18).fill(color);
            doc.fontSize(7).font("Helvetica-Bold").fillColor(color)
                .text(title, MG + 9, Y + 5, { lineBreak: false });
            if (badge) {
                doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                    .text(badge, MG + 9, Y + 5, { width: CW - 18, align: "right", lineBreak: false });
            }
            Y += 18;
        };

        // ── HEADER ────────────────────────────────────────────────────────────
        doc.rect(0, 0, PW, 54).fill(C.navy);
        doc.rect(0, 50, PW, 4).fill(C.indigo);

        doc.fontSize(19).font("Helvetica-Bold").fillColor(C.white)
            .text("VehicleBook", MG, 10, { lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
            .text("Inventory Management System", MG, 33, { lineBreak: false });

        const titleParts = ["Consignment Reports & Analytics"];
        if (filters.saleType === "park_sale")    titleParts.push("| Park Sale Only");
        if (filters.saleType === "finance_sale") titleParts.push("| Finance Sale Only");
        if (filters.dateFrom || filters.dateTo) {
            const r = [filters.dateFrom && dFmt(filters.dateFrom), filters.dateTo && dFmt(filters.dateTo)].filter(Boolean).join(" to ");
            titleParts.push(`| ${r}`);
        }
        doc.fontSize(11).font("Helvetica-Bold").fillColor(C.white)
            .text(titleParts.join(" "), MG, 12, { width: CW, align: "right", lineBreak: false });

        const now = new Date();
        const months2 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const genStr = `Generated: ${String(now.getDate()).padStart(2,"0")} ${months2[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
            .text(`${genStr}  |  ${vehicles.length} sold`, MG, 31, { width: CW, align: "right", lineBreak: false });

        Y = 58;

        // ── SECTION A: OVERVIEW CARDS ─────────────────────────────────────────
        sectionHeader("P&L Overview (Sold Vehicles)", C.indigo);
        const SH = 42;
        const marginStr = totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(1) + "%" : "0%";
        const totCbAll = vehicles.reduce((s, v) => s + (v.buyerCashBackBalance ?? 0), 0);
        const metrics = [
            { label: "TOTAL SOLD",       value: String(vehicles.length), sub: `${profitCount} profit / ${lossCount} loss`,  accent: C.indigo },
            { label: "SALE TYPE SPLIT",  value: `PS: ${parkSaleCount}`,  sub: `FS: ${financeSaleCount}`,                    accent: C.violet },
            { label: "RECON COST",       value: dINR(vehicles.reduce((s,v) => s + (v.totalReconCost ?? 0), 0)), sub: "Workshop, parts & misc", accent: C.amber },
            { label: "TOTAL REVENUE",    value: dINR(totalRevenue),      sub: "Total sold price",                           accent: C.cyan },
            { label: "BUYER BAL / CB",   value: totalBalance > 0 ? dINR(totalBalance) : totCbAll > 0 ? `-${dINR(totCbAll)} (CB)` : "Fully Collected", sub: totalBalance > 0 ? "Pending from buyers" : totCbAll > 0 ? "Cash-back owed to buyers" : "All payments received", accent: totalBalance > 0 ? C.orange : totCbAll > 0 ? C.violet : C.green },
            { label: "PAID TO PAYEE",    value: dINR(totalPaidOut),      sub: "Owner / Finance payout",                     accent: C.blue },
            { label: "NET PROFIT / LOSS",value: (totalProfit >= 0 ? "+" : "") + dINR(totalProfit), sub: `${marginStr} margin`, accent: totalProfit >= 0 ? C.green : C.red },
        ];

        const mW = CW / metrics.length;
        need(SH + 4);
        metrics.forEach((m, i) => {
            const mx = MG + i * mW;
            doc.rect(mx, Y, mW - 2, SH).fill(C.light).strokeColor(m.accent + "50").lineWidth(0.5).stroke();
            doc.rect(mx, Y, 3, SH).fill(m.accent);
            doc.fontSize(5.5).font("Helvetica-Bold").fillColor(m.accent)
                .text(m.label, mx + 7, Y + 5, { width: mW - 16, lineBreak: false });
            doc.fontSize(8.5).font("Helvetica-Bold").fillColor(m.accent)
                .text(m.value, mx + 7, Y + 16, { width: mW - 16, lineBreak: false });
            if (m.sub) {
                doc.fontSize(5).font("Helvetica").fillColor(C.muted)
                    .text(m.sub, mx + 7, Y + 29, { width: mW - 16, lineBreak: false });
            }
        });
        Y += SH + 6;

        // ── SECTION B: PARK VS FINANCE SPLIT CARDS ─────────────────────────────
        sectionHeader("Park Sale vs Finance Sale Comparison", C.slate);
        need(44);
        const splitH = 42;
        const splitW = CW / 2;
        [
            { label: "Park Sale 🏪", filter: "park_sale", color: C.violet, payeeLabel: "Paid to Owner" },
            { label: "Finance Sale 💳", filter: "finance_sale", color: C.blue, payeeLabel: "Paid to Finance" },
        ].forEach(({ label, filter, color, payeeLabel }, si) => {
            const sx = MG + si * splitW;
            const items = vehicles.filter(v => v.saleType === filter);
            const rev   = items.reduce((s, v) => s + (v.soldPrice || 0), 0);
            const recon = items.reduce((s, v) => s + (v.totalReconCost || 0), 0);
            const np    = items.reduce((s, v) => s + (v.netProfit || 0), 0);
            const po    = items.reduce((s, v) => s + (v.paidToPayee || 0), 0);
            const bbal  = items.reduce((s, v) => s + (v.buyerBalance || 0), 0);

            doc.rect(sx, Y, splitW - 2, splitH).fill(C.light).strokeColor(color + "40").lineWidth(0.5).stroke();
            doc.rect(sx, Y, 3, splitH).fill(color);
            doc.fontSize(6.5).font("Helvetica-Bold").fillColor(color)
                .text(`${label} (${items.length} sold)`, sx + 8, Y + 5, { lineBreak: false });

            const miniStats = [
                { l: "Revenue",     v: dINR(rev) },
                { l: "Recon Cost",   v: dINR(recon) },
                { l: payeeLabel,    v: dINR(po) },
                { l: "Net Profit",  v: (np >= 0 ? "+" : "") + dINR(np) },
                { l: "Buyer Bal",   v: bbal > 0 ? dINR(bbal) : "Nil" },
            ];
            const mW2 = (splitW - 12) / 5;
            miniStats.forEach(({ l, v }, mi) => {
                const mx = sx + 8 + mi * mW2;
                doc.fontSize(4.8).font("Helvetica").fillColor(C.muted)
                    .text(l, mx, Y + 16, { width: mW2 - 2, lineBreak: false });
                doc.fontSize(6.5).font("Helvetica-Bold").fillColor(l === "Net Profit" ? color : C.text)
                    .text(v, mx, Y + 24, { width: mW2 - 2, lineBreak: false });
            });
        });
        Y += splitH + 6;

        // ── SECTION C: OPEN SETTLEMENTS TABLE ────────────────────────────────
        if (openSettlements.length > 0) {
            need(18);
            const totBuyerBal = openSettlements.reduce((s: number, v: any) => s + (v.buyerBalance || 0), 0);
            const totPayeeBal = openSettlements.reduce((s: number, v: any) => s + (v.payeeBalance || 0), 0);
            const totCbBal    = openSettlements.reduce((s: number, v: any) => s + (v.buyerCashBackBalance || 0), 0);

            sectionHeader("Open Settlements", C.orange,
                `${openSettlements.length} pending | Buyer Bal: ${dINR(totBuyerBal)} | Payee Bal: ${dINR(totPayeeBal)}${totCbBal > 0 ? ` | Cash-Back: ${dINR(totCbBal)}` : ""}`);

            const oCols: [string, number, "left"|"right"|"center"][] = [
                ["#",            16, "center"],
                ["CS ID",        44, "left"  ],
                ["Make / Model",110, "left"  ],
                ["Reg No",       68, "left"  ],
                ["Owner",        96, "left"  ],
                ["Sale Type",    56, "left"  ],
                ["Sold Date",    62, "left"  ],
                ["Buyer Bal / CB", 90, "right" ],
                ["We Owe Payee", 90, "right" ],
                ["Settlement",   74, "center"],
            ];

            const drawOpenHdr = () => {
                doc.rect(MG, Y, CW, 14).fill(C.navy);
                let hx = MG;
                oCols.forEach(([label, w, align]) => {
                    doc.fontSize(5.5).font("Helvetica-Bold").fillColor(C.white)
                        .text(label, hx + 2, Y + 4, { width: w - 4, align, lineBreak: false });
                    hx += w;
                });
                Y += 14;
            };
            drawOpenHdr();

            openSettlements.forEach((v: any, idx: number) => {
                need(14, drawOpenHdr);
                doc.rect(MG, Y, CW, 14).fill(idx % 2 === 0 ? C.light : C.white);
                doc.moveTo(MG, Y + 14).lineTo(MG + CW, Y + 14)
                    .strokeColor(C.border).lineWidth(0.12).stroke();

                const cb = v.buyerCashBackBalance ?? 0;
                const bb = v.buyerBalance ?? 0;
                const pb = v.payeeBalance ?? 0;
                const buyerDisplay = cb > 0 ? `-${dINR(cb)} (CB)` : bb > 0 ? dINR(bb) : "Settled";
                const buyerColor   = cb > 0 ? C.violet : bb > 0 ? C.amber : C.green;

                const cells: [string, number, "left"|"right"|"center", string?][] = [
                    [`${idx + 1}`, 0, "center", C.muted],
                    [v.consignmentId ?? "-", 1, "left"],
                    [trunc(`${v.make} ${v.model}`, 20), 2, "left"],
                    [v.registrationNo ?? "-", 3, "left"],
                    [trunc(v.previousOwner ?? "-", 17), 4, "left", C.slate],
                    [v.saleType === "park_sale" ? "Park Sale" : "Finance Sale", 5, "left", v.saleType === "park_sale" ? C.violet : C.blue],
                    [dFmt(v.dateSold), 6, "left", C.muted],
                    [buyerDisplay, 7, "right", buyerColor],
                    [pb > 0 ? dINR(pb) : "-", 8, "right", pb > 0 ? C.blue : C.muted],
                    [dSl(v.settlementStatus), 9, "center", C.orange],
                ];
                let rx = MG;
                cells.forEach(([text, ci, align, color]) => {
                    const [, w] = oCols[ci];
                    doc.fontSize(6).font("Helvetica").fillColor(color ?? C.text)
                        .text(text, rx + 2, Y + 4, { width: w - 4, align, lineBreak: false });
                    rx += w;
                });
                Y += 14;
            });
            Y += 6;
        }

        // ── SECTION D: VEHICLE P&L TABLE (SOLD ONLY) ─────────────────────────
        {
            need(18);
            sectionHeader("Vehicle-wise P&L (Sold Consignments Only)", C.indigo,
                `${vehicles.length} records  |  Net: ${(totalProfit >= 0 ? "+" : "") + dINR(totalProfit)}`);

            const cols: [string, number, "left" | "right" | "center"][] = [
                ["#",            14, "center"],
                ["CS ID",        40, "left"  ],
                ["Type",         34, "left"  ],
                ["Sale Type",    50, "left"  ],
                ["Make / Model", 78, "left"  ],
                ["Reg No",       56, "left"  ],
                ["Owner",        54, "left"  ],
                ["Received",     44, "left"  ],
                ["Sold",         44, "left"  ],
                ["Invested",     52, "right" ],
                ["Sold Price",   56, "right" ],
                ["Rcvd",         48, "right" ],
                ["Buyer Bal/CB", 60, "right" ],
                ["Paid Out",     48, "right" ],
                ["Net P/L",      50, "right" ],
                ["Days",         22, "center"],
                ["Settlement",   50, "center"],
            ];

            const ROW_H = 15;
            const HDR_H = 16;

            const settlementColor = (s: string | null | undefined): string => {
                if (!s) return C.muted;
                if (s === "fully_closed")  return C.green;
                if (s === "buyer_settled") return C.blue;
                if (s === "payee_settled") return C.amber;
                if (s === "open")          return C.orange;
                return C.muted;
            };

            const settlementLabel = (s: string | null | undefined): string => {
                if (!s) return "-";
                if (s === "fully_closed")  return "Closed";
                if (s === "buyer_settled") return "Buyer Done";
                if (s === "payee_settled") return "Payee Done";
                if (s === "open")          return "Open";
                return dSl(s);
            };

            const drawPLHdr = () => {
                doc.rect(MG, Y, CW, HDR_H).fill(C.navy);
                let hx = MG;
                cols.forEach(([label, w, align]) => {
                    doc.fontSize(5.8).font("Helvetica-Bold").fillColor(C.white)
                        .text(label, hx + 2, Y + 5, { width: w - 4, align, lineBreak: false });
                    hx += w;
                });
                Y += HDR_H;
            };
            drawPLHdr();

            if (vehicles.length === 0) {
                need(28);
                doc.rect(MG, Y, CW, 28).fill(C.light);
                doc.fontSize(8).font("Helvetica").fillColor(C.muted)
                    .text("No sold consignments match the selected filters.", MG + 12, Y + 10, { lineBreak: false });
                Y += 28;
            } else {
                vehicles.forEach((v, idx) => {
                    need(ROW_H, drawPLHdr);

                    const rowBg = idx % 2 === 0 ? C.light : C.white;
                    doc.rect(MG, Y, CW, ROW_H).fill(rowBg);
                    doc.moveTo(MG, Y + ROW_H).lineTo(MG + CW, Y + ROW_H)
                        .strokeColor(C.border).lineWidth(0.12).stroke();

                    const textY   = Y + 4;
                    const np      = v.netProfit ?? 0;
                    const npColor = np >= 0 ? C.green : C.red;
                    const isParkSale = v.saleType === "park_sale";
                    const sTypeColor = isParkSale ? C.violet : C.blue;

                    let rx = MG;
                    const cell = (text: string, ci: number, color?: string, bold?: boolean) => {
                        const [, w, align] = cols[ci];
                        doc.fontSize(6).font(bold ? "Helvetica-Bold" : "Helvetica")
                            .fillColor(color ?? C.text)
                            .text(text, rx + 2, textY, { width: w - 4, align, lineBreak: false });
                        rx += w;
                    };

                    const bbal  = v.buyerBalance ?? 0;
                    const cb    = v.buyerCashBackBalance ?? 0;
                    // Cap received at soldPrice for over-trade deals
                    const rcvd  = Math.min(v.receivedAmount ?? v.soldPrice ?? 0, v.soldPrice ?? 0);

                    const balDisplay = cb > 0 ? `-${dINR(cb)}` : bbal > 0 ? dINR(bbal) : "Nil";
                    const balColor   = cb > 0 ? C.violet : bbal > 0 ? C.amber : C.muted;

                    cell(`${idx + 1}`,                                                          0, C.muted);
                    cell(v.consignmentId ?? "-",                                                1);
                    cell(v.vehicleType === "two_wheeler" ? "2W" : "4W",                        2, C.slate);
                    cell(isParkSale ? "Park Sale" : "Finance Sale",                             3, sTypeColor, true);
                    cell(trunc(`${v.make} ${v.model}${v.year ? " " + v.year : ""}`, 18),       4);
                    cell(trunc(v.registrationNo, 12),                                           5);
                    cell(trunc(v.previousOwner ?? "-", 12),                                     6, C.slate);
                    cell(dFmt(v.dateReceived),                                                  7, C.muted);
                    cell(dFmt(v.dateSold),                                                      8, C.muted);
                    cell(dINR(v.totalInvestment),                                               9);
                    cell(dINR(v.soldPrice),                                                    10);
                    cell(dINR(rcvd),                                                           11, C.muted);
                    cell(balDisplay,                                                           12, balColor);
                    cell(dINR(v.paidToPayee),                                                  13, C.muted);
                    cell((np >= 0 ? "+" : "") + dINR(np),                                     14, npColor, true);
                    cell(v.daysInShop != null ? `${v.daysInShop}d` : "-",                     15, C.muted);

                    // Settlement status
                    const [, stW] = cols[16];
                    doc.fontSize(5.8).font("Helvetica-Bold").fillColor(settlementColor(v.settlementStatus))
                        .text(settlementLabel(v.settlementStatus), rx + 2, textY, { width: stW - 4, align: "center", lineBreak: false });

                    Y += ROW_H;
                });
            }

            // Totals band
            need(24);
            doc.rect(MG, Y, CW, 24).fill(C.navy);
            doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.white)
                .text(
                    `${vehicles.length} sold  |  Invested: ${dINR(totalInvested)}  |  Revenue: ${dINR(totalRevenue)}  |  Received: ${dINR(totalReceived)}  |  Buyer Bal: ${totalBalance > 0 ? dINR(totalBalance) : "Nil"}  |  Paid Out: ${dINR(totalPaidOut)}  |  Net P/L: ${totalProfit >= 0 ? "+" : ""}${dINR(totalProfit)} (${marginStr})  |  ${profitCount} profit / ${lossCount} loss  |  Avg ${Math.round(avgDays || 0)}d`,
                    MG + 8, Y + 8, { lineBreak: false },
                );
            Y += 24 + 6;
        }

        // ── SECTION E: AGING REPORT TABLE (STILL IN SHOP) ────────────────────
        if (agingReport.length > 0) {
            need(18);
            sectionHeader("Aging Report (Vehicles Still in Shop)", C.slate, `${agingReport.length} vehicles in shop`);

            const aCols: [string, number, "left"|"right"|"center"][] = [
                ["#",            16, "center"],
                ["CS ID",        48, "left"  ],
                ["Make / Model",130, "left"  ],
                ["Reg No",       76, "left"  ],
                ["Owner",       120, "left"  ],
                ["Sale Type",    68, "left"  ],
                ["Status",       74, "left"  ],
                ["Total Invested",84, "right" ],
                ["Days in Shop", 70, "center"],
            ];

            const drawAgingHdr = () => {
                doc.rect(MG, Y, CW, 14).fill(C.navy);
                let hx = MG;
                aCols.forEach(([label, w, align]) => {
                    doc.fontSize(5.5).font("Helvetica-Bold").fillColor(C.white)
                        .text(label, hx + 2, Y + 4, { width: w - 4, align, lineBreak: false });
                    hx += w;
                });
                Y += 14;
            };
            drawAgingHdr();

            agingReport.forEach((v: any, idx: number) => {
                need(14, drawAgingHdr);
                doc.rect(MG, Y, CW, 14).fill(idx % 2 === 0 ? C.light : C.white);
                doc.moveTo(MG, Y + 14).lineTo(MG + CW, Y + 14)
                    .strokeColor(C.border).lineWidth(0.12).stroke();

                const days = v.daysInShop ?? 0;
                const daysColor = days > 30 ? C.red : days > 14 ? C.amber : C.text;

                const cells: [string, number, "left"|"right"|"center", string?][] = [
                    [`${idx + 1}`, 0, "center", C.muted],
                    [v.consignmentId ?? "-", 1, "left"],
                    [trunc(`${v.make} ${v.model}`, 24), 2, "left"],
                    [v.registrationNo ?? "-", 3, "left"],
                    [trunc(v.previousOwner ?? "-", 20), 4, "left", C.slate],
                    [v.saleType === "park_sale" ? "Park Sale" : "Finance Sale", 5, "left", v.saleType === "park_sale" ? C.violet : C.blue],
                    [dSl(v.status), 6, "left", C.slate],
                    [dINR(v.totalInvestment), 7, "right"],
                    [`${days}d`, 8, "center", daysColor],
                ];
                let rx = MG;
                cells.forEach(([text, ci, align, color]) => {
                    const [, w] = aCols[ci];
                    doc.fontSize(6).font("Helvetica").fillColor(color ?? C.text)
                        .text(text, rx + 2, Y + 4, { width: w - 4, align, lineBreak: false });
                    rx += w;
                });
                Y += 14;
            });
            Y += 6;
        }

        // ── SECTION F: AVG RECONDITIONING COST BREAKDOWN ─────────────────────
        if (costAnalysis && costAnalysis.avgTotalRecon != null) {
            need(48);
            sectionHeader("Avg Reconditioning Cost Breakdown (Sold Vehicles)", C.amber, `Avg Total: ${dINR(Math.round(costAnalysis.avgTotalRecon))}`);

            const categories = [
                { label: "Travel", val: costAnalysis.avgTravel },
                { label: "Workshop", val: costAnalysis.avgWorkshop },
                { label: "Spare Parts", val: costAnalysis.avgSpareParts },
                { label: "Alignment", val: costAnalysis.avgAlignment },
                { label: "Painting", val: costAnalysis.avgPainting },
                { label: "Washing", val: costAnalysis.avgWashing },
                { label: "Fuel", val: costAnalysis.avgFuel },
                { label: "Paperwork", val: costAnalysis.avgPaperwork },
                { label: "Commission", val: costAnalysis.avgCommission },
                { label: "Other", val: costAnalysis.avgOtherExpenses },
            ];

            const colW = CW / 10;
            const cH = 28;
            categories.forEach((c, i) => {
                const cx = MG + i * colW;
                doc.rect(cx, Y, colW - 2, cH).fill(C.light).strokeColor(C.border).lineWidth(0.5).stroke();
                doc.fontSize(5).font("Helvetica").fillColor(C.muted)
                    .text(c.label, cx + 4, Y + 5, { width: colW - 8, align: "center", lineBreak: false });
                doc.fontSize(7).font("Helvetica-Bold").fillColor(C.text)
                    .text(dINR(Math.round(c.val || 0)), cx + 4, Y + 15, { width: colW - 8, align: "center", lineBreak: false });
            });
            Y += cH + 6;
        }

        addFooter();

        // ── PAGE NUMBERS ──────────────────────────────────────────────────────
        const range = doc.bufferedPageRange();
        for (let pg = 0; pg < range.count; pg++) {
            doc.switchToPage(range.start + pg);
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text(`Page ${pg + 1} of ${range.count}`, MG, PH - 12, { width: CW, align: "right", lineBreak: false });
        }

        doc.end();
    });
};
