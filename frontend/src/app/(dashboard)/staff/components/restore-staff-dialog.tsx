"use client";

import { useState } from "react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, X, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";

type Props = {
    staff: IStaff;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function RestoreStaffDialog({ staff, open, onOpenChange }: Props) {
    const [toastId, setToastId] = useState<string | number | undefined>();
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            setToastId(toast.loading("Restoring…", { description: "Reactivating staff member." }));
            return await axios.patch(`/staff/${staff._id}/restore`);
        },
        onSuccess: () => {
            toast.success("Staff restored!", { id: toastId, description: `${staff.name} is active again.` });
            queryClient.invalidateQueries({ queryKey: ["staff"] });
            queryClient.invalidateQueries({ queryKey: ["staff-stats"] });
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: toastId, description: formatApiErrors(errorData?.errors) || errorData?.message || "Failed to restore staff" });
        },
    });

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="w-[92vw] max-w-md rounded-2xl p-6 bg-card border-border sm:w-full">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <RotateCcw className="h-6 w-6" />
                    </div>
                    <div>
                        <AlertDialogTitle className="text-lg font-bold">Restore Staff Member?</AlertDialogTitle>
                        <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
                            Are you sure you want to reactivate <strong className="text-foreground">{staff.name}</strong> ({staff.staffId})?
                            <br />
                            They will be marked as active again and will appear in active staff lists.
                        </AlertDialogDescription>
                    </div>
                </div>
                <div className="mt-6 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:justify-end sm:gap-3">
                    <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} className="cursor-pointer border-border hover:bg-muted">
                        <X size={16} className="mr-2" /> Cancel
                    </Button>
                    <Button disabled={isPending} onClick={() => mutate()} className="cursor-pointer bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:opacity-90">
                        {isPending ? <><Loader2 size={16} className="mr-2 animate-spin" /> Restoring…</> : <><RotateCcw size={16} className="mr-2" /> Restore Staff</>}
                    </Button>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
