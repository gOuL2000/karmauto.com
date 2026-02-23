import { NextRequest } from "next/server";
import { getRow, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";

/**
 * GET /api/settings/page-content?page=about - Get page content
 * PUT /api/settings/page-content?page=about - Update page content
 */

// Default content for each page
const defaultContents: Record<string, any> = {
  about: `فروشگاه آنلاین ساد، ارائه‌دهنده قطعات خودرو وارداتی با بهترین کیفیت و قیمت است.

ما متعهد به ارائه بهترین خدمات به مشتریان خود هستیم و تمام تلاش خود را می‌کنیم تا رضایت شما را جلب کنیم.`,
  
  faq: JSON.stringify([
    {
      question: "چگونه می‌توانم سفارش بدهم؟",
      answer: "شما می‌توانید با مراجعه به صفحه محصولات، محصول مورد نظر خود را انتخاب کرده و به سبد خرید اضافه کنید.",
    },
    {
      question: "روش‌های پرداخت چیست؟",
      answer: "پرداخت از طریق درگاه پرداخت آنلاین انجام می‌شود.",
    },
    {
      question: "زمان تحویل چقدر است؟",
      answer: "زمان تحویل بسته به روش ارسال انتخابی شما متفاوت است.",
    },
  ]),
  
  shipping: `ما دو روش ارسال هوایی و دریایی را برای شما فراهم کرده‌ایم.

هزینه ارسال بر اساس محصول و روش انتخابی شما محاسبه می‌شود.`,
  
  returns: `در صورت وجود مشکل در محصول، می‌توانید درخواست بازگشت کالا را ثبت کنید.

لطفاً قبل از ثبت درخواست، با پشتیبانی تماس بگیرید.`,
  
  warranty: `تمام محصولات ما دارای گارانتی اصالت و کیفیت هستند.

در صورت وجود مشکل در محصول، می‌توانید از خدمات گارانتی استفاده کنید.`,
  
  contact: JSON.stringify({
    phone: "021-12345678",
    email: "info@saded.ir",
    address: "تهران، ایران",
  }),
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");

    if (!page) {
      throw new AppError("نام صفحه الزامی است", 400, "MISSING_PAGE");
    }

    // Validate page name
    const validPages = ["about", "faq", "shipping", "returns", "warranty", "contact"];
    if (!validPages.includes(page)) {
      throw new AppError("نام صفحه معتبر نیست", 400, "INVALID_PAGE");
    }

    // Try to get from database
    let pageContent = await getRow<any>(
      "SELECT * FROM site_settings WHERE `key` = ? LIMIT 1",
      [`page_content_${page}`]
    );

    // If not found or value is empty/null, return default content
    if (!pageContent || !pageContent.value || pageContent.value.trim() === "" || pageContent.value === "null") {
      return createSuccessResponse({
        content: defaultContents[page],
        page,
        updatedAt: null,
      });
    }

    // Parse JSON if needed
    let content = pageContent.value;
    try {
      const parsed = JSON.parse(content);
      // اگر parse شد و خالی نبود، استفاده کن
      if (parsed !== null && parsed !== "" && !(Array.isArray(parsed) && parsed.length === 0) && !(typeof parsed === "object" && Object.keys(parsed).length === 0)) {
        content = parsed;
      }
      // اگر parse شد اما خالی بود، از default استفاده کن
      else {
        content = defaultContents[page];
      }
    } catch {
      // If not JSON, use as string
      // اگر string خالی بود، از default استفاده کن
      if (!content || content.trim() === "") {
        content = defaultContents[page];
      }
    }

    return createSuccessResponse({
      content,
      page,
      updatedAt: pageContent.updatedAt || null,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");

    if (!page) {
      throw new AppError("نام صفحه الزامی است", 400, "MISSING_PAGE");
    }

    // Validate page name
    const validPages = ["about", "faq", "shipping", "returns", "warranty", "contact"];
    if (!validPages.includes(page)) {
      throw new AppError("نام صفحه معتبر نیست", 400, "INVALID_PAGE");
    }

    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { content } = body;

    if (content === undefined || content === null) {
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

    // Convert content to string (JSON if object/array)
    const contentValue = typeof content === "string" ? content : JSON.stringify(content);

    // Insert or update
    await runQuery(
      `INSERT INTO site_settings (\`key\`, value, updatedAt) 
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE value = ?, updatedAt = NOW()`,
      [`page_content_${page}`, contentValue, contentValue]
    );

    // Get updated content
    const updated = await getRow<any>(
      "SELECT * FROM site_settings WHERE `key` = ? LIMIT 1",
      [`page_content_${page}`]
    );

    // Parse if JSON
    let parsedContent = updated?.value;
    try {
      parsedContent = JSON.parse(parsedContent);
    } catch {
      // Keep as string if not JSON
    }

    return createSuccessResponse({
      content: parsedContent,
      page,
      updatedAt: updated?.updatedAt || new Date().toISOString(),
      message: `محتوای صفحه ${page} با موفقیت به‌روزرسانی شد`,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

