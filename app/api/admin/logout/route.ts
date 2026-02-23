import { NextRequest, NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/auth/session";

/**
 * POST /api/admin/logout - پاک کردن نشست ادمین و کوکی.
 * بعد از فراخوانی، کلاینت به /admin/login هدایت شود.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  await clearAdminSession(request, response);
  return response;
}
