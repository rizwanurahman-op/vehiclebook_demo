import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SessionUser {
    id: string;
    username: string;
    email: string;
    role: "superadmin" | "admin" | "viewer";
    /** For viewers: points to the admin they belong to */
    adminId?: string;
    /** Admin profile metadata */
    businessName?: string;
    phone?: string;
    plan?: "free" | "pro" | "enterprise";
    isActive?: boolean;
}

interface SessionStore {
    user: SessionUser | null;
    accessToken: string | null;
    setSession: (user: SessionUser, accessToken: string) => void;
    updateUser: (user: Partial<SessionUser>) => void;
    clearSession: () => void;
    // Convenience selectors
    isSuperAdmin: () => boolean;
    isAdmin: () => boolean;
    isViewer: () => boolean;
}

export const useSessionStore = create<SessionStore>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            setSession: (user, accessToken) => set({ user, accessToken }),
            updateUser: (updates) => set(state => ({
                user: state.user ? { ...state.user, ...updates } : null,
            })),
            clearSession: () => set({ user: null, accessToken: null }),

            // Role helpers — use these instead of comparing role strings directly
            isSuperAdmin: () => get().user?.role === "superadmin",
            isAdmin: () => get().user?.role === "admin",
            isViewer: () => get().user?.role === "viewer",
        }),
        {
            name: "vb-session",
            // SECURITY: Only persist the user profile — NEVER the accessToken.
            // The accessToken is kept in Zustand memory only (not localStorage, not js-cookie).
            // It is sent to the backend via the Authorization header (axios interceptor reads it
            // from getState().accessToken). The httpOnly vb_access_token cookie is set by the
            // backend and is completely inaccessible to JavaScript — XSS-safe.
            partialize: state => ({ user: state.user }),
        }
    )
);
