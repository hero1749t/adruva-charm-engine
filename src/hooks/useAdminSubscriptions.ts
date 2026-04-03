import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_QUERY_DEFAULTS } from "@/lib/adminQuery";

export type AdminSubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  billing_period: string | null;
  max_tables: number | null;
  max_rooms: number | null;
  max_menu_items: number | null;
  max_staff: number | null;
  max_orders_per_month: number | null;
  feature_analytics: boolean | null;
  feature_inventory: boolean | null;
  feature_expenses: boolean | null;
  feature_chain: boolean | null;
  feature_coupons: boolean | null;
  feature_online_orders: boolean | null;
  feature_kitchen_display: boolean | null;
  feature_customer_reviews: boolean | null;
  feature_white_label: boolean | null;
  is_active: boolean | null;
  total_clients: number;
  active_clients: number;
};

export type AdminSubscriptionQueueRow = {
  subscription_id: string;
  owner_id: string;
  client_name: string;
  owner_name: string;
  contact: string;
  phone: string | null;
  plan_id: string;
  plan_name: string;
  billing_period: string | null;
  subscription_status: string;
  expires_at: string | null;
  created_at: string;
  notes: string | null;
  outlets_count: number;
};

type AssignAdminClientPlanInput = {
  ownerId: string;
  planId: string;
  status: string;
  expiresAt: string | null;
  notes?: string;
};

const normalizePlans = (plans: AdminSubscriptionPlan[]) =>
  [...plans].sort((left, right) => left.price - right.price);

const normalizeQueue = (rows: AdminSubscriptionQueueRow[]) =>
  [...rows].sort((left, right) => {
    const leftExpiry = left.expires_at ? new Date(left.expires_at).getTime() : Number.MAX_SAFE_INTEGER;
    const rightExpiry = right.expires_at ? new Date(right.expires_at).getTime() : Number.MAX_SAFE_INTEGER;
    return leftExpiry - rightExpiry;
  });

export const useAdminSubscriptionPlans = () =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_subscription_catalog");
      if (error) {
        throw error;
      }
      return normalizePlans((data ?? []) as AdminSubscriptionPlan[]);
    },
  });

export const useAdminSubscriptionQueue = () =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-subscription-queue"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_subscription_queue");
      if (error) {
        throw error;
      }
      return normalizeQueue((data ?? []) as AdminSubscriptionQueueRow[]);
    },
  });

export const useAssignAdminClientPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ownerId, planId, status, expiresAt, notes }: AssignAdminClientPlanInput) => {
      const { data, error } = await supabase.rpc("assign_admin_client_plan", {
        _owner_id: ownerId,
        _plan_id: planId,
        _status: status,
        _expires_at: expiresAt,
        _notes: notes?.trim() ? notes.trim() : null,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-subscription-plans"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-subscription-queue"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-clients"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] }),
      ]);
    },
  });
};
