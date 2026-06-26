interface AuthSession {
    id: string;
    username: string;
    email: string;
    role: "superadmin" | "admin" | "viewer";
}
