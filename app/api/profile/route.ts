import { NextRequest } from "next/server";
import { getRow, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { getSessionUserFromRequest } from "@/lib/auth/session";

/**
 * GET /api/profile - Get current user profile (including address). Requires auth.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUserFromRequest(request);
    if (!sessionUser) {
      throw new AppError("لطفاً وارد حساب کاربری شوید", 401, "UNAUTHORIZED");
    }

    const user = await getRow<any>(
      "SELECT id, name, phone, address, role, createdAt, updatedAt FROM users WHERE id = ? LIMIT 1",
      [sessionUser.id]
    );
    if (!user) {
      throw new AppError("کاربر یافت نشد", 404, "USER_NOT_FOUND");
    }

    return createSuccessResponse({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone || undefined,
        address: user.address || undefined,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PUT /api/profile - Update current user profile (name, phone, address only). Requires auth.
 */
export async function PUT(request: NextRequest) {
  try {
    const sessionUser = await getSessionUserFromRequest(request);
    if (!sessionUser) {
      throw new AppError("لطفاً وارد حساب کاربری شوید", 401, "UNAUTHORIZED");
    }

    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim() === "") {
        throw new AppError("نام کاربر نامعتبر است", 400, "INVALID_NAME");
      }
      updates.name = body.name.trim();
    }

    if (body.phone !== undefined) {
      updates.phone = body.phone ? String(body.phone).trim() : null;
    }

    if (body.address !== undefined) {
      updates.address = body.address ? String(body.address).trim() : null;
    }

    const keysToUpdate = Object.keys(updates).filter((k) => k !== "updatedAt");
    if (keysToUpdate.length === 0) {
      const user = await getRow<any>(
        "SELECT id, name, phone, address, role, createdAt, updatedAt FROM users WHERE id = ? LIMIT 1",
        [sessionUser.id]
      );
      if (!user) throw new AppError("کاربر یافت نشد", 404, "USER_NOT_FOUND");
      return createSuccessResponse({
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone || undefined,
          address: user.address || undefined,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    }

    const setClause = ["updatedAt", ...keysToUpdate].map((k) => `\`${k}\` = ?`).join(", ");
    const values = [updates.updatedAt, ...keysToUpdate.map((k) => updates[k]), sessionUser.id];
    await runQuery(`UPDATE users SET ${setClause} WHERE id = ?`, values);

    const updatedUser = await getRow<any>(
      "SELECT id, name, phone, address, role, createdAt, updatedAt FROM users WHERE id = ? LIMIT 1",
      [sessionUser.id]
    );
    if (!updatedUser) throw new AppError("کاربر یافت نشد", 404, "USER_NOT_FOUND");

    return createSuccessResponse({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone || undefined,
        address: updatedUser.address || undefined,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
