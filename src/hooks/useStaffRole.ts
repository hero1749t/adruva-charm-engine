import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type StaffRole = "owner" | "manager" | "kitchen" | "cashier";

interface StaffInfo {
  role: StaffRole | null;
  loading: boolean;
  isOwner: boolean;
  isManager: boolean;
  isKitchen: boolean;
  isCashier: boolean;
  canManageMenu: boolean;
  canManageOrders: boolean;
  canManageStaff: boolean;
  canViewAnalytics: boolean;
}

/**
 * Hook to get the current user's staff role for a given restaurant owner.
 * If ownerId is not provided, assumes the current user IS the owner.
 */
export const useStaffRole = (ownerId?: string): StaffInfo => {
  const { user } = useAuth();
  const [role, setRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const effectiveOwnerId = ownerId || user.id;

    // If user is the owner themselves
    if (user.id === effectiveOwnerId) {
      setRole("owner");
      setLoading(false);
      return;
    }

    // Check staff_members table
    const fetchRole = async () => {
      const { data } = await supabase
        .from("staff_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("restaurant_owner_id", effectiveOwnerId)
        .eq("is_active", true)
        .maybeSingle();

      setRole((data?.role as StaffRole) || null);
      setLoading(false);
    };

    fetchRole();
  }, [user, ownerId]);

  const isOwner = role === "owner";
  const isManager = role === "manager";
  const isKitchen = role === "kitchen";
  const isCashier = role === "cashier";

  return {
    role,
    loading,
    isOwner,
    isManager,
    isKitchen,
    isCashier,
    canManageMenu: isOwner || isManager,
    canManageOrders: isOwner || isManager || isCashier,
    canManageStaff: isOwner,
    canViewAnalytics: isOwner || isManager,
  };
};
