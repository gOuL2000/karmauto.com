import { NextRequest } from "next/server";
import { getRow } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/verify - Verify user session
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { userId } = body;

    if (!userId || typeof userId !== "string" || userId.trim() === "" || userId === "guest") {
      throw new AppError("شناسه کاربر معتبر نیست", 401, "INVALID_USER_ID");
    }

    // بررسی وجود کاربر در دیتابیس
    const user = await getRow<{
      id: string;
      name: string;
      phone: string;
      role: string;
      enabled: boolean;
      createdAt: string;
    }>(
      "SELECT id, name, phone, role, enabled, createdAt FROM users WHERE id = ?",
      [userId.trim()]
    );

    if (!user) {
      throw new AppError("کاربر یافت نشد", 404, "USER_NOT_FOUND");
    }

    // بررسی فعال بودن کاربر
    if (!user.enabled) {
      throw new AppError("حساب کاربری شما غیرفعال است", 403, "USER_DISABLED");
    }

    return createSuccessResponse({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
      valid: true,
    });
  } catch (error: any) {
    logger.error("POST /api/auth/verify error:", error);
    
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }

    return createErrorResponse(
      new AppError("خطا در تأیید هویت", 500, "VERIFY_ERROR")
    );
  }
}

