import { NextRequest } from "next/server";
import { getRow, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import type { Product } from "@/types/product";
import { normalizeImages, normalizeTags, normalizeSpecifications } from "@/lib/product-utils";
import { requireAdmin } from "@/lib/auth/require-admin";
import { cache } from "@/lib/cache";

/**
 * GET /api/products/[id] - Get product by ID
 * PUT /api/products/[id] - Update product
 * DELETE /api/products/[id] - Delete product
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await getRow<any>(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );

    if (!product) {
      throw new AppError("محصول یافت نشد", 404, "PRODUCT_NOT_FOUND");
    }

    // برای مشتریان: محصول غیرفعال نمایش داده نشود (فقط ادمین محصول غیرفعال را ببیند)
    const isEnabled = product.enabled === true || product.enabled === 1;
    if (!isEnabled) {
      try {
        await requireAdmin(request);
      } catch {
        throw new AppError("محصول یافت نشد", 404, "PRODUCT_NOT_FOUND");
      }
    }

    // Parse JSON fields with normalization
    const parsedProduct: Product = {
      ...product,
      images: normalizeImages(product.images),
      tags: normalizeTags(product.tags),
      specifications: normalizeSpecifications(product.specifications),
      price: Number(product.price),
      originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
      stockCount: Number(product.stockCount),
      inStock: Boolean(product.inStock),
      enabled: Boolean(product.enabled),
      featuredOrder: product.featuredOrder != null ? Number(product.featuredOrder) : null,
      vinEnabled: Boolean(product.vinEnabled),
      airShippingEnabled: Boolean(product.airShippingEnabled),
      seaShippingEnabled: Boolean(product.seaShippingEnabled),
      airShippingCost: product.airShippingCost !== null && product.airShippingCost !== undefined ? Number(product.airShippingCost) : null,
      seaShippingCost: product.seaShippingCost !== null && product.seaShippingCost !== undefined ? Number(product.seaShippingCost) : null,
      createdAt: product.createdAt instanceof Date ? product.createdAt : new Date(product.createdAt),
      updatedAt: product.updatedAt instanceof Date ? product.updatedAt : new Date(product.updatedAt),
    };

    return createSuccessResponse(parsedProduct);
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

    const product = await getRow<any>("SELECT * FROM products WHERE id = ?", [id]);
    if (!product) {
      throw new AppError("محصول یافت نشد", 404, "PRODUCT_NOT_FOUND");
    }

    // Define allowed fields that can be updated (exclude id, createdAt, etc.)
    const allowedFields = [
      'name', 'description', 'price', 'originalPrice', 'brand', 
      'category', 'vehicle', 'model', 'vin', 'vinEnabled',
      'airShippingEnabled', 'seaShippingEnabled', 'airShippingCost', 
      'seaShippingCost', 'stockCount', 'inStock', 'enabled',
      'featuredOrder', 'images', 'tags', 'specifications'
    ];

    // Filter out undefined values and non-updatable fields
    const filteredUpdates: any = {
      updatedAt: new Date().toISOString(),
    };

    // Only include allowed fields that are not undefined
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        filteredUpdates[key] = body[key];
      }
    }

    // گذینش در صفحهٔ اصلی: اگر featuredOrder تنظیم شد، محصول قبلی در آن موقعیت را خالی کن (حداکثر ۵ موقعیت)
    if (filteredUpdates.featuredOrder !== undefined) {
      const order = filteredUpdates.featuredOrder;
      if (order !== null && (order < 1 || order > 5)) {
        filteredUpdates.featuredOrder = null;
      }
      if (order !== null && order >= 1 && order <= 5) {
        try {
          await runQuery(
            "UPDATE products SET `featuredOrder` = NULL WHERE `featuredOrder` = ? AND id != ?",
            [order, id]
          );
        } catch (e: any) {
          if (e?.code === "ER_BAD_FIELD_ERROR") delete filteredUpdates.featuredOrder;
          else throw e;
        }
      }
    }

    // Convert arrays/objects to JSON strings
    if (filteredUpdates.images !== undefined) {
      filteredUpdates.images = JSON.stringify(filteredUpdates.images);
    }
    if (filteredUpdates.tags !== undefined) {
      filteredUpdates.tags = JSON.stringify(filteredUpdates.tags);
    }
    if (filteredUpdates.specifications !== undefined) {
      filteredUpdates.specifications = JSON.stringify(filteredUpdates.specifications);
    }
    
    // Ensure boolean values are properly converted
    if (filteredUpdates.airShippingEnabled !== undefined) {
      filteredUpdates.airShippingEnabled = typeof filteredUpdates.airShippingEnabled === "boolean" 
        ? filteredUpdates.airShippingEnabled 
        : (filteredUpdates.airShippingEnabled === true || filteredUpdates.airShippingEnabled === "true" || filteredUpdates.airShippingEnabled === 1);
    }
    if (filteredUpdates.seaShippingEnabled !== undefined) {
      filteredUpdates.seaShippingEnabled = typeof filteredUpdates.seaShippingEnabled === "boolean" 
        ? filteredUpdates.seaShippingEnabled 
        : (filteredUpdates.seaShippingEnabled === true || filteredUpdates.seaShippingEnabled === "true" || filteredUpdates.seaShippingEnabled === 1);
    }
    // Ensure shipping cost values are properly converted
    if (filteredUpdates.airShippingCost !== undefined) {
      filteredUpdates.airShippingCost = filteredUpdates.airShippingCost !== null && filteredUpdates.airShippingCost !== undefined 
        ? Math.max(0, Math.round(Number(filteredUpdates.airShippingCost))) 
        : null;
    }
    if (filteredUpdates.seaShippingCost !== undefined) {
      filteredUpdates.seaShippingCost = filteredUpdates.seaShippingCost !== null && filteredUpdates.seaShippingCost !== undefined 
        ? Math.max(0, Math.round(Number(filteredUpdates.seaShippingCost))) 
        : null;
    }
    // MySQL: store booleans as 1/0 so UPDATE persists correctly
    if (filteredUpdates.enabled !== undefined) {
      filteredUpdates.enabled = filteredUpdates.enabled === true || filteredUpdates.enabled === "true" || filteredUpdates.enabled === 1 ? 1 : 0;
    }
    if (filteredUpdates.inStock !== undefined) {
      filteredUpdates.inStock = filteredUpdates.inStock === true || filteredUpdates.inStock === "true" || filteredUpdates.inStock === 1 ? 1 : 0;
    }

    // Build SQL query only with fields that have values (backticks for reserved words like updatedAt)
    const setClause = Object.keys(filteredUpdates)
      .map((key) => `\`${key}\` = ?`)
      .join(", ");
    const values = Object.values(filteredUpdates);
    values.push(id);

    let updateResult: { affectedRows?: number };
    try {
      updateResult = (await runQuery(`UPDATE products SET ${setClause} WHERE id = ?`, values)) as { affectedRows?: number };
    } catch (e: any) {
      if (e?.code === "ER_BAD_FIELD_ERROR") {
        if (filteredUpdates.featuredOrder !== undefined) {
          throw new AppError(
            "ستون «گذینش در صفحهٔ اصلی» در دیتابیس وجود ندارد. دستور: node scripts/run-add-featured-order.js",
            400,
            "MISSING_FEATURED_ORDER_COLUMN"
          );
        }
        if (filteredUpdates.enabled !== undefined) {
          throw new AppError(
            "ستون «enabled» (وضعیت فعال/غیرفعال) در دیتابیس وجود ندارد. دستور: node scripts/ensure-products-enabled-column.js",
            400,
            "MISSING_ENABLED_COLUMN"
          );
        }
      }
      throw e;
    }

    if (updateResult?.affectedRows === 0) {
      throw new AppError("محصول یافت نشد یا تغییری اعمال نشد", 404, "UPDATE_NO_ROWS");
    }

    // Invalidate products list cache so next GET returns fresh data
    cache.deleteByPrefix("products:");

    const updatedProduct = await getRow<any>("SELECT * FROM products WHERE id = ?", [id]);
    
    // Parse JSON fields with normalization
    const parsedProduct: Product = {
      ...updatedProduct,
      images: normalizeImages(updatedProduct.images),
      tags: normalizeTags(updatedProduct.tags),
      specifications: normalizeSpecifications(updatedProduct.specifications),
      price: Number(updatedProduct.price),
      originalPrice: updatedProduct.originalPrice ? Number(updatedProduct.originalPrice) : undefined,
      stockCount: Number(updatedProduct.stockCount),
      inStock: Boolean(updatedProduct.inStock),
      enabled: Boolean(updatedProduct.enabled),
      featuredOrder: updatedProduct.featuredOrder != null ? Number(updatedProduct.featuredOrder) : null,
      vinEnabled: Boolean(updatedProduct.vinEnabled),
      airShippingEnabled: Boolean(updatedProduct.airShippingEnabled),
      seaShippingEnabled: Boolean(updatedProduct.seaShippingEnabled),
      airShippingCost: updatedProduct.airShippingCost !== null && updatedProduct.airShippingCost !== undefined ? Number(updatedProduct.airShippingCost) : null,
      seaShippingCost: updatedProduct.seaShippingCost !== null && updatedProduct.seaShippingCost !== undefined ? Number(updatedProduct.seaShippingCost) : null,
      createdAt: updatedProduct.createdAt instanceof Date ? updatedProduct.createdAt : new Date(updatedProduct.createdAt),
      updatedAt: updatedProduct.updatedAt instanceof Date ? updatedProduct.updatedAt : new Date(updatedProduct.updatedAt),
    };

    return createSuccessResponse(parsedProduct);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PATCH /api/products/[id] - فقط به‌روزرسانی وضعیت فعال/غیرفعال (enabled)
 * Body: { enabled: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const enabled = body.enabled === true || body.enabled === "true" || body.enabled === 1;

    const product = await getRow<any>("SELECT id, enabled FROM products WHERE id = ?", [id]);
    if (!product) {
      throw new AppError("محصول یافت نشد", 404, "PRODUCT_NOT_FOUND");
    }

    try {
      await runQuery("UPDATE products SET `enabled` = ?, `updatedAt` = CURRENT_TIMESTAMP WHERE id = ?", [
        enabled ? 1 : 0,
        id,
      ]);
    } catch (e: any) {
      if (e?.code === "ER_BAD_FIELD_ERROR") {
        throw new AppError(
          "ستون «enabled» در دیتابیس وجود ندارد. دستور: node scripts/ensure-products-enabled-column.js",
          400,
          "MISSING_ENABLED_COLUMN"
        );
      }
      throw e;
    }
    cache.deleteByPrefix("products:");

    const updated = await getRow<any>("SELECT * FROM products WHERE id = ?", [id]);
    if (!updated) {
      throw new AppError("خطا در خواندن محصول به‌روز شده", 500, "FETCH_AFTER_UPDATE");
    }
    const parsedProduct: Product = {
      ...updated,
      images: normalizeImages(updated.images),
      tags: normalizeTags(updated.tags),
      specifications: normalizeSpecifications(updated.specifications),
      price: Number(updated.price),
      originalPrice: updated.originalPrice ? Number(updated.originalPrice) : undefined,
      stockCount: Number(updated.stockCount),
      inStock: Boolean(updated.inStock),
      enabled: Boolean(updated.enabled),
      featuredOrder: updated.featuredOrder != null ? Number(updated.featuredOrder) : null,
      vinEnabled: Boolean(updated.vinEnabled),
      airShippingEnabled: Boolean(updated.airShippingEnabled),
      seaShippingEnabled: Boolean(updated.seaShippingEnabled),
      airShippingCost: updated.airShippingCost != null ? Number(updated.airShippingCost) : null,
      seaShippingCost: updated.seaShippingCost != null ? Number(updated.seaShippingCost) : null,
      createdAt: updated.createdAt instanceof Date ? updated.createdAt : new Date(updated.createdAt),
      updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt : new Date(updated.updatedAt),
    };
    return createSuccessResponse(parsedProduct);
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

    const product = await getRow<any>("SELECT * FROM products WHERE id = ?", [id]);
    if (!product) {
      throw new AppError("محصول یافت نشد", 404, "PRODUCT_NOT_FOUND");
    }

    await runQuery("DELETE FROM products WHERE id = ?", [id]);

    return createSuccessResponse({ message: "محصول با موفقیت حذف شد" });
  } catch (error) {
    return createErrorResponse(error);
  }
}
