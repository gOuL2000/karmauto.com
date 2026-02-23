import { NextRequest } from "next/server";
import { getRow, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import type { Order } from "@/types/order";
import { getSessionUserFromRequestWithAdminFallback } from "@/lib/auth/session";

/**
 * GET /api/orders/[id] - Get order by ID
 * PUT /api/orders/[id] - Update order
 * DELETE /api/orders/[id] - Delete order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionUser = await getSessionUserFromRequestWithAdminFallback(request);
    const isAdmin = sessionUser?.role === "admin";

    const order = await getRow<any>("SELECT * FROM orders WHERE id = ?", [id]);

    if (!order) {
      throw new AppError("سفارش یافت نشد", 404, "ORDER_NOT_FOUND");
    }

    // دسترسی: فقط ادمین یا مالک سفارش (userId برابر با session)
    if (!isAdmin) {
      const orderUserId = order.userId != null ? String(order.userId) : null;
      const sessionUserId = sessionUser?.id ? String(sessionUser.id) : null;
      if (!sessionUserId || orderUserId !== sessionUserId) {
        throw new AppError("شما اجازه مشاهده این سفارش را ندارید", 403, "FORBIDDEN");
      }
    }

    // Parse JSON fields (PostgreSQL JSONB returns objects, not strings)
    const parsedOrder: Order = {
      ...order,
      items: Array.isArray(order.items) ? order.items : (typeof order.items === 'string' ? JSON.parse(order.items) : []),
      shippingAddress: typeof order.shippingAddress === 'object' && order.shippingAddress !== null 
        ? order.shippingAddress 
        : (typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : {}),
      total: Number(order.total),
      shippingCost: Number(order.shippingCost),
      createdAt: order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt),
      updatedAt: order.updatedAt instanceof Date ? order.updatedAt : new Date(order.updatedAt),
    };

    return createSuccessResponse(parsedOrder);
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionUser = await getSessionUserFromRequestWithAdminFallback(request);
    const isAdmin = sessionUser?.role === "admin";
    if (!isAdmin) {
      throw new AppError("فقط ادمین می‌تواند سفارش را ویرایش کند", 403, "FORBIDDEN");
    }

    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const order = await getRow<any>("SELECT * FROM orders WHERE id = ?", [id]);
    if (!order) {
      throw new AppError("سفارش یافت نشد", 404, "ORDER_NOT_FOUND");
    }

    const updates: any = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // Convert arrays/objects to JSON strings
    if (updates.items) updates.items = JSON.stringify(updates.items);
    if (updates.shippingAddress) updates.shippingAddress = JSON.stringify(updates.shippingAddress);

    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(updates);
    values.push(id);

    await runQuery(`UPDATE orders SET ${setClause} WHERE id = ?`, values);

    const updatedOrder = await getRow<any>("SELECT * FROM orders WHERE id = ?", [id]);

    // Parse JSON fields (PostgreSQL JSONB returns objects, not strings)
    const parsedOrder: Order = {
      ...updatedOrder,
      items: Array.isArray(updatedOrder.items) ? updatedOrder.items : (typeof updatedOrder.items === 'string' ? JSON.parse(updatedOrder.items) : []),
      shippingAddress: typeof updatedOrder.shippingAddress === 'object' && updatedOrder.shippingAddress !== null 
        ? updatedOrder.shippingAddress 
        : (typeof updatedOrder.shippingAddress === 'string' ? JSON.parse(updatedOrder.shippingAddress) : {}),
      total: Number(updatedOrder.total),
      shippingCost: Number(updatedOrder.shippingCost),
      createdAt: updatedOrder.createdAt instanceof Date ? updatedOrder.createdAt : new Date(updatedOrder.createdAt),
      updatedAt: updatedOrder.updatedAt instanceof Date ? updatedOrder.updatedAt : new Date(updatedOrder.updatedAt),
    };

    return createSuccessResponse(parsedOrder);
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionUser = await getSessionUserFromRequestWithAdminFallback(request);
    const isAdmin = sessionUser?.role === "admin";
    if (!isAdmin) {
      throw new AppError("فقط ادمین می‌تواند سفارش را ویرایش کند", 403, "FORBIDDEN");
    }

    const order = await getRow<any>("SELECT * FROM orders WHERE id = ?", [id]);
    if (!order) {
      throw new AppError("سفارش یافت نشد", 404, "ORDER_NOT_FOUND");
    }

    await runQuery("DELETE FROM orders WHERE id = ?", [id]);

    return createSuccessResponse({ message: "سفارش با موفقیت حذف شد" });
  } catch (error) {
    return createErrorResponse(error);
  }
}
