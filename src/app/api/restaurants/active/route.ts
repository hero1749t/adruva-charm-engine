/**
 * API Route: GET /api/restaurants/active
 * Returns list of active restaurants for QR entry manual form
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(req: NextRequest) {
  try {
    // Get optional filter parameters
    const region = req.nextUrl.searchParams.get("region");
    const approvedOnly = req.nextUrl.searchParams.get("approvedOnly") !== "false";

    // Query active restaurants from database
    let query = supabase
      .from("restaurants")
      .select("user_id, restaurant_name, region, table_count, subscription_status")
      .eq("subscription_status", "active")
      .eq("is_approved", true);

    // Optional: filter by region
    if (region) {
      query = query.eq("region", region);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch restaurants" },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      // Return MOCK data if no real data available
      return NextResponse.json({
        success: true,
        restaurants: [
          {
            user_id: "550e8400-e29b-41d4-a716-446655440000",
            restaurant_name: "Test Restaurant 1",
            region: "Mumbai",
            table_count: 20,
          },
          {
            user_id: "550e8400-e29b-41d4-a716-446655440001",
            restaurant_name: "Test Restaurant 2",
            region: "Bangalore",
            table_count: 15,
          },
        ],
        isTestMode: true,
        message: "Using fallback test data - no active restaurants in database",
      });
    }

    return NextResponse.json({
      success: true,
      restaurants: data.map((r: any) => ({
        user_id: r.user_id,
        restaurant_name: r.restaurant_name,
        region: r.region,
        table_count: r.table_count || 20,
      })),
      isTestMode: false,
    });
  } catch (error) {
    console.error("Restaurants API error:", error);

    // Always return mock data on error - never fail the user (fallback-first design)
    return NextResponse.json({
      success: true,
      restaurants: [
        {
          user_id: "550e8400-e29b-41d4-a716-446655440000",
          restaurant_name: "Test Restaurant 1",
          region: "Mumbai",
          table_count: 20,
        },
        {
          user_id: "550e8400-e29b-41d4-a716-446655440001",
          restaurant_name: "Test Restaurant 2",
          region: "Bangalore",
          table_count: 15,
        },
      ],
      isTestMode: true,
      message: "Using fallback test data - API error",
    });
  }
}
