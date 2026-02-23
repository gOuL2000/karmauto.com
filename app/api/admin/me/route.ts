import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-route-helpers";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * GET /api/admin/me - بازگرداندن اطلاعات ادمین با توکن Bearer.
 * فقط برای پنل ادمین؛ کوکی سایت را عوض نمی‌کند.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    return createSuccessResponse({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
