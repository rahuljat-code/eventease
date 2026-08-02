import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import type { Role } from "../lib/types";
import { useAuth, dashboardPath } from "../context/AuthContext";

export function ProtectedRoute({
  children,
  allow,
}: {
  children: ReactNode;
  allow?: Role[];
}) {
  const { user, loading } = useAuth();

  // Wait until we've asked the server who we are (avoids a flash of the login page)
  if (loading) {
    return <div className="p-10 text-slate-500">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allow && !allow.includes(user.role)) {
    return <Navigate to={dashboardPath(user.role)} replace />;
  }

  return <>{children}</>;
}
