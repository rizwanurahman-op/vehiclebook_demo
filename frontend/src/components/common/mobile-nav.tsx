"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import VBookLogo from "./vbook-logo";

const SidebarFallback = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
    </div>
);

interface MobileNavProps {
    customTrigger?: React.ReactNode;
}

const MobileNav = ({ customTrigger }: MobileNavProps = {}) => {
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
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Mobile navigation menu</SheetDescription>

                {/* Mobile Sidebar Header */}
                <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex h-20 items-center justify-center border-b border-border px-4 shrink-0 hover:opacity-90 group cursor-pointer"
                >
                    <VBookLogo size="lg" className="group-hover:scale-[1.03] transition-transform" />
                </Link>

                {/* Mobile Navigation Links */}
                <Suspense fallback={<SidebarFallback />}>
                    <SidebarNav collapsed={false} onItemClick={() => setOpen(false)} />
                </Suspense>
            </SheetContent>
        </Sheet>
    );
};

export default MobileNav;
