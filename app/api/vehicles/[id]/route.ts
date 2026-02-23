import { NextRequest } from "next/server";
import { getRow, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import type { Vehicle } from "@/types/vehicle";
import { logger } from "@/lib/logger";

/**
 * GET /api/vehicles/[id] - Get vehicle by ID
 * PUT /api/vehicles/[id] - Update vehicle
 * DELETE /api/vehicles/[id] - Delete vehicle
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    try {
      const vehicle = await getRow<any>("SELECT * FROM vehicles WHERE id = ?", [id]);
      
      if (!vehicle) {
        throw new AppError("خودرو یافت نشد", 404, "VEHICLE_NOT_FOUND");
      }

      const parsedVehicle: Vehicle = {
        ...vehicle,
        logo: vehicle.logo && vehicle.logo.trim() !== '' ? vehicle.logo : null, // Ensure empty strings become null
        models: vehicle.models ? (typeof vehicle.models === 'string' ? JSON.parse(vehicle.models) : vehicle.models) : [],
        enabled: Boolean(vehicle.enabled),
        createdAt: new Date(vehicle.createdAt),
        updatedAt: new Date(vehicle.updatedAt),
      };

      return createSuccessResponse(parsedVehicle);
    } catch (dbError: any) {
      if (dbError instanceof AppError) {
        return createErrorResponse(dbError);
      }
      logger.error("GET /api/vehicles/[id] database error:", dbError);
      throw new AppError("خطا در دریافت خودرو", 500, "VEHICLE_FETCH_ERROR");
    }
  } catch (error: any) {
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }
    logger.error("GET /api/vehicles/[id] error:", error);
    return createErrorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { name, logo, models, enabled } = body;

    try {
      const existing = await getRow<any>("SELECT * FROM vehicles WHERE id = ?", [id]);
      if (!existing) {
        throw new AppError("خودرو یافت نشد", 404, "VEHICLE_NOT_FOUND");
      }

      if (name && name !== existing.name) {
        const nameCheck = await getRow<any>("SELECT * FROM vehicles WHERE name = ? AND id != ?", [name.trim(), id]);
        if (nameCheck) {
          throw new AppError("خودرو با این نام قبلاً وجود دارد", 400, "DUPLICATE_VEHICLE");
        }
      }

      const modelsJson = Array.isArray(models) ? JSON.stringify(models) : (existing.models || JSON.stringify([]));
      const now = new Date().toISOString();

      await runQuery(
        `UPDATE vehicles SET name = ?, logo = ?, models = ?, enabled = ?, \`updatedAt\` = ? WHERE id = ?`,
        [
          name !== undefined ? name.trim() : existing.name,
          logo !== undefined ? logo : existing.logo,
          modelsJson,
          enabled !== undefined ? Boolean(enabled) : existing.enabled,
          now,
          id
        ]
      );

      const updated = await getRow<any>("SELECT * FROM vehicles WHERE id = ?", [id]);
      const parsedVehicle: Vehicle = {
        ...updated,
        logo: updated.logo && updated.logo.trim() !== '' ? updated.logo : null,
        models: updated.models ? (typeof updated.models === 'string' ? JSON.parse(updated.models) : updated.models) : [],
        enabled: Boolean(updated.enabled),
        createdAt: new Date(updated.createdAt),
        updatedAt: new Date(updated.updatedAt),
      };

      return createSuccessResponse(parsedVehicle);
    } catch (dbError: any) {
      if (dbError instanceof AppError) {
        return createErrorResponse(dbError);
      }
      logger.error("PUT /api/vehicles/[id] database error:", dbError);
      throw new AppError("خطا در به‌روزرسانی خودرو", 500, "VEHICLE_UPDATE_ERROR");
    }
  } catch (error: any) {
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }
    logger.error("PUT /api/vehicles/[id] error:", error);
    return createErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    try {
      const existing = await getRow<any>("SELECT * FROM vehicles WHERE id = ?", [id]);
      if (!existing) {
        throw new AppError("خودرو یافت نشد", 404, "VEHICLE_NOT_FOUND");
      }

      await runQuery("DELETE FROM vehicles WHERE id = ?", [id]);

      return createSuccessResponse({ message: "خودرو با موفقیت حذف شد" });
    } catch (dbError: any) {
      if (dbError instanceof AppError) {
        return createErrorResponse(dbError);
      }
      logger.error("DELETE /api/vehicles/[id] database error:", dbError);
      throw new AppError("خطا در حذف خودرو", 500, "VEHICLE_DELETE_ERROR");
    }
  } catch (error: any) {
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }
    logger.error("DELETE /api/vehicles/[id] error:", error);
    return createErrorResponse(error);
  }
}

