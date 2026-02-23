import { NextRequest } from "next/server";
import { testConnection, getDatabaseType, getRow } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";

/**
 * GET /api/health/db - Check database connection status
 */
export async function GET(request: NextRequest) {
  try {
    // Check environment variables in development
    const envInfo = process.env.NODE_ENV === "development" ? {
      DB_HOST: process.env.DB_HOST || "NOT SET",
      DB_PORT: process.env.DB_PORT || "NOT SET",
      DB_NAME: process.env.DB_NAME || "NOT SET",
      DB_USER: process.env.DB_USER || "NOT SET",
      DB_PASSWORD: process.env.DB_PASSWORD ? "SET" : "NOT SET",
    } : undefined;

    const isConnected = await testConnection();
    
    if (isConnected) {
      // Test query
      const result = await getRow<{ test: number }>("SELECT 1 as test");
      
      return createSuccessResponse({
        connected: true,
        type: getDatabaseType(),
        message: "دیتابیس متصل است",
        test: result,
        ...(envInfo && { env: envInfo }),
      });
    }
    
    return createErrorResponse(
      new Error("دیتابیس متصل نیست"),
      503
    );
  } catch (error: any) {
    const envInfo = process.env.NODE_ENV === "development" ? {
      DB_HOST: process.env.DB_HOST || "NOT SET",
      DB_PORT: process.env.DB_PORT || "NOT SET",
      DB_NAME: process.env.DB_NAME || "NOT SET",
      DB_USER: process.env.DB_USER || "NOT SET",
      DB_PASSWORD: process.env.DB_PASSWORD ? "SET" : "NOT SET",
      error: error?.message,
      code: error?.code,
    } : undefined;

    return createErrorResponse(
      error,
      503
    );
  }
}
