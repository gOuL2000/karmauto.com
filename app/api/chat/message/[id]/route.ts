import { NextRequest } from "next/server";
import { runQuery, getRow } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { getSessionUserFromRequestWithAdminFallback } from "@/lib/auth/session";
import { ensureChatTables, getChatSchemaInfo } from "@/lib/chat/schema";

async function ensureMessageColumns(): Promise<void> {
  try {
    await runQuery(`ALTER TABLE chat_messages ADD COLUMN updatedAt TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP`);
  } catch {
    // ignore
  }
}

/**
 * PATCH /api/chat/message/[id] - Edit a message
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureChatTables();
    const schema = await getChatSchemaInfo();
    await ensureMessageColumns();
    // Authentication removed - message editing is now open to everyone
    const sessionUser = await getSessionUserFromRequestWithAdminFallback(request);
    const isAdmin = sessionUser?.role === "admin";

    const { id } = await params;
    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { text, attachments } = body;

    if (!text && (!attachments || attachments.length === 0)) {
      throw new AppError("text or attachments are required", 400, "MISSING_PARAMS");
    }

    const message = await getRow<any>(
      schema.chatHasUserId
        ? `SELECT m.*, c.userId as chatUserId, c.customerPhone as chatPhone
           FROM chat_messages m
           JOIN quick_buy_chats c ON c.id = m.chatId
           WHERE m.id = ?
           LIMIT 1`
        : `SELECT m.*, c.customerPhone as chatPhone
           FROM chat_messages m
           JOIN quick_buy_chats c ON c.id = m.chatId
           WHERE m.id = ?
           LIMIT 1`,
      [id]
    );
    if (!message) {
      throw new AppError("پیام یافت نشد", 404, "MESSAGE_NOT_FOUND");
    }

    if (!isAdmin) {
      if (!sessionUser) {
        throw new AppError("برای ویرایش پیام باید وارد حساب کاربری خود شوید", 401, "UNAUTHORIZED");
      }
      const chatPhone = message.chatPhone ? String(message.chatPhone) : "";
      const chatUserId = schema.chatHasUserId && message.chatUserId ? String(message.chatUserId) : "";
      const isOwnerByUserId = schema.chatHasUserId && chatUserId === sessionUser.id;
      const isOwnerByPhone = !schema.chatHasUserId && chatPhone === sessionUser.phone;
      if (!isOwnerByUserId && !isOwnerByPhone) throw new AppError("شما دسترسی به این پیام را ندارید", 403, "FORBIDDEN");
      if (String(message.sender) !== "user") {
        throw new AppError("شما فقط می‌توانید پیام‌های خودتان را ویرایش کنید", 403, "FORBIDDEN");
      }
    }

    await runQuery(
      `UPDATE chat_messages 
       SET text = ?, attachments = ?, updatedAt = ?
       WHERE id = ?`,
      [
        text || message.text,
        attachments ? JSON.stringify(attachments) : message.attachments,
        new Date().toISOString(),
        id,
      ]
    );

    return createSuccessResponse({ message: "پیام با موفقیت ویرایش شد" });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/chat/message/[id] - Delete a message
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureChatTables();
    const schema = await getChatSchemaInfo();
    // Authentication removed - message deletion is now open to everyone
    const sessionUser = await getSessionUserFromRequestWithAdminFallback(request);
    const isAdmin = sessionUser?.role === "admin";

    const { id } = await params;

    const message = await getRow<any>(
      schema.chatHasUserId
        ? `SELECT m.*, c.userId as chatUserId, c.customerPhone as chatPhone
           FROM chat_messages m
           JOIN quick_buy_chats c ON c.id = m.chatId
           WHERE m.id = ?
           LIMIT 1`
        : `SELECT m.*, c.customerPhone as chatPhone
           FROM chat_messages m
           JOIN quick_buy_chats c ON c.id = m.chatId
           WHERE m.id = ?
           LIMIT 1`,
      [id]
    );
    if (!message) {
      throw new AppError("پیام یافت نشد", 404, "MESSAGE_NOT_FOUND");
    }

    // اگر پیام از ادمین است (support) یا از کاربر است (user)، اجازه حذف بدون احراز هویت
    const isSupportMessage = String(message.sender) === "support";
    const isUserMessage = String(message.sender) === "user";
    
    // فقط برای پیام‌های ادمین و کاربر اجازه حذف بدون احراز هویت
    if (!isAdmin && !isSupportMessage && !isUserMessage) {
      if (!sessionUser) {
        throw new AppError("برای حذف پیام باید وارد حساب کاربری خود شوید", 401, "UNAUTHORIZED");
      }
      const chatPhone = message.chatPhone ? String(message.chatPhone) : "";
      const chatUserId = schema.chatHasUserId && message.chatUserId ? String(message.chatUserId) : "";
      const isOwnerByUserId = schema.chatHasUserId && chatUserId === sessionUser.id;
      const isOwnerByPhone = !schema.chatHasUserId && chatPhone === sessionUser.phone;
      if (!isOwnerByUserId && !isOwnerByPhone) throw new AppError("شما دسترسی به این پیام را ندارید", 403, "FORBIDDEN");
    }

    await runQuery("DELETE FROM chat_messages WHERE id = ?", [id]);

    return createSuccessResponse({ message: "پیام با موفقیت حذف شد" });
  } catch (error) {
    return createErrorResponse(error);
  }
}


