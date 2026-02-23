import { NextRequest } from "next/server";
import { getRow, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { getSessionUserFromRequestWithAdminFallback } from "@/lib/auth/session";
import { ensureChatTables, getChatSchemaInfo } from "@/lib/chat/schema";

/**
 * POST /api/chat/block - Block a user from chat
 */
export async function POST(request: NextRequest) {
  try {
    await ensureChatTables();
    const schema = await getChatSchemaInfo();
    
    const sessionUser = await getSessionUserFromRequestWithAdminFallback(request);
    if (!sessionUser || sessionUser.role !== "admin") {
      throw new AppError("فقط ادمین می‌تواند کاربران را مسدود کند", 403, "FORBIDDEN");
    }

    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { chatId, customerPhone } = body;

    if (!chatId && !customerPhone) {
      throw new AppError("chatId یا customerPhone الزامی است", 400, "MISSING_PARAMS");
    }

    // Find chat
    let chat;
    if (chatId) {
      chat = await getRow<any>(`SELECT * FROM quick_buy_chats WHERE id = ?`, [chatId]);
    } else if (customerPhone) {
      chat = await getRow<any>(`SELECT * FROM quick_buy_chats WHERE customerPhone = ?`, [customerPhone]);
    }

    if (!chat) {
      throw new AppError("چت یافت نشد", 404, "CHAT_NOT_FOUND");
    }

    const phoneToBlock = customerPhone || chat.customerPhone;
    const userIdToBlock = schema.chatHasUserId ? chat.userId : null;

    // Check if blocked_users table exists, if not create it
    try {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS blocked_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT,
          userId TEXT,
          blockedBy TEXT,
          blockedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          reason TEXT
        )
      `);
    } catch (error) {
      // Table might already exist, ignore error
    }

    // Check if user is already blocked
    const existingBlock = await getRow<any>(
      `SELECT * FROM blocked_users WHERE phone = ? OR userId = ?`,
      [phoneToBlock, userIdToBlock || ""]
    );

    if (existingBlock) {
      throw new AppError("این کاربر قبلاً مسدود شده است", 400, "ALREADY_BLOCKED");
    }

    // Block the user
    await runQuery(
      `INSERT INTO blocked_users (phone, userId, blockedBy, reason) VALUES (?, ?, ?, ?)`,
      [phoneToBlock, userIdToBlock || null, sessionUser.id, "مسدود شده توسط ادمین"]
    );

    return createSuccessResponse({ 
      message: "کاربر با موفقیت مسدود شد",
      blockedPhone: phoneToBlock,
      blockedUserId: userIdToBlock
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * GET /api/chat/block - Check if a user is blocked
 */
export async function GET(request: NextRequest) {
  try {
    await ensureChatTables();
    
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const userId = searchParams.get("userId");

    if (!phone && !userId) {
      throw new AppError("phone یا userId الزامی است", 400, "MISSING_PARAMS");
    }

    // Check if blocked_users table exists
    try {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS blocked_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT,
          userId TEXT,
          blockedBy TEXT,
          blockedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          reason TEXT
        )
      `);
    } catch (error) {
      // Table might already exist, ignore error
    }

    const blocked = await getRow<any>(
      `SELECT * FROM blocked_users WHERE phone = ? OR userId = ?`,
      [phone || "", userId || ""]
    );

    return createSuccessResponse({ 
      isBlocked: !!blocked,
      blockInfo: blocked || null
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

