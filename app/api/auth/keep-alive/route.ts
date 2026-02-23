import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-route-helpers";
import { refreshSession, setSessionCookie, setAdminSessionCookie, SESSION_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * GET /api/auth/keep-alive - تمدید نشست (پنل ادمین یا سایت).
 * تا زمانی که پنل باز است نشست منقضی نمی‌شود.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const adminCookieToken = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    const mainCookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const token = bearerToken || adminCookieToken || mainCookieToken || null;

    if (!token) {
      return createErrorResponse(new Error("نشست یافت نشد"), 401);
    }

    const extended = await refreshSession(token);
    if (!extended) {
      return createErrorResponse(new Error("نشست منقضی شده"), 401);
    }

    const res = createSuccessResponse({ ok: true });
    if (adminCookieToken) {
      setAdminSessionCookie(res, token);
    } else if (mainCookieToken) {
      setSessionCookie(res, token, request, { sessionOnly: true });
    }
    return res;
  } catch (error) {
    return createErrorResponse(error);
  }
}
