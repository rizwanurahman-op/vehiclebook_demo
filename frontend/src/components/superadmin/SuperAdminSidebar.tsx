"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Settings,
    Shield,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useUiStore } from "@/stores/ui";
import { LogoutDialog } from "@/components/common";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
    { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/superadmin/admins", label: "Admin Management", icon: Users },
    { href: "/superadmin/settings", label: "Settings", icon: Settings },
];

export default function SuperAdminSidebar() {
    const pathname = usePathname();
    const collapsed = useUiStore(s => s.sidebarCollapsed);
    const [logoutOpen, setLogoutOpen] = useState(false);

    return (
        <aside
            className={cn(
                "hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out relative",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo */}
            <Link
                href="/superadmin/dashboard"
                className="flex h-16 items-center gap-3 border-b border-border px-4 transition-all overflow-hidden whitespace-nowrap hover:opacity-90 group cursor-pointer"
            >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-brand shadow-md group-hover:scale-105 transition-transform">
                    <Shield className="h-5 w-5 text-white" />
                </div>
                {!collapsed && (
                    <div className="min-w-0">
                        <p className="truncate text-base font-bold text-foreground group-hover:text-primary transition-colors">VehicleBook</p>
                        <p className="truncate text-[10px] text-muted-foreground">Super Admin</p>
                    </div>
                )}
            </Link>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-1">
                <TooltipProvider>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.href === "/superadmin/dashboard"
                            ? pathname === "/superadmin/dashboard"
                            : pathname === item.href || pathname.startsWith(`${item.href}/`);

                        const link = (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                    collapsed && "justify-center px-2"
                                )}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );

                        if (collapsed) {
                            return (
                                <Tooltip key={item.href}>
                                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                                    <TooltipContent side="right">{item.label}</TooltipContent>
                                </Tooltip>
                            );
                        }
                        return link;
                    })}
                </TooltipProvider>
            </nav>

            {/* Logout Button */}
            <div className="border-t border-border p-3">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setLogoutOpen(true)}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors",
                                    collapsed && "justify-center px-2"
                                )}
                            >
                                <LogOut className="h-4 w-4 shrink-0" />
                                {!collapsed && <span>Sign out</span>}
                            </button>
                        </TooltipTrigger>
                        {collapsed && <TooltipContent side="right">Sign out</TooltipContent>}
                    </Tooltip>
                </TooltipProvider>
            </div>
            <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />

            {/* Collapse Toggle */}
            <button
                onClick={() => useUiStore.getState().toggleSidebar()}
                className="absolute -right-3 top-8 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-foreground transition-colors z-50 cursor-pointer"
            >
                {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>
        </aside>
    );
}
