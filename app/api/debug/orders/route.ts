import { NextRequest } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { getRows } from "@/lib/db/index";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * GET /api/debug/orders - Debug endpoint for orders table (admin in production; open in dev)
 */
export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  if (!isDev) {
    try {
      await requireAdmin(request);
    } catch {
      return createErrorResponse(new AppError("در دسترس نیست", 403, "FORBIDDEN"));
    }
  }
  try {
    const results: any = {
      tableExists: false,
      tableStructure: null,
      orderCount: 0,
      recentOrders: [],
      errors: [],
    };

    try {
      // Check if table exists by trying to get count
      const [countResult] = await getRows<{ count: number }>(
        "SELECT COUNT(*) as count FROM orders"
      );
      results.tableExists = true;
      results.orderCount = countResult?.count || 0;
    } catch (error: any) {
      if (error?.code === "ER_NO_SUCH_TABLE" || error?.message?.includes("doesn't exist")) {
        results.errors.push("Orders table does not exist");
        return createSuccessResponse(results);
      }
      results.errors.push(`Error checking table: ${error?.message}`);
    }

    if (results.tableExists) {
      try {
        // Get table structure
        const structure = await getRows<any>("DESCRIBE orders");
        results.tableStructure = structure;
      } catch (error: any) {
        results.errors.push(`Error getting structure: ${error?.message}`);
      }

      try {
        // Get recent orders
        const recentOrders = await getRows<any>(
          "SELECT id, orderNumber, userId, customerName, customerPhone, status, paymentStatus, createdAt FROM orders ORDER BY createdAt DESC LIMIT 10"
        );
        results.recentOrders = recentOrders;
      } catch (error: any) {
        results.errors.push(`Error getting orders: ${error?.message}`);
      }
    }

    return createSuccessResponse(results);
  } catch (error: any) {
    logger.error("Error in debug/orders:", error);
    return createErrorResponse(error);
  }
}

