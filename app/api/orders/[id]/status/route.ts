import { NextRequest } from "next/server";
import { getRow, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import type { Order, OrderStatus } from "@/types/order";

/**
 * PATCH /api/orders/[id]/status - Update order status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { status } = body;

    if (!status) {
      throw new AppError("status is required", 400, "MISSING_PARAMS");
    }

    const validStatuses: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw new AppError("Invalid order status", 400, "INVALID_STATUS");
    }

    const order = await getRow<any>("SELECT * FROM orders WHERE id = ?", [id]);
    if (!order) {
      throw new AppError("سفارش یافت نشد", 404, "ORDER_NOT_FOUND");
    }

    await runQuery(
      `UPDATE orders SET status = ?, \`updatedAt\` = ? WHERE id = ?`,
      [status, new Date().toISOString(), id]
    );

    const updatedOrder = await getRow<any>("SELECT * FROM orders WHERE id = ?", [id]);

    // Parse JSON fields
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








