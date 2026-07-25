"use client";

import { useState } from "react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserX, X, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";

type Props = {
    staff: IStaff;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function DeleteStaffDialog({ staff, open, onOpenChange }: Props) {
    const [toastId, setToastId] = useState<string | number | undefined>();
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            setToastId(toast.loading("Deactivating…", { description: "Updating staff member status." }));
            return await axios.delete(`/staff/${staff._id}`);
        },
        onSuccess: () => {
            toast.success("Staff deactivated!", { id: toastId, description: `${staff.name} is now inactive.` });
            queryClient.invalidateQueries({ queryKey: ["staff"] });
            queryClient.invalidateQueries({ queryKey: ["staff-stats"] });
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: toastId, description: formatApiErrors(errorData?.errors) || errorData?.message || "Failed to deactivate staff" });
        },
    });

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="w-[92vw] max-w-md rounded-2xl p-6 bg-card border-border sm:w-full">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 shrink-0">
                        <UserX className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                        <AlertDialogTitle className="text-lg font-bold">Deactivate Staff Member?</AlertDialogTitle>
                        <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
                            Are you sure you want to deactivate <strong className="text-foreground">{staff.name}</strong> ({staff.staffId})?
                            <br />
                            They will be marked as inactive and hidden from active dropdowns, but past historical records will be preserved.
                        </AlertDialogDescription>
                    </div>
                </div>
                <div className="mt-6 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:justify-end sm:gap-3">
                    <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} className="cursor-pointer border-border hover:bg-muted">
                        <X size={16} className="mr-2" /> Cancel
                    </Button>
                    <Button variant="destructive" disabled={isPending} onClick={() => mutate()} className="cursor-pointer">
                        {isPending ? <><Loader2 size={16} className="mr-2 animate-spin" /> Deactivating…</> : <><UserX size={16} className="mr-2" /> Deactivate</>}
                    </Button>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
