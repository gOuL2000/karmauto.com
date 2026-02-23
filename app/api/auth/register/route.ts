import { NextRequest, NextResponse } from "next/server";
import { getRow, runQuery } from "@/lib/db/index";
import { createErrorResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";
import { registerSchema, normalizePhone, validateStrongPassword } from "@/lib/validations/auth";
import { createSession, ensureAuthTables, setSessionCookie } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

/** 10 requests per minute per IP for registration */
const registerRateLimit = rateLimit(10, 60 * 1000);

/**
 * POST /api/auth/register - Register new user
 */
export async function POST(request: NextRequest) {
  const rateLimitRes = registerRateLimit(request);
  if (rateLimitRes) return rateLimitRes;

  try {
    await ensureAuthTables();
    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (parseError: any) {
      logger.error("JSON parse error:", parseError);
      throw new AppError("فرمت درخواست نامعتبر است", 400, "INVALID_JSON");
    }

    const { name, phone, password } = body || {};

    // بررسی وجود فیلدهای ضروری
    if (!name || typeof name !== "string" || name.trim() === "") {
      throw new AppError("نام الزامی است", 400, "MISSING_NAME");
    }

    if (!phone || typeof phone !== "string" || phone.trim() === "") {
      throw new AppError("شماره تماس الزامی است", 400, "MISSING_PHONE");
    }

    if (!password || typeof password !== "string" || password.trim() === "") {
      throw new AppError("رمز عبور الزامی است", 400, "MISSING_PASSWORD");
    }

    // اعتبارسنجی با Zod
    try {
      registerSchema.parse({ name: name.trim(), phone: phone.trim(), password });
    } catch (validationError: any) {
      const errors = validationError.errors || [];
      const firstError = errors[0];
      logger.warn("Validation error:", { errors, input: { name, phone: "***" } });
      throw new AppError(
        firstError?.message || "اطلاعات وارد شده معتبر نیست",
        400,
        "VALIDATION_ERROR",
        errors
      );
    }

    // اعتبارسنجی قوی رمز عبور — ثبت‌نام با رمز ضعیف مجاز نیست
    const passwordValidation = validateStrongPassword(password);
    if (!passwordValidation.valid && passwordValidation.errors.length > 0) {
      throw new AppError(
        passwordValidation.errors[0] || "رمز عبور معتبر نیست",
        400,
        "WEAK_PASSWORD"
      );
    }

    // نرمال‌سازی شماره تماس
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhone(phone.trim());
    } catch (error: any) {
      logger.error("Phone normalization error:", { error: error.message });
      throw new AppError(
        error.message || "شماره تماس معتبر نیست. فرمت صحیح: 09123456789",
        400,
        "INVALID_PHONE"
      );
    }

    // Ensure users table exists
    // NOTE: We do NOT pre-check duplicates anymore.
    // We rely on UNIQUE index on users.phone (atomic + reliable).

    // IMPORTANT: Check if phone number belongs to an existing admin user
    // Prevent registering with admin phone number
    const existingAdmin = await getRow<{
      id: string;
      role: string;
    }>(
      "SELECT id, role FROM users WHERE phone = ? AND role = 'admin' LIMIT 1",
      [normalizedPhone]
    );
    
    if (existingAdmin) {
      throw new AppError("این شماره تماس متعلق به ادمین است. لطفاً از صفحه ورود ادمین استفاده کنید", 403, "ADMIN_PHONE_NOT_ALLOWED");
    }

    // Hash password
    let hashedPassword: string;
    try {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(password, saltRounds);
      logger.debug("Password hashed successfully");
    } catch (hashError: any) {
      logger.error("Password hashing error:", hashError);
      throw new AppError("خطا در پردازش رمز عبور", 500, "PASSWORD_HASH_ERROR");
    }

    // Generate user ID
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    // Insert user
    try {
      await runQuery(
        `INSERT INTO users (id, name, phone, password, role, enabled, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'user', TRUE, ?, ?)`,
        [id, name.trim(), normalizedPhone, hashedPassword, now, now]
      );
      if (process.env.NODE_ENV === "development") {
        logger.debug("User inserted successfully", { id });
      }
    } catch (insertError: any) {
      logger.error("Error inserting user:", {
        code: insertError?.code,
        message: insertError?.message,
        sqlState: insertError?.sqlState,
        errno: insertError?.errno,
      });

      // بررسی خطاهای خاص
      if (insertError?.code === "ER_DUP_ENTRY" || insertError?.errno === 1062) {
        const msg =
          insertError?.sqlMessage ||
          insertError?.message ||
          "";
        // Only show DUPLICATE_PHONE when the duplicate key is actually the phone unique index.
        // Otherwise, return a generic duplicate key error to avoid misleading the user.
        const keyMatch = msg.match(/for key '([^']+)'/i);
        const dupKey = keyMatch?.[1] || "";
        const isPhoneDuplicate =
          /phone/i.test(msg) ||
          /uniq_users_phone/i.test(msg) ||
          /phone/i.test(dupKey) ||
          /uniq_users_phone/i.test(dupKey);
        if (isPhoneDuplicate) {
          throw new AppError("شماره تماس قبلاً ثبت شده است", 400, "DUPLICATE_PHONE");
        }
        throw new AppError("خطا: رکورد تکراری (کلید یکتا)", 409, "DUPLICATE_KEY");
      }

      if (
        insertError?.code === "ECONNREFUSED" ||
        insertError?.code === "ETIMEDOUT" ||
        insertError?.code === "ECONNRESET" ||
        insertError?.message?.includes("connect") ||
        insertError?.message?.includes("timeout")
      ) {
        throw new AppError("دیتابیس در دسترس نیست", 503, "DATABASE_NOT_AVAILABLE");
      }

      throw new AppError(
        `خطا در ثبت کاربر: ${insertError?.message || "خطای نامشخص"}`,
        500,
        "USER_INSERT_ERROR"
      );
    }

    // Get created user (without password)
    let newUser: {
      id: string;
      name: string;
      phone: string;
      role: string;
      createdAt: string;
    } | null = null;

    try {
      newUser = await getRow<{
        id: string;
        name: string;
        phone: string;
        role: string;
        createdAt: string;
      }>(
        "SELECT id, name, phone, role, createdAt FROM users WHERE id = ?",
        [id]
      );
    } catch (selectError: any) {
      logger.error("Error selecting created user:", {
        code: selectError?.code,
        message: selectError?.message,
        id,
      });
      // اگر کاربر insert شده اما select نشد، خطا نیست - ممکن است کمی delay داشته باشد
      // اما برای اطمینان، خطا را throw می‌کنیم
      throw new AppError("خطا در دریافت اطلاعات کاربر", 500, "USER_SELECT_ERROR");
    }

    if (!newUser) {
      logger.error("User created but not found:", { id, phone: normalizedPhone });
      throw new AppError("خطا در ایجاد کاربر", 500, "USER_CREATION_ERROR");
    }

    if (process.env.NODE_ENV === "development") {
      logger.debug("User registered successfully", { id });
    }

    const sessionToken = await createSession(newUser.id, request);
    // Create response directly to ensure cookie is set on the same object
    const res = NextResponse.json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          phone: newUser.phone,
          createdAt: newUser.createdAt,
        },
        message: "ثبت‌نام با موفقیت انجام شد",
      },
    });
    setSessionCookie(res, sessionToken, request);
    return res;
  } catch (error: any) {
    // Log کامل خطا برای debugging
    logger.error("POST /api/auth/register error:", {
      message: error?.message,
      code: error?.code,
      errno: error?.errno,
      sqlState: error?.sqlState,
      stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
    });
    
    // اگر AppError است، مستقیماً return کن
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
      error?.message?.includes("timeout") ||
      error?.message?.includes("Connection lost")
    ) {
      return createErrorResponse(
        new AppError("دیتابیس در دسترس نیست. لطفاً دوباره تلاش کنید", 503, "DATABASE_NOT_AVAILABLE")
      );
    }

    // Handle validation errors
    if (error?.name === "ZodError" || error?.issues) {
      const firstError = error?.issues?.[0] || error?.errors?.[0];
      return createErrorResponse(
        new AppError(
          firstError?.message || "اطلاعات وارد شده معتبر نیست",
          400,
          "VALIDATION_ERROR"
        )
      );
    }

    // Handle other errors with proper message
    const errorMessage = error?.message || "خطا در ثبت‌نام. لطفاً دوباره تلاش کنید";
    return createErrorResponse(
      new AppError(
        errorMessage,
        500,
        "REGISTRATION_ERROR",
        process.env.NODE_ENV === "development" ? error : undefined
      )
    );
  }
}
