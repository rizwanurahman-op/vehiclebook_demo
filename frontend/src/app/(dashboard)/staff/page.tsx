import { Metadata } from "next";
import { APP_NAME } from "@data";
import { StaffList } from "./components";

export const metadata: Metadata = {
    title: `${APP_NAME} | Staff`,
    description: "Manage shop staff members and payroll details",
};

export default function StaffPage() {
    return (
        <section className="flex w-full flex-col gap-6 pb-20 md:pb-2">
            <StaffList />
        </section>
    );
}
