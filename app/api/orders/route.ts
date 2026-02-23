import { NextRequest } from "next/server";
import { getRows, getRow } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import type { Order, OrderFilters } from "@/types/order";
import { getSessionUserFromRequestWithAdminFallback, getAdminSessionUserFromRequest } from "@/lib/auth/session";

/**
 * GET /api/orders - Get orders (filtered by user if not admin)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get("orderNumber");
    
    let sessionUser = await getSessionUserFromRequestWithAdminFallback(request);
    // Fallback: پنل ادمین گاهی فقط کوکی ادمین می‌فرستد؛ اگر هنوز کاربری نیامده، مستقیم از کوکی ادمین بخوان
    if (!sessionUser) {
      const adminOnly = await getAdminSessionUserFromRequest(request);
      if (adminOnly?.role === "admin") sessionUser = adminOnly;
    }
    const isAdmin = sessionUser?.role === "admin";
    const userId = sessionUser?.id || null;

    let query = "SELECT * FROM orders";
    const params: any[] = [];
    const conditions: string[] = [];

    // اگر orderNumber وجود دارد، اجازه جستجو را بده (حتی برای مهمان‌ها)
    // این برای صفحه track order است که کاربر باید بتواند سفارش خود را با orderNumber پیدا کند
    if (orderNumber) {
      // اگر orderNumber وجود دارد، فقط بر اساس آن جستجو کن (بدون فیلتر userId)
      conditions.push("(`orderNumber` = ? OR id = ?)");
      params.push(orderNumber, orderNumber);
    } else {
      // منطق ساده برای لیست سفارشات:
      // 1. اگر ادمین است → تمام سفارشات (بدون فیلتر)
      // 2. اگر کاربر لاگین شده است → فقط سفارشات با userId او
      // 3. اگر مهمان است → خطا (احراز هویت الزامی است)
      if (!isAdmin) {
        if (userId) {
          // کاربر لاگین شده: فقط سفارشات با userId او
          conditions.push("`userId` = ?");
          params.push(String(userId));
        } else {
          // مهمان: خطا - احراز هویت الزامی است
          throw new AppError("برای مشاهده سفارش‌ها باید وارد حساب کاربری خود شوید", 401, "UNAUTHORIZED");
        }
      }
      // اگر ادمین است، هیچ فیلتری اضافه نمی‌کنیم (تمام سفارشات)
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY `createdAt` DESC";

    const orders = await getRows<any>(query, params.length > 0 ? params : undefined);

    // Parse JSON fields (PostgreSQL JSONB returns objects, not strings)
    const parsedOrders = orders.map((o: any) => ({
      ...o,
      items: Array.isArray(o.items) ? o.items : (typeof o.items === 'string' ? JSON.parse(o.items) : []),
      shippingAddress: typeof o.shippingAddress === 'object' && o.shippingAddress !== null 
        ? o.shippingAddress 
        : (typeof o.shippingAddress === 'string' ? JSON.parse(o.shippingAddress) : {}),
      total: Number(o.total),
      shippingCost: Number(o.shippingCost),
      createdAt: o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt),
      updatedAt: o.updatedAt instanceof Date ? o.updatedAt : new Date(o.updatedAt),
    }));

    return createSuccessResponse(parsedOrders, 200, {
      page: 1,
      limit: parsedOrders.length,
      total: parsedOrders.length,
      totalPages: 1,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const filters: OrderFilters = body || {};
    
    let sessionUser = await getSessionUserFromRequestWithAdminFallback(request);
    if (!sessionUser) {
      const adminOnly = await getAdminSessionUserFromRequest(request);
      if (adminOnly?.role === "admin") sessionUser = adminOnly;
    }
    let isAdmin = sessionUser?.role === "admin";
    let userId = sessionUser?.id || null;

    // Fallback: فقط در development با هدر x-user-id
    if (!sessionUser && process.env.NODE_ENV === "development") {
      const userIdHeader = request.headers.get("x-user-id");
      if (userIdHeader) {
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
          isAdmin = sessionUser.role === "admin";
          userId = sessionUser.id;
        }
      }
    }

    let query = "SELECT * FROM orders WHERE 1=1";
    const params: any[] = [];

    // منطق ساده:
    // 1. اگر ادمین است → تمام سفارشات (بدون فیلتر userId)
    // 2. اگر کاربر لاگین شده است → فقط سفارشات با userId او
    // 3. اگر مهمان است → خطا (احراز هویت الزامی است)
    if (!isAdmin) {
      if (userId) {
        // کاربر لاگین شده: فقط سفارشات با userId او
        query += " AND `userId` = ?";
        params.push(String(userId));
      } else {
        // مهمان: خطا - احراز هویت الزامی است
        throw new AppError("برای مشاهده سفارش‌ها باید وارد حساب کاربری خود شوید", 401, "UNAUTHORIZED");
      }
    }
    // اگر ادمین است، هیچ فیلتری اضافه نمی‌کنیم (تمام سفارشات)

    if (filters.status && filters.status.length > 0) {
      query += ` AND status IN (${filters.status.map(() => "?").join(",")})`;
      params.push(...filters.status);
    }

    if (filters.paymentStatus && filters.paymentStatus.length > 0) {
      query += ` AND \`paymentStatus\` IN (${filters.paymentStatus.map(() => "?").join(",")})`;
      params.push(...filters.paymentStatus);
    }

    if (filters.search) {
      query += " AND (`orderNumber` LIKE ? OR `customerName` LIKE ? OR `customerPhone` LIKE ?)";
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.dateFrom) {
      query += " AND `createdAt` >= ?";
      params.push(filters.dateFrom.toISOString());
    }

    if (filters.dateTo) {
      query += " AND `createdAt` <= ?";
      params.push(filters.dateTo.toISOString());
    }

    query += " ORDER BY `createdAt` DESC";

    const orders = await getRows<any>(query, params);

    // Parse JSON fields (PostgreSQL JSONB returns objects, not strings)
    const parsedOrders = orders.map((o: any) => ({
      ...o,
      items: Array.isArray(o.items) ? o.items : (typeof o.items === 'string' ? JSON.parse(o.items) : []),
      shippingAddress: typeof o.shippingAddress === 'object' && o.shippingAddress !== null 
        ? o.shippingAddress 
        : (typeof o.shippingAddress === 'string' ? JSON.parse(o.shippingAddress) : {}),
      total: Number(o.total),
      shippingCost: Number(o.shippingCost),
      createdAt: o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt),
      updatedAt: o.updatedAt instanceof Date ? o.updatedAt : new Date(o.updatedAt),
    }));

    return createSuccessResponse(parsedOrders, 200, {
      page: 1,
      limit: parsedOrders.length,
      total: parsedOrders.length,
      totalPages: 1,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
