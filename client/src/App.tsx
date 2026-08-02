import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth, dashboardPath } from "./context/AuthContext";
import { FacultyDashboard } from "./pages/Dashboards";
import { VolunteerDashboard } from "./pages/VolunteerDashboard";
import { TeamHeadDashboard } from "./pages/TeamHeadDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { PresidentDashboard } from "./pages/PresidentDashboard";

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-slate-500">Loading…</div>;
  return <Navigate to={user ? dashboardPath(user.role) : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Each dashboard is locked to its own role.
          `allow` decides who may SEE the page; the SERVER decides who gets DATA. */}
      <Route
        path="/volunteer"
        element={
          <ProtectedRoute allow={["VOLUNTEER"]}>
            <VolunteerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-head"
        element={
          <ProtectedRoute allow={["TEAM_HEAD"]}>
            <TeamHeadDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/president"
        element={
          <ProtectedRoute allow={["PRESIDENT"]}>
            <PresidentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty"
        element={
          <ProtectedRoute allow={["FACULTY"]}>
            <FacultyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allow={["ADMIN"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
