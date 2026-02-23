import { NextRequest } from "next/server";
import { createSuccessResponse } from "@/lib/api-route-helpers";
import { SESSION_COOKIE_NAME, getSessionUserFromRequest } from "@/lib/auth/session";

/**
 * GET /api/auth/debug-session - Debug session cookie (development only)
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return createSuccessResponse({ error: "Not available in production" });
  }

  const allCookies = request.cookies.getAll();
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const sessionUser = await getSessionUserFromRequest(request);

  return createSuccessResponse({
    cookies: {
      all: allCookies.map(c => ({ name: c.name, hasValue: !!c.value, valueLength: c.value?.length })),
      sessionCookie: sessionCookie ? {
        name: sessionCookie.name,
        hasValue: !!sessionCookie.value,
        valueLength: sessionCookie.value?.length,
        valuePreview: sessionCookie.value ? `${sessionCookie.value.substring(0, 20)}...` : null,
      } : null,
    },
    session: {
      found: !!sessionUser,
      user: sessionUser ? {
        id: sessionUser.id,
        name: sessionUser.name,
        phone: sessionUser.phone,
        role: sessionUser.role,
        enabled: sessionUser.enabled,
      } : null,
    },
  });
}








