"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@config/axios";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRound, Plus, Search, Loader2, IndianRupee, Users, Wallet, UserCheck, X, Phone, Calendar, Pencil, UserX, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, TableSkeleton, CurrencyDisplay, AdminOnly, TablePagination } from "@components/shared";
import { createStaffSchema, type CreateStaffFormData } from "@schemas/staff";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { formatINR } from "@lib/currency";
import { cn } from "@/lib/utils";
import { useDebounce } from "@hooks/use-debounce";
import { UpdateStaffDialog, DeleteStaffDialog, RestoreStaffDialog } from ".";

const StatCard = ({ label, value, sub, icon: Icon, gradient, textColor }: {
    label: string; value: string; sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string; textColor: string;
}) => (
    <div className={cn("relative rounded-2xl p-4 sm:p-5 pr-14 sm:pr-16 shadow-sm hover:shadow-md transition-all overflow-hidden min-w-0", gradient)}>
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-white/15 backdrop-blur-sm shadow-inner">
            <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", textColor)} />
        </div>
        <p className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold opacity-70 mb-1 truncate">{label}</p>
        <p className="font-mono font-bold tabular-nums text-lg sm:text-2xl leading-tight truncate">{value}</p>
        {sub && <p className="text-[10px] sm:text-[11px] mt-1 opacity-60 truncate">{sub}</p>}
    </div>
);

const fetchRoles = async (): Promise<IStaffRole[]> => {
    const res = await axios.get<ApiResponse<IStaffRole[]>>("/staff-roles");
    return res.data.data ?? [];
};

const fetchStats = async (): Promise<StaffStats> => {
    const res = await axios.get<ApiResponse<StaffStats>>("/staff/stats");
    return res.data.data ?? { total: 0, active: 0, totalMonthlyPayroll: 0 };
};

function CreateStaffDialog() {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: roles = [] } = useQuery<IStaffRole[]>({ queryKey: ["staff-roles"], queryFn: fetchRoles, enabled: open });

    const form = useForm<CreateStaffFormData>({
        resolver: zodResolver(createStaffSchema),
        defaultValues: { name: "", role: "", phone: "", monthlySalary: 0, joiningDate: "", remarks: "" },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (data: CreateStaffFormData) => axios.post("/staff", data),
        onSuccess: () => {
            toast.success("Staff member added!");
            queryClient.invalidateQueries({ queryKey: ["staff"] });
            queryClient.invalidateQueries({ queryKey: ["staff-stats"] });
            form.reset({ name: "", role: "", phone: "", monthlySalary: 0, joiningDate: "", remarks: "" });
            setOpen(false);
        },
        onError: (error: unknown) => {
            const d = (error as AxiosError)?.response?.data as ErrorData;
            toast.error(formatApiErrors(d?.errors) || d?.message || "Failed to add staff");
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg hover:opacity-90 cursor-pointer">
                    <Plus size={18} className="mr-2" /> Add Staff
                </Button>
            </DialogTrigger>
            <DialogContent onOpenAutoFocus={e => e.preventDefault()} className="w-[96vw] max-w-lg p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full">
                <div className="relative p-4 sm:p-6 bg-gradient-to-r from-violet-500/10 to-purple-600/10 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                            <UserRound className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">Add Staff Member</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">Fill in the staff details below</DialogDescription>
                        </div>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(d => mutate(d))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {/* Name */}
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel className="font-semibold">Full Name <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Mohammed Ashraf" className="h-10 bg-muted/50 border-border" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Role */}
                                <FormField control={form.control} name="role" render={({ field }) => (
                                    <FormItem className="col-span-2 sm:col-span-1">
                                        <FormLabel className="font-semibold">Role <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-10 bg-muted/50 border-border">
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roles.map(r => (
                                                        <SelectItem key={r._id} value={r.name}>{r.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Phone */}
                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem className="col-span-2 sm:col-span-1">
                                        <FormLabel className="font-semibold">Phone</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Phone size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                                                <Input placeholder="Mobile number" className="h-10 pl-9 bg-muted/50 border-border" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Monthly Salary */}
                                <FormField control={form.control} name="monthlySalary" render={({ field }) => (
                                    <FormItem className="col-span-2 sm:col-span-1">
                                        <FormLabel className="font-semibold">Monthly Salary (₹)</FormLabel>
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

                                {/* Joining Date */}
                                <FormField control={form.control} name="joiningDate" render={({ field }) => (
                                    <FormItem className="col-span-2 sm:col-span-1">
                                        <FormLabel className="font-semibold">Joining Date</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Calendar size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                                                <Input type="date" className="h-10 pl-9 bg-muted/50 border-border" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Remarks */}
                                <FormField control={form.control} name="remarks" render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel className="font-semibold">Remarks</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Any notes about this staff member…" rows={2} className="resize-none bg-muted/50 border-border" {...field} />
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
                            <Button type="submit" disabled={isPending} className="cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90">
                                {isPending ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving…</> : <><Plus size={16} className="mr-2" /> Add Staff</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

const PAGE_SIZE = 10;

export function StaffList() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("active");
    const [editingStaff, setEditingStaff] = useState<IStaff | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deletingStaff, setDeletingStaff] = useState<IStaff | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [restoringStaff, setRestoringStaff] = useState<IStaff | null>(null);
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const debouncedSearch = useDebounce(search, 350);

    const { data: roles = [] } = useQuery<IStaffRole[]>({ queryKey: ["staff-roles"], queryFn: fetchRoles });
    const { data: stats } = useQuery<StaffStats>({ queryKey: ["staff-stats"], queryFn: fetchStats });

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, roleFilter, statusFilter]);

    const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (roleFilter !== "all") params.role = roleFilter;
    if (statusFilter !== "all") params.isActive = statusFilter === "active" ? "true" : "false";

    const { data: staffData, isLoading } = useQuery<{ data: IStaff[]; meta: PaginationMeta }>({
        queryKey: ["staff", params],
        queryFn: async () => {
            const res = await axios.get<ApiResponse<IStaff[]>>("/staff", { params });
            return { data: res.data.data ?? [], meta: res.data.meta ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 } };
        },
        placeholderData: (prev) => prev,
    });

    const staffList = staffData?.data ?? [];
    const meta = staffData?.meta ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

    const handleEdit = (staff: IStaff) => {
        setEditingStaff(staff);
        setEditDialogOpen(true);
    };

    const handleDelete = (staff: IStaff) => {
        setDeletingStaff(staff);
        setDeleteDialogOpen(true);
    };

    const handleRestore = (staff: IStaff) => {
        setRestoringStaff(staff);
        setRestoreDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                        <UserRound className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Staff</h1>
                        <p className="text-sm text-muted-foreground">Shop staff members and their details</p>
                    </div>
                </div>
                <AdminOnly>
                    <CreateStaffDialog />
                </AdminOnly>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="Total Staff" value={String(stats?.total ?? 0)} icon={Users}
                    gradient="bg-gradient-to-br from-violet-500/15 to-purple-600/15" textColor="text-violet-600" />
                <StatCard label="Active Staff" value={String(stats?.active ?? 0)} icon={UserCheck}
                    gradient="bg-gradient-to-br from-emerald-500/15 to-green-600/15" textColor="text-emerald-600" />
                <StatCard label="Monthly Payroll" value={formatINR(stats?.totalMonthlyPayroll ?? 0)} icon={Wallet}
                    gradient="bg-gradient-to-br from-amber-500/15 to-orange-500/15" textColor="text-amber-600" />
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, ID, phone, role…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="h-9 pl-9 bg-muted/50 border-border"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:w-auto">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="h-9 w-full sm:w-[160px] bg-muted/50 border-border text-sm">
                            <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            {roles.map(r => <SelectItem key={r._id} value={r.name}>{r.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 w-full sm:w-[140px] bg-muted/50 border-border text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table / Cards Container */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-4"><TableSkeleton rows={5} /></div>
                ) : staffList.length === 0 ? (
                    <EmptyState icon={UserRound} title="No staff found" description="Add your first staff member using the button above" />
                ) : (
                    <>
                        {/* Mobile Card View */}
                        <div className="grid grid-cols-1 gap-3 p-4 md:hidden bg-muted/10">
                            {staffList.map(s => (
                                <div key={s._id} className="flex flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-mono text-xs font-semibold text-muted-foreground">{s.staffId}</span>
                                            <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 truncate">
                                                {s.role}
                                            </Badge>
                                        </div>
                                        <Badge className={cn("text-xs shrink-0", s.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                                            {s.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base text-foreground leading-snug">{s.name}</h3>
                                        {s.phone && <p className="text-xs text-muted-foreground mt-0.5">{s.phone}</p>}
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                                        <div>
                                            <span className="text-muted-foreground">Monthly Salary: </span>
                                            <span className="font-mono font-bold text-foreground"><CurrencyDisplay amount={s.monthlySalary} /></span>
                                        </div>
                                        {s.joiningDate && (
                                            <span className="text-muted-foreground">
                                                Joined {new Date(s.joiningDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                                            </span>
                                        )}
                                    </div>
                                    <AdminOnly>
                                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                                            <Button
                                                size="sm" variant="outline"
                                                className="h-8 text-xs cursor-pointer border-border"
                                                onClick={() => handleEdit(s)}
                                            >
                                                <Pencil className="h-3.5 w-3.5 mr-1.5 text-violet-600" /> Edit
                                            </Button>
                                            {s.isActive ? (
                                                <Button
                                                    size="sm" variant="outline"
                                                    className="h-8 text-xs text-destructive hover:text-destructive cursor-pointer border-border"
                                                    onClick={() => handleDelete(s)}
                                                >
                                                    <UserX className="h-3.5 w-3.5 mr-1.5" /> Deactivate
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm" variant="outline"
                                                    className="h-8 text-xs text-emerald-600 hover:text-emerald-700 cursor-pointer border-border"
                                                    onClick={() => handleRestore(s)}
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore
                                                </Button>
                                            )}
                                        </div>
                                    </AdminOnly>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold text-center w-12">#</TableHead>
                                        <TableHead className="font-semibold">ID</TableHead>
                                        <TableHead className="font-semibold">Name</TableHead>
                                        <TableHead className="font-semibold">Role</TableHead>
                                        <TableHead className="font-semibold">Phone</TableHead>
                                        <TableHead className="font-semibold text-right">Monthly Salary</TableHead>
                                        <TableHead className="font-semibold">Joined</TableHead>
                                        <TableHead className="font-semibold">Status</TableHead>
                                        <TableHead className="font-semibold text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {staffList.map((s, index) => {
                                        const rowNum = (page - 1) * PAGE_SIZE + index + 1;
                                        return (
                                            <TableRow key={s._id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="text-center font-mono text-xs text-muted-foreground">{rowNum}</TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">{s.staffId}</TableCell>
                                                <TableCell className="font-medium">{s.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                                        {s.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{s.phone || "—"}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">
                                                    <CurrencyDisplay amount={s.monthlySalary} />
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {s.joiningDate ? new Date(s.joiningDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn("text-xs", s.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                                                        {s.isActive ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <AdminOnly>
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-muted-foreground hover:text-violet-600 hover:bg-violet-500/10 dark:hover:text-violet-400 dark:hover:bg-violet-500/20 cursor-pointer transition-colors"
                                                                title="Edit staff details"
                                                                onClick={() => handleEdit(s)}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            {s.isActive ? (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                                                                    title="Deactivate staff member"
                                                                    onClick={() => handleDelete(s)}
                                                                >
                                                                    <UserX className="h-3.5 w-3.5" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 dark:hover:text-emerald-400 cursor-pointer transition-colors"
                                                                    title="Restore staff member"
                                                                    onClick={() => handleRestore(s)}
                                                                >
                                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
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
                            limit={PAGE_SIZE}
                            onPageChange={setPage}
                        />
                    </>
                )}
            </div>

            {/* Edit Dialog */}
            {editingStaff && (
                <UpdateStaffDialog
                    staff={editingStaff}
                    open={editDialogOpen}
                    onOpenChange={open => {
                        setEditDialogOpen(open);
                        if (!open) setEditingStaff(null);
                    }}
                />
            )}

            {/* Delete/Deactivate Confirmation Dialog */}
            {deletingStaff && (
                <DeleteStaffDialog
                    staff={deletingStaff}
                    open={deleteDialogOpen}
                    onOpenChange={open => {
                        setDeleteDialogOpen(open);
                        if (!open) setDeletingStaff(null);
                    }}
                />
            )}

            {/* Restore Confirmation Dialog */}
            {restoringStaff && (
                <RestoreStaffDialog
                    staff={restoringStaff}
                    open={restoreDialogOpen}
                    onOpenChange={open => {
                        setRestoreDialogOpen(open);
                        if (!open) setRestoringStaff(null);
                    }}
                />
            )}
        </div>
    );
}
