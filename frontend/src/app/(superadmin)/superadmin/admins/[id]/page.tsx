"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import superAdminApi, { Admin, AdminStats } from "@/services/superadmin.service";
import {
    ArrowLeft, Loader2, AlertCircle, CheckCircle2, PauseCircle,
    PlayCircle, Trash2, Edit3, Save, X, Car, Users, Building2,
    TrendingUp, TrendingDown, Activity,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function StatBadge({ label, value, icon: Icon, color }: {
    label: string; value: number; icon: React.ElementType; color: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card shadow-sm text-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <Icon className="w-5 h-5 mb-2" style={{ color }} />
            <p className="text-foreground text-xl font-bold">{value}</p>
            <p className="text-muted-foreground text-xs">{label}</p>
        </div>
    );
}

export default function AdminDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [admin, setAdmin] = useState<Admin | null>(null);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [actioning, setActioning] = useState(false);
    const [editForm, setEditForm] = useState({
        username: "", email: "", businessName: "", phone: "",
        plan: "free" as "free" | "pro" | "enterprise", password: "",
    });

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [a, s] = await Promise.all([
                superAdminApi.getAdmin(id),
                superAdminApi.getAdminStats(id),
            ]);
            setAdmin(a);
            setStats(s);
            setEditForm({
                username: a.username, email: a.email,
                businessName: a.businessName || "", phone: a.phone || "",
                plan: a.plan || "free", password: "",
            });
        } catch {
            setError("Failed to load admin.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await superAdminApi.updateAdmin(id, {
                username: editForm.username || undefined,
                email: editForm.email || undefined,
                businessName: editForm.businessName || undefined,
                phone: editForm.phone || undefined,
                plan: editForm.plan,
                password: editForm.password || undefined,
            });
            setAdmin(updated);
            setEditing(false);
            toast.success("Admin updated!");
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Update failed";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleSuspend = async () => {
        if (!admin) return;
        setActioning(true);
        try {
            const updated = await superAdminApi.suspendAdmin(id);
            setAdmin(updated);
            toast.success(`${admin.username} suspended`);
        } catch { toast.error("Failed to suspend"); }
        finally { setActioning(false); }
    };

    const handleActivate = async () => {
        if (!admin) return;
        setActioning(true);
        try {
            const updated = await superAdminApi.activateAdmin(id);
            setAdmin(updated);
            toast.success(`${admin.username} activated`);
        } catch { toast.error("Failed to activate"); }
        finally { setActioning(false); }
    };

    const handleDelete = async () => {
        if (!admin) return;
        if (!confirm(`Permanently delete "${admin.username}"? All their data will be removed.`)) return;
        setActioning(true);
        try {
            await superAdminApi.deleteAdmin(id);
            toast.success("Admin deleted");
            router.push("/superadmin/admins");
        } catch { toast.error("Failed to delete"); }
        finally { setActioning(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
    );

    if (error || !admin) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-muted-foreground">{error}</p>
            <button onClick={load} className="text-primary text-sm font-semibold hover:underline cursor-pointer">Retry</button>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Back */}
            <Link href="/superadmin/admins" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
                <ArrowLeft className="w-4 h-4" />
                Back to Admins
            </Link>

            {/* Profile Card */}
            <div className="rounded-2xl p-6 border border-border bg-card shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-sm"
                            style={{ background: `hsl(${(admin.username.charCodeAt(0) * 47) % 360}, 65%, 40%)` }}
                        >
                            {admin.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-foreground text-xl font-bold">{admin.username}</h1>
                            <p className="text-muted-foreground text-sm">{admin.email}</p>
                            {admin.businessName && <p className="text-muted-foreground/80 text-xs mt-0.5">{admin.businessName}</p>}
                            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2.5">
                                {admin.isSuspended ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                        <AlertCircle className="w-3 h-3" /> Suspended
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                        <CheckCircle2 className="w-3 h-3" /> Active
                                    </span>
                                )}
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                    admin.plan === "enterprise" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
                                    admin.plan === "pro" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                                    "bg-muted text-muted-foreground"
                                }`}>
                                    {admin.plan || "free"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                        <button
                            onClick={() => setEditing(e => !e)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer shadow-sm"
                        >
                            <Edit3 className="w-4 h-4 text-muted-foreground" />
                            {editing ? "Cancel" : "Edit"}
                        </button>
                        {admin.isSuspended ? (
                            <button
                                onClick={handleActivate}
                                disabled={actioning}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 text-green-600 dark:text-green-400 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                            >
                                {actioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                                Activate
                            </button>
                        ) : (
                            <button
                                onClick={handleSuspend}
                                disabled={actioning}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                            >
                                {actioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />}
                                Suspend
                            </button>
                        )}
                        <button
                            onClick={handleDelete}
                            disabled={actioning}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                            <Trash2 className="w-4 h-4 text-red-500" />
                            Delete
                        </button>
                    </div>
                </div>

                {/* Edit form */}
                {editing && (
                    <div className="mt-6 pt-6 border-t border-border space-y-4">
                        <p className="text-primary text-xs font-bold uppercase tracking-wider">Edit Admin Details</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {(["username", "email", "businessName", "phone", "password"] as const).map(f => (
                                <div key={f}>
                                    <label className="block text-foreground text-sm font-semibold mb-1.5 capitalize">
                                        {f === "password" ? "New Password (optional)" : f.replace(/([A-Z])/g, " $1")}
                                    </label>
                                    <input
                                        type={f === "password" ? "password" : "text"}
                                        value={editForm[f]}
                                        onChange={e => setEditForm(ef => ({ ...ef, [f]: e.target.value }))}
                                        placeholder={f === "password" ? "Leave blank to keep current" : ""}
                                        className="w-full px-4 py-2.5 rounded-xl text-sm text-foreground bg-muted/40 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-muted-foreground"
                                    />
                                </div>
                            ))}
                            <div>
                                <label className="block text-foreground text-sm font-semibold mb-1.5">Plan</label>
                                <select
                                    value={editForm.plan}
                                    onChange={e => setEditForm(ef => ({ ...ef, plan: e.target.value as "free" | "pro" | "enterprise" }))}
                                    className="w-full px-4 py-2.5 rounded-xl text-sm text-foreground bg-muted/40 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                >
                                    <option value="free">Free</option>
                                    <option value="pro">Pro</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-brand shadow-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                            <button
                                onClick={() => setEditing(false)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground border border-border hover:bg-muted transition-all cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats */}
            {stats && (
                <div className="space-y-4">
                    <h2 className="text-foreground font-bold text-lg">Workspace Statistics</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        <StatBadge label="Vehicles" value={stats.vehicles} icon={Car} color="#10b981" />
                        <StatBadge label="Lenders" value={stats.lenders} icon={Building2} color="#f59e0b" />
                        <StatBadge label="Investments" value={stats.investments} icon={TrendingUp} color="#8b5cf6" />
                        <StatBadge label="Repayments" value={stats.repayments} icon={TrendingDown} color="#ec4899" />
                        <StatBadge label="Consignments" value={stats.consignments} icon={Activity} color="#06b6d4" />
                        <StatBadge label="Viewers" value={stats.users} icon={Users} color="#0ea5e9" />
                    </div>
                </div>
            )}

            {/* Metadata */}
            <div className="rounded-2xl p-5 border border-border bg-card shadow-sm">
                <h2 className="text-foreground font-bold mb-4 text-sm">Account Metadata</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <dt className="text-muted-foreground">Admin ID</dt>
                        <dd className="text-foreground font-mono text-xs mt-0.5 break-all">{admin._id}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">Phone</dt>
                        <dd className="text-foreground mt-0.5">{admin.phone || "—"}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">Created</dt>
                        <dd className="text-foreground mt-0.5">{new Date(admin.createdAt).toLocaleString("en-IN")}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">Last Updated</dt>
                        <dd className="text-foreground mt-0.5">{new Date(admin.updatedAt).toLocaleString("en-IN")}</dd>
                    </div>
                </dl>
            </div>
        </div>
    );
}
