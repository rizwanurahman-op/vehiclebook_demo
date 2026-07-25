"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@config/axios";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tags, Plus, Trash2, Loader2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { AdminOnly } from "@components/shared";
import { createStaffRoleSchema, type CreateStaffRoleFormData } from "@schemas/staff-role";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { cn } from "@/lib/utils";

const fetchRoles = async (): Promise<IStaffRole[]> => {
    const res = await axios.get<ApiResponse<IStaffRole[]>>("/staff-roles", { params: { includeInactive: true } });
    return res.data.data ?? [];
};

export function StaffRoleList() {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { data: roles = [], isLoading } = useQuery<IStaffRole[]>({
        queryKey: ["staff-roles"],
        queryFn: fetchRoles,
    });

    const form = useForm<CreateStaffRoleFormData>({
        resolver: zodResolver(createStaffRoleSchema),
        defaultValues: { name: "" },
    });

    // Create
    const { mutate: createRole, isPending: isCreating } = useMutation({
        mutationFn: (data: CreateStaffRoleFormData) => axios.post("/staff-roles", data),
        onSuccess: () => {
            toast.success("Role created!");
            form.reset();
            queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
        },
        onError: (error: unknown) => {
            const d = (error as AxiosError)?.response?.data as ErrorData;
            toast.error(formatApiErrors(d?.errors) || d?.message || "Failed to create role");
        },
    });

    // Update
    const { mutate: updateRole, isPending: isUpdating } = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => axios.patch(`/staff-roles/${id}`, { name }),
        onSuccess: () => {
            toast.success("Role renamed!");
            setEditingId(null);
            queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
            queryClient.invalidateQueries({ queryKey: ["staff"] });
        },
        onError: (error: unknown) => {
            const d = (error as AxiosError)?.response?.data as ErrorData;
            toast.error(formatApiErrors(d?.errors) || d?.message || "Failed to rename role");
        },
    });

    // Delete
    const { mutate: deleteRole, isPending: isDeleting } = useMutation({
        mutationFn: (id: string) => axios.delete(`/staff-roles/${id}`),
        onSuccess: () => {
            toast.success("Role deleted!");
            setDeletingId(null);
            queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
        },
        onError: (error: unknown) => {
            const d = (error as AxiosError)?.response?.data as ErrorData;
            toast.error(d?.message || "Failed to delete role");
            setDeletingId(null);
        },
    });

    const startEdit = (role: IStaffRole) => {
        setEditingId(role._id);
        setEditName(role.name);
    };

    const cancelEdit = () => setEditingId(null);

    const confirmEdit = () => {
        if (!editingId || !editName.trim()) return;
        updateRole({ id: editingId, name: editName.trim() });
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                        <Tags className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Staff Roles</h1>
                        <p className="text-sm text-muted-foreground">Create and manage roles assigned to staff members</p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Tags className="h-4 w-4 text-violet-500" />
                        <h2 className="font-semibold text-foreground">All Roles</h2>
                        <Badge variant="secondary" className="text-xs">{roles.length}</Badge>
                    </div>
                </div>

                {/* Add Role Form */}
                <AdminOnly>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(d => createRole(d))} className="mb-6 flex flex-col sm:flex-row gap-2">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="Enter role name (e.g. Manager, Technician)"
                                                className="h-10 bg-muted/50 border-border focus-visible:border-primary"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="submit"
                                disabled={isCreating}
                                className="h-10 w-full sm:w-auto shrink-0 bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90 cursor-pointer"
                            >
                                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Add Role</>}
                            </Button>
                        </form>
                    </Form>
                </AdminOnly>

                {/* Roles List */}
                <div className="space-y-2">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                        ))
                    ) : roles.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
                            <Tags className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm font-medium text-muted-foreground">No staff roles created yet</p>
                            <p className="text-xs text-muted-foreground/60">Create staff roles above to assign them to your staff members</p>
                        </div>
                    ) : (
                        roles.map(role => (
                            <div key={role._id} className={cn(
                                "flex items-center justify-between rounded-xl px-3 sm:px-4 py-3 transition-colors border border-border/50 min-w-0 gap-2",
                                editingId === role._id ? "bg-primary/5 border-primary/20" : "bg-muted/40 hover:bg-muted/60"
                            )}>
                                {editingId === role._id ? (
                                    <div className="flex flex-1 items-center gap-2 min-w-0">
                                        <Input
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="h-8 flex-1 bg-background border-border text-sm min-w-0"
                                            autoFocus
                                            onKeyDown={e => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") cancelEdit(); }}
                                        />
                                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400 cursor-pointer transition-colors" onClick={confirmEdit} disabled={isUpdating} title="Save">
                                            {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors" onClick={cancelEdit} title="Cancel">
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                            <div className="h-2.5 w-2.5 rounded-full bg-violet-500 shrink-0" />
                                            <span className="text-sm font-medium text-foreground truncate">{role.name}</span>
                                        </div>
                                        <AdminOnly>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground cursor-pointer hover:text-violet-600 hover:bg-violet-500/10 dark:hover:text-violet-400 dark:hover:bg-violet-500/20 transition-colors"
                                                    onClick={() => startEdit(role)}
                                                    title="Edit role"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                {deletingId === role._id ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-destructive font-medium mr-1">Delete?</span>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive cursor-pointer hover:bg-destructive/15 transition-colors" onClick={() => deleteRole(role._id)} disabled={isDeleting}>
                                                            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground cursor-pointer hover:bg-muted transition-colors" onClick={() => setDeletingId(null)}>
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground cursor-pointer hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={() => setDeletingId(role._id)} title="Delete role">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </AdminOnly>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
