"use client";

import { useEffect, useState } from "react";
import superAdminApi, { GlobalDashboard } from "@/services/superadmin.service";
import {
    Users, Car, Building2, TrendingUp, TrendingDown,
    Activity, AlertCircle, CheckCircle2, Loader2, RefreshCw,
} from "lucide-react";
import Link from "next/link";

function StatCard({
    label, value, icon: Icon, color, sub
}: {
    label: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
    sub?: string;
}) {
    return (
        <div className="relative p-5 rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
            {/* Glow blob */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-10"
                style={{ background: color }} />

            <div className="relative z-10 flex items-start justify-between">
                <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{label}</p>
                    <p className="text-foreground text-3xl font-bold mt-1">{value.toLocaleString()}</p>
                    {sub && <p className="text-muted-foreground text-xs mt-1">{sub}</p>}
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                </div>
            </div>
        </div>
    );
}

export default function SuperAdminDashboardPage() {
    const [data, setData] = useState<GlobalDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError(null);
        try {
            const d = await superAdminApi.getDashboard();
            setData(d);
        } catch {
            setError("Failed to load dashboard data.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <AlertCircle className="w-10 h-10 text-destructive" />
                <p className="text-muted-foreground">{error}</p>
                <button onClick={() => load()} className="text-violet-500 hover:text-violet-400 text-sm underline">Retry</button>
            </div>
        );
    }

    const d = data!;

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-foreground text-2xl font-bold">Global Dashboard</h1>
                    <p className="text-muted-foreground text-sm mt-1">Platform-wide overview across all admin accounts</p>
                </div>
                <button
                    onClick={() => load(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/40 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                <StatCard label="Total Admins" value={d.totalAdmins} icon={Users} color="#7c3aed"
                    sub={`${d.activeAdmins} active · ${d.suspendedAdmins} suspended`} />
                <StatCard label="Total Viewers" value={d.totalUsers} icon={Users} color="#0ea5e9" />
                <StatCard label="Total Vehicles" value={d.totalVehicles} icon={Car} color="#10b981" />
                <StatCard label="Total Lenders" value={d.totalLenders} icon={Building2} color="#f59e0b" />
                <StatCard label="Investments" value={d.totalInvestments} icon={TrendingUp} color="#8b5cf6" />
                <StatCard label="Repayments" value={d.totalRepayments} icon={TrendingDown} color="#ec4899" />
                <StatCard label="Consignments" value={d.totalConsignments} icon={Activity} color="#06b6d4" />
            </div>

            {/* Admin Table */}
            <div className="rounded-2xl overflow-hidden border border-border bg-card">
                <div className="px-6 py-4 flex items-center justify-between bg-violet-50 dark:bg-violet-900/10 border-b border-border">
                    <h2 className="text-foreground font-semibold">All Admins</h2>
                    <Link href="/superadmin/admins/new"
                        className="text-xs font-medium px-4 py-2 rounded-xl text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm">
                        + New Admin
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left px-6 py-3 text-muted-foreground font-medium">Admin</th>
                                <th className="text-left px-6 py-3 text-muted-foreground font-medium hidden md:table-cell">Business</th>
                                <th className="text-left px-6 py-3 text-muted-foreground font-medium hidden lg:table-cell">Plan</th>
                                <th className="text-left px-6 py-3 text-muted-foreground font-medium">Status</th>
                                <th className="text-left px-6 py-3 text-muted-foreground font-medium hidden md:table-cell">Joined</th>
                                <th className="text-right px-6 py-3 text-muted-foreground font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {d.admins.map((admin, i) => (
                                <tr
                                    key={admin._id}
                                    className={`transition-colors hover:bg-muted/50 ${i < d.admins.length - 1 ? "border-b border-border" : ""}`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                                style={{ background: `hsl(${(admin.username.charCodeAt(0) * 47) % 360}, 60%, 45%)` }}>
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
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            admin.plan === "enterprise" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                            admin.plan === "pro" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                            "bg-muted text-muted-foreground"
                                        }`}>
                                            {admin.plan || "free"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {admin.isSuspended ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                <AlertCircle className="w-3 h-3" /> Suspended
                                            </span>
                                        ) : admin.isActive ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                <CheckCircle2 className="w-3 h-3" /> Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                                Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground text-xs hidden md:table-cell">
                                        {new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/superadmin/admins/${admin._id}`}
                                            className="text-violet-600 dark:text-violet-400 hover:text-violet-500 text-xs font-medium"
                                        >
                                            Manage →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {d.admins.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        No admins yet. <Link href="/superadmin/admins/new" className="text-violet-500 hover:text-violet-400 underline">Create the first one</Link>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
