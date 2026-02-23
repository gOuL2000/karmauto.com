import { NextRequest, NextResponse } from "next/server";
import { getRow, runQuery, getRows } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import type { CartItem } from "@/store/cart-store";
import { logger } from "@/lib/logger";
import { getSessionUserFromRequest } from "@/lib/auth/session";

/**
 * GET /api/cart - Get cart for current session
 * POST /api/cart - Save/Update cart for current session
 */
function emptyCartResponse(sessionId: string | null, userId: string | null) {
  const res = createSuccessResponse({ items: [], shippingMethod: null });
  if (!userId && sessionId) {
    res.cookies.set("cart-session-id", sessionId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return res;
}

export async function GET(request: NextRequest) {
  try {
    let user: Awaited<ReturnType<typeof getSessionUserFromRequest>> = null;
    try {
      user = await getSessionUserFromRequest(request);
    } catch (e) {
      logger.warn("Cart GET: session lookup failed, continuing as guest", e);
    }
    const userId = user?.id || null;

    const sessionId = request.headers.get("x-cart-session-id") ||
                     request.cookies.get("cart-session-id")?.value ||
                     null;

    if (!userId && !sessionId) {
      return createSuccessResponse({ items: [], shippingMethod: null });
    }

    try {
      // Ensure table exists (will be created if it doesn't exist)
      try {
        await runQuery(`
          CREATE TABLE IF NOT EXISTS carts (
            id VARCHAR(255) PRIMARY KEY,
            \`sessionId\` VARCHAR(255),
            \`userId\` VARCHAR(255),
            items JSON NOT NULL DEFAULT '[]',
            \`shippingMethod\` VARCHAR(50),
            \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE(\`sessionId\`, \`userId\`)
          )
        `);
        try {
          await runQuery(`CREATE INDEX idx_carts_sessionId ON carts(\`sessionId\`)`);
        } catch (idxErr: any) {
          if (idxErr?.code !== "1061" && !idxErr?.message?.includes("Duplicate key name")) {
            logger.error("Error creating index idx_carts_sessionId:", idxErr);
          }
        }
        try {
          await runQuery(`CREATE INDEX idx_carts_userId ON carts(\`userId\`)`);
        } catch (idxErr: any) {
          if (idxErr?.code !== "1061" && !idxErr?.message?.includes("Duplicate key name")) {
            logger.error("Error creating index idx_carts_userId:", idxErr);
          }
        }
      } catch (createError: any) {
        if (createError?.code !== "42P07" && createError?.code !== "ER_TABLE_EXISTS_ERROR" && !createError?.message?.includes("already exists")) {
          logger.error("Error creating carts table:", createError);
        }
      }
      
      // Get cart by userId (if logged in) or sessionId (if guest)
      let cart;
      if (userId) {
        // User is logged in - get cart by userId
        cart = await getRow<any>(
          "SELECT * FROM carts WHERE `userId` = ? ORDER BY `updatedAt` DESC LIMIT 1",
          [userId]
        );
        // If no cart found by userId but sessionId exists, try to migrate session cart to user
        if (!cart && sessionId) {
          const sessionCart = await getRow<any>(
            "SELECT * FROM carts WHERE `sessionId` = ?",
            [sessionId]
          );
          if (sessionCart) {
            // Migrate session cart to user cart
            await runQuery(
              `UPDATE carts SET \`userId\` = ?, \`sessionId\` = NULL WHERE \`sessionId\` = ?`,
              [userId, sessionId]
            );
            cart = await getRow<any>(
              "SELECT * FROM carts WHERE `userId` = ? ORDER BY `updatedAt` DESC LIMIT 1",
              [userId]
            );
          }
        }
      } else {
        // Guest user - get cart by sessionId
        cart = await getRow<any>(
          "SELECT * FROM carts WHERE `sessionId` = ?",
          [sessionId]
        );
      }

      if (!cart) {
        return emptyCartResponse(sessionId, userId);
      }

      // Parse items from JSONB
      const items: CartItem[] = Array.isArray(cart.items)
        ? cart.items
        : typeof cart.items === "string"
        ? JSON.parse(cart.items)
        : [];

      // Log items for debugging
      if (items.length > 0) {
        logger.debug("Loading cart items from DB:", {
          itemCount: items.length,
          firstItem: {
            id: items[0].id,
            name: items[0].name,
            hasImage: !!items[0].image,
            imageLength: items[0].image?.length || 0,
            imageType: items[0].image?.startsWith("data:") ? "base64" : items[0].image?.startsWith("http") ? "url" : "other",
          },
        });
      }

      const response = NextResponse.json({
        success: true,
        data: {
          items,
          shippingMethod: cart.shippingMethod || null,
        },
      });
      
      // Set cookie for session ID (only for guest users)
      if (!userId && sessionId) {
        response.cookies.set("cart-session-id", sessionId, {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365, // 1 year
          path: "/",
        });
      }
      
      return response;
    } catch (dbError: any) {
      logger.error("Error fetching cart:", dbError);
      const msg = dbError?.message ?? "";
      const code = dbError?.code;
      if (
        msg.includes("not available") ||
        code === "DATABASE_NOT_AVAILABLE" ||
        code === "ECONNREFUSED" ||
        msg.includes("connect") ||
        msg.includes("timeout") ||
        code === "ER_BAD_DB_ERROR"
      ) {
        return createErrorResponse(
          new AppError("دیتابیس در دسترس نیست. لطفاً MySQL را روشن کنید و داده‌ها از دیتابیس بارگذاری می‌شوند.", 503, "DATABASE_NOT_AVAILABLE")
        );
      }
      // Table missing or any other DB error: return empty cart so app keeps working
      const sid = request.headers.get("x-cart-session-id") ?? request.cookies.get("cart-session-id")?.value ?? null;
      return emptyCartResponse(sid, userId);
    }
  } catch (error: any) {
    logger.error("GET /api/cart error:", error);
    const sid = request.headers.get("x-cart-session-id") ?? request.cookies.get("cart-session-id")?.value ?? null;
    return emptyCartResponse(sid, userId ?? null);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    // Get user from session (if logged in)
    const user = await getSessionUserFromRequest(request);
    const userId = user?.id || null;

    const { items, shippingMethod, sessionId } = body;

    // If no user and no sessionId, create a new sessionId for guest
    let finalSessionId = sessionId;
    if (!userId && !sessionId) {
      finalSessionId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    } else if (!finalSessionId) {
      finalSessionId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    if (!Array.isArray(items)) {
      throw new AppError("Items must be an array", 400, "INVALID_ITEMS");
    }

    // Validate items
    for (const item of items) {
      if (!item.id || !item.name || typeof item.price !== "number" || typeof item.quantity !== "number") {
        throw new AppError("Invalid cart item", 400, "INVALID_ITEM");
      }
      // Log image info for debugging
      logger.debug("Saving cart item to DB:", {
        id: item.id,
        name: item.name,
        hasImage: !!item.image,
        imageLength: item.image?.length || 0,
        imageType: item.image?.startsWith("data:") ? "base64" : item.image?.startsWith("http") ? "url" : "other",
      });
    }

    const now = new Date().toISOString();

    try {
      // Ensure table exists (will be created if it doesn't exist)
      try {
        await runQuery(`
          CREATE TABLE IF NOT EXISTS carts (
            id VARCHAR(255) PRIMARY KEY,
            \`sessionId\` VARCHAR(255),
            \`userId\` VARCHAR(255),
            items JSON NOT NULL DEFAULT '[]',
            \`shippingMethod\` VARCHAR(50),
            \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE(\`sessionId\`, \`userId\`)
          )
        `);
        try {
          await runQuery(`CREATE INDEX idx_carts_sessionId ON carts(\`sessionId\`)`);
        } catch (idxErr: any) {
          if (idxErr?.code !== "1061" && !idxErr?.message?.includes("Duplicate key name")) { logger.error("Error creating index idx_carts_sessionId:", idxErr); }
        }
        try {
          await runQuery(`CREATE INDEX idx_carts_userId ON carts(\`userId\`)`);
        } catch (idxErr: any) {
          if (idxErr?.code !== "1061" && !idxErr?.message?.includes("Duplicate key name")) { logger.error("Error creating index idx_carts_userId:", idxErr); }
        }
      } catch (createError: any) {
        if (createError?.code !== "42P07" && createError?.code !== "ER_TABLE_EXISTS_ERROR" && !createError?.message?.includes("already exists")) {
          logger.error("Error creating carts table:", createError);
        }
      }
      
      // Check if cart exists (by userId if logged in, or by sessionId if guest)
      let existingCart;
      if (userId) {
        existingCart = await getRow<any>(
          "SELECT * FROM carts WHERE `userId` = ? ORDER BY `updatedAt` DESC LIMIT 1",
          [userId]
        );
        // If no cart found by userId but sessionId exists, try to migrate
        if (!existingCart && finalSessionId) {
          const sessionCart = await getRow<any>(
            "SELECT * FROM carts WHERE `sessionId` = ?",
            [finalSessionId]
          );
          if (sessionCart) {
            // Migrate session cart to user cart
            await runQuery(
              `UPDATE carts SET \`userId\` = ?, \`sessionId\` = NULL WHERE \`sessionId\` = ?`,
              [userId, finalSessionId]
            );
            existingCart = await getRow<any>(
              "SELECT * FROM carts WHERE `userId` = ? ORDER BY `updatedAt` DESC LIMIT 1",
              [userId]
            );
          }
        }
      } else {
        existingCart = await getRow<any>(
          "SELECT * FROM carts WHERE `sessionId` = ?",
          [finalSessionId]
        );
      }

      if (existingCart) {
        // Update existing cart
        // Always ensure sessionId is set, even if userId exists
        const sessionIdForUpdate = finalSessionId || (userId ? `user-${userId}` : `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
        if (userId) {
          await runQuery(
            `UPDATE carts SET items = ?, \`shippingMethod\` = ?, \`updatedAt\` = ?, \`userId\` = ?, \`sessionId\` = ? WHERE id = ?`,
            [JSON.stringify(items), shippingMethod || null, now, userId, sessionIdForUpdate, existingCart.id]
          );
        } else {
          await runQuery(
            `UPDATE carts SET items = ?, \`shippingMethod\` = ?, \`updatedAt\` = ?, \`sessionId\` = ? WHERE \`sessionId\` = ?`,
            [JSON.stringify(items), shippingMethod || null, now, sessionIdForUpdate, finalSessionId]
          );
        }
        logger.debug("Cart updated in database:", { userId, sessionId: sessionIdForUpdate, itemCount: items.length });
      } else {
        // Create new cart
        const cartId = `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Always set sessionId, even if userId exists (for compatibility with existing table structure)
        // If userId exists, we can still keep sessionId for tracking purposes
        const sessionIdForInsert = finalSessionId || (userId ? `user-${userId}` : `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
        await runQuery(
          `INSERT INTO carts (id, \`sessionId\`, \`userId\`, items, \`shippingMethod\`, \`createdAt\`, \`updatedAt\`)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [cartId, sessionIdForInsert, userId, JSON.stringify(items), shippingMethod || null, now, now]
        );
        logger.debug("Cart created in database:", { cartId, userId, sessionId: sessionIdForInsert, itemCount: items.length });
      }

      const response = NextResponse.json({
        success: true,
        message: "Cart saved successfully",
      });
      
      // Set cookie for session ID (only for guest users)
      if (!userId && finalSessionId) {
        response.cookies.set("cart-session-id", finalSessionId, {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365, // 1 year
          path: "/",
        });
      }
      
      return response;
    } catch (dbError: any) {
      logger.error("Error saving cart:", {
        message: dbError?.message,
        code: dbError?.code,
        detail: dbError?.detail,
        hint: dbError?.hint,
        sessionId,
      });
      
      // Check if table doesn't exist
      if (dbError?.message?.includes("does not exist") || dbError?.code === "42P01") {
        logger.error("Carts table does not exist. Please restart the server to create it.");
        return createErrorResponse(
          new AppError("جدول سبد خرید در دیتابیس وجود ندارد. لطفاً سرور را restart کنید.", 500, "TABLE_NOT_EXISTS")
        );
      }
      
      if (
        dbError?.message?.includes("not available") ||
        dbError?.code === "DATABASE_NOT_AVAILABLE" ||
        dbError?.code === "ECONNREFUSED" ||
        dbError?.message?.includes("connect") ||
        dbError?.message?.includes("timeout") ||
        dbError?.code === "ER_BAD_DB_ERROR"
      ) {
        return createErrorResponse(
          new AppError("دیتابیس در دسترس نیست. سبد خرید ذخیره نشد. لطفاً MySQL را روشن کنید.", 503, "DATABASE_NOT_AVAILABLE")
        );
      }
      throw dbError;
    }
  } catch (error: any) {
    logger.error("POST /api/cart error:", error);
    return createErrorResponse(error);
  }
}

