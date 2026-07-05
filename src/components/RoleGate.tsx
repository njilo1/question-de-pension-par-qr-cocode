import { useAuth } from "@/lib/auth";
import { Navigate } from "@tanstack/react-router";

export function RoleGate({ children, role }: { children: React.ReactNode; role: "admin" | "member" }) {
  const { role: userRole, loading } = useAuth();

  if (loading) return null;
  if (userRole !== role && role === "admin") {
    return <Navigate to="/face-verify" />;
  }

  return <>{children}</>;
}
