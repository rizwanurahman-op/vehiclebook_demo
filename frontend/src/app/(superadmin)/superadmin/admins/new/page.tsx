"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import superAdminApi from "@/services/superadmin.service";
import { ArrowLeft, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FormData {
    username: string;
    email: string;
    password: string;
    businessName: string;
    phone: string;
    plan: "free" | "pro" | "enterprise";
}

export default function NewAdminPage() {
    const router = useRouter();
    const [form, setForm] = useState<FormData>({
        username: "", email: "", password: "",
        businessName: "", phone: "", plan: "free",
    });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Partial<FormData>>({});

    const validate = (): boolean => {
        const e: Partial<FormData> = {};
        if (!form.username.trim()) e.username = "Username is required";
        else if (form.username.length < 3) e.username = "Min 3 characters";
        if (!form.email.trim()) e.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
        if (!form.password) e.password = "Password is required";
        else if (form.password.length < 8) e.password = "Min 8 characters";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            const admin = await superAdminApi.createAdmin({
                username: form.username.trim().toLowerCase(),
                email: form.email.trim().toLowerCase(),
                password: form.password,
                businessName: form.businessName.trim() || undefined,
                phone: form.phone.trim() || undefined,
                plan: form.plan,
            });
            toast.success(`Admin "${admin.username}" created!`);
            router.push(`/superadmin/admins/${admin._id}`);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create admin";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const field = (id: keyof FormData) => ({
        value: form[id],
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            setForm(f => ({ ...f, [id]: e.target.value }));
            setErrors(er => ({ ...er, [id]: undefined }));
        },
    });

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Back */}
            <Link href="/superadmin/admins" className="inline-flex items-center gap-2 text-muted-foreground hover:text-violet-500 transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" />
                Back to Admins
            </Link>

            {/* Card */}
            <div className="rounded-2xl p-8 border border-border bg-card shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md shadow-violet-500/20">
                        <UserPlus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-foreground text-xl font-bold">Create New Admin</h1>
                        <p className="text-muted-foreground text-sm">Set up a new admin workspace</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Account */}
                    <div>
                        <p className="text-violet-600 dark:text-violet-400 text-xs font-semibold uppercase tracking-wider mb-4">Account Credentials</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField
                                label="Username" id="username" type="text" autoComplete="off"
                                placeholder="e.g. john_admin" error={errors.username}
                                {...field("username")}
                            />
                            <InputField
                                label="Email Address" id="email" type="email" autoComplete="off"
                                placeholder="admin@example.com" error={errors.email}
                                {...field("email")}
                            />
                        </div>
                        <div className="mt-4 relative">
                            <InputField
                                label="Password" id="password"
                                type={showPwd ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="Min 8 characters" error={errors.password}
                                {...field("password")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(p => !p)}
                                className="absolute right-4 top-9 text-muted-foreground hover:text-violet-500 transition-colors"
                            >
                                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Business */}
                    <div>
                        <p className="text-violet-600 dark:text-violet-400 text-xs font-semibold uppercase tracking-wider mb-4">Business Info (Optional)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField
                                label="Business Name" id="businessName" type="text"
                                placeholder="e.g. Royal Motors" error={errors.businessName}
                                {...field("businessName")}
                            />
                            <InputField
                                label="Phone" id="phone" type="tel"
                                placeholder="+91 98765 43210" error={errors.phone}
                                {...field("phone")}
                            />
                        </div>
                    </div>

                    {/* Plan */}
                    <div>
                        <p className="text-violet-600 dark:text-violet-400 text-xs font-semibold uppercase tracking-wider mb-4">Plan</p>
                        <div className="grid grid-cols-3 gap-3">
                            {(["free", "pro", "enterprise"] as const).map(plan => (
                                <button
                                    key={plan}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, plan }))}
                                    className={cn(
                                        "p-3 rounded-xl border text-sm font-medium capitalize transition-all",
                                        form.plan === plan
                                            ? "bg-violet-100 dark:bg-violet-900/20 border-violet-500 text-violet-700 dark:text-violet-300"
                                            : "bg-muted border-border text-muted-foreground hover:border-violet-400 hover:text-foreground"
                                    )}
                                >
                                    {plan}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        {loading ? "Creating..." : "Create Admin"}
                    </button>
                </form>
            </div>
        </div>
    );
}

function InputField({
    label, id, error,
    ...props
}: {
    label: string;
    id: string;
    error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label htmlFor={id} className="block text-foreground text-sm font-medium mb-1.5">{label}</label>
            <input
                id={id}
                {...props}
                className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground bg-muted border outline-none transition-all",
                    error
                        ? "border-destructive ring-1 ring-destructive"
                        : "border-border focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
                )}
            />
            {error && <p className="text-destructive text-xs mt-1">{error}</p>}
        </div>
    );
}
