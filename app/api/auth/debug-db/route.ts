import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { getRows } from "@/lib/db/index";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * GET /api/auth/debug-db - Debug database users table (admin only in production; dev-only otherwise)
 */
export async function GET(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === "development";
    if (!isDev) {
      await requireAdmin(request);
    }

    // Get all users
    const allUsers = await getRows<{
      id: string;
      name: string;
      phone: string;
      role: string;
      enabled: boolean;
      createdAt: string;
    }>(
      "SELECT id, name, phone, role, enabled, createdAt FROM users ORDER BY createdAt DESC LIMIT 50"
    );

    // Get users with null or empty phone
    const nullPhones = await getRows<{ id: string; phone: string }>(
      "SELECT id, phone FROM users WHERE phone IS NULL OR phone = '' OR LENGTH(phone) != 11"
    );

    // Get duplicate phones
    const duplicates = await getRows<{ phone: string; count: number }>(
      "SELECT phone, COUNT(*) as count FROM users WHERE phone IS NOT NULL AND phone != '' GROUP BY phone HAVING count > 1"
    );

    // Get phone statistics
    const phoneStats = await getRows<{
      total: number;
      withPhone: number;
      nullPhone: number;
      emptyPhone: number;
      invalidLength: number;
    }>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN phone IS NOT NULL AND phone != '' AND LENGTH(phone) = 11 THEN 1 ELSE 0 END) as withPhone,
        SUM(CASE WHEN phone IS NULL THEN 1 ELSE 0 END) as nullPhone,
        SUM(CASE WHEN phone = '' THEN 1 ELSE 0 END) as emptyPhone,
        SUM(CASE WHEN phone IS NOT NULL AND phone != '' AND LENGTH(phone) != 11 THEN 1 ELSE 0 END) as invalidLength
      FROM users`
    );

    logger.info("Database debug result:", {
      totalUsers: allUsers.length,
      nullPhones: nullPhones.length,
      duplicates: duplicates.length,
    });

    return createSuccessResponse({
      totalUsers: allUsers.length,
      users: allUsers,
      nullPhones,
      duplicates,
      phoneStats: phoneStats[0] || {},
    });
  } catch (error: any) {
    logger.error("Debug DB error:", error);
    return createErrorResponse(
      new AppError(error.message || "خطا در بررسی دیتابیس", 500, "DEBUG_ERROR")
    );
  }
}

