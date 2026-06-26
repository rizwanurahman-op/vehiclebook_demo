"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSessionStore } from "@/stores/session";
import Link from "next/link";
import {
    Bell,
    Shield,
    LogOut,
    Settings,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoutDialog, ThemeToggle } from "@/components/common";
import SuperAdminMobileNav from "./SuperAdminMobileNav";

const getSuperAdminPageTitle = (pathname: string): string => {
    if (pathname === "/superadmin/dashboard") return "Dashboard";
    if (pathname.startsWith("/superadmin/admins/new")) return "New Admin";
    if (pathname.startsWith("/superadmin/admins/")) return "Admin Details";
    if (pathname.startsWith("/superadmin/admins")) return "Admin Management";
    if (pathname.startsWith("/superadmin/settings")) return "Settings";
    return "Super Admin Console";
};

export default function SuperAdminNavbar() {
    const { user } = useSessionStore();
    const pathname = usePathname();
    const router = useRouter();
    const [logoutOpen, setLogoutOpen] = useState(false);
    const title = getSuperAdminPageTitle(pathname);
    const initials = user?.username?.slice(0, 2).toUpperCase() || "SA";

    return (
        <>
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
                <div className="flex items-center gap-3">
                    {/* Mobile Menu trigger */}
                    <SuperAdminMobileNav />

                    {/* Logo for mobile */}
                    <Link
                        href="/superadmin/dashboard"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-brand shadow-md md:hidden hover:opacity-90 transition-opacity cursor-pointer"
                    >
                        <Shield className="h-4 w-4 text-white" />
                    </Link>
                    <h1 className="text-lg font-bold text-foreground">{title}</h1>
                </div>

                <div className="flex items-center gap-2">
                    {/* Notification bell */}
                    <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
                        <Bell className="h-4 w-4" />
                    </button>

                    <ThemeToggle />

                    {/* User menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted transition-colors cursor-pointer">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-gradient-brand text-white text-xs font-bold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden sm:block text-left">
                                    <p className="text-sm font-medium text-foreground leading-none">{user?.username || "Super Admin"}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">Super Admin</p>
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="font-normal">
                                <p className="font-medium">{user?.username}</p>
                                <p className="text-xs text-muted-foreground">{user?.email}</p>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push("/superadmin/settings")} className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" /> Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer" onClick={() => setLogoutOpen(true)}>
                                <LogOut className="mr-2 h-4 w-4" /> Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
            <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
        </>
    );
}
