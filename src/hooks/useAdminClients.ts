import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_QUERY_DEFAULTS } from "@/lib/adminQuery";

export type AdminClientRow = {
  owner_id: string;
  client_name: string;
  owner_name: string;
  contact: string;
  phone: string | null;
  address: string | null;
  plan_name: string;
  subscription_status: string;
  client_status: string;
  outlets_count: number;
  onboarding_status: string;
  last_active: string | null;
  subscription_expiry: string | null;
  monthly_revenue: number;
};

export type AdminClientDetail = {
  owner_id: string;
  client_name: string;
  owner_name: string;
  contact: string;
  phone: string | null;
  address: string | null;
  restaurant_logo_url: string | null;
  plan_name: string;
  subscription_status: string;
  subscription_expiry: string | null;
  billing_period: string | null;
  monthly_revenue: number;
  outlets_count: number;
  tables_count: number;
  rooms_count: number;
  staff_count: number;
  total_orders: number;
  feature_analytics: boolean;
  feature_inventory: boolean;
  feature_expenses: boolean;
  feature_chain: boolean;
  feature_coupons: boolean;
  feature_online_orders: boolean;
  feature_kitchen_display: boolean;
  feature_customer_reviews: boolean;
  feature_white_label: boolean;
};

export type AdminClientOutlet = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  manager_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminClientUser = {
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  source: string;
};

const sortClients = (clients: AdminClientRow[]) =>
  [...clients].sort((left, right) => {
    const leftTime = left.last_active ? new Date(left.last_active).getTime() : 0;
    const rightTime = right.last_active ? new Date(right.last_active).getTime() : 0;
    return rightTime - leftTime;
  });

export const useAdminClients = () =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_clients");
      if (error) {
        throw error;
      }
      return sortClients((data ?? []) as AdminClientRow[]);
    },
  });

export const useAdminClientDetail = (ownerId?: string) =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-client-detail", ownerId],
    enabled: Boolean(ownerId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_client_detail", {
        _owner_id: ownerId!,
      });
      if (error) {
        throw error;
      }
      return ((data ?? [])[0] ?? null) as AdminClientDetail | null;
    },
  });

export const useAdminClientOutlets = (ownerId?: string) =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-client-outlets", ownerId],
    enabled: Boolean(ownerId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_client_outlets", {
        _owner_id: ownerId!,
      });
      if (error) {
        throw error;
      }
      return (data ?? []) as AdminClientOutlet[];
    },
  });

export const useAdminClientUsers = (ownerId?: string) =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-client-users", ownerId],
    enabled: Boolean(ownerId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_client_users", {
        _owner_id: ownerId!,
      });
      if (error) {
        throw error;
      }
      return (data ?? []) as AdminClientUser[];
    },
  });
