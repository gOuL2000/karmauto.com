import { NextRequest } from "next/server";
import { getRow, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { getSessionUserFromRequestWithAdminFallback } from "@/lib/auth/session";
import { ensureChatTables, ensureChatReadStateTable, getChatSchemaInfo } from "@/lib/chat/schema";

/**
 * POST /api/chat/read-state
 * بدن: { chatId: string }
 *
 * وضعیت «خواندم» را برای همین شرکت‌کننده (از روی session) در این چت به‌روز می‌کند.
 * - کاربر لاگین‌شده → participantType='user', participantId=userId
 * - ادمین → participantType='admin', participantId='admin'
 *
 * بعد از فراخوانی، تمام پیام‌های طرف مقابل که قبل از الان ارسال شده‌اند «خوانده‌شده» شمرده می‌شوند.
 */
export async function POST(request: NextRequest) {
  try {
    await ensureChatTables();
    await ensureChatReadStateTable();
    const schema = await getChatSchemaInfo();
    const sessionUser = await getSessionUserFromRequestWithAdminFallback(request);

    if (!sessionUser) {
      throw new AppError("برای به‌روزرسانی وضعیت خواندن باید وارد شوید", 401, "UNAUTHORIZED");
    }

    const body = await request.json().catch(() => ({}));
    const chatId = body?.chatId;
    if (!chatId || typeof chatId !== "string") {
      throw new AppError("chatId الزامی است", 400, "MISSING_PARAMS");
    }

    const chat = await getRow<any>(`SELECT * FROM quick_buy_chats WHERE id = ?`, [chatId]);
    if (!chat) {
      throw new AppError("چت یافت نشد", 404, "CHAT_NOT_FOUND");
    }

    const isAdmin = sessionUser.role === "admin";
    const participantType = isAdmin ? "admin" : "user";
    const participantId = isAdmin ? "admin" : sessionUser.id;

    if (!isAdmin) {
      const chatPhone = (chat.customerPhone && String(chat.customerPhone).trim()) || "";
      const chatUserId = schema.chatHasUserId && chat.userId ? String(chat.userId).trim() : "";
      const isOwnerByUserId = schema.chatHasUserId && chatUserId === sessionUser.id;
      const isOwnerByPhone = chatPhone && chatPhone === sessionUser.phone;
      if (!isOwnerByUserId && !isOwnerByPhone) {
        throw new AppError("شما به این چت دسترسی ندارید", 403, "FORBIDDEN");
      }
    }

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    await runQuery(
      `INSERT INTO chat_read_state (chatId, participantType, participantId, lastReadAt)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE lastReadAt = VALUES(lastReadAt)`,
      [chatId, participantType, participantId, now]
    );

    return createSuccessResponse({ chatId, lastReadAt: now });
  } catch (error) {
    return createErrorResponse(error);
  }
}
