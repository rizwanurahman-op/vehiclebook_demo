"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import {
    Home, Zap, Droplets, UserRound, Wrench, MoreHorizontal,
    Calendar, IndianRupee, Loader2, X, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { updateExpenseSchema, type UpdateExpenseFormData, expenseCategories, expensePaymentModes } from "@schemas/expense";
import { formatApiErrors } from "@/lib/formatApiErrors";

const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    room_rent:    { label: "Room Rent",    icon: Home,           color: "text-blue-600" },
    electricity:  { label: "Electricity",  icon: Zap,            color: "text-yellow-500" },
    water:        { label: "Water Bill",   icon: Droplets,       color: "text-cyan-500" },
    staff_salary: { label: "Staff Salary", icon: UserRound,      color: "text-violet-600" },
    maintenance:  { label: "Maintenance",  icon: Wrench,         color: "text-orange-500" },
    others:       { label: "Others",       icon: MoreHorizontal, color: "text-gray-500" },
};

interface Props {
    expense: IExpense;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UpdateExpenseDialog({ expense, open, onOpenChange }: Props) {
    const queryClient = useQueryClient();

    const form = useForm<UpdateExpenseFormData>({
        resolver: zodResolver(updateExpenseSchema),
        defaultValues: {
            category: expense.category,
            date: expense.date.slice(0, 10),
            amount: expense.amount,
            paymentMode: expense.paymentMode,
            staffName: expense.staffName ?? "",
            referenceNo: expense.referenceNo ?? "",
            description: expense.description ?? "",
            notes: expense.notes ?? "",
        },
    });

    const watchCategory = form.watch("category") ?? expense.category;
    const meta = CATEGORY_META[watchCategory];
    const Icon = meta.icon;

    const { data: staffList = [] } = useQuery<IStaff[]>({
        queryKey: ["staff-active-select"],
        queryFn: async () => {
            const res = await axios.get<ApiResponse<IStaff[]>>("/staff", { params: { isActive: "true", limit: 100 } });
            return res.data.data ?? [];
        },
        enabled: open && watchCategory === "staff_salary",
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (data: UpdateExpenseFormData) => axios.patch(`/expenses/${expense._id}`, data),
        onSuccess: () => {
            toast.success("Expense updated!");
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["expense-stats"] });
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const d = (error as AxiosError)?.response?.data as ErrorData;
            toast.error(formatApiErrors(d?.errors) || d?.message || "Failed to update expense");
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent onOpenAutoFocus={e => e.preventDefault()} className="w-[96vw] max-w-lg p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full">
                <div className="relative p-4 sm:p-6 bg-gradient-to-r from-rose-500/10 to-pink-600/10 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-lg bg-gradient-to-br from-rose-500 to-pink-600">
                            <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">Edit Expense</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                {expense.expenseId} · Update expense details
                            </DialogDescription>
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
                                                    value={field.value ?? ""}
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
                                            <Input placeholder="Brief description" className="h-10 bg-muted/50 border-border" {...field} />
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
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
                                <X size={16} className="mr-2" /> Cancel
                            </Button>
                            <Button type="submit" disabled={isPending} className="cursor-pointer bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:opacity-90">
                                {isPending ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving…</> : <><Pencil size={16} className="mr-2" /> Update</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
