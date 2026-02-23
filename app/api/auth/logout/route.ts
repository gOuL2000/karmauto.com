import { NextRequest } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { clearSession, clearSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * POST /api/auth/logout - Logout current user (clear session cookie)
 */
export async function POST(request: NextRequest) {
  try {
    await clearSession(request);
    const res = createSuccessResponse({ message: "خروج موفق" });
    clearSessionCookie(res, request);
    
    // Also clear cookie in headers as fallback
    const cookieString = `saded_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
    res.headers.append('Set-Cookie', cookieString);
    
    return res;
  } catch (error) {
    return createErrorResponse(error);
  }
}


