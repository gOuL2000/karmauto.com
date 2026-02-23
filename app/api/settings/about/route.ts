import { NextRequest, NextResponse } from "next/server";
import { getRow, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";

/**
 * GET /api/settings/about - Get about us content
 * PUT /api/settings/about - Update about us content
 */

export async function GET(request: NextRequest) {
  try {
    // Try to get from database first
    let aboutContent = await getRow<any>(
      "SELECT * FROM site_settings WHERE `key` = 'about_content' LIMIT 1"
    );

    // If not found, return default content
    if (!aboutContent) {
      return createSuccessResponse({
        content: `فروشگاه آنلاین ساد، ارائه‌دهنده قطعات خودرو وارداتی با بهترین کیفیت و قیمت است.

ما متعهد به ارائه بهترین خدمات به مشتریان خود هستیم و تمام تلاش خود را می‌کنیم تا رضایت شما را جلب کنیم.`,
        updatedAt: null,
      });
    }

    return createSuccessResponse({
      content: aboutContent.value || "",
      updatedAt: aboutContent.updatedAt || null,
    });
  } catch (error) {
    // If table doesn't exist, return default content
    return createSuccessResponse({
      content: `فروشگاه آنلاین ساد، ارائه‌دهنده قطعات خودرو وارداتی با بهترین کیفیت و قیمت است.

ما متعهد به ارائه بهترین خدمات به مشتریان خود هستیم و تمام تلاش خود را می‌کنیم تا رضایت شما را جلب کنیم.`,
      updatedAt: null,
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { content } = body;

    if (!content || typeof content !== "string") {
      throw new AppError("محتوا الزامی است", 400, "MISSING_CONTENT");
    }

    // Check if table exists, if not create it
    try {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS site_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          \`key\` VARCHAR(255) UNIQUE NOT NULL,
          value TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    } catch (error) {
      // Table might already exist, continue
    }

    // Insert or update
    await runQuery(
      `INSERT INTO site_settings (\`key\`, value, updatedAt) 
       VALUES ('about_content', ?, NOW())
       ON DUPLICATE KEY UPDATE value = ?, updatedAt = NOW()`,
      [content, content]
    );

    // Get updated content
    const updated = await getRow<any>(
      "SELECT * FROM site_settings WHERE `key` = 'about_content' LIMIT 1"
    );

    return createSuccessResponse({
      content: updated?.value || content,
      updatedAt: updated?.updatedAt || new Date().toISOString(),
      message: "محتوای درباره ما با موفقیت به‌روزرسانی شد",
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

