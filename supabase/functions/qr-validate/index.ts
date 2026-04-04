/**
 * QR Validation API - Supabase Edge Function
 * Validates QR codes and manual table entries
 * 
 * Endpoint: POST /api/qr/validate
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

interface ValidateRequest {
  ownerId: string;
  tableNumber: number;
}

interface ValidateResponse {
  success: boolean;
  tableId?: string;
  menuUrl?: string;
  tableStatus?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = (await req.json()) as ValidateRequest;
    const { ownerId, tableNumber } = body;

    if (!ownerId || !tableNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Call the validate_qr_scan function
    const { data, error } = await supabase.rpc("validate_qr_scan", {
      p_owner_id: ownerId,
      p_table_number: tableNumber,
    });

    if (error) {
      console.error("QR validation error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Validation failed",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No validation result",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = data[0];

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error_message,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize abandonment tracking
    const { error: trackingError } = await supabase.rpc(
      "initialize_abandonment_tracking",
      {
        p_order_id: "", // Will be done after order creation
      }
    );

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        tableId: result.table_id,
        menuUrl: result.menu_url,
        tableStatus: result.table_status,
        available: result.available,
      } as ValidateResponse),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
