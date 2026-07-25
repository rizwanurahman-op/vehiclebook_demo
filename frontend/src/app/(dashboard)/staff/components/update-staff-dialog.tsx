"use client";

import { useEffect, useState } from "react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRound, X, Save, Calendar, Loader2, IndianRupee, Phone } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateStaffSchema, type UpdateStaffFormData } from "@schemas/staff";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { formatDateInput } from "@/lib/date";

type Props = {
    staff: IStaff;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

const fetchRoles = async (): Promise<IStaffRole[]> => {
    const res = await axios.get<ApiResponse<IStaffRole[]>>("/staff-roles");
    return res.data.data ?? [];
};

export function UpdateStaffDialog({ staff, open, onOpenChange }: Props) {
    const [toastId, setToastId] = useState<string | number | undefined>();
    const queryClient = useQueryClient();

    const { data: roles = [] } = useQuery<IStaffRole[]>({
        queryKey: ["staff-roles"],
        queryFn: fetchRoles,
        enabled: open,
    });

    const form = useForm<UpdateStaffFormData>({
        resolver: zodResolver(updateStaffSchema),
        defaultValues: {
            name: staff.name,
            role: staff.role,
            phone: staff.phone || "",
            monthlySalary: staff.monthlySalary,
            joiningDate: formatDateInput(staff.joiningDate),
            isActive: staff.isActive,
            remarks: staff.remarks || "",
        },
    });

    useEffect(() => {
        if (open && staff) {
            form.reset({
                name: staff.name,
                role: staff.role,
                phone: staff.phone || "",
                monthlySalary: staff.monthlySalary,
                joiningDate: formatDateInput(staff.joiningDate),
                isActive: staff.isActive,
                remarks: staff.remarks || "",
            });
        }
    }, [open, staff, form]);

    const { mutate, isPending } = useMutation({
        mutationFn: async (values: UpdateStaffFormData) => {
            setToastId(toast.loading("Updating…", { description: "Saving staff member changes." }));
            return await axios.patch(`/staff/${staff._id}`, values);
        },
        onSuccess: () => {
            toast.success("Updated!", { id: toastId, description: "Staff details saved successfully." });
            queryClient.invalidateQueries({ queryKey: ["staff"] });
            queryClient.invalidateQueries({ queryKey: ["staff-stats"] });
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: toastId, description: formatApiErrors(errorData?.errors) || errorData?.message || "Failed to update staff" });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent onOpenAutoFocus={e => e.preventDefault()} className="w-[96vw] max-w-lg p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full">
                <div className="relative p-4 sm:p-6 bg-gradient-to-r from-violet-500/10 to-purple-600/10 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                            <UserRound className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">Edit Staff Member</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">Update details for {staff.name} ({staff.staffId})</DialogDescription>
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
                                            <Input placeholder="Full Name" className="h-10 bg-muted/50 border-border" {...field} />
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
                                                    {field.value && !roles.some(r => r.name === field.value) && (
                                                        <SelectItem value={field.value}>{field.value}</SelectItem>
                                                    )}
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
                                                    value={field.value ?? ""}
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

                                {/* Status Toggle */}
                                <FormField control={form.control} name="isActive" render={({ field }) => (
                                    <FormItem className="col-span-2 flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                                        <div>
                                            <FormLabel className="font-semibold text-sm cursor-pointer">Active Status</FormLabel>
                                            <p className="text-xs text-muted-foreground">Inactive staff won&apos;t appear in default active lists</p>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
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
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer border-border hover:bg-muted">
                                <X size={16} className="mr-2" /> Cancel
                            </Button>
                            <Button type="submit" disabled={isPending} className="cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90">
                                {isPending ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving…</> : <><Save size={16} className="mr-2" /> Save Changes</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
