"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@config/axios";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    ReceiptText, Plus, Search, Loader2, IndianRupee, X, Calendar,
    Home, Zap, Droplets, UserRound, Wrench, MoreHorizontal,
    Download, FileSpreadsheet, ChevronDown, Trash2, Pencil,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState, TableSkeleton, CurrencyDisplay, AdminOnly, TablePagination } from "@components/shared";
import { createExpenseSchema, type CreateExpenseFormData, expenseCategories, expensePaymentModes } from "@schemas/expense";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { formatINR } from "@lib/currency";
import { cn } from "@/lib/utils";
import { useDebounce } from "@hooks/use-debounce";
import { UpdateExpenseDialog, DeleteExpenseDialog } from ".";

// ── Category Metadata ──────────────────────────────────────────────────────────
const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
    room_rent:    { label: "Room Rent",    icon: Home,           color: "text-blue-600",   bg: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
    electricity:  { label: "Electricity",  icon: Zap,            color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" },
    water:        { label: "Water Bill",   icon: Droplets,       color: "text-cyan-500",   bg: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300" },
    staff_salary: { label: "Staff Salary", icon: UserRound,      color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" },
    maintenance:  { label: "Maintenance",  icon: Wrench,         color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" },
    others:       { label: "Others",       icon: MoreHorizontal, color: "text-gray-500",   bg: "bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300" },
};

const formatEntryCount = (count?: number) => {
    if (!count || count === 0) return "No entries";
    if (count === 1) return "1 entry";
    return `${count} entries`;
};

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard = ({
    label, value, sub, icon: Icon, gradient, textColor, active, onClick, percent,
}: {
    label: string; value: string; sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string; textColor: string; active?: boolean;
    onClick?: () => void; percent?: number;
}) => (
    <div
        onClick={onClick}
        className={cn(
            "group relative rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all border cursor-pointer flex flex-col justify-between min-w-0",
            active ? "border-primary ring-2 ring-primary/20 shadow-md bg-card" : "border-border/60 hover:border-primary/40 bg-card/60 hover:bg-card",
            gradient
        )}
    >
        <div className="flex items-center justify-between mb-3 gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{label}</span>
            <div className="flex items-center gap-1.5 shrink-0">
                {percent !== undefined && percent > 0 && (
                    <Badge variant="secondary" className="text-[11px] px-2 py-0.5 font-mono font-semibold bg-primary/10 text-primary border-0">
                        {percent}%
                    </Badge>
                )}
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-background/80 shadow-sm border border-border/40">
                    <Icon className={cn("h-4 w-4", textColor)} />
                </div>
            </div>
        </div>
        <div className="space-y-1 min-w-0">
            <p className="font-mono font-bold tabular-nums text-xl sm:text-2xl text-foreground leading-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
    </div>
);

// ── Category Badge ─────────────────────────────────────────────────────────────
function CategoryBadge({ category }: { category: ExpenseCategory }) {
    const meta = CATEGORY_META[category];
    const Icon = meta.icon;
    return (
        <Badge className={cn("flex items-center gap-1 text-xs font-medium px-2 py-0.5 border-0 shrink-0", meta.bg)}>
            <Icon className="h-3 w-3" />
            {meta.label}
        </Badge>
    );
}

// ── Create Expense Dialog ──────────────────────────────────────────────────────
function CreateExpenseDialog() {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const form = useForm<CreateExpenseFormData>({
        resolver: zodResolver(createExpenseSchema),
        defaultValues: {
            category: "room_rent",
            date: new Date().toISOString().split("T")[0],
            amount: 0,
            paymentMode: "Cash",
            staffName: "",
            referenceNo: "",
            description: "",
            notes: "",
        },
    });

    const watchCategory = form.watch("category");

    const { data: staffList = [] } = useQuery<IStaff[]>({
        queryKey: ["staff-active-select"],
        queryFn: async () => {
            const res = await axios.get<ApiResponse<IStaff[]>>("/staff", { params: { isActive: "true", limit: 100 } });
            return res.data.data ?? [];
        },
        enabled: open && watchCategory === "staff_salary",
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (data: CreateExpenseFormData) => axios.post("/expenses", data),
        onSuccess: () => {
            toast.success("Expense recorded!");
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["expense-stats"] });
            form.reset({
                category: "room_rent",
                date: new Date().toISOString().split("T")[0],
                amount: 0,
                paymentMode: "Cash",
                staffName: "",
            });
            setOpen(false);
        },
        onError: (error: unknown) => {
            const d = (error as AxiosError)?.response?.data as ErrorData;
            toast.error(formatApiErrors(d?.errors) || d?.message || "Failed to record expense");
        },
    });

    const meta = CATEGORY_META[watchCategory];
    const Icon = meta.icon;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg hover:opacity-90 cursor-pointer">
                    <Plus size={18} className="mr-2" /> Add Expense
                </Button>
            </DialogTrigger>
            <DialogContent onOpenAutoFocus={e => e.preventDefault()} className="w-[96vw] max-w-lg p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full">
                <div className="relative p-4 sm:p-6 bg-gradient-to-r from-rose-500/10 to-pink-600/10 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-lg bg-gradient-to-br from-rose-500 to-pink-600")}>
                            <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">Record Expense</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">{meta.label} — fill in the expense details</DialogDescription>
                        </div>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(d => mutate(d))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 space-y-4">
                            {/* Category selector */}
                            <div>
                                <p className="text-sm font-semibold mb-2">Category <span className="text-destructive">*</span></p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {expenseCategories.map(cat => {
                                        const m = CATEGORY_META[cat];
                                        const CatIcon = m.icon;
                                        return (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => form.setValue("category", cat)}
                                                className={cn(
                                                    "flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 text-center transition-all cursor-pointer",
                                                    watchCategory === cat
                                                        ? "border-primary bg-primary/10 shadow-sm"
                                                        : "border-border bg-muted/30 hover:bg-muted/60"
                                                )}
                                            >
                                                <CatIcon className={cn("h-5 w-5", watchCategory === cat ? m.color : "text-muted-foreground")} />
                                                <span className={cn("text-[10px] font-medium leading-tight", watchCategory === cat ? "text-foreground" : "text-muted-foreground")}>
                                                    {m.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Date */}
                                <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem className="col-span-2 sm:col-span-1">
                                        <FormLabel className="font-semibold">Date <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Calendar size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                                                <Input type="date" className="h-10 pl-9 bg-muted/50 border-border" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Amount */}
                                <FormField control={form.control} name="amount" render={({ field }) => (
                                    <FormItem className="col-span-2 sm:col-span-1">
                                        <FormLabel className="font-semibold">Amount (₹) <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <IndianRupee size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    type="number" min="0" step="1"
                                                    className="h-10 pl-9 bg-muted/50 border-border"
                                                    value={field.value || ""}
                                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Payment Mode */}
                                <FormField control={form.control} name="paymentMode" render={({ field }) => (
                                    <FormItem className="col-span-2 sm:col-span-1">
                                        <FormLabel className="font-semibold">Payment Mode <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-10 bg-muted/50 border-border">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {expensePaymentModes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Staff Select / Name (for staff_salary) */}
                                {watchCategory === "staff_salary" && (
                                    <FormField control={form.control} name="staffName" render={({ field }) => (
                                        <FormItem className="col-span-2 sm:col-span-1">
                                            <FormLabel className="font-semibold">Staff Member</FormLabel>
                                            <FormControl>
                                                {staffList.length > 0 ? (
                                                    <Select
                                                        onValueChange={(staffId) => {
                                                            const selected = staffList.find(s => s._id === staffId);
                                                            if (selected) {
                                                                field.onChange(selected.name);
                                                                if (selected.monthlySalary) {
                                                                    form.setValue("amount", selected.monthlySalary);
                                                                }
                                                            }
                                                        }}
                                                        value={staffList.find(s => s.name === field.value)?._id || ""}
                                                    >
                                                        <SelectTrigger className="h-10 bg-muted/50 border-border">
                                                            <SelectValue placeholder="Select staff member" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {staffList.map(s => (
                                                                <SelectItem key={s._id} value={s._id}>
                                                                    {s.staffId} — {s.name} ({s.role})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Input placeholder="Enter staff name" className="h-10 bg-muted/50 border-border" {...field} />
                                                )}
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                )}

                                {/* Reference No */}
                                <FormField control={form.control} name="referenceNo" render={({ field }) => (
                                    <FormItem className="col-span-2 sm:col-span-1">
                                        <FormLabel className="font-semibold">Reference No</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Cheque/UPI ref" className="h-10 bg-muted/50 border-border" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Description */}
                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel className="font-semibold">Description</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Brief description of this expense" className="h-10 bg-muted/50 border-border" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Notes */}
                                <FormField control={form.control} name="notes" render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel className="font-semibold">Notes</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Optional notes…" rows={2} className="resize-none bg-muted/50 border-border" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        <div className="border-t border-border bg-muted/30 p-4 sm:p-5 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
                                <X size={16} className="mr-2" /> Cancel
                            </Button>
                            <Button type="submit" disabled={isPending} className="cursor-pointer bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:opacity-90">
                                {isPending ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving…</> : <><Plus size={16} className="mr-2" /> Record</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// ── Date Preset ────────────────────────────────────────────────────────────────
type DatePreset = "all" | "today" | "this_week" | "this_month" | "this_year" | "custom";
const getPresetRange = (p: DatePreset) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (p === "today") { const t = fmt(now); return { dateFrom: t, dateTo: t }; }
    if (p === "this_week") { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); return { dateFrom: fmt(s), dateTo: fmt(now) }; }
    if (p === "this_month") return { dateFrom: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: fmt(now) };
    if (p === "this_year") return { dateFrom: fmt(new Date(now.getFullYear(), 0, 1)), dateTo: fmt(now) };
    return {};
};

const PAGE_SIZE = 10;

// ── Main Expense List ──────────────────────────────────────────────────────────
export function ExpenseList() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");
    const [modeFilter, setModeFilter] = useState("all");
    const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [editingExpense, setEditingExpense] = useState<IExpense | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deletingExpense, setDeletingExpense] = useState<IExpense | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isExporting, setIsExporting] = useState<"csv" | null>(null);
    const debouncedSearch = useDebounce(search, 350);

    const { dateFrom: presetFrom, dateTo: presetTo } = getPresetRange(datePreset);
    const effectiveDateFrom = datePreset === "custom" ? dateFrom : presetFrom;
    const effectiveDateTo = datePreset === "custom" ? dateTo : presetTo;

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, categoryFilter, modeFilter, datePreset, dateFrom, dateTo]);

    const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (categoryFilter !== "all") params.category = categoryFilter;
    if (modeFilter !== "all") params.paymentMode = modeFilter;
    if (effectiveDateFrom) params.dateFrom = effectiveDateFrom;
    if (effectiveDateTo) params.dateTo = effectiveDateTo;

    const { data: expenseData, isLoading } = useQuery<{ data: IExpense[]; meta: PaginationMeta }>({
        queryKey: ["expenses", params],
        queryFn: async () => {
            const res = await axios.get<ApiResponse<IExpense[]>>("/expenses", { params });
            return { data: res.data.data ?? [], meta: res.data.meta ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 } };
        },
        placeholderData: (prev) => prev,
    });

    const statsParams: Record<string, string> = {};
    if (effectiveDateFrom) statsParams.dateFrom = effectiveDateFrom;
    if (effectiveDateTo) statsParams.dateTo = effectiveDateTo;

    const { data: stats } = useQuery<ExpenseStats>({
        queryKey: ["expense-stats", statsParams],
        queryFn: async () => {
            const res = await axios.get<ApiResponse<ExpenseStats>>("/expenses/stats", { params: statsParams });
            return res.data.data ?? { totalAmount: 0, totalCount: 0, categoryBreakdown: {}, modeBreakdown: {} };
        },
    });

    const expenses = expenseData?.data ?? [];
    const meta = expenseData?.meta ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

    const handleEdit = (exp: IExpense) => {
        setEditingExpense(exp);
        setEditDialogOpen(true);
    };

    const handleDelete = (exp: IExpense) => {
        setDeletingExpense(exp);
        setDeleteDialogOpen(true);
    };

    const handleExport = async (format: "csv") => {
        setIsExporting(format);
        const tid = toast.loading(`Preparing ${format.toUpperCase()} export…`);
        try {
            const exportParams = { ...params, format };
            const res = await axios.get("/expenses/export", { params: exportParams, responseType: "blob" });
            const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("CSV export completed!", { id: tid });
        } catch {
            toast.error("Export failed", { id: tid });
        } finally {
            setIsExporting(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg">
                        <ReceiptText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Expenses</h1>
                        <p className="text-sm text-muted-foreground">Track all operating costs</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="cursor-pointer border-border" disabled={!!isExporting}>
                                {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                                Export <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleExport("csv")} disabled={isExporting === "csv"} className="gap-2 cursor-pointer">
                                <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Export CSV
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <AdminOnly>
                        <CreateExpenseDialog />
                    </AdminOnly>
                </div>
            </div>

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Total Expenses Hero Card */}
                <div
                    onClick={() => setCategoryFilter("all")}
                    className={cn(
                        "group relative rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border cursor-pointer bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-purple-500/10 border-rose-500/30 flex flex-col justify-between col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2 min-w-0",
                        categoryFilter === "all" ? "ring-2 ring-rose-500/40 border-rose-500 shadow-md" : ""
                    )}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shrink-0">
                                <ReceiptText className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Total Expenses</span>
                                <p className="text-xs text-muted-foreground mt-0.5">{formatEntryCount(stats?.totalCount ?? 0)}</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="text-xs border-rose-500/30 text-rose-600 dark:text-rose-400 font-mono font-semibold">
                            Overall Summary
                        </Badge>
                    </div>
                    <p className="font-mono font-bold tabular-nums text-2xl sm:text-3xl text-foreground leading-tight">
                        {formatINR(stats?.totalAmount ?? 0)}
                    </p>
                </div>

                {/* 6 Category Stat Cards */}
                {expenseCategories.map(cat => {
                    const m = CATEGORY_META[cat];
                    const Icon = m.icon;
                    const catStats = stats?.categoryBreakdown?.[cat];
                    const catTotal = catStats?.total ?? 0;
                    const totalSum = stats?.totalAmount ?? 0;
                    const percent = totalSum > 0 ? Math.round((catTotal / totalSum) * 100) : 0;
                    return (
                        <StatCard
                            key={cat}
                            label={m.label}
                            value={formatINR(catTotal)}
                            sub={formatEntryCount(catStats?.count)}
                            icon={Icon}
                            gradient=""
                            textColor={m.color}
                            active={categoryFilter === cat}
                            onClick={() => setCategoryFilter(cat)}
                            percent={percent}
                        />
                    );
                })}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 max-w-full sm:flex-wrap">
                <button
                    onClick={() => setCategoryFilter("all")}
                    className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
                        categoryFilter === "all"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                >
                    All Categories
                </button>
                {expenseCategories.map(cat => {
                    const m = CATEGORY_META[cat];
                    const Icon = m.icon;
                    return (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={cn(
                                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
                                categoryFilter === cat
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                        >
                            <Icon className="h-3 w-3" />
                            {m.label}
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search expenses…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="h-9 pl-9 bg-muted/50 border-border"
                    />
                    {search && <button onClick={() => setSearch("")} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:w-auto">
                    <Select value={modeFilter} onValueChange={setModeFilter}>
                        <SelectTrigger className="h-9 w-full sm:w-[150px] bg-muted/50 border-border text-sm">
                            <SelectValue placeholder="All Modes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Modes</SelectItem>
                            {expensePaymentModes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={datePreset} onValueChange={v => setDatePreset(v as DatePreset)}>
                        <SelectTrigger className="h-9 w-full sm:w-[150px] bg-muted/50 border-border text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="this_week">This Week</SelectItem>
                            <SelectItem value="this_month">This Month</SelectItem>
                            <SelectItem value="this_year">This Year</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {datePreset === "custom" && (
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-full sm:w-[140px] bg-muted/50 border-border text-sm" />
                        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-full sm:w-[140px] bg-muted/50 border-border text-sm" />
                    </div>
                )}
            </div>

            {/* Table Container */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-4"><TableSkeleton rows={6} /></div>
                ) : expenses.length === 0 ? (
                    <EmptyState icon={ReceiptText} title="No expenses found" description="Record your first expense using the button above" />
                ) : (
                    <>
                        {/* Mobile Cards */}
                        <div className="grid grid-cols-1 gap-3 p-4 md:hidden bg-muted/10">
                            {expenses.map(exp => (
                                <div key={exp._id} className="flex flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-semibold text-muted-foreground">{exp.expenseId}</span>
                                            <CategoryBadge category={exp.category} />
                                        </div>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {new Date(exp.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">
                                                {exp.description || CATEGORY_META[exp.category]?.label || "Expense"}
                                            </p>
                                            {exp.staffName && (
                                                <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                                                    Staff: {exp.staffName}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-mono font-bold text-base text-foreground"><CurrencyDisplay amount={exp.amount} /></p>
                                            <Badge variant="outline" className="text-[10px] mt-0.5">{exp.paymentMode}</Badge>
                                        </div>
                                    </div>
                                    <AdminOnly>
                                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                                            <Button
                                                size="sm" variant="outline"
                                                className="h-8 text-xs cursor-pointer border-border"
                                                onClick={() => handleEdit(exp)}
                                            >
                                                <Pencil className="h-3.5 w-3.5 mr-1.5 text-rose-600" /> Edit
                                            </Button>
                                            <Button
                                                size="sm" variant="outline"
                                                className="h-8 text-xs text-destructive hover:text-destructive cursor-pointer border-border"
                                                onClick={() => handleDelete(exp)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                                            </Button>
                                        </div>
                                    </AdminOnly>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold text-center w-12">#</TableHead>
                                        <TableHead className="font-semibold">ID</TableHead>
                                        <TableHead className="font-semibold">Date</TableHead>
                                        <TableHead className="font-semibold">Category</TableHead>
                                        <TableHead className="font-semibold">Description</TableHead>
                                        <TableHead className="font-semibold">Staff</TableHead>
                                        <TableHead className="font-semibold">Mode</TableHead>
                                        <TableHead className="font-semibold text-right">Amount</TableHead>
                                        <TableHead className="font-semibold text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenses.map((exp, index) => {
                                        const rowNum = (page - 1) * PAGE_SIZE + index + 1;
                                        return (
                                            <TableRow key={exp._id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="text-center font-mono text-xs text-muted-foreground">{rowNum}</TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">{exp.expenseId}</TableCell>
                                                <TableCell className="text-sm whitespace-nowrap">
                                                    {new Date(exp.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                                </TableCell>
                                                <TableCell><CategoryBadge category={exp.category} /></TableCell>
                                                <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                                                    {exp.description || "—"}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {exp.staffName ? (
                                                        <span className="text-violet-600 dark:text-violet-400 font-medium">{exp.staffName}</span>
                                                    ) : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">{exp.paymentMode}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-semibold">
                                                    <CurrencyDisplay amount={exp.amount} />
                                                </TableCell>
                                                <TableCell>
                                                    <AdminOnly>
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Button
                                                                size="icon" variant="ghost"
                                                                className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:bg-rose-500/20 cursor-pointer transition-colors"
                                                                title="Edit expense"
                                                                onClick={() => handleEdit(exp)}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                size="icon" variant="ghost"
                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                                                                title="Delete expense"
                                                                onClick={() => handleDelete(exp)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </AdminOnly>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <TablePagination
                            page={page}
                            totalPages={meta.totalPages}
                            total={meta.total}
                            limit={meta.limit}
                            onPageChange={setPage}
                        />
                    </>
                )}
            </div>

            {/* Edit Dialog */}
            {editingExpense && (
                <UpdateExpenseDialog
                    expense={editingExpense}
                    open={editDialogOpen}
                    onOpenChange={open => {
                        setEditDialogOpen(open);
                        if (!open) setEditingExpense(null);
                    }}
                />
            )}

            {/* Delete Dialog */}
            {deletingExpense && (
                <DeleteExpenseDialog
                    expense={deletingExpense}
                    open={deleteDialogOpen}
                    onOpenChange={open => {
                        setDeleteDialogOpen(open);
                        if (!open) setDeletingExpense(null);
                    }}
                />
            )}
        </div>
    );
}
