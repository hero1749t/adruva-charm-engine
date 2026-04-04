/**
 * API Route: POST /api/qr/validate
 * Validates QR codes and manual table entries
 * 
 * Security:
 * - Validates input format (UUID, positive integers)
 * - Prevents invalid table number queries
 * - Calls Edge Function with proper authorization
 */

import { NextRequest, NextResponse } from "next/server";

// Validation helper functions
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidTableNumber(tableNumber: any): tableNumber is number {
  const num = parseInt(tableNumber);
  return Number.isInteger(num) && num >= 1 && num <= 99;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ownerId, tableNumber } = body;

    // ✅ VALIDATION: Check required fields
    if (!ownerId || tableNumber === undefined && tableNumber === null) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: ownerId, tableNumber" },
        { status: 400 }
      );
    }

    // ✅ VALIDATION: Owner ID must be valid UUID
    if (!isValidUUID(ownerId)) {
      return NextResponse.json(
        { success: false, error: "Invalid ownerId format (must be UUID)" },
        { status: 400 }
      );
    }

    // ✅ VALIDATION: Table number must be 1-99
    if (!isValidTableNumber(tableNumber)) {
      return NextResponse.json(
        { success: false, error: "Invalid tableNumber (must be integer 1-99)" },
        { status: 400 }
      );
    }

    // ✅ TIMEOUT: Set 2-second timeout for Edge Function call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    // Call Supabase Edge Function
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const functionName = "qr-validate";
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || ""}`,
      },
      body: JSON.stringify({
        ownerId,
        tableNumber,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { success: false, error: error.message || "Validation failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("QR validation timeout (2s exceeded)");
      return NextResponse.json(
        { success: false, error: "Validation timeout - please try again" },
        { status: 504 }
      );
    }

    console.error("QR validation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
