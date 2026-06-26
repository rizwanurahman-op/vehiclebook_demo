"use client";

import { useEffect, useState, useCallback } from "react";
import superAdminApi, { Admin } from "@/services/superadmin.service";
import Link from "next/link";
import {
    UserPlus, Search, Loader2, AlertCircle, CheckCircle2,
    PauseCircle, PlayCircle, Trash2, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminsListPage() {
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [filtered, setFiltered] = useState<Admin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [actionId, setActionId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await superAdminApi.listAdmins();
            setAdmins(data);
            setFiltered(data);
        } catch {
            setError("Failed to load admins.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(
            admins.filter(a =>
                a.username.toLowerCase().includes(q) ||
                a.email.toLowerCase().includes(q) ||
                (a.businessName || "").toLowerCase().includes(q)
            )
        );
    }, [search, admins]);

    const handleSuspend = async (admin: Admin) => {
        setActionId(admin._id);
        try {
            await superAdminApi.suspendAdmin(admin._id);
            toast.success(`${admin.username} suspended`);
            await load();
        } catch {
            toast.error("Failed to suspend admin");
        } finally {
            setActionId(null);
        }
    };

    const handleActivate = async (admin: Admin) => {
        setActionId(admin._id);
        try {
            await superAdminApi.activateAdmin(admin._id);
            toast.success(`${admin.username} activated`);
            await load();
        } catch {
            toast.error("Failed to activate admin");
        } finally {
            setActionId(null);
        }
    };

    const handleDelete = async (admin: Admin) => {
        if (!confirm(`Permanently delete admin "${admin.username}"? This will also remove all their data. This cannot be undone.`)) return;
        setActionId(admin._id);
        try {
            await superAdminApi.deleteAdmin(admin._id);
            toast.success(`${admin.username} deleted`);
            await load();
        } catch {
            toast.error("Failed to delete admin");
        } finally {
            setActionId(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-foreground text-2xl font-bold">Admin Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {admins.length} admin account{admins.length !== 1 ? "s" : ""} registered
                    </p>
                </div>
                <Link
                    href="/superadmin/admins/new"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-violet-500/20"
                >
                    <UserPlus className="w-4 h-4" />
                    New Admin
                </Link>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by name, email, or business..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground bg-muted border border-border outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                />
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                    <p className="text-muted-foreground text-sm">{error}</p>
                    <button onClick={load} className="text-violet-500 hover:text-violet-400 text-sm underline">Retry</button>
                </div>
            ) : (
                <div className="rounded-2xl overflow-hidden border border-border bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-violet-50 dark:bg-violet-900/10 border-b border-border">
                                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Admin</th>
                                    <th className="text-left px-6 py-3 text-muted-foreground font-medium hidden md:table-cell">Business</th>
                                    <th className="text-left px-6 py-3 text-muted-foreground font-medium hidden lg:table-cell">Plan</th>
                                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Status</th>
                                    <th className="text-left px-6 py-3 text-muted-foreground font-medium hidden xl:table-cell">Joined</th>
                                    <th className="text-right px-6 py-3 text-muted-foreground font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((admin, i) => (
                                    <tr
                                        key={admin._id}
                                        className={`transition-colors hover:bg-muted/50 ${i < filtered.length - 1 ? "border-b border-border" : ""}`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                                    style={{ background: `hsl(${(admin.username.charCodeAt(0) * 47) % 360}, 60%, 45%)` }}
                                                >
                                                    {admin.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-foreground font-medium">{admin.username}</p>
                                                    <p className="text-muted-foreground text-xs">{admin.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-foreground hidden md:table-cell">
                                            {admin.businessName || <span className="text-muted-foreground">—</span>}
                                        </td>
                                        <td className="px-6 py-4 hidden lg:table-cell">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                admin.plan === "enterprise" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                                admin.plan === "pro" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                                "bg-muted text-muted-foreground"
                                            }`}>
                                                {admin.plan || "free"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {admin.isSuspended ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                    <AlertCircle className="w-3 h-3" /> Suspended
                                                </span>
                                            ) : admin.isActive ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    <CheckCircle2 className="w-3 h-3" /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground text-xs hidden xl:table-cell">
                                            {new Date(admin.createdAt).toLocaleDateString("en-IN", {
                                                day: "numeric", month: "short", year: "numeric"
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={`/superadmin/admins/${admin._id}`}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-violet-600 hover:bg-violet-100 dark:hover:text-violet-400 dark:hover:bg-violet-900/20 transition-all"
                                                    title="Manage"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </Link>

                                                {admin.isSuspended ? (
                                                    <button
                                                        onClick={() => handleActivate(admin)}
                                                        disabled={actionId === admin._id}
                                                        className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:text-green-400 dark:hover:bg-green-900/20 transition-all disabled:opacity-50"
                                                        title="Activate"
                                                    >
                                                        {actionId === admin._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSuspend(admin)}
                                                        disabled={actionId === admin._id}
                                                        className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-100 dark:hover:text-amber-400 dark:hover:bg-amber-900/20 transition-all disabled:opacity-50"
                                                        title="Suspend"
                                                    >
                                                        {actionId === admin._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleDelete(admin)}
                                                    disabled={actionId === admin._id}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-100 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                                            {search ? "No admins match your search." : (
                                                <>No admins yet. <Link href="/superadmin/admins/new" className="text-violet-500 hover:text-violet-400 underline">Create the first one</Link></>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
