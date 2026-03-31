import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useAdminCheck = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("is_admin", { _user_id: user.id });
      setIsAdmin(!error && data === true);
      setLoading(false);
    };
    if (!authLoading) check();
  }, [user, authLoading]);

  return { isAdmin, loading: authLoading || loading, user };
};
