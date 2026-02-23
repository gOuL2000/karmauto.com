import { NextRequest, NextResponse } from "next/server";
import { getRow } from "@/lib/db/index";
import { createErrorResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";
import { loginSchema, normalizePhone } from "@/lib/validations/auth";
import { createSession, ensureAuthTables, setSessionCookie } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

/** 15 requests per minute per IP for login (brute-force protection) */
const loginRateLimit = rateLimit(15, 60 * 1000);

/**
 * POST /api/auth/login - Login user
 */
export async function POST(request: NextRequest) {
  const rateLimitRes = loginRateLimit(request);
  if (rateLimitRes) return rateLimitRes;

  try {
    await ensureAuthTables();
    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { phone, password } = body;

    // اعتبارسنجی با Zod
    try {
      loginSchema.parse({ phone, password });
    } catch (validationError: any) {
      const errors = validationError.errors || [];
      const firstError = errors[0];
      throw new AppError(
        firstError?.message || "اطلاعات وارد شده معتبر نیست",
        400,
        "VALIDATION_ERROR",
        errors
      );
    }

    // نرمال‌سازی شماره تماس
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhone(phone.trim());
    } catch (error: any) {
      logger.error("Login - Phone normalization error:", { error: error.message });
      throw new AppError(
        error.message || "شماره تماس معتبر نیست. فرمت صحیح: 09123456789",
        400,
        "INVALID_PHONE"
      );
    }

    // Get user from database - استفاده از BINARY برای case-sensitive comparison
    const user = await getRow<{
      id: string;
      name: string;
      phone: string;
      password: string;
      role: string;
      enabled: boolean;
      createdAt: string;
    }>(
      "SELECT id, name, phone, password, role, enabled, createdAt FROM users WHERE BINARY phone = ? AND phone IS NOT NULL AND phone != '' AND LENGTH(phone) = 11",
      [normalizedPhone]
    );

    if (process.env.NODE_ENV === "development") {
      logger.debug("Login - User lookup:", { found: !!user });
    }

    if (!user) {
      throw new AppError("شماره تماس یا رمز عبور اشتباه است", 401, "INVALID_CREDENTIALS");
    }

    // IMPORTANT: Prevent admin from using regular user login endpoint
    // Admin should use /api/admin/login instead
    if (user.role === "admin") {
      throw new AppError("ادمین باید از صفحه ورود ادمین استفاده کند", 403, "ADMIN_MUST_USE_ADMIN_LOGIN");
    }

    // Check if user is enabled
    if (!user.enabled) {
      throw new AppError("حساب کاربری شما غیرفعال است", 403, "USER_DISABLED");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError("شماره تماس یا رمز عبور اشتباه است", 401, "INVALID_CREDENTIALS");
    }

    if (process.env.NODE_ENV === "development") {
      logger.debug("User logged in", { id: user.id });
    } else {
      logger.info("User logged in successfully");
    }

    const sessionToken = await createSession(user.id, request);

    // Create response FIRST, then set cookie on it
    // CRITICAL: Cookie must be set on the same response object that's returned
    const res = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
        },
        message: "ورود موفق",
      },
    });

    setSessionCookie(res, sessionToken, request);

    if (process.env.NODE_ENV === "development") {
      const cookieValue = res.cookies.get("saded_session")?.value;
      logger.debug("Session cookie set", { hasCookie: !!cookieValue });
    }

    return res;
  } catch (error: any) {
    logger.error("POST /api/auth/login error:", error);
    
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }

    // Handle database connection errors
    if (
      error?.message?.includes("not available") ||
      error?.code === "DATABASE_NOT_AVAILABLE" ||
      error?.code === "ECONNREFUSED" ||
      error?.code === "ETIMEDOUT" ||
      error?.code === "ECONNRESET" ||
      error?.code === "PROTOCOL_CONNECTION_LOST" ||
      error?.message?.includes("connect") ||
      error?.message?.includes("timeout")
    ) {
      logger.error("Database connection error during login:", error);
      return createErrorResponse(
        new AppError("دیتابیس در دسترس نیست. لطفاً اطمینان حاصل کنید که MySQL (XAMPP) نصب و در حال اجرا است.", 503, "DATABASE_NOT_AVAILABLE")
      );
    }

    // Handle other errors with proper message
    const errorMessage = error?.message || "خطا در ورود";
    return createErrorResponse(
      new AppError(errorMessage, 500, "LOGIN_ERROR")
    );
  }
}
