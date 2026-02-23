import { NextRequest } from "next/server";
import { getRow, getRows, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { logger } from "@/lib/logger";
import { getSessionUserFromRequestWithAdminFallback } from "@/lib/auth/session";
import { ensureChatTables, ensureChatReadStateTable, getChatSchemaInfo } from "@/lib/chat/schema";

/**
 * سیستم اعلان چت (بر اساس read state):
 * - هر شرکت‌کننده (کاربر یا ادمین) در هر چت یک lastReadAt دارد (جدول chat_read_state).
 * - unread = تعداد پیام‌های طرف مقابل که بعد از lastReadAt ارسال شده‌اند.
 *
 * GET /api/chat/unread-count
 *   - chatId (اختیاری): یک چت
 *   - all=true: همه چت‌ها (ادمین) یا همه چت‌های این کاربر
 */
export async function GET(request: NextRequest) {
  try {
    await ensureChatTables();
    await ensureChatReadStateTable();
    const schema = await getChatSchemaInfo();
    const sessionUser = await getSessionUserFromRequestWithAdminFallback(request);
    const isAdmin = sessionUser?.role === "admin";

    const { searchParams } = new URL(request.url);
    const chatIdParam = searchParams.get("chatId");
    const getAll = searchParams.get("all") === "true";

    if (chatIdParam) {
      const chat = await getRow<any>(`SELECT * FROM quick_buy_chats WHERE id = ?`, [chatIdParam]);
      if (!chat) {
        throw new AppError("چت یافت نشد", 404, "CHAT_NOT_FOUND");
      }
      if (!isAdmin && sessionUser) {
        const chatPhone = (chat.customerPhone && String(chat.customerPhone).trim()) || "";
        const chatUserId = schema.chatHasUserId && chat.userId ? String(chat.userId).trim() : "";
        const isOwner = (schema.chatHasUserId && chatUserId === sessionUser.id) || chatPhone === sessionUser.phone;
        if (!isOwner) {
          throw new AppError("شما به این چت دسترسی ندارید", 403, "FORBIDDEN");
        }
      }

      const participantType = isAdmin ? "admin" : "user";
      const participantId = isAdmin ? "admin" : (sessionUser?.id ?? "");
      const senderCondition = isAdmin ? "m.sender = 'user'" : "m.sender != 'user'";

      const result = await getRow<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM chat_messages m
         LEFT JOIN chat_read_state r ON r.chatId = m.chatId AND r.participantType = ? AND r.participantId = ?
         WHERE m.chatId = ? AND ${senderCondition}
           AND m.createdAt > COALESCE(r.lastReadAt, '1970-01-01 00:00:00')`,
        [participantType, participantId, chatIdParam]
      );
      const unreadCount = parseInt(result?.count ?? "0", 10);
      return createSuccessResponse({ chatId: chatIdParam, unreadCount });
    }

    if (!getAll) {
      throw new AppError("پارامتر chatId یا all=true الزامی است", 400, "MISSING_PARAMS");
    }

    let chats: { id: string }[] = [];

    if (isAdmin) {
      try {
        chats = await getRows<{ id: string }>(`SELECT DISTINCT chatId as id FROM chat_messages`);
      } catch (err: any) {
        if (err?.code === "ER_NO_SUCH_TABLE" || err?.message?.includes("doesn't exist")) {
          return createSuccessResponse({ chats: [] });
        }
        throw err;
      }
    } else {
      if (!sessionUser) {
        return createSuccessResponse({ chats: [] });
      }
      const phone = (sessionUser.phone != null && String(sessionUser.phone).trim()) || "";
      const uid = (sessionUser.id != null && String(sessionUser.id).trim()) || "";
      try {
        if (schema.chatHasUserId) {
          chats = await getRows<{ id: string }>(
            `SELECT DISTINCT m.chatId as id
             FROM chat_messages m
             JOIN quick_buy_chats c ON c.id = m.chatId
             WHERE c.userId = ? OR TRIM(c.customerPhone) = TRIM(?)`,
            [uid, phone]
          );
        } else {
          chats = await getRows<{ id: string }>(
            `SELECT DISTINCT m.chatId as id
             FROM chat_messages m
             JOIN quick_buy_chats c ON c.id = m.chatId
             WHERE TRIM(c.customerPhone) = TRIM(?)`,
            [phone]
          );
        }
      } catch (err: any) {
        if (err?.code === "ER_NO_SUCH_TABLE" || err?.message?.includes("doesn't exist")) {
          return createSuccessResponse({ chats: [] });
        }
        throw err;
      }
    }

    const participantType = isAdmin ? "admin" : "user";
    const participantId = isAdmin ? "admin" : (sessionUser?.id ?? "");
    const senderCondition = isAdmin ? "m.sender = 'user'" : "m.sender != 'user'";

    const chatsWithUnreadCount = await Promise.all(
      chats.map(async (chat) => {
        try {
          const result = await getRow<{ count: string }>(
            `SELECT COUNT(*) as count
             FROM chat_messages m
             LEFT JOIN chat_read_state r ON r.chatId = m.chatId AND r.participantType = ? AND r.participantId = ?
             WHERE m.chatId = ? AND ${senderCondition}
               AND m.createdAt > COALESCE(r.lastReadAt, '1970-01-01 00:00:00')`,
            [participantType, participantId, chat.id]
          );
          return {
            id: chat.id,
            unreadCount: parseInt(result?.count ?? "0", 10),
          };
        } catch (e) {
          logger.error(`Unread count for chat ${chat.id}:`, e);
          return { id: chat.id, unreadCount: 0 };
        }
      })
    );

    return createSuccessResponse({ chats: chatsWithUnreadCount });
  } catch (error) {
    logger.error("[GET /api/chat/unread-count]", error);
    return createErrorResponse(error);
  }
}
