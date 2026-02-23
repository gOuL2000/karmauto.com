import { NextRequest, NextResponse } from "next/server";
import { getRows, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import type { Vehicle } from "@/types/vehicle";
import { logger } from "@/lib/logger";

/**
 * GET /api/vehicles - Get all vehicles
 * POST /api/vehicles - Create vehicle
 */
export async function GET(request: NextRequest) {
  try {
    let vehicles: any[] = [];
    try {
      vehicles = await getRows<any>("SELECT * FROM vehicles WHERE enabled = TRUE ORDER BY name ASC");
    } catch (dbError: any) {
      logger.error("Error fetching vehicles:", dbError);
      const code = dbError?.code;
      const msg = dbError?.message?.toString() ?? "";
      const isTableMissing = code === "ER_NO_SUCH_TABLE" ||
        msg.includes("doesn't exist") || msg.includes("does not exist");
      const isDbUnavailable = code === "ECONNREFUSED" ||
        code === "ER_BAD_DB_ERROR" ||
        code === "ER_ACCESS_DENIED_ERROR" ||
        code === "DATABASE_NOT_AVAILABLE" ||
        msg.includes("not available") || msg.includes("connect") || msg.includes("ECONNREFUSED");
      if (isTableMissing) {
        return createErrorResponse(new AppError("جدول خودروها وجود ندارد. npm run setup-mysql را اجرا کنید.", 503, "TABLE_NOT_EXISTS"));
      }
      if (isDbUnavailable) {
        return createErrorResponse(new AppError("دیتابیس در دسترس نیست. MySQL را روشن کنید.", 503, "DATABASE_NOT_AVAILABLE"));
      }
      return createErrorResponse(new AppError("خطا در بارگذاری خودروها", 503, "VEHICLE_FETCH_ERROR"));
    }

    const parsedVehicles = vehicles.map((v: any) => {
      const vehicle = {
        ...v,
        logo: v.logo && v.logo.trim() !== '' ? v.logo : null, // Ensure empty strings become null
        models: v.models ? (typeof v.models === 'string' ? JSON.parse(v.models) : v.models) : [],
        enabled: Boolean(v.enabled),
        createdAt: new Date(v.createdAt),
        updatedAt: new Date(v.updatedAt),
      };
      
      if (process.env.NODE_ENV === 'development') {
        logger.info('[GET /api/vehicles] Parsed vehicle:', {
          id: vehicle.id,
          name: vehicle.name,
          hasLogo: !!vehicle.logo,
          logoType: vehicle.logo ? typeof vehicle.logo : 'none',
          logoLength: vehicle.logo ? vehicle.logo.length : 0,
        });
      }
      
      return vehicle;
    });

    return createSuccessResponse(parsedVehicles);
  } catch (error: any) {
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }
    logger.error("GET /api/vehicles error:", error);
    return createErrorResponse(new AppError("خطا در بارگذاری خودروها", 503, "VEHICLE_FETCH_ERROR"));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { name, logo, models } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      throw new AppError("نام خودرو الزامی است", 400, "MISSING_NAME");
    }

    try {
      // Check if vehicle with same name exists
      let existing: any[] = [];
      try {
        existing = await getRows<any>("SELECT * FROM vehicles WHERE name = ?", [name.trim()]);
      } catch (checkError: any) {
        logger.error("Error checking existing vehicle:", checkError);
        
        // If table doesn't exist, that's okay - we'll create it
        if (checkError?.code === "ER_NO_SUCH_TABLE" || 
            checkError?.message?.includes("doesn't exist") || 
            checkError?.message?.includes("does not exist")) {
          logger.warn("Vehicles table does not exist yet, will be created on insert");
          existing = [];
        } else if (checkError?.message?.includes("not available") || 
            checkError?.code === "DATABASE_NOT_AVAILABLE") {
          throw new AppError("دیتابیس در دسترس نیست", 503, "DATABASE_NOT_AVAILABLE");
        } else {
          throw checkError;
        }
      }
      
      if (existing && existing.length > 0) {
        throw new AppError("خودرو با این نام قبلاً ایجاد شده است", 400, "DUPLICATE_VEHICLE");
      }

      const id = `vehicle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const modelsJson = Array.isArray(models) ? JSON.stringify(models) : JSON.stringify([]);

      // Insert vehicle
      let insertResult: any;
      try {
        insertResult = await runQuery(
          `INSERT INTO vehicles (id, name, logo, models, enabled, \`createdAt\`, \`updatedAt\`)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, name.trim(), logo || null, modelsJson, true, now, now]
        );
      } catch (insertError: any) {
        logger.error("Error inserting vehicle:", insertError);
        
        // If table doesn't exist, provide helpful error message
        if (insertError?.code === "ER_NO_SUCH_TABLE" || 
            insertError?.message?.includes("doesn't exist") || 
            insertError?.message?.includes("does not exist")) {
          throw new AppError("جدول vehicles وجود ندارد. لطفاً ابتدا setup script را اجرا کنید.", 500, "TABLE_NOT_EXISTS");
        }
        
        if (insertError?.message?.includes("not available") || 
            insertError?.code === "DATABASE_NOT_AVAILABLE") {
          throw new AppError("دیتابیس در دسترس نیست", 503, "DATABASE_NOT_AVAILABLE");
        }
        throw insertError;
      }

      // Fetch the newly created vehicle
      let newVehicleResult: any[] = [];
      try {
        newVehicleResult = await getRows<any>("SELECT * FROM vehicles WHERE id = ?", [id]);
      } catch (fetchError: any) {
        logger.error("Error fetching created vehicle:", fetchError);
        if (insertResult && insertResult.changes > 0) {
          const vehicleData = {
            id,
            name: name.trim(),
            logo: logo || null,
            models: Array.isArray(models) ? models : [],
            enabled: true,
            createdAt: now,
            updatedAt: now,
          };
          const parsedVehicle: Vehicle = {
            ...vehicleData,
            logo: vehicleData.logo && vehicleData.logo.trim() !== '' ? vehicleData.logo : null,
            enabled: Boolean(vehicleData.enabled),
            createdAt: new Date(vehicleData.createdAt),
            updatedAt: new Date(vehicleData.updatedAt),
          };
          return createSuccessResponse(parsedVehicle, 201);
        }
        throw fetchError;
      }
      
      if (!newVehicleResult || newVehicleResult.length === 0) {
        if (insertResult && insertResult.changes > 0) {
          const vehicleData = {
            id,
            name: name.trim(),
            logo: logo || null,
            models: Array.isArray(models) ? models : [],
            enabled: true,
            createdAt: now,
            updatedAt: now,
          };
          const parsedVehicle: Vehicle = {
            ...vehicleData,
            logo: vehicleData.logo && vehicleData.logo.trim() !== '' ? vehicleData.logo : null,
            enabled: Boolean(vehicleData.enabled),
            createdAt: new Date(vehicleData.createdAt),
            updatedAt: new Date(vehicleData.updatedAt),
          };
          return createSuccessResponse(parsedVehicle, 201);
        }
        throw new AppError("خطا در ایجاد خودرو", 500, "VEHICLE_CREATE_FAILED");
      }

      const vehicleData = newVehicleResult[0];
      const parsedVehicle: Vehicle = {
        ...vehicleData,
        logo: vehicleData.logo && vehicleData.logo.trim() !== '' ? vehicleData.logo : null,
        models: vehicleData.models ? (typeof vehicleData.models === 'string' ? JSON.parse(vehicleData.models) : vehicleData.models) : [],
        enabled: Boolean(vehicleData.enabled),
        createdAt: new Date(vehicleData.createdAt),
        updatedAt: new Date(vehicleData.updatedAt),
      };

      return createSuccessResponse(parsedVehicle, 201);
    } catch (dbError: any) {
      if (dbError instanceof AppError) {
        return createErrorResponse(dbError);
      }
      logger.error("POST /api/vehicles database error:", dbError);
      throw new AppError("خطا در ایجاد خودرو", 500, "VEHICLE_CREATE_ERROR");
    }
  } catch (error: any) {
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }
    logger.error("POST /api/vehicles error:", error);
    return createErrorResponse(error);
  }
}

