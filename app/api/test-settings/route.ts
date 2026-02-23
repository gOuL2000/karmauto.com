import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("=== [GET /api/test-settings] ROUTE HANDLER CALLED ===");
  return NextResponse.json({ success: true, message: "Test endpoint works!" });
}

