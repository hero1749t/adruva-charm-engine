import { Navigate, useLocation } from "react-router-dom";
import { useStaffRole } from "@/hooks/useStaffRole";

interface RoleGuardProps {
  children: React.ReactNode;
  check: "canViewAnalytics" | "canManageMenu" | "canManageStaff" | "canManageOrders" | "canManageBusiness" | "isOwner";
}

const RoleGuard = ({ children, check }: RoleGuardProps) => {
  const staffInfo = useStaffRole();
  const location = useLocation();

  if (staffInfo.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!staffInfo[check]) {
    return <Navigate to="/owner/dashboard" replace state={{ reason: "insufficient-permission", from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default RoleGuard;
