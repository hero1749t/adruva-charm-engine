import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export const ensureProfileExists = async (user: User) => {
  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existingProfile) {
    return existingProfile;
  }

  const insertPayload: TablesInsert<"profiles"> = {
    user_id: user.id,
    full_name:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null,
  };

  const { data, error } = await supabase
    .from("profiles")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data;
};
