import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { normalizePhone, validateIranianPhone } from "@/lib/validations/auth";
import { getRow, getRows } from "@/lib/db/index";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/test-phone - Test phone normalization (development only)
 * Query params: phone=09123456789
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return createErrorResponse(new AppError("در دسترس نیست", 403, "FORBIDDEN"));
  }

  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return createErrorResponse(
        new AppError("شماره تماس را وارد کنید", 400, "MISSING_PHONE")
      );
    }

    const results: any = {
      original: phone,
      trimmed: phone.trim(),
    };

    // Test validation
    try {
      results.isValid = validateIranianPhone(phone);
    } catch (error: any) {
      results.validationError = error.message;
    }

    // Test normalization
    try {
      results.normalized = normalizePhone(phone.trim());
      results.normalizedLength = results.normalized.length;
    } catch (error: any) {
      results.normalizationError = error.message;
      return createSuccessResponse(results);
    }

    // Check database
    try {
      const existingUser = await getRow<{ id: string; phone: string; name: string }>(
        "SELECT id, phone, name FROM users WHERE phone = ? AND phone IS NOT NULL AND phone != ''",
        [results.normalized]
      );

      results.databaseCheck = {
        found: !!existingUser,
        userId: existingUser?.id,
        dbPhone: existingUser?.phone,
        dbName: existingUser?.name,
      };
    } catch (dbError: any) {
      results.databaseError = {
        code: dbError?.code,
        message: dbError?.message,
      };
    }

    // Check all users with similar phones
    try {
      const allUsers = await getRows<{ id: string; phone: string; name: string }>(
        "SELECT id, phone, name FROM users WHERE phone LIKE ? LIMIT 10",
        [`%${results.normalized.slice(-4)}%`]
      );
      results.similarPhones = allUsers || [];
    } catch (error: any) {
      results.similarPhonesError = error.message;
    }

    if (process.env.NODE_ENV === "development") {
      logger.debug("Phone test result (dev only)");
    }

    return createSuccessResponse(results);
  } catch (error: any) {
    logger.error("Test phone error:", error);
    return createErrorResponse(
      new AppError(error.message || "خطا در تست شماره تماس", 500, "TEST_ERROR")
    );
  }
}

