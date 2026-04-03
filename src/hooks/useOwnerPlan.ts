import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaffRole } from "@/hooks/useStaffRole";
import type { Tables } from "@/integrations/supabase/types";

export interface OwnerPlan {
  planName: string;
  expiresAt: string | null;
  status: string;
  maxTables: number;
  maxRooms: number;
  maxMenuItems: number;
  maxStaff: number;
  maxOrdersPerMonth: number;
  featureAnalytics: boolean;
  featureInventory: boolean;
  featureExpenses: boolean;
  featureChain: boolean;
  featureCoupons: boolean;
  featureOnlineOrders: boolean;
  featureKitchenDisplay: boolean;
  featureCustomerReviews: boolean;
  featureWhiteLabel: boolean;
  hasPlan: boolean;
}

const defaultPlan: OwnerPlan = {
  planName: "No Plan",
  expiresAt: null,
  status: "none",
  maxTables: 999,
  maxRooms: 999,
  maxMenuItems: 999,
  maxStaff: 999,
  maxOrdersPerMonth: 99999,
  featureAnalytics: true,
  featureInventory: true,
  featureExpenses: true,
  featureChain: true,
  featureCoupons: true,
  featureOnlineOrders: true,
  featureKitchenDisplay: true,
  featureCustomerReviews: true,
  featureWhiteLabel: false,
  hasPlan: false,
};

type PlanRow = Tables<"subscription_plans">;

export const useOwnerPlan = () => {
  const { ownerId, loading: roleLoading } = useStaffRole();
  const [plan, setPlan] = useState<OwnerPlan>(defaultPlan);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const applyPlan = (nextPlan: OwnerPlan) => {
      if (!active) return;
      setPlan(nextPlan);
      setLoading(false);
    };

    const fetchPlan = async () => {
      if (roleLoading) return;
      if (!ownerId) {
        applyPlan(defaultPlan);
        return;
      }

      setLoading(true);

      const { data: sub } = await supabase
        .from("owner_subscriptions")
        .select("expires_at, status, subscription_plans(*)")
        .eq("owner_id", ownerId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const rawPlan = sub?.subscription_plans;
      const subscriptionPlan = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan;

      if (subscriptionPlan) {
        const p = subscriptionPlan as PlanRow;
        applyPlan({
          planName: p.name,
          expiresAt: sub.expires_at,
          status: sub.status || "active",
          maxTables: p.max_tables ?? defaultPlan.maxTables,
          maxRooms: p.max_rooms ?? defaultPlan.maxRooms,
          maxMenuItems: p.max_menu_items ?? defaultPlan.maxMenuItems,
          maxStaff: p.max_staff ?? defaultPlan.maxStaff,
          maxOrdersPerMonth: p.max_orders_per_month ?? defaultPlan.maxOrdersPerMonth,
          featureAnalytics: p.feature_analytics ?? defaultPlan.featureAnalytics,
          featureInventory: p.feature_inventory ?? defaultPlan.featureInventory,
          featureExpenses: p.feature_expenses ?? defaultPlan.featureExpenses,
          featureChain: p.feature_chain ?? defaultPlan.featureChain,
          featureCoupons: p.feature_coupons ?? defaultPlan.featureCoupons,
          featureOnlineOrders: p.feature_online_orders ?? defaultPlan.featureOnlineOrders,
          featureKitchenDisplay: p.feature_kitchen_display ?? defaultPlan.featureKitchenDisplay,
          featureCustomerReviews: p.feature_customer_reviews ?? defaultPlan.featureCustomerReviews,
          featureWhiteLabel: p.feature_white_label ?? false,
          hasPlan: true,
        });
        return;
      }

      applyPlan(defaultPlan);
    };

    fetchPlan();

    return () => {
      active = false;
    };
  }, [ownerId, roleLoading]);

  return { plan, loading: roleLoading || loading };
};
