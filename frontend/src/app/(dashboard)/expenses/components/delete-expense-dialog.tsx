"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { formatINR } from "@lib/currency";

interface Props {
    expense: IExpense;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DeleteExpenseDialog({ expense, open, onOpenChange }: Props) {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: () => axios.delete(`/expenses/${expense._id}`),
        onSuccess: () => {
            toast.success("Expense deleted!");
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["expense-stats"] });
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const d = (error as AxiosError)?.response?.data as ErrorData;
            toast.error(formatApiErrors(d?.errors) || d?.message || "Failed to delete expense");
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[92vw] max-w-md rounded-2xl p-0 overflow-hidden bg-card border-border">
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">Delete Expense</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground">
                                This action cannot be undone.
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Expense ID</span>
                            <span className="font-mono font-semibold">{expense.expenseId}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-mono font-semibold text-destructive">{formatINR(expense.amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Category</span>
                            <span className="font-medium capitalize">{expense.category.replace("_", " ")}</span>
                        </div>
                        {expense.description && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Description</span>
                                <span className="text-right max-w-[180px] truncate">{expense.description}</span>
                            </div>
                        )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete this expense record? It will be permanently removed from your expense ledger.
                    </p>
                </div>

                <div className="border-t border-border bg-muted/30 p-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="cursor-pointer">
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => mutate()}
                        disabled={isPending}
                        className="cursor-pointer"
                    >
                        {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…</> : <><Trash2 className="h-4 w-4 mr-2" /> Delete</>}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
