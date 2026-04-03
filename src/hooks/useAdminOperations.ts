import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_QUERY_DEFAULTS } from "@/lib/adminQuery";

export type AdminOutletDirectoryRow = {
  outlet_id: string;
  owner_id: string;
  client_name: string;
  owner_name: string;
  contact: string;
  outlet_name: string;
  city: string;
  manager_name: string;
  phone: string | null;
  outlet_status: string;
  orders_today: number | null;
  revenue_today: number | null;
  sync_status: string;
  qr_status: string;
  updated_at: string;
};

export type AdminOnboardingRow = {
  owner_id: string;
  client_name: string;
  owner_name: string;
  onboarding_status: string;
  progress: number;
  business_info_complete: boolean;
  branding_uploaded: boolean;
  menu_imported: boolean;
  tax_configured: boolean;
  payment_setup_complete: boolean;
  qr_generated: boolean;
  printer_connected: boolean;
  staff_accounts_created: boolean;
  test_order_completed: boolean;
  go_live_confirmed: boolean;
};

export type AdminPlatformUserRow = {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  scope: string;
  status: string;
  source: string;
};

export type AdminDemoLeadRow = {
  admin_notes: string | null;
  approved_at: string | null;
  id: string;
  email: string | null;
  lead_status: string;
  meeting_notes: string | null;
  name: string;
  next_follow_up_at: string | null;
  phone: string;
  priority: string;
  proposed_plan_id: string | null;
  restaurant_name: string;
  demo_scheduled_at: string | null;
  city: string | null;
  has_website: boolean | null;
  created_at: string;
  updated_at: string;
};

export const useAdminOutletsDirectory = () =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-outlets-directory"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_outlets_directory");
      if (error) {
        throw error;
      }
      return (data ?? []) as AdminOutletDirectoryRow[];
    },
  });

export const useAdminOnboardingClients = () =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-onboarding-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_onboarding_clients");
      if (error) {
        throw error;
      }
      return (data ?? []) as AdminOnboardingRow[];
    },
  });

export const useAdminPlatformUsers = () =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-platform-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_platform_users");
      if (error) {
        throw error;
      }
      return (data ?? []) as AdminPlatformUserRow[];
    },
  });

export const useAdminDemoRequests = () =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-demo-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_requests")
        .select("id, name, email, phone, restaurant_name, city, has_website, lead_status, priority, proposed_plan_id, demo_scheduled_at, next_follow_up_at, approved_at, meeting_notes, admin_notes, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return (data ?? []) as AdminDemoLeadRow[];
    },
  });

type UpdateAdminDemoLeadInput = {
  id: string;
  lead_status?: string;
  priority?: string;
  proposed_plan_id?: string | null;
  demo_scheduled_at?: string | null;
  next_follow_up_at?: string | null;
  meeting_notes?: string | null;
  admin_notes?: string | null;
  approved_at?: string | null;
};

export const useUpdateAdminDemoLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateAdminDemoLeadInput) => {
      const { error } = await supabase.from("demo_requests").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-demo-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-clients"] }),
      ]);
    },
  });
};
