import { NextRequest } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getRow, runQuery } from "@/lib/db/index";
import { logger } from "@/lib/logger";

/** Used only when no password exists in DB (first-time setup). Set via env ADMIN_INITIAL_PASSWORD. */
function getInitialAdminPassword(): string | null {
  const v = process.env.ADMIN_INITIAL_PASSWORD;
  return v && v.trim() ? v.trim() : null;
}

/**
 * PUT /api/admin/password - Update admin password
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { password, currentPassword } = body;

    if (!password || typeof password !== "string" || password.trim() === "") {
      throw new AppError("رمز عبور جدید الزامی است", 400, "MISSING_PASSWORD");
    }

    if (password.length < 6) {
      throw new AppError("رمز عبور باید حداقل 6 کاراکتر باشد", 400, "PASSWORD_TOO_SHORT");
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

    // Verify current password if provided
    if (currentPassword) {
      const currentPasswordSetting = await getRow<{
        key: string;
        value: string;
      }>(
        "SELECT `key`, `value` FROM admin_settings WHERE `key` = 'admin_password' LIMIT 1"
      );
      const initialPassword = getInitialAdminPassword();
      const actualPassword = currentPasswordSetting?.value ?? initialPassword;
      if (actualPassword == null) {
        throw new AppError("رمز عبور ادمین تنظیم نشده است", 403, "ADMIN_PASSWORD_NOT_SET");
      }
      if (currentPassword !== actualPassword) {
        throw new AppError("رمز عبور فعلی اشتباه است", 401, "INVALID_CURRENT_PASSWORD");
      }
    }

    // Update password in database
    await runQuery(
      `INSERT INTO admin_settings (\`key\`, \`value\`) VALUES ('admin_password', ?)
       ON DUPLICATE KEY UPDATE \`value\` = ?, \`updatedAt\` = CURRENT_TIMESTAMP`,
      [password.trim(), password.trim()]
    );

    logger.info("Admin password updated successfully");

    return createSuccessResponse({
      message: "رمز عبور با موفقیت تغییر کرد",
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

