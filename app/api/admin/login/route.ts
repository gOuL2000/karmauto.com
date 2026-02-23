import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { createSession, setAdminSessionCookie } from "@/lib/auth/session";
import { getRow, runQuery } from "@/lib/db/index";
import { logger } from "@/lib/logger";

/** Used only when no password exists in DB (first-time setup). Set via env ADMIN_INITIAL_PASSWORD. */
function getInitialAdminPassword(): string | null {
  const v = process.env.ADMIN_INITIAL_PASSWORD;
  return v && v.trim() ? v.trim() : null;
}

/**
 * POST /api/admin/login - Admin login with password only
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { password } = body;

    if (!password) {
      throw new AppError("رمز عبور الزامی است", 400, "MISSING_PASSWORD");
    }

    // Ensure admin_settings table exists
    try {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          id VARCHAR(255) PRIMARY KEY DEFAULT 'admin_password',
          \`key\` VARCHAR(255) UNIQUE NOT NULL,
          \`value\` TEXT NOT NULL,
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (error: any) {
      logger.warn("Error ensuring admin_settings table:", error?.message);
    }

    // Get password from database
    let passwordSetting = await getRow<{
      key: string;
      value: string;
    }>(
      "SELECT `key`, `value` FROM admin_settings WHERE `key` = 'admin_password' LIMIT 1"
    );

    let adminPassword: string | null = passwordSetting?.value ?? null;
    if (!adminPassword) {
      const initial = getInitialAdminPassword();
      if (!initial) {
        throw new AppError("رمز عبور ادمین تنظیم نشده است. متغیر ADMIN_INITIAL_PASSWORD را تنظیم کنید یا از پنل تنظیمات رمز را تعیین کنید.", 503, "ADMIN_PASSWORD_NOT_SET");
      }
      adminPassword = initial;
      await runQuery(
        `INSERT INTO admin_settings (\`key\`, \`value\`) VALUES ('admin_password', ?)
         ON DUPLICATE KEY UPDATE \`value\` = ?`,
        [initial, initial]
      );
    }

    // Check password
    if (password !== adminPassword) {
      logger.warn("Admin login attempt with wrong password");
      throw new AppError("رمز عبور اشتباه است", 401, "INVALID_PASSWORD");
    }

    // Find or create admin user
    let adminUser = await getRow<{
      id: string;
      name: string;
      phone: string;
      role: string;
      enabled: any;
    }>(
      `SELECT id, name, phone, role, enabled FROM users WHERE role = 'admin' LIMIT 1`
    );

    if (!adminUser) {
      // Create admin user if doesn't exist
      const adminId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");

      await runQuery(
        `INSERT INTO users (id, name, phone, password, role, enabled, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'admin', TRUE, ?, ?)`,
        [adminId, "ادمین", "00000000000", "$2a$10$dummy", now, now]
      );

      adminUser = await getRow<{
        id: string;
        name: string;
        phone: string;
        role: string;
        enabled: any;
      }>(
        `SELECT id, name, phone, role, enabled FROM users WHERE id = ?`,
        [adminId]
      );

      if (!adminUser) {
        throw new AppError("خطا در ایجاد کاربر ادمین", 500, "ADMIN_CREATION_ERROR");
      }

      logger.info("Admin user created:", adminId);
    }

    if (!adminUser.enabled) {
      throw new AppError("حساب کاربری ادمین غیرفعال است", 403, "ADMIN_DISABLED");
    }

    // Create session
    const token = await createSession(adminUser.id, request);

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: adminUser.id,
          name: adminUser.name,
          phone: adminUser.phone,
          role: adminUser.role,
        },
        message: "ورود موفق",
      },
    });

    // نشست ادمین فقط با کوکی سشن (با بستن تب پاک می‌شود). هیچ توکنی در کلاینت ذخیره نمی‌شود.
    setAdminSessionCookie(response, token);
    logger.info("Admin logged in successfully:", adminUser.id);

    return response;
  } catch (error) {
    return createErrorResponse(error);
  }
}

