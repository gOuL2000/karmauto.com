import { NextRequest } from "next/server";
import { getRow, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * POST /api/admin/presence - Update admin online status (heartbeat) (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAdmin(request);

    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { adminId, isOnline = true } = body;

    if (!adminId) {
      throw new AppError("adminId is required", 400, "MISSING_ADMIN_ID");
    }
    if (adminId !== sessionUser.id) {
      throw new AppError("دسترسی غیرمجاز", 403, "UNAUTHORIZED");
    }

    // Ensure admin_presence table exists
    await runQuery(`
      CREATE TABLE IF NOT EXISTS admin_presence (
        \`adminId\` VARCHAR(255) PRIMARY KEY,
        \`isOnline\` BOOLEAN DEFAULT FALSE,
        \`lastSeen\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    try {
      await runQuery(`CREATE INDEX idx_admin_presence_isOnline ON admin_presence(\`isOnline\`)`);
    } catch (idxErr: unknown) {
      const err = idxErr as { code?: string; message?: string };
      if (err?.code !== "1061" && !err?.message?.includes("Duplicate key name")) {
        throw idxErr;
      }
    }

    const now = new Date().toISOString();

    // Upsert admin presence
    await runQuery(
      `INSERT INTO admin_presence (\`adminId\`, \`isOnline\`, \`lastSeen\`, \`updatedAt\`)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         \`isOnline\` = VALUES(\`isOnline\`),
         \`lastSeen\` = CASE WHEN VALUES(\`isOnline\`) = TRUE THEN VALUES(\`lastSeen\`) ELSE admin_presence.\`lastSeen\` END,
         \`updatedAt\` = VALUES(\`updatedAt\`)`,
      [adminId, isOnline, now, now]
    );

    return createSuccessResponse({ adminId, isOnline, lastSeen: now });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * GET /api/admin/presence - Get admin online status (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId");

    // Ensure admin_presence table exists
    await runQuery(`
      CREATE TABLE IF NOT EXISTS admin_presence (
        \`adminId\` VARCHAR(255) PRIMARY KEY,
        \`isOnline\` BOOLEAN DEFAULT FALSE,
        \`lastSeen\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    if (adminId) {
      // Get specific admin status
      const presence = await getRow<{
        adminId: string;
        isOnline: boolean;
        lastSeen: string;
        updatedAt: string;
      }>(
        `SELECT * FROM admin_presence WHERE \`adminId\` = ?`,
        [adminId]
      );

      if (!presence) {
        // Admin not found, consider offline
        return createSuccessResponse({
          adminId,
          isOnline: false,
          lastSeen: null,
        });
      }

      // Check if admin is still online (within last 30 seconds)
      const lastSeen = new Date(presence.lastSeen).getTime();
      const now = Date.now();
      const timeSinceLastSeen = now - lastSeen;
      const isActuallyOnline = presence.isOnline && timeSinceLastSeen < 30000; // 30 seconds

      // Update if status changed
      if (presence.isOnline !== isActuallyOnline) {
        await runQuery(
          `UPDATE admin_presence SET \`isOnline\` = ?, \`updatedAt\` = CURRENT_TIMESTAMP WHERE \`adminId\` = ?`,
          [isActuallyOnline, adminId]
        );
      }

      return createSuccessResponse({
        adminId: presence.adminId,
        isOnline: isActuallyOnline,
        lastSeen: presence.lastSeen,
      });
    } else {
      // Get all admin presences
      const { getRows } = await import("@/lib/db/index");
      const presences = await getRows<{
        adminId: string;
        isOnline: boolean;
        lastSeen: string;
        updatedAt: string;
      }>(`SELECT * FROM admin_presence ORDER BY \`updatedAt\` DESC`);

      // Filter out offline admins that haven't been seen in 30 seconds
      const now = Date.now();
      const validPresences = presences
        .map((presence) => {
          const lastSeen = new Date(presence.lastSeen).getTime();
          const timeSinceLastSeen = now - lastSeen;
          const isActuallyOnline = presence.isOnline && timeSinceLastSeen < 30000;
          return {
            adminId: presence.adminId,
            isOnline: isActuallyOnline,
            lastSeen: presence.lastSeen,
          };
        })
        .filter((p) => p.isOnline); // Only return online admins

      return createSuccessResponse({ admins: validPresences });
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}

