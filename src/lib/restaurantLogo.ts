import { supabase } from "@/integrations/supabase/client";

export const getRestaurantLogoUrl = (value: string | null | undefined, version?: number) => {
  if (!value) return null;

  const baseUrl = value.startsWith("http")
    ? value.split("?")[0]
    : supabase.storage.from("restaurant-logos").getPublicUrl(value).data.publicUrl;

  if (!version) return baseUrl;
  return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}v=${version}`;
};

