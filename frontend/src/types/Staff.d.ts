interface IStaffRole {
    _id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface IStaff {
    _id: string;
    staffId: string;
    name: string;
    role: string;
    phone?: string;
    monthlySalary: number;
    joiningDate?: string;
    isActive: boolean;
    remarks?: string;
    createdAt: string;
    updatedAt: string;
}

interface StaffStats {
    total: number;
    active: number;
    totalMonthlyPayroll: number;
}
