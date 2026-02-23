import { NextRequest } from "next/server";
import { getRow, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import type { Category } from "@/types/category";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * GET /api/categories/[id] - Get category by ID
 * PUT /api/categories/[id] - Update category
 * DELETE /api/categories/[id] - Delete category
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const category = await getRow<any>("SELECT * FROM categories WHERE id = ?", [id]);

    if (!category) {
      throw new AppError("دسته‌بندی یافت نشد", 404, "CATEGORY_NOT_FOUND");
    }

    const parsedCategory: Category = {
      ...category,
      isActive: Boolean(category.isActive),
      enabled: Boolean(category.enabled),
      createdAt: new Date(category.createdAt),
      updatedAt: new Date(category.updatedAt),
    };

    return createSuccessResponse(parsedCategory);
  } catch (error) {
    return createErrorResponse(error);
  }
}

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

    const category = await getRow<any>("SELECT * FROM categories WHERE id = ?", [id]);
    if (!category) {
      throw new AppError("دسته‌بندی یافت نشد", 404, "CATEGORY_NOT_FOUND");
    }

    const updates: any = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // PostgreSQL accepts boolean values directly, no need to convert to 1/0
    // Keep boolean values as-is for PostgreSQL

    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(updates);
    values.push(id);

    await runQuery(`UPDATE categories SET ${setClause} WHERE id = ?`, values);

    const updatedCategory = await getRow<any>("SELECT * FROM categories WHERE id = ?", [id]);

    const parsedCategory: Category = {
      ...updatedCategory,
      isActive: Boolean(updatedCategory.isActive),
      enabled: Boolean(updatedCategory.enabled),
      createdAt: new Date(updatedCategory.createdAt),
      updatedAt: new Date(updatedCategory.updatedAt),
    };

    return createSuccessResponse(parsedCategory);
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const category = await getRow<any>("SELECT * FROM categories WHERE id = ?", [id]);
    if (!category) {
      throw new AppError("دسته‌بندی یافت نشد", 404, "CATEGORY_NOT_FOUND");
    }

    await runQuery("DELETE FROM categories WHERE id = ?", [id]);

    return createSuccessResponse({ message: "دسته‌بندی با موفقیت حذف شد" });
  } catch (error) {
    return createErrorResponse(error);
  }
}
