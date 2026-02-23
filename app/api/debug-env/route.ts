/**
 * Debug endpoint to check environment variables
 * Only available in development
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  return NextResponse.json({
    DB_HOST: process.env.DB_HOST || "NOT SET",
    DB_PORT: process.env.DB_PORT || "NOT SET",
    DB_NAME: process.env.DB_NAME || "NOT SET",
    DB_USER: process.env.DB_USER || "NOT SET",
    DB_PASSWORD: process.env.DB_PASSWORD ? "***SET***" : "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
  });
}

