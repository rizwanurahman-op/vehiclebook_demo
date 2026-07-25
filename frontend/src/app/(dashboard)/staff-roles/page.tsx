import { Metadata } from "next";
import { APP_NAME } from "@data";
import { StaffRoleList } from "./components";

export const metadata: Metadata = {
    title: `${APP_NAME} | Staff Roles`,
    description: "Manage staff roles and designations",
};

export default function StaffRolesPage() {
    return (
        <section className="flex w-full flex-col gap-6 pb-20 md:pb-2">
            <StaffRoleList />
        </section>
    );
}
