// ── P&L Report PDF Export — Full Reports Page ─────────────────────────────────
// Mirrors the complete Reports page:
//   Section A: Combined Overview (all vehicles)
//   Section B: Two/Four Wheeler Split
//   Section C: Purchase Payments Due to Sellers
//   Section D: Sale Payments Pending from Buyers
//   Section E: Cash-Back Owed to Buyers
//   Section F: Vehicle P&L Table (sold vehicles only)
// Unicode-safe: only ASCII chars used in text rendering

// ── Helpers ──────────────────────────────────────────────────────────────────

const dINR = (n: number | null | undefined): string => {
    if (n == null) return "-";
    const num = Math.abs(Math.round(n));
    let s = num.toString();
    if (s.length > 3) {
        const last3 = s.slice(-3);
        const rest  = s.slice(0, -3);
        s = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
    }
    return `Rs. ${s}`;
};

const dFmt = (d: Date | string | null | undefined): string => {
    if (!d) return "-";
    const dt = new Date(d);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${String(dt.getDate()).padStart(2,"0")} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
};

const dSl = (s: string | null | undefined): string =>
    s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "-";

const trunc = (s: string | null | undefined, max: number): string => {
    if (!s) return "-";
    return s.length > max ? s.slice(0, max - 1) + "." : s;
};

interface PLReportFilters {
    vehicleType?: string;
    dateFrom?: string;
    dateTo?: string;
}

interface PLReportSupplements {
    purchaseDue:   any[];
    salePending:   any[];
    cashbackOwed:  any[];
    vehicleStats?: any;   // full stats object from getVehicleStats (all vehicles)
}

export const exportPLReportPDF = async (
    vehicles: any[],
    filters: PLReportFilters = {},
    supplements: PLReportSupplements = { purchaseDue: [], salePending: [], cashbackOwed: [] },
): Promise<Buffer> => {
    const { purchaseDue, salePending, cashbackOwed, vehicleStats } = supplements;
    const combined     = vehicleStats?.combined     ?? null;
    const twoWheelers  = vehicleStats?.twoWheelers  ?? null;
    const fourWheelers = vehicleStats?.fourWheelers ?? null;

    // ── Sold-vehicles aggregates (P&L section) ───────────────────────────────
    const plInvested  = vehicles.reduce((s, v) => s + (v.totalInvestment ?? 0), 0);
    const plRevenue   = vehicles.reduce((s, v) => s + (v.soldPrice       ?? 0), 0);
    const plReceived  = vehicles.reduce((s, v) => s + Math.min(v.receivedAmount ?? v.soldPrice ?? 0, v.soldPrice ?? 0), 0);
    const plBalance   = vehicles.reduce((s, v) => s + (v.balanceAmount   ?? 0), 0);
    const plProfit    = vehicles.reduce((s, v) => s + (v.profitLoss      ?? 0), 0);
    const profitCount = vehicles.filter(v => (v.profitLoss ?? 0) >= 0).length;
    const lossCount   = vehicles.length - profitCount;
    const avgDays     = vehicles.filter(v => v.daysToSell != null)
        .reduce((s, v, _, a) => s + v.daysToSell / a.length, 0);
    const twoWCount   = vehicles.filter(v => v.vehicleType === "two_wheeler").length;
    const fourWCount  = vehicles.length - twoWCount;
    const exchangeCount = vehicles.filter(v => v.isFromExchange || v.isExchange).length;

    // ── Supplement stats ─────────────────────────────────────────────────────
    const totalPurchaseDue  = purchaseDue.reduce((s, v) => s + (v.purchasePendingAmount ?? 0), 0);
    const totalSalePending  = salePending.reduce((s, v) => s + (v.balanceAmount ?? 0), 0);
    const totalCashbackOwed = cashbackOwed.reduce((s, v) => s + (v.buyerCashBackBalance ?? v.buyerCashBackDue ?? 0), 0);

    const PDFDocument = (await import("pdfkit")).default;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 0, size: "A4", layout: "landscape", bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on("data", (c: Buffer) => chunks.push(c));
        doc.on("end",  () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const PW = doc.page.width;
        const PH = doc.page.height;
        const MG = 28;
        const CW = PW - MG * 2;

        const C = {
            navy:   "#0f172a", indigo: "#6366f1", green:  "#16a34a", red:    "#dc2626",
            amber:  "#d97706", orange: "#ea580c", cyan:   "#0891b2", purple: "#7c3aed",
            slate:  "#64748b", white:  "#ffffff", border: "#e2e8f0", light:  "#f8fafc",
            text:   "#1e293b", muted:  "#94a3b8",
        };

        // ── Shared helpers ───────────────────────────────────────────────────
        const addFooter = () => {
            doc.moveTo(MG, PH - 18).lineTo(PW - MG, PH - 18)
                .strokeColor(C.border).lineWidth(0.5).stroke();
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text("VehicleBook -- Confidential. For internal use only.", MG, PH - 12, { lineBreak: false });
        };

        let Y = 0;

        // Ensure enough vertical space; add new page if needed
        const need = (h: number, redrawHeaderFn?: () => void) => {
            if (Y + h > PH - 30) {
                addFooter();
                doc.addPage({ margin: 0, size: "A4", layout: "landscape" });
                Y = MG;
                if (redrawHeaderFn) redrawHeaderFn();
            }
        };

        // Section divider bar
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

        // Stat card helper (used in overview and split sections)
        const statCard = (mx: number, my: number, w: number, h: number,
            label: string, value: string, sub: string | null, accent: string) => {
            doc.rect(mx, my, w - 2, h).fill(C.light).strokeColor(accent + "50").lineWidth(0.5).stroke();
            doc.rect(mx, my, 3, h).fill(accent);
            doc.fontSize(5.5).font("Helvetica-Bold").fillColor(accent)
                .text(label, mx + 7, my + 5, { width: w - 16, lineBreak: false });
            doc.fontSize(9).font("Helvetica-Bold").fillColor(accent)
                .text(value, mx + 7, my + 16, { width: w - 16, lineBreak: false });
            if (sub) {
                doc.fontSize(5).font("Helvetica").fillColor(C.muted)
                    .text(sub, mx + 7, my + 28, { width: w - 16, lineBreak: false });
            }
        };

        // ── HEADER ───────────────────────────────────────────────────────────
        doc.rect(0, 0, PW, 54).fill(C.navy);
        doc.rect(0, 50, PW, 4).fill(C.indigo);

        doc.fontSize(19).font("Helvetica-Bold").fillColor(C.white)
            .text("VehicleBook", MG, 10, { lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
            .text("Inventory Management System", MG, 33, { lineBreak: false });

        const titleParts = ["Vehicle Reports & Analytics"];
        if (filters.vehicleType)
            titleParts.push(filters.vehicleType === "two_wheeler" ? "| Two Wheelers" : "| Four Wheelers");
        if (filters.dateFrom || filters.dateTo) {
            const r = [filters.dateFrom && dFmt(filters.dateFrom), filters.dateTo && dFmt(filters.dateTo)].filter(Boolean).join(" to ");
            titleParts.push(`| ${r}`);
        }
        doc.fontSize(11).font("Helvetica-Bold").fillColor(C.white)
            .text(titleParts.join(" "), MG, 12, { width: CW, align: "right", lineBreak: false });

        const now = new Date();
        const mos = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const genStr = `Generated: ${String(now.getDate()).padStart(2,"0")} ${mos[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
            .text(`${genStr}  |  ${vehicles.length} sold`, MG, 31, { width: CW, align: "right", lineBreak: false });

        Y = 58;

        // ── SECTION A: COMBINED OVERVIEW ─────────────────────────────────────
        // Uses ALL-vehicle stats (total=7, invested=3,30,650) — matches the page
        sectionHeader("Combined Overview", C.indigo, combined ? `${combined.total} vehicles total` : "");

        const oH = 44;
        const mW4 = CW / 4;
        const overviewCards = combined ? [
            { label: "TOTAL VEHICLES",   value: String(combined.total),             sub: `${combined.inStock} in stock`,                         accent: C.indigo },
            { label: "TOTAL INVESTED",   value: dINR(combined.totalInvested),        sub: "All purchases + costs",                                accent: C.amber  },
            { label: "TOTAL REVENUE",    value: dINR(combined.totalRevenue),          sub: `${(combined.sold ?? 0) + (combined.soldPending ?? 0)} sold`, accent: C.cyan   },
            { label: "NET PROFIT",       value: dINR(combined.netProfit),             sub: `${(combined.avgMargin ?? 0).toFixed(1)}% margin (sold only)`, accent: (combined.netProfit ?? 0) >= 0 ? C.green : C.red },
        ] : [
            { label: "TOTAL SOLD",        value: String(vehicles.length),            sub: `${profitCount} profit / ${lossCount} loss`,  accent: C.indigo },
            { label: "TOTAL INVESTED",    value: dINR(plInvested),                   sub: `2W:${twoWCount} 4W:${fourWCount}`,           accent: C.amber  },
            { label: "TOTAL REVENUE",     value: dINR(plRevenue),                    sub: "Agreed sold price",                          accent: C.cyan   },
            { label: "NET PROFIT / LOSS", value: (plProfit >= 0 ? "+" : "") + dINR(plProfit), sub: `${((plProfit / (plInvested || 1)) * 100).toFixed(1)}% margin`, accent: plProfit >= 0 ? C.green : C.red },
        ];
        need(oH + 4);
        overviewCards.forEach((m, i) => {
            statCard(MG + i * mW4, Y, mW4, oH, m.label, m.value, m.sub, m.accent);
        });
        Y += oH + 4;

        // ── SECTION A2: 2W / 4W SPLIT ───────────────────────────────────────
        if (twoWheelers || fourWheelers) {
            sectionHeader("Vehicle Type Split", C.slate);
            need(44);

            const splitH = 42;
            const splitW = CW / 2;
            const splitSections = [
                { title: "Two Wheelers", data: twoWheelers, color: C.indigo },
                { title: "Four Wheelers", data: fourWheelers, color: C.purple },
            ];
            splitSections.forEach(({ title, data, color }, si) => {
                const sx = MG + si * splitW;
                doc.rect(sx, Y, splitW - 2, splitH).fill(C.light).strokeColor(color + "40").lineWidth(0.5).stroke();
                doc.rect(sx, Y, 3, splitH).fill(color);
                // Title
                doc.fontSize(6.5).font("Helvetica-Bold").fillColor(color)
                    .text(title, sx + 8, Y + 5, { lineBreak: false });
                // 6 mini stats inline
                const miniStats = [
                    { l: "Total",      v: String(data?.total ?? 0) },
                    { l: "In Stock",   v: String(data?.inStock ?? 0) },
                    { l: "Invested",   v: dINR(data?.totalInvested ?? 0) },
                    { l: "Revenue",    v: dINR(data?.totalRevenue ?? 0) },
                    { l: "Net Profit", v: dINR(data?.netProfit ?? 0) },
                    { l: "Balance Due",v: dINR(data?.totalBalancePending ?? 0) },
                ];
                const mW = (splitW - 12) / 6;
                miniStats.forEach(({ l, v }, mi) => {
                    const mx = sx + 8 + mi * mW;
                    doc.fontSize(4.8).font("Helvetica").fillColor(C.muted)
                        .text(l, mx, Y + 16, { width: mW - 2, lineBreak: false });
                    doc.fontSize(6.5).font("Helvetica-Bold").fillColor(l === "Net Profit" ? color : C.text)
                        .text(v, mx, Y + 24, { width: mW - 2, lineBreak: false });
                });
            });
            Y += splitH + 6;
        }

        // ── ALERTS BAND ──────────────────────────────────────────────────────
        const alertItems = [
            totalPurchaseDue  > 0 && { label: `Purchase Due to Sellers: ${dINR(totalPurchaseDue)} (${purchaseDue.length} vehicles)`,     color: C.red    },
            totalSalePending  > 0 && { label: `Sale Balance from Buyers: ${dINR(totalSalePending)} (${salePending.length} vehicles)`,     color: C.amber  },
            totalCashbackOwed > 0 && { label: `Cash-Back Owed to Buyers: ${dINR(totalCashbackOwed)} (${cashbackOwed.length} vehicles)`,   color: C.purple },
        ].filter(Boolean) as { label: string; color: string }[];

        if (alertItems.length > 0) {
            need(20);
            const aW = CW / alertItems.length;
            alertItems.forEach((a, i) => {
                const ax = MG + i * aW;
                doc.rect(ax, Y, aW - 2, 16).fill(a.color + "18").strokeColor(a.color + "60").lineWidth(0.4).stroke();
                doc.rect(ax, Y, 3, 16).fill(a.color);
                doc.fontSize(6.5).font("Helvetica-Bold").fillColor(a.color)
                    .text(a.label, ax + 8, Y + 4, { width: aW - 16, lineBreak: false });
            });
            Y += 20;
        }

        // ── SECTION B: PURCHASE PAYMENTS DUE TO SELLERS ─────────────────────
        if (purchaseDue.length > 0) {
            need(18);
            sectionHeader("Purchase Payments Due to Sellers", C.red,
                `${purchaseDue.length} vehicles  |  Total Due: ${dINR(totalPurchaseDue)}`);

            const pCols: [string, number, "left"|"right"|"center"][] = [
                ["#",              16, "center"],
                ["Vehicle ID",     52, "left"  ],
                ["Type",           44, "left"  ],
                ["Make / Model",  110, "left"  ],
                ["Reg No",         68, "left"  ],
                ["Seller",         96, "left"  ],
                ["Date Purch.",    62, "left"  ],
                ["Purchase Price", 78, "right" ],
                ["Amount Paid",    76, "right" ],
                ["Amount Due",     76, "right" ],
                ["Status",         68, "center"],
            ];

            const drawPurchaseHdr = () => {
                doc.rect(MG, Y, CW, 14).fill(C.navy);
                let hx = MG;
                pCols.forEach(([label, w, align]) => {
                    doc.fontSize(5.5).font("Helvetica-Bold").fillColor(C.white)
                        .text(label, hx + 2, Y + 4, { width: w - 4, align, lineBreak: false });
                    hx += w;
                });
                Y += 14;
            };
            drawPurchaseHdr();

            purchaseDue.forEach((v, idx) => {
                need(14, drawPurchaseHdr);
                doc.rect(MG, Y, CW, 14).fill(idx % 2 === 0 ? C.light : C.white);
                doc.moveTo(MG, Y + 14).lineTo(MG + CW, Y + 14)
                    .strokeColor(C.border).lineWidth(0.12).stroke();

                const paid    = (v.purchasePrice ?? 0) - (v.purchasePendingAmount ?? 0);
                const pending = v.purchasePendingAmount ?? 0;
                const psColor = v.purchasePaymentStatus === "partial" ? C.orange : C.red;
                const psLabel = v.purchasePaymentStatus === "partial" ? "Partial" : "Not Paid";

                const cells: [string, number, "left"|"right"|"center", string?][] = [
                    [`${idx + 1}`,                                    0, "center", C.muted],
                    [v.vehicleId ?? "-",                              1, "left"  ],
                    [v.vehicleType === "two_wheeler" ? "Two Whlr" : "Four Whlr", 2, "left", C.slate],
                    [trunc(`${v.make} ${v.model}`, 20),               3, "left"  ],
                    [v.registrationNo ?? "-",                         4, "left"  ],
                    [trunc(v.purchasedFrom ?? "-", 17),               5, "left", C.slate],
                    [dFmt(v.datePurchased),                           6, "left", C.muted],
                    [dINR(v.purchasePrice),                           7, "right" ],
                    [dINR(paid),                                      8, "right", C.green],
                    [dINR(pending),                                   9, "right", C.red  ],
                    [psLabel,                                        10, "center", psColor],
                ];
                let rx = MG;
                cells.forEach(([text, ci, align, color]) => {
                    const [, w] = pCols[ci];
                    doc.fontSize(6).font("Helvetica").fillColor(color ?? C.text)
                        .text(text, rx + 2, Y + 4, { width: w - 4, align, lineBreak: false });
                    rx += w;
                });
                Y += 14;
            });

            need(14);
            doc.rect(MG, Y, CW, 14).fill(C.navy);
            doc.fontSize(6).font("Helvetica-Bold").fillColor(C.white)
                .text(`${purchaseDue.length} vehicles  |  Total Pending: ${dINR(totalPurchaseDue)}`,
                    MG + 8, Y + 4, { lineBreak: false });
            Y += 14 + 6;
        }

        // ── SECTION C: SALE PAYMENTS PENDING FROM BUYERS ────────────────────
        if (salePending.length > 0) {
            need(18);
            sectionHeader("Sale Payments Pending from Buyers", C.amber,
                `${salePending.length} vehicles  |  Total Balance: ${dINR(totalSalePending)}`);

            const sCols: [string, number, "left"|"right"|"center"][] = [
                ["#",              16, "center"],
                ["Vehicle ID",     50, "left"  ],
                ["Type",           42, "left"  ],
                ["Make / Model",  106, "left"  ],
                ["Reg No",         66, "left"  ],
                ["Buyer",          92, "left"  ],
                ["Date Sold",      60, "left"  ],
                ["Sold Price",     72, "right" ],
                ["Collected",      70, "right" ],
                ["Balance Due",    72, "right" ],
                ["Sale Status",    74, "center"],
                ["NOC Status",     76, "center"],
            ];

            const nocLabel = (s: string | null | undefined): string => {
                if (!s || s === "not_applicable") return "N/A";
                if (s === "pending")   return "Pending";
                if (s === "received")  return "Received";
                if (s === "submitted") return "Submitted";
                if (s === "completed") return "Completed";
                return dSl(s);
            };
            const saleStatusLbl = (ss: string | null | undefined): string => {
                if (!ss) return "-";
                if (ss === "balance_pending")  return "Bal. Pending";
                if (ss === "noc_pending")      return "NOC Pending";
                if (ss === "noc_cash_pending") return "NOC+Cash Pend.";
                return dSl(ss);
            };
            const saleStatusClr = (ss: string | null | undefined): string => {
                if (ss === "noc_cash_pending") return C.red;
                if (ss === "balance_pending")  return C.amber;
                if (ss === "noc_pending")      return C.orange;
                return C.muted;
            };

            const drawSaleHdr = () => {
                doc.rect(MG, Y, CW, 14).fill(C.navy);
                let hx = MG;
                sCols.forEach(([label, w, align]) => {
                    doc.fontSize(5.5).font("Helvetica-Bold").fillColor(C.white)
                        .text(label, hx + 2, Y + 4, { width: w - 4, align, lineBreak: false });
                    hx += w;
                });
                Y += 14;
            };
            drawSaleHdr();

            salePending.forEach((v, idx) => {
                need(14, drawSaleHdr);
                doc.rect(MG, Y, CW, 14).fill(idx % 2 === 0 ? C.light : C.white);
                doc.moveTo(MG, Y + 14).lineTo(MG + CW, Y + 14)
                    .strokeColor(C.border).lineWidth(0.12).stroke();

                const cells: [string, number, "left"|"right"|"center", string?][] = [
                    [`${idx + 1}`,                                    0, "center", C.muted],
                    [v.vehicleId ?? "-",                              1, "left"  ],
                    [v.vehicleType === "two_wheeler" ? "Two Whlr" : "Four Whlr", 2, "left", C.slate],
                    [trunc(`${v.make} ${v.model}`, 20),               3, "left"  ],
                    [v.registrationNo ?? "-",                         4, "left"  ],
                    [trunc(v.soldTo ?? "-", 16),                      5, "left", C.slate],
                    [dFmt(v.dateSold),                                6, "left", C.muted],
                    [dINR(v.soldPrice),                               7, "right" ],
                    [dINR(v.receivedAmount),                          8, "right", C.cyan ],
                    [dINR(v.balanceAmount),                           9, "right", C.red  ],
                    [saleStatusLbl(v.saleStatus),                    10, "center", saleStatusClr(v.saleStatus)],
                    [nocLabel(v.nocStatus),                          11, "center", C.slate],
                ];
                let rx = MG;
                cells.forEach(([text, ci, align, color]) => {
                    const [, w] = sCols[ci];
                    doc.fontSize(6).font("Helvetica").fillColor(color ?? C.text)
                        .text(text, rx + 2, Y + 4, { width: w - 4, align, lineBreak: false });
                    rx += w;
                });
                Y += 14;
            });

            need(14);
            doc.rect(MG, Y, CW, 14).fill(C.navy);
            doc.fontSize(6).font("Helvetica-Bold").fillColor(C.white)
                .text(`${salePending.length} vehicles  |  Total Outstanding: ${dINR(totalSalePending)}`,
                    MG + 8, Y + 4, { lineBreak: false });
            Y += 14 + 6;
        }

        // ── SECTION D: CASH-BACK OWED TO BUYERS ─────────────────────────────
        if (cashbackOwed.length > 0) {
            need(18);
            sectionHeader("Cash-Back Owed to Buyers (Exchange Over-Trade)", C.purple,
                `${cashbackOwed.length} vehicles  |  Still Owed: ${dINR(totalCashbackOwed)}`);

            const cCols: [string, number, "left"|"right"|"center"][] = [
                ["#",               16, "center"],
                ["Vehicle ID",      52, "left"  ],
                ["Make / Model",   118, "left"  ],
                ["Reg No",          70, "left"  ],
                ["Buyer",          100, "left"  ],
                ["Sold Price",      80, "right" ],
                ["Exch. Value",     80, "right" ],
                ["Cash-Back Due",   84, "right" ],
                ["Paid Back",       80, "right" ],
                ["Still Owed",      86, "right" ],
            ];

            const drawCbHdr = () => {
                doc.rect(MG, Y, CW, 14).fill(C.navy);
                let hx = MG;
                cCols.forEach(([label, w, align]) => {
                    doc.fontSize(5.5).font("Helvetica-Bold").fillColor(C.white)
                        .text(label, hx + 2, Y + 4, { width: w - 4, align, lineBreak: false });
                    hx += w;
                });
                Y += 14;
            };
            drawCbHdr();

            cashbackOwed.forEach((v, idx) => {
                need(14, drawCbHdr);
                doc.rect(MG, Y, CW, 14).fill(idx % 2 === 0 ? C.light : C.white);
                doc.moveTo(MG, Y + 14).lineTo(MG + CW, Y + 14)
                    .strokeColor(C.border).lineWidth(0.12).stroke();

                const cbDue     = v.buyerCashBackDue ?? 0;
                const cbBalance = v.buyerCashBackBalance ?? cbDue;
                const paidBack  = cbDue - cbBalance;

                const cells: [string, number, "left"|"right"|"center", string?][] = [
                    [`${idx + 1}`,                          0, "center", C.muted  ],
                    [v.vehicleId ?? "-",                    1, "left",   C.purple ],
                    [trunc(`${v.make} ${v.model}`, 22),     2, "left"             ],
                    [v.registrationNo ?? "-",               3, "left"             ],
                    [trunc(v.soldTo ?? "-", 18),            4, "left",   C.slate  ],
                    [dINR(v.soldPrice),                     5, "right"            ],
                    [dINR(v.receivedAmount),                6, "right",  C.orange ],
                    [dINR(cbDue),                           7, "right",  C.purple ],
                    [paidBack > 0 ? dINR(paidBack) : "-",  8, "right",  C.green  ],
                    [dINR(cbBalance),                       9, "right",  C.red    ],
                ];
                let rx = MG;
                cells.forEach(([text, ci, align, color]) => {
                    const [, w] = cCols[ci];
                    doc.fontSize(6).font("Helvetica").fillColor(color ?? C.text)
                        .text(text, rx + 2, Y + 4, { width: w - 4, align, lineBreak: false });
                    rx += w;
                });
                Y += 14;
            });

            need(14);
            doc.rect(MG, Y, CW, 14).fill(C.navy);
            doc.fontSize(6).font("Helvetica-Bold").fillColor(C.white)
                .text(`${cashbackOwed.length} vehicles  |  Total Cash-Back Still Owed: ${dINR(totalCashbackOwed)}`,
                    MG + 8, Y + 4, { lineBreak: false });
            Y += 14 + 6;
        }

        // ── SECTION E: VEHICLE P&L TABLE (SOLD ONLY) ─────────────────────────
        {
            need(18);
            sectionHeader("Vehicle-wise P&L (Sold Vehicles Only)", C.indigo,
                `${vehicles.length} records  |  Net: ${(plProfit >= 0 ? "+" : "") + dINR(plProfit)}`);

            const cols: [string, number, "left"|"right"|"center"][] = [
                ["#",             16, "center"],
                ["Vehicle ID",    44, "left"  ],
                ["Type",          36, "left"  ],
                ["Make / Model",  88, "left"  ],
                ["Reg No",        64, "left"  ],
                ["Sold To",       62, "left"  ],
                ["Purchased",     48, "left"  ],
                ["Sold",          48, "left"  ],
                ["Invested",      64, "right" ],
                ["Sold Price",    62, "right" ],
                ["Received",      58, "right" ],
                ["P/L",           62, "right" ],
                ["P/L %",         36, "right" ],
                ["Days",          24, "center"],
                ["Status",        60, "center"],
            ];

            const ROW_H = 15;
            const HDR_H = 16;

            const ssColor = (ss: string | null | undefined): string => {
                if (!ss) return C.muted;
                if (ss === "fully_received")   return C.green;
                if (ss === "balance_pending" || ss === "noc_cash_pending") return C.amber;
                if (ss === "noc_pending")      return C.orange;
                if (ss === "cashback_pending") return C.purple;
                return C.muted;
            };
            const ssLabel = (ss: string | null | undefined): string => {
                if (!ss) return "-";
                if (ss === "fully_received")   return "Fully Paid";
                if (ss === "balance_pending")  return "Bal. Pending";
                if (ss === "noc_pending")      return "NOC Pending";
                if (ss === "noc_cash_pending") return "NOC+Cash";
                if (ss === "cashback_pending") return "Cash-Back Due";
                return dSl(ss);
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
                    .text("No sold vehicles match the selected filters.", MG + 12, Y + 10, { lineBreak: false });
                Y += 28;
            } else {
                vehicles.forEach((v, idx) => {
                    need(ROW_H, drawPLHdr);
                    doc.rect(MG, Y, CW, ROW_H).fill(idx % 2 === 0 ? C.light : C.white);
                    doc.moveTo(MG, Y + ROW_H).lineTo(MG + CW, Y + ROW_H)
                        .strokeColor(C.border).lineWidth(0.12).stroke();

                    const textY = Y + 4;
                    const pl    = v.profitLoss ?? 0;
                    const plPct = v.profitLossPercentage ?? 0;
                    const plCol = pl >= 0 ? C.green : C.red;
                    const isBal = (v.balanceAmount ?? 0) > 0;
                    const isExch = v.isFromExchange || v.isExchange;
                    // Effective received: cap at soldPrice for over-trade vehicles
                    const effReceived = Math.min(v.receivedAmount ?? v.soldPrice ?? 0, v.soldPrice ?? 0);

                    let rx = MG;
                    const cell = (text: string, ci: number, color?: string, bold?: boolean) => {
                        const [, w, align] = cols[ci];
                        doc.fontSize(6).font(bold ? "Helvetica-Bold" : "Helvetica")
                            .fillColor(color ?? C.text)
                            .text(text, rx + 2, textY, { width: w - 4, align, lineBreak: false });
                        rx += w;
                    };

                    cell(`${idx + 1}`,                                               0, C.muted);
                    cell(v.vehicleId ?? "-",                                         1, isExch ? C.cyan : C.text);
                    cell(v.vehicleType === "two_wheeler" ? "2W" : "4W",              2, C.slate);
                    cell(trunc(`${v.make} ${v.model}${v.year ? " " + v.year : ""}`, 22), 3);
                    cell(trunc(v.registrationNo, 14),                                4);
                    cell(trunc(v.soldTo ?? "-", 14),                                 5, C.slate);
                    cell(dFmt(v.datePurchased),                                      6, C.muted);
                    cell(dFmt(v.dateSold),                                           7, C.muted);
                    cell(dINR(v.totalInvestment),                                    8);
                    cell(dINR(v.soldPrice),                                          9);
                    cell(dINR(effReceived),                                         10, isBal ? C.amber : C.text);
                    cell((pl >= 0 ? "+" : "") + dINR(pl),                          11, plCol, true);
                    cell((plPct >= 0 ? "+" : "") + plPct.toFixed(1) + "%",         12, plCol);
                    cell(v.daysToSell != null ? `${v.daysToSell}d` : "-",          13, C.muted);

                    // Status cell (last — uses remaining rx)
                    const [, stW] = cols[14];
                    doc.fontSize(5.8).font("Helvetica-Bold").fillColor(ssColor(v.saleStatus))
                        .text(ssLabel(v.saleStatus), rx + 2, textY, { width: stW - 4, align: "center", lineBreak: false });

                    Y += ROW_H;
                });
            }

            // Totals band
            need(24);
            doc.rect(MG, Y, CW, 24).fill(C.navy);
            const marginPct = plInvested > 0
                ? `${plProfit >= 0 ? "+" : ""}${((plProfit / plInvested) * 100).toFixed(1)}%`
                : "0.0%";
            doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.white)
                .text(
                    `${vehicles.length} vehicles  |  Invested: ${dINR(plInvested)}  |  Revenue: ${dINR(plRevenue)}  |  Received: ${dINR(plReceived)}  |  Balance: ${dINR(plBalance)}  |  Net P/L: ${plProfit >= 0 ? "+" : ""}${dINR(plProfit)} (${marginPct})  |  ${profitCount} profit / ${lossCount} loss  |  Avg ${Math.round(avgDays || 0)}d`,
                    MG + 8, Y + 8, { lineBreak: false },
                );
            Y += 24;
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
