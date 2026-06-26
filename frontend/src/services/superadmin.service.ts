import api from "@/config/axios";

export interface Admin {
    _id: string;
    username: string;
    email: string;
    role: "admin";
    isActive: boolean;
    isSuspended: boolean;
    businessName?: string;
    phone?: string;
    plan?: "free" | "pro" | "enterprise";
    createdAt: string;
    updatedAt: string;
}

export interface CreateAdminPayload {
    username: string;
    email: string;
    password: string;
    businessName?: string;
    phone?: string;
    plan?: "free" | "pro" | "enterprise";
}

export interface UpdateAdminPayload {
    username?: string;
    email?: string;
    password?: string;
    businessName?: string;
    phone?: string;
    plan?: "free" | "pro" | "enterprise";
}

export interface GlobalDashboard {
    totalAdmins: number;
    activeAdmins: number;
    suspendedAdmins: number;
    totalUsers: number;
    totalVehicles: number;
    totalLenders: number;
    totalInvestments: number;
    totalRepayments: number;
    totalConsignments: number;
    admins: Admin[];
}

export interface AdminStats {
    vehicles: number;
    lenders: number;
    investments: number;
    repayments: number;
    consignments: number;
    users: number;
}

const superAdminApi = {
    getDashboard: () =>
        api.get<{ data: GlobalDashboard }>("/superadmin/dashboard").then(r => r.data.data),

    listAdmins: () =>
        api.get<{ data: Admin[] }>("/superadmin/admins").then(r => r.data.data),

    getAdmin: (id: string) =>
        api.get<{ data: Admin }>(`/superadmin/admins/${id}`).then(r => r.data.data),

    createAdmin: (payload: CreateAdminPayload) =>
        api.post<{ data: Admin }>("/superadmin/admins", payload).then(r => r.data.data),

    updateAdmin: (id: string, payload: UpdateAdminPayload) =>
        api.put<{ data: Admin }>(`/superadmin/admins/${id}`, payload).then(r => r.data.data),

    deleteAdmin: (id: string) =>
        api.delete(`/superadmin/admins/${id}`),

    suspendAdmin: (id: string) =>
        api.post<{ data: Admin }>(`/superadmin/admins/${id}/suspend`).then(r => r.data.data),

    activateAdmin: (id: string) =>
        api.post<{ data: Admin }>(`/superadmin/admins/${id}/activate`).then(r => r.data.data),

    getAdminStats: (id: string) =>
        api.get<{ data: AdminStats }>(`/superadmin/admins/${id}/stats`).then(r => r.data.data),
};

export default superAdminApi;
