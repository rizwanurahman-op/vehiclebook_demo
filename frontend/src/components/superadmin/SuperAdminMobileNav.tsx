"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Menu, Shield, LayoutDashboard, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/superadmin/admins", label: "Admin Management", icon: Users },
    { href: "/superadmin/settings", label: "Settings", icon: Settings },
];

interface SuperAdminMobileNavProps {
    customTrigger?: React.ReactNode;
}

const SuperAdminMobileNav = ({ customTrigger }: SuperAdminMobileNavProps = {}) => {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    // Close sheet when route changes
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {customTrigger ? (
                    <div onClick={() => setOpen(true)}>{customTrigger}</div>
                ) : (
                    <button onClick={() => setOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden transition-colors cursor-pointer">
                        <Menu className="h-5 w-5 pointer-events-none" />
                        <span className="sr-only">Toggle Navigation</span>
                    </button>
                )}
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <SheetTitle className="sr-only">SuperAdmin Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Mobile navigation menu for SuperAdmin console</SheetDescription>
                
                {/* Mobile Sidebar Header */}
                <Link
                    href="/superadmin/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex h-16 items-center gap-3 border-b border-border px-4 shrink-0 hover:opacity-90 group cursor-pointer"
                >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-brand shadow-md group-hover:scale-105 transition-transform">
                        <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-base font-bold text-foreground group-hover:text-primary transition-colors">VehicleBook</p>
                        <p className="truncate text-[10px] text-muted-foreground">Super Admin</p>
                    </div>
                </Link>

                {/* Mobile Navigation Links */}
                <nav className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.href === "/superadmin/dashboard"
                            ? pathname === "/superadmin/dashboard"
                            : pathname === item.href || pathname.startsWith(`${item.href}/`);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </SheetContent>
        </Sheet>
    );
};

export default SuperAdminMobileNav;
