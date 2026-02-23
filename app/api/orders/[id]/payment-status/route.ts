import { NextRequest } from "next/server";
import { getRow, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import type { Order, PaymentStatus } from "@/types/order";
import { logger } from "@/lib/logger";

/**
 * PATCH /api/orders/[id]/payment-status - Update payment status
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

    const { paymentStatus } = body;

    if (!paymentStatus) {
      throw new AppError("paymentStatus is required", 400, "MISSING_PARAMS");
    }

    const validStatuses: PaymentStatus[] = ["pending", "paid", "failed", "refunded"];
    if (!validStatuses.includes(paymentStatus)) {
      throw new AppError("Invalid payment status", 400, "INVALID_STATUS");
    }

    const order = await getRow<any>("SELECT * FROM orders WHERE id = ?", [id]);
    if (!order) {
      throw new AppError("سفارش یافت نشد", 404, "ORDER_NOT_FOUND");
    }

    await runQuery(
      `UPDATE orders SET \`paymentStatus\` = ?, \`updatedAt\` = ? WHERE id = ?`,
      [paymentStatus, new Date().toISOString(), id]
    );

    const updatedOrder = await getRow<any>("SELECT * FROM orders WHERE id = ?", [id]);

    if (!updatedOrder) {
      throw new AppError("سفارش پس از به‌روزرسانی یافت نشد", 500, "ORDER_UPDATE_FAILED");
    }

    // Parse JSON fields with error handling
    let parsedItems = [];
    let parsedShippingAddress = {};
    
    try {
      parsedItems = Array.isArray(updatedOrder.items) 
        ? updatedOrder.items 
        : (typeof updatedOrder.items === 'string' ? JSON.parse(updatedOrder.items) : []);
    } catch (e) {
      logger.error("Error parsing items:", e);
      parsedItems = [];
    }

    try {
      parsedShippingAddress = typeof updatedOrder.shippingAddress === 'object' && updatedOrder.shippingAddress !== null 
        ? updatedOrder.shippingAddress 
        : (typeof updatedOrder.shippingAddress === 'string' ? JSON.parse(updatedOrder.shippingAddress) : {});
    } catch (e) {
      logger.error("Error parsing shippingAddress:", e);
      parsedShippingAddress = {};
    }

    const parsedOrder: Order = {
      ...updatedOrder,
      items: parsedItems,
      shippingAddress: parsedShippingAddress,
      total: Number(updatedOrder.total) || 0,
      shippingCost: Number(updatedOrder.shippingCost) || 0,
      createdAt: updatedOrder.createdAt instanceof Date ? updatedOrder.createdAt : new Date(updatedOrder.createdAt),
      updatedAt: updatedOrder.updatedAt instanceof Date ? updatedOrder.updatedAt : new Date(updatedOrder.updatedAt),
    };

    return createSuccessResponse(parsedOrder);
  } catch (error) {
    return createErrorResponse(error);
  }
}

