import { NextRequest } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { getRow, runQuery } from "@/lib/db/index";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/settings - Get site settings
 */
export async function GET(request: NextRequest) {
  try {
    logger.info("[GET /api/admin/settings] Starting request");
    
    // Ensure settings table exists
    logger.info("[GET /api/admin/settings] Creating table if not exists");
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
    logger.info("[GET /api/admin/settings] Table ensured");

    // Get settings from database
    logger.info("[GET /api/admin/settings] Fetching settings from database");
    let settings = await getRow<{
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

    // If not found, create default settings
    if (!settings) {
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
    }

    if (!settings) {
      throw new AppError("خطا در بارگذاری تنظیمات", 500, "SETTINGS_NOT_FOUND");
    }

    return createSuccessResponse({
      siteName: settings.siteName || "ساد",
      siteDescription: settings.siteDescription || "",
      logoUrl: settings.logoUrl || "",
      contactPhone: settings.contactPhone || "",
      contactEmail: settings.contactEmail || "",
      address: settings.address || "",
      maintenanceMode: settings.maintenanceMode || false,
      allowRegistration: settings.allowRegistration !== undefined ? settings.allowRegistration : true,
      emailNotifications: settings.emailNotifications !== undefined ? settings.emailNotifications : true,
      lowStockThreshold: settings.lowStockThreshold || 10,
      itemsPerPage: settings.itemsPerPage || 10,
      showNotifications: settings.showNotifications !== undefined ? settings.showNotifications : true,
      theme: settings.theme || "system",
    });
  } catch (error) {
    logger.error("[GET /api/admin/settings] Error getting settings:", error);
    logger.error("[GET /api/admin/settings] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return createErrorResponse(error);
  }
}

/**
 * PUT /api/admin/settings - Update site settings (Admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const { getAdminSessionUserFromRequest } = await import("@/lib/auth/session");
    const sessionUser = await getAdminSessionUserFromRequest(request);
    
    if (!sessionUser || sessionUser.role !== "admin") {
      throw new AppError("دسترسی غیرمجاز", 403, "UNAUTHORIZED");
    }

    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    // Ensure settings table exists
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

    // Update settings
    await runQuery(`
      INSERT INTO settings (
        id,
        \`siteName\`,
        \`siteDescription\`,
        \`logoUrl\`,
        \`contactPhone\`,
        \`contactEmail\`,
        \`address\`,
        \`maintenanceMode\`,
        \`allowRegistration\`,
        \`emailNotifications\`,
        \`lowStockThreshold\`,
        \`itemsPerPage\`,
        \`showNotifications\`,
        \`theme\`
      ) VALUES (
        'site_settings',
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON DUPLICATE KEY UPDATE
        \`siteName\` = VALUES(\`siteName\`),
        \`siteDescription\` = VALUES(\`siteDescription\`),
        \`logoUrl\` = VALUES(\`logoUrl\`),
        \`contactPhone\` = VALUES(\`contactPhone\`),
        \`contactEmail\` = VALUES(\`contactEmail\`),
        \`address\` = VALUES(\`address\`),
        \`maintenanceMode\` = VALUES(\`maintenanceMode\`),
        \`allowRegistration\` = VALUES(\`allowRegistration\`),
        \`emailNotifications\` = VALUES(\`emailNotifications\`),
        \`lowStockThreshold\` = VALUES(\`lowStockThreshold\`),
        \`itemsPerPage\` = VALUES(\`itemsPerPage\`),
        \`showNotifications\` = VALUES(\`showNotifications\`),
        \`theme\` = VALUES(\`theme\`),
        \`updatedAt\` = CURRENT_TIMESTAMP
    `, [
      body.siteName || "ساد",
      body.siteDescription || null,
      body.logoUrl || null,
      body.contactPhone || null,
      body.contactEmail || null,
      body.address || null,
      body.maintenanceMode || false,
      body.allowRegistration !== undefined ? body.allowRegistration : true,
      body.emailNotifications !== undefined ? body.emailNotifications : true,
      body.lowStockThreshold || 10,
      body.itemsPerPage || 10,
      body.showNotifications !== undefined ? body.showNotifications : true,
      body.theme || "system",
    ]);

    // Dispatch event to notify other tabs
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("settingsUpdated"));
    }

    return createSuccessResponse({
      message: "تنظیمات با موفقیت ذخیره شد",
    });
  } catch (error) {
    logger.error("Error updating settings:", error);
    return createErrorResponse(error);
  }
}


