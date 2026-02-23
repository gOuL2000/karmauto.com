import { NextRequest, NextResponse } from "next/server";
import { getRows, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import type { Category } from "@/types/category";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth/require-admin";

// Simple in-memory cache for categories (categories don't change often)
let categoriesCache: { data: Category[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/categories - Get all categories (with caching)
 * POST /api/categories - Create category
 */
export async function GET(request: NextRequest) {
  try {
    // Check if we need all categories (for admin pages and product filters)
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get("all") === "true";
    
    // Check cache first (only for active categories, not for admin view)
    const now = Date.now();
    if (!includeAll && categoriesCache && (now - categoriesCache.timestamp) < CACHE_TTL) {
      return createSuccessResponse(categoriesCache.data);
    }

    let categories: any[] = [];
    try {
      // If all=true, return all enabled categories (for product filters), otherwise only active ones
      const whereClause = includeAll 
        ? "SELECT * FROM categories WHERE enabled = TRUE ORDER BY name ASC"
        : "SELECT * FROM categories WHERE enabled = TRUE AND \`isActive\` = TRUE ORDER BY name ASC";
      
      categories = await getRows<any>(whereClause);
    } catch (dbError: any) {
      logger.error("Error fetching categories:", dbError);
      
      // If table doesn't exist, return empty array instead of error
      if (dbError?.code === "ER_NO_SUCH_TABLE" || 
          dbError?.message?.includes("doesn't exist") || 
          dbError?.message?.includes("does not exist") ||
          dbError?.message?.includes("Table") && dbError?.message?.includes("doesn't exist")) {
        logger.warn("Categories table does not exist yet, returning empty array");
        return createSuccessResponse([]);
      }
      
      // If database is not available, return empty array instead of 503
      // This allows the app to continue working even if database is temporarily unavailable
      if (dbError?.message?.includes("not available") || 
          dbError?.code === "DATABASE_NOT_AVAILABLE" ||
          dbError?.code === "ECONNREFUSED" ||
          dbError?.message?.includes("connect") ||
          dbError?.message?.includes("timeout")) {
        logger.warn("Database not available, returning empty categories array");
        return createSuccessResponse([]);
      }
      
      // For other errors, still return empty array to prevent UI crash
      logger.error("Unexpected error fetching categories, returning empty array:", dbError);
      return createSuccessResponse([]);
    }

    const parsedCategories = categories.map((c: any) => ({
      ...c,
      isActive: Boolean(c.isActive),
      enabled: Boolean(c.enabled),
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    }));

    // Update cache only for active categories (not for admin view)
    if (!includeAll) {
      categoriesCache = {
        data: parsedCategories,
        timestamp: now,
      };
    }

    // Create response with cache headers
    const response = createSuccessResponse(parsedCategories);
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    
    return response;
  } catch (error: any) {
    // If it's already an AppError, re-throw it
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }
    // Otherwise, wrap database errors
    logger.error("GET /api/categories error:", error);
    logger.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
    });
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { name, description, slug, image, icon, isActive } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      throw new AppError("نام دسته‌بندی الزامی است", 400, "MISSING_NAME");
    }

    try {
      // Check if category with same name exists
      let existing: any[] = [];
      try {
        existing = await getRows<any>("SELECT * FROM categories WHERE name = ?", [name.trim()]);
      } catch (checkError: any) {
        logger.error("Error checking existing category:", checkError);
        // If database is not available, throw a clear error
        if (checkError?.message?.includes("not available") || 
            checkError?.code === "DATABASE_NOT_AVAILABLE" ||
            checkError?.code === "ECONNREFUSED" ||
            checkError?.message?.includes("connect") ||
            checkError?.message?.includes("timeout")) {
          throw new AppError("دیتابیس در دسترس نیست. لطفاً اطمینان حاصل کنید که PostgreSQL نصب و پیکربندی شده است.", 503, "DATABASE_NOT_AVAILABLE");
        }
        throw checkError;
      }
      
      if (existing && existing.length > 0) {
        throw new AppError("دسته‌بندی با این نام قبلاً ایجاد شده است", 400, "DUPLICATE_CATEGORY");
      }

      const id = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      // Use isActive from body, default to true if not provided
      const categoryIsActive = isActive !== undefined ? Boolean(isActive) : true;

      // Insert category
      let insertResult: any;
      try {
        insertResult = await runQuery(
          `INSERT INTO categories (id, name, description, slug, image, icon, enabled, \`isActive\`, \`createdAt\`, \`updatedAt\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, name.trim(), description || null, slug || null, image || null, icon || null, true, categoryIsActive, now, now]
        );
      } catch (insertError: any) {
        logger.error("Error inserting category:", insertError);
        if (insertError?.message?.includes("not available") || 
            insertError?.code === "DATABASE_NOT_AVAILABLE" ||
            insertError?.code === "ECONNREFUSED" ||
            insertError?.message?.includes("connect") ||
            insertError?.message?.includes("timeout")) {
          throw new AppError("دیتابیس در دسترس نیست. لطفاً اطمینان حاصل کنید که PostgreSQL نصب و پیکربندی شده است.", 503, "DATABASE_NOT_AVAILABLE");
        }
        throw insertError;
      }

      // Check if insert was successful
      if (insertResult && insertResult.changes === 0) {
        throw new AppError("خطا در ایجاد دسته‌بندی - هیچ رکوردی ایجاد نشد", 500, "CATEGORY_CREATE_FAILED");
      }

      // Fetch the newly created category
      let newCategoryResult: any[] = [];
      try {
        newCategoryResult = await getRows<any>("SELECT * FROM categories WHERE id = ?", [id]);
      } catch (fetchError: any) {
        logger.error("Error fetching created category:", fetchError);
        // Even if fetch fails, if insert was successful, we can construct the category object
        if (insertResult && insertResult.changes > 0) {
          // Construct category from input data
          const categoryData = {
            id,
            name: name.trim(),
            description: description || null,
            slug: slug || null,
            image: image || null,
            icon: icon || null,
            enabled: true,
            isActive: categoryIsActive,
            createdAt: now,
            updatedAt: now,
          };
          const parsedCategory: Category = {
            ...categoryData,
            isActive: Boolean(categoryData.isActive),
            enabled: Boolean(categoryData.enabled),
            createdAt: new Date(categoryData.createdAt),
            updatedAt: new Date(categoryData.updatedAt),
          };
          
          // Invalidate caches
          categoriesCache = null;
          
          return createSuccessResponse(parsedCategory, 201);
        }
        throw fetchError;
      }
      
      if (!newCategoryResult || newCategoryResult.length === 0) {
        // If insert was successful but fetch failed, construct from input
        if (insertResult && insertResult.changes > 0) {
          const categoryData = {
            id,
            name: name.trim(),
            description: description || null,
            slug: slug || null,
            image: image || null,
            icon: icon || null,
            enabled: true,
            isActive: categoryIsActive,
            createdAt: now,
            updatedAt: now,
          };
          const parsedCategory: Category = {
            ...categoryData,
            isActive: Boolean(categoryData.isActive),
            enabled: Boolean(categoryData.enabled),
            createdAt: new Date(categoryData.createdAt),
            updatedAt: new Date(categoryData.updatedAt),
          };
          
          categoriesCache = null;
          
          return createSuccessResponse(parsedCategory, 201);
        }
        throw new AppError("خطا در ایجاد دسته‌بندی - دسته‌بندی ایجاد نشد", 500, "CATEGORY_CREATE_FAILED");
      }

      const categoryData = newCategoryResult[0];
      const parsedCategory: Category = {
        ...categoryData,
        isActive: Boolean(categoryData.isActive),
        enabled: Boolean(categoryData.enabled),
        createdAt: new Date(categoryData.createdAt),
        updatedAt: new Date(categoryData.updatedAt),
      };

      // Invalidate caches when creating new category
      categoriesCache = null;

      return createSuccessResponse(parsedCategory, 201);
    } catch (dbError: any) {
      // If it's already an AppError, re-throw it
      if (dbError instanceof AppError) {
        throw dbError;
      }
      // Otherwise, wrap database errors
      logger.error("Database error creating category:", dbError);
      logger.error("Error details:", {
        message: dbError?.message,
        stack: dbError?.stack,
        name: dbError?.name,
      });
      throw new AppError(
        dbError?.message || "خطا در ذخیره دسته‌بندی در دیتابیس",
        500,
        "DATABASE_ERROR"
      );
    }
  } catch (error: any) {
    logger.error("POST /api/categories error:", error);
    return createErrorResponse(error);
  }
}
