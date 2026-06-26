"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/stores/session";
import SuperAdminSidebar from "@/components/superadmin/SuperAdminSidebar";
import SuperAdminNavbar from "@/components/superadmin/SuperAdminNavbar";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user } = useSessionStore();

    useEffect(() => {
        if (user && user.role !== "superadmin") {
            router.replace("/dashboard");
        }
    }, [user, router]);

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <SuperAdminSidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <SuperAdminNavbar />
                <main className="flex-1 overflow-y-auto scrollbar-thin">
                    <div className="p-4 sm:p-6 lg:p-8">{children}</div>
                </main>
            </div>
        </div>
    );
}
