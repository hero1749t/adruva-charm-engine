import { Navigate } from "react-router-dom";
import { useStaffRole } from "@/hooks/useStaffRole";

interface RoleGuardProps {
  children: React.ReactNode;
  check: "canViewAnalytics" | "canManageMenu" | "canManageStaff" | "isOwner";
}

const RoleGuard = ({ children, check }: RoleGuardProps) => {
  const staffInfo = useStaffRole();

  if (staffInfo.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!staffInfo[check]) {
    return <Navigate to="/owner/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
