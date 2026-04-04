import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useAdminCheck = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const check = async () => {
      if (authLoading) {
        return;
      }

      setLoading(true);

      if (!user) {
        if (!active) return;
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc("is_admin", { _user_id: user.id });
        if (!active) return;
        setIsAdmin(!error && data === true);
      } catch {
        if (!active) return;
        setIsAdmin(false);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };

    void check();

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  return { isAdmin, loading: authLoading || loading, user };
};
