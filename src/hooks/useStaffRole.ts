import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type StaffRole = "owner" | "manager" | "kitchen" | "cashier";

interface StaffInfo {
  role: StaffRole | null;
  ownerId: string | null;
  loading: boolean;
  isOwner: boolean;
  isManager: boolean;
  isKitchen: boolean;
  isCashier: boolean;
  canWorkKitchen: boolean;
  canManageMenu: boolean;
  canManageOrders: boolean;
  canManageStaff: boolean;
  canViewAnalytics: boolean;
  canManageBusiness: boolean;
}

/**
 * Resolves the current user's role and the owner account they belong to.
 * If an ownerId is provided, permissions are evaluated against that owner.
 */
export const useStaffRole = (ownerId?: string): StaffInfo => {
  const { user } = useAuth();
  const [role, setRole] = useState<StaffRole | null>(null);
  const [resolvedOwnerId, setResolvedOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const applyState = (nextRole: StaffRole | null, nextOwnerId: string | null) => {
      if (!active) return;
      setRole(nextRole);
      setResolvedOwnerId(nextOwnerId);
      setLoading(false);
    };

    const fetchRole = async () => {
      if (!user) {
        applyState(null, null);
        return;
      }

      setLoading(true);

      if (ownerId) {
        if (user.id === ownerId) {
          applyState("owner", ownerId);
          return;
        }

        const { data, error } = await supabase
          .from("staff_members")
          .select("role")
          .eq("user_id", user.id)
          .eq("restaurant_owner_id", ownerId)
          .eq("is_active", true)
          .maybeSingle();

        if (error) {
          applyState(null, null);
          return;
        }

        applyState((data?.role as StaffRole | undefined) ?? null, ownerId);
        return;
      }

      const { data: staffRecord, error: staffError } = await supabase
        .from("staff_members")
        .select("role, restaurant_owner_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (staffError) {
        applyState(null, null);
        return;
      }

      if (staffRecord && staffRecord.restaurant_owner_id !== user.id) {
        applyState(staffRecord.role as StaffRole, staffRecord.restaurant_owner_id);
        return;
      }

      const { data: ownerProfile, error: ownerProfileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownerProfileError) {
        applyState(null, null);
        return;
      }

      if (ownerProfile) {
        applyState("owner", user.id);
        return;
      }

      applyState(null, null);
    };

    fetchRole();

    return () => {
      active = false;
    };
  }, [user, ownerId]);

  const isOwner = role === "owner";
  const isManager = role === "manager";
  const isKitchen = role === "kitchen";
  const isCashier = role === "cashier";

  return {
    role,
    ownerId: resolvedOwnerId,
    loading,
    isOwner,
    isManager,
    isKitchen,
    isCashier,
    canWorkKitchen: isOwner || isManager || isKitchen,
    canManageMenu: isOwner || isManager,
    canManageOrders: isOwner || isManager || isCashier,
    canManageStaff: isOwner,
    canViewAnalytics: isOwner || isManager,
    canManageBusiness: isOwner || isManager,
  };
};
