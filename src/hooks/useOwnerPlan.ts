import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  hasPlan: false,
};

export const useOwnerPlan = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<OwnerPlan>(defaultPlan);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) { setLoading(false); return; }

      const { data: sub } = await supabase
        .from("owner_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("owner_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub && sub.subscription_plans) {
        const p = sub.subscription_plans as any;
        setPlan({
          planName: p.name,
          expiresAt: sub.expires_at,
          status: sub.status || "active",
          maxTables: p.max_tables,
          maxRooms: p.max_rooms,
          maxMenuItems: p.max_menu_items,
          maxStaff: p.max_staff,
          maxOrdersPerMonth: p.max_orders_per_month,
          featureAnalytics: p.feature_analytics,
          featureInventory: p.feature_inventory,
          featureExpenses: p.feature_expenses,
          featureChain: p.feature_chain,
          featureCoupons: p.feature_coupons,
          featureOnlineOrders: p.feature_online_orders,
          featureKitchenDisplay: p.feature_kitchen_display,
          featureCustomerReviews: p.feature_customer_reviews,
          hasPlan: true,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  return { plan, loading };
};
