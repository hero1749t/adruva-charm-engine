import { Navigate } from "react-router-dom";
import { useStaffRole } from "@/hooks/useStaffRole";

/**
 * Redirects authenticated users to their role-appropriate dashboard.
 * - Owner/Manager → /owner/dashboard (full orders + stats)
 * - Kitchen → /owner/kitchen
 * - Cashier → /owner/cashier
 */
const RoleDashboardRedirect = () => {
  const { role, loading } = useStaffRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  switch (role) {
    case "kitchen":
      return <Navigate to="/owner/kitchen" replace />;
    case "cashier":
      return <Navigate to="/owner/cashier" replace />;
    default:
      return <Navigate to="/owner/dashboard" replace />;
  }
};

export default RoleDashboardRedirect;
