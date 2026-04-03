import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { AdminLoadingState, AdminPanelCard, AdminSectionHeader, AdminStatusBadge, AdminTableEmptyState } from "@/components/admin/AdminPrimitives";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";

const AdminProfile = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  const profileQuery = useQuery({
    queryKey: ["admin-profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, restaurant_name, updated_at, created_at")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
  });

  const initials = useMemo(() => (user?.email ?? "SA").slice(0, 2).toUpperCase(), [user?.email]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminSectionHeader
          title="Profile"
          description="Current signed-in admin identity, access level, and operational profile details."
        />

        {adminLoading || profileQuery.isLoading ? (
          <AdminLoadingState />
        ) : profileQuery.isError ? (
          <AdminTableEmptyState
            title="Could not load admin profile"
            description={profileQuery.error instanceof Error ? profileQuery.error.message : "Admin profile data could not be loaded."}
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <AdminPanelCard title="Signed-in Identity" description="Live admin identity from the current authenticated session.">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-lg font-semibold text-slate-900">
                    {initials}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {profileQuery.data?.full_name || user?.email?.split("@")[0] || "Admin User"}
                    </p>
                    <p className="text-sm text-slate-500">{user?.email ?? "No email available"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">Access level</span>
                    <AdminStatusBadge value={isAdmin ? "Super Admin" : "Pending"} />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">Phone</span>
                    <span className="text-sm font-semibold text-slate-900">{profileQuery.data?.phone || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">Profile last updated</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {profileQuery.data?.updated_at ? new Date(profileQuery.data.updated_at).toLocaleString() : "Not available"}
                    </span>
                  </div>
                </div>
              </div>
            </AdminPanelCard>

            <AdminPanelCard title="Operational Notes" description="Truthful summary of what this admin profile currently controls in the platform.">
              <div className="space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="font-medium text-slate-900">Admin console access</p>
                  <p className="mt-1">This account can access the super-admin dashboard and platform operations modules.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="font-medium text-slate-900">Audit visibility</p>
                  <p className="mt-1">Billing, support, subscriptions, notifications, and activity logs are now visible from the admin workspace.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="font-medium text-slate-900">Profile editing</p>
                  <p className="mt-1">This page is intentionally readonly until a dedicated admin-profile update flow is modeled in the database.</p>
                </div>
              </div>
            </AdminPanelCard>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
