import { NextRequest } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { getSessionUserFromRequest } from "@/lib/auth/session";
import { AppError } from "@/lib/api-error-handler";

/**
 * GET /api/debug/session - Debug endpoint to check session (development only)
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return createErrorResponse(new AppError("در دسترس نیست", 403, "FORBIDDEN"));
  }
  try {
    const cookieHeader = request.headers.get('cookie');
    const cookies = request.cookies.getAll();
    const sessionCookie = request.cookies.get("saded_session");
    
    const sessionUser = await getSessionUserFromRequest(request);
    
    return createSuccessResponse({
      hasCookieHeader: !!cookieHeader,
      cookieHeader: cookieHeader ? cookieHeader.substring(0, 500) : null,
      cookieCount: cookies.length,
      cookieNames: cookies.map(c => c.name),
      hasSessionCookie: !!sessionCookie,
      sessionCookieValue: sessionCookie?.value ? sessionCookie.value.substring(0, 50) + '...' : null,
      hasSessionUser: !!sessionUser,
      sessionUser: sessionUser ? {
        id: sessionUser.id,
        name: sessionUser.name,
        phone: sessionUser.phone,
        role: sessionUser.role,
        enabled: sessionUser.enabled,
      } : null,
      requestUrl: request.url,
      requestHost: request.nextUrl.hostname,
      requestProtocol: request.nextUrl.protocol,
    });
  } catch (error: any) {
    return createErrorResponse(error);
  }
}

