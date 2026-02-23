import { NextRequest } from "next/server";
import { getRow, runQuery, getRows } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { cache, cacheKeys } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimiter, getClientId } from "@/lib/rate-limit";
import { getSessionUserFromRequest, getSessionUserFromRequestWithAdminFallback, SessionUser } from "@/lib/auth/session";
import { ensureChatTables as ensureChatTablesShared, getChatSchemaInfo } from "@/lib/chat/schema";

async function ensureChatTables(): Promise<void> {
  await ensureChatTablesShared();
}

function rateLimitKeyForAuthedUser(request: NextRequest, userId: string): string {
  // Use userId as the primary key for authenticated-only chat endpoints.
  // This prevents false 429s on hosts where client IP is missing (all users become "unknown")
  // and avoids collisions for users behind the same NAT.
  return `user:${userId}`;
}

function createRateLimitResponse(maxRequests: number, windowMs: number, fullKey: string): Response {
  const resetTime = rateLimiter.getResetTime(fullKey);
  const remaining = rateLimiter.getRemaining(fullKey, maxRequests);

  return new Response(
    JSON.stringify({
      success: false,
      error: "درخواست‌های شما زیاد است. لطفاً کمی بعد دوباره تلاش کنید.",
      code: "RATE_LIMIT_EXCEEDED",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": maxRequests.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": resetTime?.toString() || "",
        "Retry-After": Math.ceil((resetTime ? resetTime - Date.now() : windowMs) / 1000).toString(),
      },
    }
  );
}

/**
 * POST /api/chat - Create a new chat and save messages
 */
export async function POST(request: NextRequest) {
  try {
    await ensureChatTables();
    const schema = await getChatSchemaInfo();

    // Parse body first to check if this is from admin (support)
    const body = await request.json().catch((error) => {
      logger.error("[POST /api/chat] JSON parse error:", error);
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    // Check if message is from admin (support)
    const isFromAdmin = body.messages && Array.isArray(body.messages) && 
                       body.messages.length > 0 && 
                       body.messages[0]?.sender === "support";

    // Authentication required - only registered users can create chats
    // BUT: If message is from admin (support), skip auth check (admin is already authenticated in admin panel)
    let sessionUser: SessionUser | null = null;
    let isAdmin = false;

    if (!isFromAdmin) {
      // Only check session for non-admin messages
      sessionUser = await getSessionUserFromRequest(request);
      
      // Fallback: اگر session پیدا نشد اما userId در header ارسال شده (برای development)
      if (!sessionUser && process.env.NODE_ENV === 'development') {
        const userIdHeader = request.headers.get('x-user-id');
        if (userIdHeader) {
          logger.debug('[POST /api/chat] Using userId from header (development fallback):', userIdHeader);
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
            logger.debug('[POST /api/chat] Fallback user found:', sessionUser);
          }
        }
      }
      
      // Require authentication - no guest users allowed (only for non-admin messages)
      if (!sessionUser) {
        throw new AppError("برای ارسال پیام باید وارد حساب کاربری خود شوید", 401, "UNAUTHORIZED");
      }
      
      isAdmin = sessionUser?.role === "admin";
    } else {
      // For admin messages, try to get session but don't require it
      sessionUser = await getSessionUserFromRequest(request);
      isAdmin = true; // If sender is "support", it's from admin
    }
    
    logger.debug("[POST /api/chat] Request from user:", {
      userId: sessionUser?.id,
      phone: sessionUser?.phone,
      role: sessionUser?.role,
      isAdmin,
      isFromAdmin,
    });

    // Rate limiting (auth-based): 20 POSTs/min per user (fallback to IP if needed)
    {
      const max = 20;
      const windowMs = 60000;
      const key = sessionUser?.id ? rateLimitKeyForAuthedUser(request, sessionUser.id) : getClientId(request);
      const fullKey = `${request.nextUrl.pathname}:${request.method}:${key}`;
      if (rateLimiter.isRateLimited(fullKey, max, windowMs)) {
        return createRateLimitResponse(max, windowMs, fullKey);
      }
    }

    // Support both payloads:
    // - { customerInfo: {name, phone, email?}, messages?: [], chatId?: string }
    // - legacy: { customerName, customerPhone, customerEmail } (create chat without messages)
    const providedChatId: string | undefined = body.chatId;
    const customerInfo =
      body.customerInfo ||
      (body.customerName || body.customerPhone
        ? {
            name: body.customerName,
            phone: body.customerPhone,
            email: body.customerEmail,
          }
        : null);
    const messages = body.messages;

    const hasMessages = Array.isArray(messages) && messages.length > 0;
    
    logger.debug("[POST /api/chat] Request body:", {
      providedChatId,
      hasMessages,
      messageCount: messages?.length || 0,
      hasCustomerInfo: !!customerInfo,
    });

    let chatId: string;
    const now = new Date().toISOString();

    // When admin creates a chat, resolve target user so the same chat appears for the customer in /api/chat/my
    let targetUserIdForAdmin: string | null = null;
    if (isFromAdmin && schema.chatHasUserId) {
      if (providedChatId && providedChatId.startsWith("user-chat-")) {
        targetUserIdForAdmin = providedChatId.replace(/^user-chat-/, "").trim() || null;
      }
      if (!targetUserIdForAdmin && customerInfo?.phone) {
        const userByPhone = await getRow<{ id: string }>(
          `SELECT id FROM users WHERE phone = ? AND (role = 'user' OR role IS NULL) LIMIT 1`,
          [customerInfo.phone.trim()]
        );
        if (userByPhone?.id) targetUserIdForAdmin = userByPhone.id;
      }
    }

    if (providedChatId) {
      // Resolve "user-chat-XXX" for admin: use existing chat for that user if any
      let resolvedChatId = providedChatId;
      if (isAdmin && providedChatId.startsWith("user-chat-") && targetUserIdForAdmin) {
        const existingForUser = await getRow<{ id: string }>(
          `SELECT id FROM quick_buy_chats WHERE userId = ? ORDER BY updatedAt DESC LIMIT 1`,
          [targetUserIdForAdmin]
        );
        if (existingForUser?.id) resolvedChatId = existingForUser.id;
      }
      chatId = resolvedChatId;
      const chat = await getRow<any>(`SELECT * FROM quick_buy_chats WHERE id = ?`, [chatId]);
      if (!chat) {
        // stale chatId or new conversation: create a chat for this user
        chatId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // For admin: use customerInfo and link to target user so customer sees same chat
        const userName = isFromAdmin ? (customerInfo?.name || "کاربر") : (sessionUser?.name || customerInfo?.name || "کاربر");
        const userPhone = isFromAdmin ? (customerInfo?.phone || "") : (sessionUser?.phone || customerInfo?.phone || "");
        const userId = isFromAdmin ? targetUserIdForAdmin : (sessionUser?.id || null);
        
        await runQuery(
          schema.chatHasUserId
            ? `INSERT INTO quick_buy_chats (id, userId, customerName, customerPhone, customerEmail, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            : `INSERT INTO quick_buy_chats (id, customerName, customerPhone, customerEmail, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
          schema.chatHasUserId
            ? [
                chatId,
                userId,
                userName,
                userPhone,
                customerInfo?.email?.trim() || null,
                "active",
                now,
                now,
              ]
            : [
                chatId,
                userName,
                userPhone,
                customerInfo?.email?.trim() || null,
                "active",
                now,
                now,
              ]
        );
      } else {
        // Chat exists - verify access
        // For admin: always allow (no need to check, already authenticated)
        // For user: check if they own the chat or claim it
        if (!isAdmin && sessionUser) {
          const chatUserId = schema.chatHasUserId && chat.userId ? String(chat.userId).trim() : "";
          
          // Simple check: if chat has userId, it must match user's id
          if (schema.chatHasUserId && chatUserId) {
            if (chatUserId !== sessionUser.id) {
              throw new AppError("شما به این چت دسترسی ندارید", 403, "FORBIDDEN");
            }
          } else if (schema.chatHasUserId && !chatUserId) {
            // Chat has no userId - claim it for the logged-in user
            try {
              await runQuery(`UPDATE quick_buy_chats SET userId = ? WHERE id = ?`, [sessionUser.id, chatId]);
              chat.userId = sessionUser.id;
            } catch (updateError: any) {
              logger.error(`[POST /api/chat] Failed to claim chat ${chatId}:`, updateError);
              // Continue anyway - allow access for logged-in users
            }
          }
          // If schema doesn't have userId, allow access (old schema)
        }
        await runQuery(
          `UPDATE quick_buy_chats 
           SET updatedAt = ? 
           WHERE id = ?`,
          [now, chatId]
        );
      }
    } else {
      // Create new chat - only for authenticated users
      chatId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      // For admin: use customerInfo and link to target user so customer sees same chat in /api/chat/my
      const userName = isFromAdmin ? (customerInfo?.name || "کاربر") : (sessionUser?.name || customerInfo?.name || "کاربر");
      const userPhone = isFromAdmin ? (customerInfo?.phone || "") : (sessionUser?.phone || customerInfo?.phone || "");
      const userId = isFromAdmin ? targetUserIdForAdmin : (sessionUser?.id || null);
      
      await runQuery(
        schema.chatHasUserId
          ? `INSERT INTO quick_buy_chats (id, userId, customerName, customerPhone, customerEmail, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          : `INSERT INTO quick_buy_chats (id, customerName, customerPhone, customerEmail, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
        schema.chatHasUserId
          ? [
              chatId,
              userId,
              userName,
              userPhone,
              customerInfo?.email?.trim() || null,
              "active",
              now,
              now,
            ]
          : [
              chatId,
              userName,
              userPhone,
              customerInfo?.email?.trim() || null,
              "active",
              now,
              now,
            ]
      );
    }

    // Allow "create chat" without messages (used by chat UI step=info)
    if (!hasMessages) {
      // Clear cache so admin polling sees the new chat
      try {
        cache.delete(cacheKeys.chatList());
      } catch {
        // ignore
      }
      return createSuccessResponse({
        id: chatId,
        chatId,
        messages: [],
      });
    }

    // Get existing message IDs to avoid duplicates
    const existingMessages = await getRows<{ id: string }>(
      `SELECT id FROM chat_messages WHERE chatId = ?`,
      [chatId]
    );
    const existingMessageIds = new Set(existingMessages.map((m) => m.id));

    // Save messages and their attachments
    const savedMessages = [];
    for (const message of messages) {
      const messageId = message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const messageCreatedAt = message.timestamp ? new Date(message.timestamp).toISOString() : now;
      
      const isNewMessage = !existingMessageIds.has(messageId);

      // Filter attachments to only include valid URLs (not blob/data URLs)
      const validAttachments = message.attachments && Array.isArray(message.attachments) 
        ? message.attachments.filter((att: any) => {
            const url = att.url || att.fileUrl || att.filePath;
            const isValid = url && 
                           !url.startsWith('blob:') && 
                           !url.startsWith('data:') &&
                           (url.startsWith('http') || url.startsWith('/'));
            if (!isValid && url) {
              logger.warn(`Filtered out invalid attachment URL for message ${messageId}:`, { url, attachment: att });
            }
            return isValid;
          })
        : [];
      
      // Log attachments being saved (only in development)
      if (validAttachments.length > 0) {
        logger.debug(`💾 Saving ${validAttachments.length} attachment(s) for message ${messageId}:`, 
          validAttachments.map((att: any) => ({ 
            id: att.id, 
            type: att.type, 
            url: att.url || att.fileUrl,
            name: att.name 
          }))
        );
      }

      // Get message status from request or default based on sender
      const messageStatus = message.status || (message.sender === "user" ? "sent" : null);
      
      // Save message using UPSERT to avoid duplicates
      await runQuery(
        schema.messageHasUserId
          ? `INSERT INTO chat_messages (id, chatId, userId, text, sender, attachments, status, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           text = VALUES(text),
           attachments = VALUES(attachments),
           status = COALESCE(VALUES(status), chat_messages.status)`
          : `INSERT INTO chat_messages (id, chatId, text, sender, attachments, status, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               text = VALUES(text),
               attachments = VALUES(attachments),
               status = COALESCE(VALUES(status), chat_messages.status)`,
        schema.messageHasUserId
          ? [
              messageId,
              chatId,
              message.sender === "user" ? (sessionUser?.id || null) : null,
              message.text || null,
              message.sender,
              JSON.stringify(validAttachments),
              messageStatus,
              messageCreatedAt,
            ]
          : [
              messageId,
              chatId,
              message.text || null,
              message.sender,
              JSON.stringify(validAttachments),
              messageStatus,
              messageCreatedAt,
            ]
      );

      // ALWAYS save attachments, even if message already exists (important for images)
      if (validAttachments && Array.isArray(validAttachments) && validAttachments.length > 0) {
        for (const attachment of validAttachments) {
          // Ensure we have a valid URL for the attachment
          const attachmentUrl = attachment.url || attachment.fileUrl || null;
          
          if (attachmentUrl && !attachmentUrl.startsWith('blob:') && !attachmentUrl.startsWith('data:')) {
            // Only save if URL is not a blob URL or data URL (those are temporary)
            // Ensure we have a valid type
            const attachmentType = attachment.type || 
              (attachmentUrl.includes("image-") ? "image" : 
               attachmentUrl.includes("audio-") ? "audio" :
               attachmentUrl.includes("maps") || attachmentUrl.includes("location") ? "location" :
               "file");
            
            try {
              // First, check if attachment with this URL already exists for this message
              const existingAttachment = await getRow<any>(
                `SELECT id FROM chat_attachments WHERE messageId = ? AND fileUrl = ?`,
                [messageId, attachmentUrl]
              );
              
              const attachmentId = existingAttachment?.id || attachment.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              
              if (existingAttachment) {
                // Update existing attachment
                await runQuery(
                  `UPDATE chat_attachments 
                   SET type = ?, fileName = ?, fileSize = ?, fileUrl = ?
                   WHERE id = ?`,
                  [
                    attachmentType,
                    attachment.name || null,
                    attachment.size || null,
                    attachmentUrl,
                    attachmentId,
                  ]
                );
                logger.debug(`Updated existing attachment ${attachmentId} for message ${messageId}:`, { 
                  type: attachmentType, 
                  url: attachmentUrl,
                  name: attachment.name 
                });
              } else {
                // Insert new attachment
                await runQuery(
                  `INSERT INTO chat_attachments (id, messageId, type, filePath, fileName, fileSize, fileUrl, createdAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    attachmentId,
                    messageId,
                    attachmentType,
                    attachmentUrl,
                    attachment.name || null,
                    attachment.size || null,
                    attachmentUrl,
                    now,
                  ]
                );
                logger.debug(`Saved new attachment ${attachmentId} for message ${messageId}:`, { 
                  type: attachmentType, 
                  originalType: attachment.type,
                  url: attachmentUrl,
                  name: attachment.name 
                });
              }
              
            } catch (error) {
              logger.error(`Error saving attachment for message ${messageId}:`, error);
            }
          } else if (!attachmentUrl) {
            logger.warn(`Attachment has no URL, skipping database save:`, attachment);
          } else {
            logger.warn(`Attachment has temporary URL (blob/data), skipping database save:`, attachmentUrl);
          }
        }
      }

      // Get the saved message with status from database
      const savedMessage = await getRow<any>(
        `SELECT id, status FROM chat_messages WHERE id = ?`,
        [messageId]
      );
      
      savedMessages.push({
        id: messageId,
        chatId,
        text: message.text,
        sender: message.sender,
        attachments: message.attachments || [],
        createdAt: messageCreatedAt,
        status: savedMessage?.status || messageStatus,
      });
    }

    logger.debug("[POST /api/chat] Success:", {
      chatId,
      savedMessageCount: savedMessages.length,
    });

    const chatRow = await getRow<any>(`SELECT * FROM quick_buy_chats WHERE id = ?`, [chatId]);
    return createSuccessResponse({
      chatId,
      chat: chatRow || { id: chatId },
      messages: savedMessages,
    });
  } catch (error) {
    logger.error("[POST /api/chat] Error:", error);
    return createErrorResponse(error);
  }
}

/**
 * GET /api/chat - Get chat by ID or list chats
 */
export async function GET(request: NextRequest) {
  try {
    await ensureChatTables();
    const schema = await getChatSchemaInfo();

    const sessionUser = await getSessionUserFromRequestWithAdminFallback(request);
    const isAdmin = sessionUser?.role === "admin";
    
    logger.debug("[GET /api/chat] Session check:", {
      hasSession: !!sessionUser,
      userId: sessionUser?.id,
      role: sessionUser?.role,
      isAdmin,
      enabled: sessionUser?.enabled,
    });

    // Rate limiting (works for both authenticated and guest users)
    {
      const max = 240;
      const windowMs = 60000;
      const key = sessionUser?.id ? rateLimitKeyForAuthedUser(request, sessionUser.id) : getClientId(request);
      const fullKey = `${request.nextUrl.pathname}:${request.method}:${key}`;
      if (rateLimiter.isRateLimited(fullKey, max, windowMs)) {
        return createRateLimitResponse(max, windowMs, fullKey);
      }
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");
    const lastMessageId = searchParams.get("lastMessageId"); // For polling new messages
    const since = searchParams.get("since"); // ISO timestamp for polling

    if (chatId) {
      // Get single chat with messages
      let chat: any = null;
      let resolvedChatId = chatId;
      // Admin: resolve "user-chat-XXX" to the real chat for that user (so admin and customer share the same thread)
      if (isAdmin && chatId.startsWith("user-chat-")) {
        const targetUserId = chatId.replace(/^user-chat-/, "").trim();
        if (targetUserId) {
          const existingChat = await getRow<any>(
            `SELECT * FROM quick_buy_chats WHERE userId = ? ORDER BY updatedAt DESC LIMIT 1`,
            [targetUserId]
          );
          if (existingChat?.id) {
            chat = existingChat;
            resolvedChatId = existingChat.id;
          } else {
            // No chat yet: return synthetic chat + empty messages so admin can send first message
            const userRow = await getRow<any>(
              `SELECT id, name, phone, email, createdAt, updatedAt FROM users WHERE id = ? LIMIT 1`,
              [targetUserId]
            );
            if (userRow) {
              const now = new Date().toISOString();
              return createSuccessResponse({
                chat: {
                  id: chatId,
                  userId: userRow.id,
                  customerName: userRow.name || "کاربر بدون نام",
                  customerPhone: userRow.phone || "",
                  customerEmail: userRow.email || null,
                  status: "active",
                  createdAt: userRow.createdAt || now,
                  updatedAt: userRow.updatedAt || now,
                },
                messages: [],
              });
            }
          }
        }
      }
      if (!chat) {
        try {
          chat = await getRow<any>(
            `SELECT * FROM quick_buy_chats WHERE id = ?`,
            [resolvedChatId]
          );
        } catch (dbError: any) {
          if (dbError?.code === "ER_NO_SUCH_TABLE" || dbError?.message?.includes("doesn't exist") || dbError?.message?.includes("does not exist")) {
            throw new AppError("چت یافت نشد", 404, "CHAT_NOT_FOUND");
          }
          throw dbError;
        }
      }

      if (!chat) {
        throw new AppError("چت یافت نشد", 404, "CHAT_NOT_FOUND");
      }

      // Access control: 
      // - Admin: can access all chats
      // - Logged-in users: can access their own chats (by userId or phone)
      // - Guest users: can access chats by chatId (no ownership check)
      if (!isAdmin && sessionUser) {
        // For logged-in users: check if they own the chat
        const chatUserId = schema.chatHasUserId && chat.userId ? String(chat.userId).trim() : "";
        
        if (schema.chatHasUserId && chatUserId) {
          // Chat has userId - must match user's id
          if (chatUserId !== sessionUser.id) {
            throw new AppError("شما به این چت دسترسی ندارید", 403, "FORBIDDEN");
          }
        } else if (schema.chatHasUserId && !chatUserId) {
          // Chat has no userId - claim it for the logged-in user
          try {
            await runQuery(`UPDATE quick_buy_chats SET userId = ? WHERE id = ?`, [sessionUser.id, chatId]);
            chat.userId = sessionUser.id;
          } catch (updateError: any) {
            logger.error(`[GET /api/chat] Failed to claim chat ${chatId}:`, updateError);
            // Continue anyway - allow access for logged-in users
          }
        }
        // If schema doesn't have userId column, allow access (old schema)
      }
      // For guest users (no sessionUser) or admin: allow access by chatId

      // Build query based on polling parameters (use resolved chat id for messages)
      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
      const offset = (page - 1) * limit;
      
      let messagesQuery = `SELECT * FROM chat_messages WHERE chatId = ?`;
      const queryParams: any[] = [resolvedChatId];
      
      if (lastMessageId && !lastMessageId.startsWith('temp-')) {
        // Get messages after the last known message ID (for polling)
        // Skip temporary IDs (they don't exist in DB yet)
        // First get the createdAt of the last message, then get messages after that time
        const lastMessage = await getRow<any>(
          `SELECT createdAt FROM chat_messages WHERE id = ?`,
          [lastMessageId]
        );
        if (lastMessage) {
          messagesQuery += ` AND createdAt > ? ORDER BY createdAt ASC LIMIT ?`;
          queryParams.push(lastMessage.createdAt, limit);
        } else {
          // Fallback: use id comparison if createdAt not found
          messagesQuery += ` AND id != ? ORDER BY createdAt ASC LIMIT ?`;
          queryParams.push(lastMessageId, limit);
        }
      } else if (since) {
        // Get messages after a specific timestamp (for polling)
        messagesQuery += ` AND createdAt > ? ORDER BY createdAt ASC LIMIT ?`;
        queryParams.push(since, limit);
      } else {
        // Get paginated messages (for initial load)
        messagesQuery += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);
      }

      let messages = await getRows<any>(messagesQuery, queryParams);
      
      // If not polling, reverse order to show newest first (but we fetched DESC, so reverse)
      if (!lastMessageId && !since) {
        messages = messages.reverse();
      }

      // Optimize: Get all attachments in one query instead of N+1 queries
      const messageIds = messages.map((m: any) => m.id);
      let allDbAttachments: any[] = [];
      
      if (messageIds.length > 0) {
        try {
          // Use IN clause to get all attachments in one query
          const placeholders = messageIds.map(() => '?').join(',');
          allDbAttachments = await getRows<any>(
            `SELECT * FROM chat_attachments WHERE messageId IN (${placeholders})`,
            messageIds
          );
        } catch (error: any) {
          // If table doesn't exist, continue with empty attachments
          if (error?.code === "ER_NO_SUCH_TABLE" || error?.message?.includes("doesn't exist") || error?.message?.includes("does not exist")) {
            logger.warn("Chat attachments table does not exist yet, continuing without attachments");
            allDbAttachments = [];
          } else {
            logger.error("Error fetching attachments:", error);
            allDbAttachments = [];
          }
        }
      }
      
      // Group attachments by messageId for O(1) lookup
      const attachmentsByMessageId = new Map<string, any[]>();
      allDbAttachments.forEach((att) => {
        if (!attachmentsByMessageId.has(att.messageId)) {
          attachmentsByMessageId.set(att.messageId, []);
        }
        attachmentsByMessageId.get(att.messageId)!.push(att);
      });

      // Process messages and merge attachments
      for (const message of messages) {
        // First try to get attachments from JSON field
        let jsonAttachments: any[] = [];
        if (message.attachments) {
          if (Array.isArray(message.attachments)) {
            // Already an array (MySQL JSON returns as array)
            jsonAttachments = message.attachments;
          } else if (typeof message.attachments === 'string') {
            // Try to parse if it's a string
            try {
              const parsed = JSON.parse(message.attachments);
              jsonAttachments = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
              logger.error(`Error parsing attachments JSON for message ${message.id}:`, e);
              jsonAttachments = [];
            }
          } else if (typeof message.attachments === 'object' && message.attachments !== null) {
            // Single object, convert to array
            jsonAttachments = Array.isArray(message.attachments) ? message.attachments : [message.attachments];
          }
        }
        
        // Get attachments from database table (already loaded)
        const dbAttachments = attachmentsByMessageId.get(message.id) || [];
        
        // Merge attachments - prefer database table attachments (they are more reliable)
        const allAttachments: any[] = [];
        const addedUrls = new Set<string>();
        
        // First add database table attachments (these are the source of truth)
        dbAttachments.forEach((att) => {
          if (att.fileUrl && !att.fileUrl.startsWith('blob:') && !att.fileUrl.startsWith('data:')) {
            // Only add if URL exists and is not a temporary blob/data URL
            // Ensure type is preserved (important for audio, etc.)
            allAttachments.push({
              id: att.id,
              type: att.type || "file", // Default to "file" if type is missing
              url: att.fileUrl,
              name: att.fileName,
              size: att.fileSize,
            });
            addedUrls.add(att.fileUrl);
          }
        });
        
        // Then add JSON attachments if not already in database and not temporary URLs
        if (Array.isArray(jsonAttachments) && jsonAttachments.length > 0) {
          jsonAttachments.forEach((att) => {
            const attachmentUrl = att.url || att.fileUrl || att.filePath;
            // Skip if URL is temporary or already added
            if (attachmentUrl && 
                !attachmentUrl.startsWith('blob:') && 
                !attachmentUrl.startsWith('data:') &&
                !addedUrls.has(attachmentUrl)) {
              // Check if we already have this attachment by URL (even if ID is different)
              const existingByUrl = allAttachments.find(a => a.url === attachmentUrl);
              if (!existingByUrl) {
                allAttachments.push({
                  id: att.id || `att-${Date.now()}-${Math.random()}`,
                  type: att.type || "file", // Ensure type is always set
                  url: attachmentUrl,
                  name: att.name || att.fileName,
                  size: att.size || att.fileSize,
                  duration: att.duration,
                });
                addedUrls.add(attachmentUrl);
              }
            }
          });
        }
        
        message.attachments = allAttachments;
      }

      return createSuccessResponse({
        chat,
        messages,
      });
    } else {
      // List chats:
      // - admin: all chats
      // - user: only their chats
      try {
          // لیست چت ادمین کش نمی‌شود تا پولینگ و دیالوگ همیشه نتیجه یکسان از DB بگیرند و اعلان برای چت حذف‌شده اضافه نشود.
          const cacheKey = cacheKeys.chatList();
          const cached = isAdmin ? null : (cache.get<any>(cacheKey) ?? null);
          if (cached) return createSuccessResponse({ chats: cached });
          
          // Admin should see ALL chats + all registered users (even without chats)
          // User should see only their own chats (limited to 50 for performance)
          // No guest users - authentication required
          let chats: any[] = [];
          
          if (isAdmin) {
            logger.debug("[GET /api/chat] Admin detected, loading all chats and users");
            // Get all chats - but only for registered users (no guest chats)
            try {
              // Only get chats that have a userId (registered users only, no guests)
              chats = await getRows<any>(`
                SELECT c.* 
                FROM quick_buy_chats c
                WHERE c.userId IS NOT NULL AND c.userId != ''
                ORDER BY c.updatedAt DESC, c.createdAt DESC
              `);
              logger.debug(`[GET /api/chat] Found ${chats.length} existing chats (registered users only)`);
            } catch (error: any) {
              logger.warn(`[GET /api/chat] Error loading chats (table might not exist):`, error?.message);
              chats = [];
            }
            
            // Also get all registered users (simplified query - get all users first, then filter)
            let allUsers: any[] = [];
            try {
              // First, try to get all users with role='user'
              // Try multiple ways to check enabled status (MySQL can store it as boolean or int)
              allUsers = await getRows<any>(`
                SELECT 
                  u.id as userId,
                  u.name as customerName,
                  u.phone as customerPhone,
                  u.email as customerEmail,
                  u.createdAt,
                  u.updatedAt,
                  u.enabled
                FROM users u
                WHERE u.role = 'user'
                ORDER BY u.createdAt DESC
              `);
              logger.debug(`[GET /api/chat] Found ${allUsers.length} total users with role='user' (before enabled filter)`);
              
              // Filter enabled users in JavaScript (null/undefined/missing => treat as enabled)
              allUsers = allUsers.filter((user: any) => {
                const enabled = user.enabled;
                if (enabled === undefined || enabled === null) return true;
                return enabled === 1 || enabled === true || enabled === "1" || enabled === "true" || String(enabled).toLowerCase() === "true";
              });
              logger.debug(`[GET /api/chat] Found ${allUsers.length} enabled users with role='user' (after filter)`);
              
              // Get existing chat user IDs to filter them out (only registered users, no guests)
              let existingChatUserIds = new Set<string>();
              try {
                const existingChats = await getRows<{ userId: string | null }>(`
                  SELECT DISTINCT userId FROM quick_buy_chats 
                  WHERE userId IS NOT NULL AND userId != ''
                `);
                existingChatUserIds = new Set(existingChats.map(c => String(c.userId)).filter(Boolean));
                logger.debug(`[GET /api/chat] Found ${existingChatUserIds.size} users with existing chats`);
              } catch (error: any) {
                logger.warn(`[GET /api/chat] Error getting existing chat user IDs:`, error?.message);
              }
              
              // Filter out users who already have chats
              allUsers = allUsers.filter((user: any) => !existingChatUserIds.has(String(user.userId)));
              logger.debug(`[GET /api/chat] After filtering, ${allUsers.length} users without chats`);
            } catch (error: any) {
              logger.error(`[GET /api/chat] Error loading users:`, error?.message);
              allUsers = [];
            }
            
            // Convert users to chat format for admin
            const userChats = allUsers.map((user: any) => ({
              id: `user-chat-${user.userId}`,
              userId: user.userId,
              customerName: user.customerName || 'کاربر بدون نام',
              customerPhone: user.customerPhone || '',
              customerEmail: user.customerEmail || null,
              status: 'active',
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
              isUserWithoutChat: true, // Flag to indicate this is a user without chat
            }));
            
            logger.debug(`[GET /api/chat] Converted ${userChats.length} users to chat format`);
            
            // Combine chats and users, sort by updatedAt
            chats = [...chats, ...userChats].sort((a, b) => {
              const dateA = new Date(a.updatedAt || a.createdAt).getTime();
              const dateB = new Date(b.updatedAt || b.createdAt).getTime();
              return dateB - dateA;
            });
            logger.debug(`[GET /api/chat] Total chats after combining: ${chats.length} (${chats.length - userChats.length} existing + ${userChats.length} users without chat)`);
            if (chats.length === 0) {
              logger.warn(`[GET /api/chat] No chats or users found`);
            }
          } else if (sessionUser) {
            // User: only their own chats
            if (schema.chatHasUserId && sessionUser.id) {
              chats = await getRows<any>(`SELECT * FROM quick_buy_chats WHERE userId = ? ORDER BY updatedAt DESC, createdAt DESC LIMIT 50`, [
                sessionUser.id,
              ]);
            } else if (sessionUser.phone) {
              chats = await getRows<any>(`SELECT * FROM quick_buy_chats WHERE customerPhone = ? ORDER BY updatedAt DESC, createdAt DESC LIMIT 50`, [
                sessionUser.phone,
              ]);
            }
          } else {
            // No guest users - return empty
            chats = [];
          }

          // Optimize: Get unread counts for all chats in one query using GROUP BY
          const chatIds = chats.map((c: any) => c.id);
          let unreadCountsMap = new Map<string, number>();
          
          if (chatIds.length > 0) {
            try {
              // Use IN clause with GROUP BY to get all unread counts in one query
              const placeholders = chatIds.map(() => '?').join(',');
              const unreadCounts = await getRows<{ chatId: string; count: string }>(
                `SELECT chatId, COUNT(*) as count 
                 FROM chat_messages 
                 WHERE chatId IN (${placeholders})
                   AND sender = 'user' 
                   AND (status IS NULL OR (status != 'read' AND status IN ('sent', 'delivered', 'sending')))
                 GROUP BY chatId`,
                chatIds
              );
              
              // Create map for O(1) lookup
              unreadCounts.forEach((result) => {
                unreadCountsMap.set(result.chatId, parseInt(result.count || "0", 10));
              });
            } catch (error: any) {
              // If table doesn't exist or other error, continue with 0 counts
              if (error?.code === "ER_NO_SUCH_TABLE" || error?.message?.includes("doesn't exist") || error?.message?.includes("does not exist")) {
                logger.warn("Chat messages table does not exist yet, using 0 unread counts");
              } else if (process.env.NODE_ENV === 'development') {
                logger.error(`Error getting unread counts:`, error);
              }
            }
          }
          
          // Map chats with unread counts
          const chatsWithUnreadCount = chats.map((chat: any) => ({
            ...chat,
            unreadCount: unreadCountsMap.get(chat.id) || 0,
          }));
          
          // کش لیست ادمین غیرفعال است تا نتیجه با پولینگ یکسان باشد.
          if (isAdmin) {
            cache.delete(cacheKey);
          }

          return createSuccessResponse({ chats: chatsWithUnreadCount });
        } catch (dbError: any) {
          // If table doesn't exist, return empty array instead of error
          if (dbError?.code === "ER_NO_SUCH_TABLE" || dbError?.message?.includes("doesn't exist") || dbError?.message?.includes("does not exist")) {
            logger.warn("Chat table does not exist yet, returning empty chats list");
            return createSuccessResponse({ chats: [] });
          }
          throw dbError;
        }
    }
  } catch (error) {
    logger.error("[GET /api/chat] Error:", error);
    return createErrorResponse(error);
  }
}

