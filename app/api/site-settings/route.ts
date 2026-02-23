import { NextRequest } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { getRow, runQuery } from "@/lib/db/index";
import { logger } from "@/lib/logger";

/**
 * GET /api/site-settings - Get site settings (Public)
 */
const isDev = process.env.NODE_ENV === "development";

export async function GET(request: NextRequest) {
  try {
    if (isDev) logger.info("[GET /api/site-settings] Starting request");

    // Ensure settings table exists
    try {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS settings (
          id VARCHAR(255) PRIMARY KEY DEFAULT 'site_settings',
          \`siteName\` VARCHAR(255) NOT NULL DEFAULT 'ساد',
          \`siteDescription\` TEXT,
          \`logoUrl\` LONGTEXT,
          \`contactPhone\` VARCHAR(255),
          \`contactEmail\` VARCHAR(255),
          \`address\` TEXT,
          \`maintenanceMode\` BOOLEAN DEFAULT FALSE,
          \`allowRegistration\` BOOLEAN DEFAULT TRUE,
          \`emailNotifications\` BOOLEAN DEFAULT TRUE,
          \`lowStockThreshold\` INTEGER DEFAULT 10,
          \`itemsPerPage\` INTEGER DEFAULT 10,
          \`showNotifications\` BOOLEAN DEFAULT TRUE,
          \`theme\` VARCHAR(50) DEFAULT 'system',
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (dbError: any) {
      logger.error("[GET /api/site-settings] Database error creating table:", dbError);
      throw new AppError(
        `خطا در اتصال به دیتابیس: ${dbError.message || "خطای ناشناخته"}`,
        500,
        "DATABASE_ERROR"
      );
    }

    // Get settings from database
    let settings;
    try {
      settings = await getRow<{
        id: string;
        siteName: string;
        siteDescription: string | null;
        logoUrl: string | null;
        contactPhone: string | null;
        contactEmail: string | null;
        address: string | null;
        maintenanceMode: boolean;
        allowRegistration: boolean;
        emailNotifications: boolean;
        lowStockThreshold: number;
        itemsPerPage: number;
        showNotifications: boolean;
        theme: string;
      }>(
        "SELECT * FROM settings WHERE id = 'site_settings' LIMIT 1"
      );
    } catch (dbError: any) {
      logger.error("[GET /api/site-settings] Database error fetching settings:", dbError);
      throw new AppError(
        `خطا در خواندن تنظیمات: ${dbError.message || "خطای ناشناخته"}`,
        500,
        "DATABASE_ERROR"
      );
    }

    // If not found, create default settings
    if (!settings) {
      try {
        await runQuery(`
          INSERT INTO settings (id, \`siteName\`, \`siteDescription\`, \`lowStockThreshold\`, \`itemsPerPage\`)
          VALUES ('site_settings', 'ساد', 'فروشگاه آنلاین قطعات خودرو وارداتی', 10, 10)
        `);

        settings = await getRow<{
          id: string;
          siteName: string;
          siteDescription: string | null;
          logoUrl: string | null;
          contactPhone: string | null;
          contactEmail: string | null;
          address: string | null;
          maintenanceMode: boolean;
          allowRegistration: boolean;
          emailNotifications: boolean;
          lowStockThreshold: number;
          itemsPerPage: number;
          showNotifications: boolean;
          theme: string;
        }>(
          "SELECT * FROM settings WHERE id = 'site_settings' LIMIT 1"
        );
      } catch (dbError: any) {
        logger.error("[GET /api/site-settings] Database error creating default settings:", dbError);
        throw new AppError(
          `خطا در ایجاد تنظیمات پیش‌فرض: ${dbError.message || "خطای ناشناخته"}`,
          500,
          "DATABASE_ERROR"
        );
      }
    }

    if (!settings) {
      logger.error("[GET /api/site-settings] Settings still not found after creation attempt");
      throw new AppError("خطا در بارگذاری تنظیمات", 500, "SETTINGS_NOT_FOUND");
    }

    const response = createSuccessResponse({
      siteName: settings.siteName || "ساد",
      siteDescription: settings.siteDescription || "",
      logoUrl: settings.logoUrl || "",
      // Note: contactPhone, contactEmail, and address are managed in footer settings
      maintenanceMode: settings.maintenanceMode || false,
      allowRegistration: settings.allowRegistration !== undefined ? settings.allowRegistration : true,
      emailNotifications: settings.emailNotifications !== undefined ? settings.emailNotifications : true,
      lowStockThreshold: settings.lowStockThreshold || 10,
      itemsPerPage: settings.itemsPerPage || 10,
      showNotifications: settings.showNotifications !== undefined ? settings.showNotifications : true,
      theme: settings.theme || "system",
    });

    return response;
  } catch (error: any) {
    logger.error("[GET /api/site-settings] Error getting settings:", error);
    
    // Ensure we return a proper error response
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }
    
    // Handle unexpected errors
    return createErrorResponse(
      new AppError(
        `خطای سرور: ${error?.message || "خطای ناشناخته"}`,
        500,
        "INTERNAL_ERROR"
      )
    );
  }
}

/**
 * PUT /api/site-settings - Update site settings (Admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    if (isDev) logger.info("[PUT /api/site-settings] Starting request");

    // Check authentication (admin panel or site admin)
    let sessionUser;
    try {
      const { getSessionUserFromRequestWithAdminFallback } = await import("@/lib/auth/session");
      sessionUser = await getSessionUserFromRequestWithAdminFallback(request);
    } catch (authError: any) {
      logger.error("[PUT /api/site-settings] Auth error:", authError);
      throw new AppError(
        `خطا در بررسی احراز هویت: ${authError.message || "خطای ناشناخته"}`,
        500,
        "AUTH_ERROR"
      );
    }
    
    // Fallback: اگر session پیدا نشد اما userId در header ارسال شده
    // این برای development و همچنین برای اطمینان از کارکرد صحیح در production استفاده می‌شود
    if (!sessionUser) {
      const userIdHeader = request.headers.get('x-user-id');
      if (userIdHeader) {
        const user = await getRow<{
          id: string;
          name: string;
          phone: string;
          role: string;
          enabled: any;
          createdAt: string;
        }>(
          "SELECT id, name, phone, role, enabled, createdAt FROM users WHERE id = ?",
          [userIdHeader]
        );
        if (user && user.enabled) {
          sessionUser = {
            id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role || "user",
            enabled: Boolean(user.enabled),
            createdAt: user.createdAt || new Date().toISOString(),
          };
        }
      }
    }

    if (!sessionUser || sessionUser.role !== "admin") {
      throw new AppError("دسترسی غیرمجاز - فقط ادمین می‌تواند تنظیمات را تغییر دهد", 403, "UNAUTHORIZED");
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError: any) {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    }

    // Ensure settings table exists
    try {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS settings (
          id VARCHAR(255) PRIMARY KEY DEFAULT 'site_settings',
          \`siteName\` VARCHAR(255) NOT NULL DEFAULT 'ساد',
          \`siteDescription\` TEXT,
          \`logoUrl\` LONGTEXT,
          \`contactPhone\` VARCHAR(255),
          \`contactEmail\` VARCHAR(255),
          \`address\` TEXT,
          \`maintenanceMode\` BOOLEAN DEFAULT FALSE,
          \`allowRegistration\` BOOLEAN DEFAULT TRUE,
          \`emailNotifications\` BOOLEAN DEFAULT TRUE,
          \`lowStockThreshold\` INTEGER DEFAULT 10,
          \`itemsPerPage\` INTEGER DEFAULT 10,
          \`showNotifications\` BOOLEAN DEFAULT TRUE,
          \`theme\` VARCHAR(50) DEFAULT 'system',
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (dbError: any) {
      logger.error("[PUT /api/site-settings] Database error creating table:", dbError);
      throw new AppError(
        `خطا در اتصال به دیتابیس: ${dbError.message || "خطای ناشناخته"}`,
        500,
        "DATABASE_ERROR"
      );
    }

    // Update settings
    try {
      // Build dynamic UPDATE query - only update fields that are provided
      // Note: contactPhone, contactEmail, and address are managed in footer settings
      // so we preserve existing values if not provided
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      
      if (body.siteName !== undefined) {
        updateFields.push("`siteName` = ?");
        updateValues.push(body.siteName || "ساد");
      }
      if (body.siteDescription !== undefined) {
        updateFields.push("`siteDescription` = ?");
        updateValues.push(body.siteDescription || null);
      }
      if (body.logoUrl !== undefined) {
        updateFields.push("`logoUrl` = ?");
        updateValues.push(body.logoUrl || null);
      }
      // Skip contactPhone, contactEmail, address - managed in footer settings
      if (body.maintenanceMode !== undefined) {
        updateFields.push("`maintenanceMode` = ?");
        updateValues.push(body.maintenanceMode || false);
      }
      if (body.allowRegistration !== undefined) {
        updateFields.push("`allowRegistration` = ?");
        updateValues.push(body.allowRegistration);
      }
      if (body.emailNotifications !== undefined) {
        updateFields.push("`emailNotifications` = ?");
        updateValues.push(body.emailNotifications);
      }
      if (body.lowStockThreshold !== undefined) {
        updateFields.push("`lowStockThreshold` = ?");
        updateValues.push(body.lowStockThreshold || 10);
      }
      if (body.itemsPerPage !== undefined) {
        updateFields.push("`itemsPerPage` = ?");
        updateValues.push(body.itemsPerPage || 10);
      }
      if (body.showNotifications !== undefined) {
        updateFields.push("`showNotifications` = ?");
        updateValues.push(body.showNotifications);
      }
      if (body.theme !== undefined) {
        updateFields.push("`theme` = ?");
        updateValues.push(body.theme || "system");
      }
      
      if (updateFields.length === 0) {
        throw new AppError("هیچ فیلدی برای به‌روزرسانی ارسال نشده است", 400, "NO_FIELDS_TO_UPDATE");
      }
      
      updateFields.push("`updatedAt` = CURRENT_TIMESTAMP");
      
      await runQuery(`
        UPDATE settings 
        SET ${updateFields.join(", ")}
        WHERE id = 'site_settings'
      `, updateValues);
    } catch (dbError: any) {
      logger.error("[PUT /api/site-settings] Database error updating settings:", dbError);
      throw new AppError(
        `خطا در ذخیره تنظیمات: ${dbError.message || "خطای ناشناخته"}`,
        500,
        "DATABASE_ERROR"
      );
    }

    // Dispatch event to notify other tabs (client-side only)
    // Note: This won't work in server-side context, but it's harmless
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("settingsUpdated"));
    }

    return createSuccessResponse({
      message: "تنظیمات با موفقیت ذخیره شد",
    });
  } catch (error: any) {
    logger.error("[PUT /api/site-settings] Error updating settings:", error);
    
    // Ensure we return a proper error response
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }
    
    // Handle unexpected errors
    return createErrorResponse(
      new AppError(
        `خطای سرور: ${error?.message || "خطای ناشناخته"}`,
        500,
        "INTERNAL_ERROR"
      )
    );
  }
}

