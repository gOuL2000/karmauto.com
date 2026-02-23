import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { runQuery, getRows } from "@/lib/db/index";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * POST /api/auth/cleanup-db - Clean up invalid users in database (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === "development";
    if (!isDev) {
      await requireAdmin(request);
    }

    const results: any = {
      deleted: [],
      errors: [],
    };

    // 1. حذف کاربران با شماره تماس null یا خالی
    try {
      const nullResult = await runQuery(
        "DELETE FROM users WHERE phone IS NULL OR phone = '' OR LENGTH(phone) != 11 OR phone NOT LIKE '09%'"
      ) as { affectedRows?: number; changes?: number };
      const count = nullResult?.affectedRows ?? nullResult?.changes ?? 0;
      results.deleted.push({
        type: "invalid_phones",
        count,
      });
      logger.info("Deleted invalid phone users:", count);
    } catch (error: any) {
      results.errors.push({
        type: "invalid_phones",
        error: error.message,
      });
      logger.error("Error deleting invalid phones:", error);
    }

    // 2. پیدا کردن و حذف duplicate ها (به جز اولین رکورد)
    try {
      const duplicates = await getRows<{ phone: string; count: number }>(
        "SELECT phone, COUNT(*) as count FROM users WHERE phone IS NOT NULL AND phone != '' AND LENGTH(phone) = 11 GROUP BY phone HAVING count > 1"
      );

      for (const dup of duplicates) {
        // پیدا کردن تمام رکوردهای با این شماره
        const usersWithPhone = await getRows<{ id: string; createdAt: string }>(
          "SELECT id, createdAt FROM users WHERE phone = ? ORDER BY createdAt ASC",
          [dup.phone]
        );

        // حذف همه به جز اولین (قدیمی‌ترین)
        if (usersWithPhone.length > 1) {
          const idsToDelete = usersWithPhone.slice(1).map(u => u.id);
          for (const id of idsToDelete) {
            await runQuery("DELETE FROM users WHERE id = ?", [id]);
          }
          results.deleted.push({
            type: "duplicate",
            phone: dup.phone,
            count: idsToDelete.length,
          });
        }
      }
    } catch (error: any) {
      results.errors.push({
        type: "duplicates",
        error: error.message,
      });
      logger.error("Error deleting duplicates:", error);
    }

    logger.info("Cleanup result:", results);

    return createSuccessResponse({
      message: "پاکسازی انجام شد",
      results,
    });
  } catch (error: any) {
    logger.error("Cleanup DB error:", error);
    return createErrorResponse(
      new AppError(error.message || "خطا در پاکسازی دیتابیس", 500, "CLEANUP_ERROR")
    );
  }
}

