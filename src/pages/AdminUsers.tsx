import { useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  AdminLoadingState,
  AdminPanelCard,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminTableEmptyState,
} from "@/components/admin/AdminPrimitives";
import { useAdminPlatformUsers } from "@/hooks/useAdminOperations";

const roleMatrix = [
  "Super Admin",
  "Admin",
  "Onboarding Manager",
  "Support Agent",
  "Finance Manager",
  "Sales Manager",
  "Tech Operator",
  "Client Owner",
  "Outlet Manager",
  "Manager",
  "Kitchen",
  "Cashier",
];

const AdminUsers = () => {
  const { data: users = [], isLoading, isError, error } = useAdminPlatformUsers();

  const platformUsers = useMemo(() => users.filter((user) => user.source === "admin"), [users]);
  const clientUsers = useMemo(() => users.filter((user) => user.source !== "admin"), [users]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminSectionHeader title="Users & Roles" description="Platform operators plus client-side owner and staff access currently registered in the system." />

        {isLoading ? (
          <AdminLoadingState />
        ) : isError ? (
          <AdminTableEmptyState
            title="Could not load users"
            description={error instanceof Error ? error.message : "An unexpected error occurred while loading platform users."}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminPanelCard title="Platform Team" description="Live admin accounts with access to the super-admin console.">
              <div className="space-y-3">
                {platformUsers.length ? platformUsers.map((user) => (
                  <div key={`${user.source}-${user.user_id}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-sm text-slate-500">{user.email} | {user.scope}</p>
                    </div>
                    <div className="flex gap-2">
                      <AdminStatusBadge value={user.role} />
                      <AdminStatusBadge value={user.status} />
                    </div>
                  </div>
                )) : (
                  <AdminTableEmptyState title="No platform admins found" description="Create or sync admin accounts to manage platform access." />
                )}
              </div>
            </AdminPanelCard>

            <AdminPanelCard title="Client Access Roster" description="Owners and staff already linked to client restaurants.">
              <div className="space-y-3">
                {clientUsers.length ? clientUsers.slice(0, 12).map((user) => (
                  <div key={`${user.source}-${user.user_id}-${user.role}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-sm text-slate-500">{user.scope}{user.email ? ` | ${user.email}` : ""}</p>
                    </div>
                    <div className="flex gap-2">
                      <AdminStatusBadge value={user.role} />
                      <AdminStatusBadge value={user.status} />
                    </div>
                  </div>
                )) : (
                  <AdminTableEmptyState title="No client users found" description="Once owners and staff are linked, they will appear here." />
                )}
              </div>
            </AdminPanelCard>

            <AdminPanelCard title="Role Matrix" description="Supported platform and client-facing roles in the current access model.">
              <div className="grid gap-2">
                {roleMatrix.map((role) => (
                  <div key={role} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    {role}
                  </div>
                ))}
              </div>
            </AdminPanelCard>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
