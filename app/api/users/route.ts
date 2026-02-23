import { NextRequest } from "next/server";
import { getRows, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import type { User, UserFilters } from "@/types/user";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * GET /api/users - Get all users with pagination and filtering (admin only)
 * Query params: page (default: 1), limit (default: 50), search, role, status
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    // Parse pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    // Parse filters
    const search = searchParams.get("search") || undefined;
    const role = searchParams.get("role") as User["role"] | null;
    const status = searchParams.get("status") as User["status"] | null;

    // Build query
    let query = "SELECT * FROM users WHERE 1=1";
    const params: any[] = [];

    if (search) {
      query += " AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (role) {
      query += " AND role = ?";
      params.push(role);
    }

    if (status) {
      // Map status to enabled field
      // active -> enabled = TRUE, inactive/suspended -> enabled = FALSE
      if (status === "active") {
        query += " AND enabled = TRUE";
      } else {
        query += " AND enabled = FALSE";
      }
    }

    // Get total count
    const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as count");
    const countResult = await getRows<{ count: number }>(countQuery, params);
    const total = countResult[0]?.count || 0;

    // Get paginated users
    query += " ORDER BY \"createdAt\" DESC LIMIT ? OFFSET ?";
    const users = await getRows<any>(query, [...params, limit, offset]);

    // Parse and transform users
    const parsedUsers: User[] = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || undefined,
      role: (u.role || "user") as User["role"],
      status: (u.enabled === 1 || u.enabled === true ? "active" : "inactive") as User["status"],
      avatar: undefined, // Not stored in database currently
      ordersCount: undefined, // Would need to be calculated from orders table
      totalSpent: undefined, // Would need to be calculated from orders table
      createdAt: u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt),
      updatedAt: u.updatedAt instanceof Date ? u.updatedAt : new Date(u.updatedAt),
    }));

    const totalPages = Math.ceil(total / limit);

    return createSuccessResponse(parsedUsers, 200, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/users - Create a new user (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { name, email, password, phone, address, role, status } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim() === "") {
      throw new AppError("نام کاربر الزامی است", 400, "MISSING_NAME");
    }

    if (!email || typeof email !== "string" || email.trim() === "") {
      throw new AppError("ایمیل کاربر الزامی است", 400, "MISSING_EMAIL");
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new AppError("فرمت ایمیل نامعتبر است", 400, "INVALID_EMAIL");
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      throw new AppError("رمز عبور باید حداقل 6 کاراکتر باشد", 400, "INVALID_PASSWORD");
    }

    // Check if user with same email exists
    try {
      const existing = await getRows<any>("SELECT * FROM users WHERE email = ?", [email.trim()]);
      if (existing && existing.length > 0) {
        throw new AppError("کاربری با این ایمیل قبلاً ثبت شده است", 400, "DUPLICATE_EMAIL");
      }
    } catch (checkError: any) {
      if (checkError instanceof AppError) {
        throw checkError;
      }
      logger.error("Error checking existing user:", checkError);
      throw new AppError("خطا در بررسی کاربر موجود", 500, "CHECK_ERROR");
    }

    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Validate role
    const validRoles: User["role"][] = ["admin", "moderator", "user"];
    const userRole = validRoles.includes(role) ? role : "user";

    // Validate status and map to enabled
    const validStatuses: User["status"][] = ["active", "inactive", "suspended"];
    const userStatus = validStatuses.includes(status) ? status : "active";
    const enabled = userStatus === "active" ? 1 : 0;

    // Insert user into database
    // Note: In production, password should be hashed before storing
    let insertResult: any;
    try {
      insertResult = await runQuery(
        `INSERT INTO users (id, email, password, name, role, phone, address, enabled, \`createdAt\`, \`updatedAt\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          email.trim().toLowerCase(),
          password, // TODO: Hash password in production
          name.trim(),
          userRole,
          phone ? phone.trim() : null,
          address ? address.trim() : null,
          enabled,
          now,
          now,
        ]
      );
    } catch (insertError: any) {
      logger.error("Error inserting user:", insertError);
      if (insertError?.message?.includes("UNIQUE constraint")) {
        throw new AppError("کاربری با این ایمیل قبلاً ثبت شده است", 400, "DUPLICATE_EMAIL");
      }
      throw new AppError("خطا در ایجاد کاربر", 500, "USER_CREATE_FAILED");
    }

    // Check if insert was successful
    if (insertResult && insertResult.changes === 0) {
      throw new AppError("خطا در ایجاد کاربر - هیچ رکوردی ایجاد نشد", 500, "USER_CREATE_FAILED");
    }

    // Fetch the newly created user
    let newUserResult: any[] = [];
    try {
      newUserResult = await getRows<any>("SELECT * FROM users WHERE id = ?", [id]);
    } catch (fetchError: any) {
      logger.error("Error fetching created user:", fetchError);
      // Even if fetch fails, if insert was successful, we can construct the user object
      if (insertResult && insertResult.changes > 0) {
        const userData: User = {
          id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : undefined,
          role: userRole,
          status: userStatus,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        };
        return createSuccessResponse(userData, 201);
      }
      throw fetchError;
    }

    if (!newUserResult || newUserResult.length === 0) {
      // If insert was successful but fetch failed, construct from input
      const userData: User = {
        id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : undefined,
        role: userRole,
        status: userStatus,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };
      return createSuccessResponse(userData, 201);
    }

    const user = newUserResult[0];
    const parsedUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || undefined,
      role: (user.role || "user") as User["role"],
      status: (user.enabled === 1 || user.enabled === true ? "active" : "inactive") as User["status"],
      createdAt: user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt),
      updatedAt: user.updatedAt instanceof Date ? user.updatedAt : new Date(user.updatedAt),
    };

    return createSuccessResponse(parsedUser, 201);
  } catch (error) {
    return createErrorResponse(error);
  }
}


