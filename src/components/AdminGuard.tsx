import { Navigate, useLocation } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading, user } = useAdminCheck();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace state={{ reason: "auth-required", from: location.pathname }} />;
  if (!isAdmin) return <Navigate to="/" replace state={{ reason: "admin-required", from: location.pathname }} />;

  return <>{children}</>;
};

export default AdminGuard;
