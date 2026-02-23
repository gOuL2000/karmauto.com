import { NextRequest } from "next/server";
import { getRow, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import type { User } from "@/types/user";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * GET /api/users/[id] - Get user by ID (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const user = await getRow<any>("SELECT * FROM users WHERE id = ?", [id]);

    if (!user) {
      throw new AppError("کاربر یافت نشد", 404, "USER_NOT_FOUND");
    }

    // Parse and transform user
    const parsedUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || undefined,
      role: (user.role || "user") as User["role"],
      status: (user.enabled === 1 || user.enabled === true ? "active" : "inactive") as User["status"],
      avatar: undefined, // Not stored in database currently
      ordersCount: undefined, // Would need to be calculated from orders table
      totalSpent: undefined, // Would need to be calculated from orders table
      createdAt: user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt),
      updatedAt: user.updatedAt instanceof Date ? user.updatedAt : new Date(user.updatedAt),
    };

    return createSuccessResponse(parsedUser);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PUT /api/users/[id] - Update user (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const user = await getRow<any>("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) {
      throw new AppError("کاربر یافت نشد", 404, "USER_NOT_FOUND");
    }

    // Prepare updates
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    // Update allowed fields
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim() === "") {
        throw new AppError("نام کاربر نامعتبر است", 400, "INVALID_NAME");
      }
      updates.name = body.name.trim();
    }

    if (body.email !== undefined) {
      if (typeof body.email !== "string" || body.email.trim() === "") {
        throw new AppError("ایمیل کاربر نامعتبر است", 400, "INVALID_EMAIL");
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email.trim())) {
        throw new AppError("فرمت ایمیل نامعتبر است", 400, "INVALID_EMAIL_FORMAT");
      }
      // Check if email is already taken by another user
      const existing = await getRow<any>("SELECT * FROM users WHERE email = ? AND id != ?", [
        body.email.trim().toLowerCase(),
        id,
      ]);
      if (existing) {
        throw new AppError("کاربری با این ایمیل قبلاً ثبت شده است", 400, "DUPLICATE_EMAIL");
      }
      updates.email = body.email.trim().toLowerCase();
    }

    if (body.password !== undefined) {
      if (typeof body.password !== "string" || body.password.length < 6) {
        throw new AppError("رمز عبور باید حداقل 6 کاراکتر باشد", 400, "INVALID_PASSWORD");
      }
      // TODO: Hash password in production
      updates.password = body.password;
    }

    if (body.phone !== undefined) {
      updates.phone = body.phone ? body.phone.trim() : null;
    }

    if (body.address !== undefined) {
      updates.address = body.address ? body.address.trim() : null;
    }

    if (body.role !== undefined) {
      const validRoles: User["role"][] = ["admin", "moderator", "user"];
      if (!validRoles.includes(body.role)) {
        throw new AppError("نقش کاربر نامعتبر است", 400, "INVALID_ROLE");
      }
      updates.role = body.role;
    }

    if (body.status !== undefined) {
      const validStatuses: User["status"][] = ["active", "inactive", "suspended"];
      if (!validStatuses.includes(body.status)) {
        throw new AppError("وضعیت کاربر نامعتبر است", 400, "INVALID_STATUS");
      }
      // Single explicit query so enabled is always persisted (MySQL: 1 = active, 0 = inactive/suspended)
      const enabledValue = body.status === "active" ? 1 : 0;
      await runQuery(
        "UPDATE users SET `enabled` = ?, `updatedAt` = CURRENT_TIMESTAMP WHERE id = ?",
        [enabledValue, id]
      );
    }

    // Build update query for other fields (name, email, role, etc.) — never include "enabled" here
    const { enabled: _e, ...rest } = updates as Record<string, unknown>;
    const updatesForQuery = rest;
    const keysToUpdate = Object.keys(updatesForQuery).filter((k) => k !== "enabled");
    // When we only updated status, the explicit query already set updatedAt; skip generic update to avoid double-write
    const onlyStatusUpdate = body.status !== undefined && keysToUpdate.length <= 1 && keysToUpdate[0] === "updatedAt";
    if (keysToUpdate.length > 0 && !onlyStatusUpdate) {
      const setClause = keysToUpdate.map((k) => `\`${k}\` = ?`).join(", ");
      const values = keysToUpdate.map((k) => (updatesForQuery as any)[k]);
      values.push(id);
      await runQuery(`UPDATE users SET ${setClause} WHERE id = ?`, values);
    }

    // Fetch updated user
    const updatedUser = await getRow<any>("SELECT * FROM users WHERE id = ?", [id]);

    const parsedUser: User = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || undefined,
      role: (updatedUser.role || "user") as User["role"],
      status: (updatedUser.enabled === 1 || updatedUser.enabled === true ? "active" : "inactive") as User["status"],
      createdAt: updatedUser.createdAt instanceof Date ? updatedUser.createdAt : new Date(updatedUser.createdAt),
      updatedAt: updatedUser.updatedAt instanceof Date ? updatedUser.updatedAt : new Date(updatedUser.updatedAt),
    };

    return createSuccessResponse(parsedUser);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/users/[id] - Delete user (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const user = await getRow<any>("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) {
      throw new AppError("کاربر یافت نشد", 404, "USER_NOT_FOUND");
    }

    await runQuery("DELETE FROM users WHERE id = ?", [id]);

    return createSuccessResponse({ message: "کاربر با موفقیت حذف شد" });
  } catch (error) {
    return createErrorResponse(error);
  }
}


