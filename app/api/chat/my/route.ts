import { NextRequest } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { getRow, runQuery } from "@/lib/db/index";
import { getSessionUserFromRequest } from "@/lib/auth/session";
import { ensureChatTables, getChatSchemaInfo } from "@/lib/chat/schema";

/**
 * GET /api/chat/my
 * Returns the current user's chat (creates one if none exists).
 */
export async function GET(request: NextRequest) {
  try {
    await ensureChatTables();
    const schema = await getChatSchemaInfo();

    // Debug: log cookie info in development
    if (process.env.NODE_ENV === 'development') {
      const cookieHeader = request.headers.get('cookie');
      const sessionCookie = request.cookies.get("saded_session");
      const allCookies = request.cookies.getAll();
      console.log('[GET /api/chat/my] Cookie check:', {
        hasCookieHeader: !!cookieHeader,
        cookieHeaderPreview: cookieHeader ? cookieHeader.substring(0, 300) : null,
        hasSessionCookie: !!sessionCookie,
        sessionCookieValue: sessionCookie?.value ? sessionCookie.value.substring(0, 50) + '...' : null,
        allCookiesCount: allCookies.length,
        allCookieNames: allCookies.map(c => c.name),
        requestUrl: request.url,
        requestHost: request.nextUrl.hostname,
        requestProtocol: request.nextUrl.protocol,
      });
    }

    // Authentication required - only registered users can access chat
    let sessionUser = await getSessionUserFromRequest(request);
    
    // Fallback: اگر session پیدا نشد اما userId در header ارسال شده (برای development)
    if (!sessionUser && process.env.NODE_ENV === 'development') {
      const userIdHeader = request.headers.get('x-user-id');
      if (userIdHeader) {
        console.log('[GET /api/chat/my] Using userId from header (development fallback):', userIdHeader);
        // Get user from database
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
          console.log('[GET /api/chat/my] Fallback user found:', sessionUser);
        }
      }
    }
    
    // Require authentication - no guest users allowed
    if (!sessionUser) {
      throw new AppError("برای دسترسی به چت باید وارد حساب کاربری خود شوید", 401, "UNAUTHORIZED");
    }
    
    // Use authenticated user info
    const userId = sessionUser.id;
    const userName = sessionUser.name || "کاربر";
    const userPhone = sessionUser.phone || "";

    // For guest users without phone, we'll create a new chat each time
    // For logged-in users or users with phone, try to find existing chat
    let existing = null;
    
    if (userId && schema.chatHasUserId) {
      existing = await getRow<any>(
        `SELECT * FROM quick_buy_chats WHERE userId = ? ORDER BY updatedAt DESC LIMIT 1`,
        [userId]
      );
    } else if (userPhone) {
      existing = await getRow<any>(
        `SELECT * FROM quick_buy_chats WHERE customerPhone = ? ORDER BY updatedAt DESC LIMIT 1`,
        [userPhone]
      );
    }

    if (existing?.id) {
      return createSuccessResponse({
        chatId: existing.id,
        chat: existing,
      });
    }

    // Create new chat (guest or authenticated)
    const chatId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    try {
      if (schema.chatHasUserId) {
        // If table has userId column, insert with userId (can be null for guests)
        await runQuery(
          `INSERT INTO quick_buy_chats (id, userId, customerName, customerPhone, customerEmail, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [chatId, userId, userName, userPhone, null, "active", now, now]
        );
      } else {
        // If table doesn't have userId column, insert without it
        await runQuery(
          `INSERT INTO quick_buy_chats (id, customerName, customerPhone, customerEmail, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [chatId, userName, userPhone, null, "active", now, now]
        );
      }
    } catch (error: any) {
      // Log error for debugging
      console.error('[GET /api/chat/my] Error creating chat:', error);
      throw new AppError(
        `خطا در ایجاد چت: ${error?.message || 'خطای نامشخص'}`,
        500,
        "CHAT_CREATION_ERROR"
      );
    }

    const created = await getRow<any>(`SELECT * FROM quick_buy_chats WHERE id = ?`, [chatId]);
    return createSuccessResponse({
      chatId,
      chat: created,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}


