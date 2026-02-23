import { NextRequest } from "next/server";
import { getRows, getRow, runQuery } from "@/lib/db/index";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import type { Product, ProductFilters } from "@/types/product";
import { cache, cacheKeys, withCache } from "@/lib/cache";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { productSchema, productFiltersSchema } from "@/lib/validations/product";
import { normalizeImages, normalizeTags, normalizeSpecifications } from "@/lib/product-utils";
import { validateImageUrl, normalizeImageUrl } from "@/lib/image-utils";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * GET /api/products - Get all products with pagination
 * Query params: page (default: 1), limit (default: 50)
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 100 requests per minute per IP
  const rateLimitResponse = await rateLimit(100, 60000)(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Parse pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;
    
    // Check if we need all products (for admin pages)
    const includeAll = searchParams.get("all") === "true";
    // محصولات گذینش‌شده برای صفحهٔ اصلی (فقط ۵ محصول فعال)
    const featuredOnly = searchParams.get("featured") === "true";

    // Get total count first
    let countResult: { count: number }[];
    let total = 0;
    let products: any[] = [];

    try {
      // Test database connection first
      const { testConnection } = await import("@/lib/db/index");
      const isConnected = await testConnection();
      
      if (!isConnected) {
        logger.warn("⚠️ Database connection test failed - returning empty products");
        // Return empty response instead of error
        return createSuccessResponse([], 200, {
          page,
          limit,
          total: 0,
          totalPages: 0,
        });
      }
    } catch (connectionTestError) {
      logger.warn("⚠️ Database connection test error - returning empty products:", connectionTestError);
      // Return empty response instead of error
      return createSuccessResponse([], 200, {
        page,
        limit,
        total: 0,
        totalPages: 0,
      });
    }

    try {
      if (featuredOnly) {
        // فقط محصولات گذینش‌شده برای صفحهٔ اصلی: فعال + موقعیت ۱ تا ۵، مرتب‌شده، حداکثر ۵ تا
        try {
          const featuredQuery = `SELECT * FROM products WHERE enabled = TRUE AND \`featuredOrder\` >= 1 AND \`featuredOrder\` <= 5 ORDER BY \`featuredOrder\` ASC LIMIT 5`;
          products = await getRows<any>(featuredQuery);
          total = products.length;
        } catch (feErr: any) {
          if (feErr?.code === "ER_BAD_FIELD_ERROR" || feErr?.message?.includes("featuredOrder")) {
            products = [];
            total = 0;
          } else {
            throw feErr;
          }
        }
      } else {
        // برای ادمین (all=true): کش نزن تا بعد از رفرش وضعیت فعال/غیرفعال درست از DB خوانده شود
        const cacheKey = cacheKeys.products(page, limit, includeAll ? 'all' : 'enabled');
        const useCache = !includeAll;

        if (useCache) {
          const cached = cache.get<{ products: Product[]; total: number }>(cacheKey);
          if (cached) {
            return createSuccessResponse(cached.products, 200, {
              page,
              limit,
              total: cached.total,
              totalPages: Math.ceil(cached.total / limit),
            });
          }
        }

        // If all=true, count all products, otherwise only enabled ones
        const countQuery = includeAll 
          ? `SELECT COUNT(*) as count FROM products`
          : `SELECT COUNT(*) as count FROM products WHERE enabled = TRUE`;
        
        countResult = await getRows<{ count: number }>(countQuery);
        total = countResult[0]?.count || 0;

        // If all=true, get all products, otherwise only enabled ones
        const productsQuery = includeAll
          ? `SELECT * FROM products ORDER BY \`createdAt\` DESC LIMIT ? OFFSET ?`
          : `SELECT * FROM products WHERE enabled = TRUE ORDER BY \`createdAt\` DESC LIMIT ? OFFSET ?`;
        
        products = await getRows<Product>(productsQuery, [limit, offset]);

        if (useCache) {
          cache.set(cacheKey, { products, total }, 5 * 60 * 1000);
        }
      }
    } catch (dbError: any) {
      logger.error("Database error in GET /api/products:", {
        message: dbError?.message,
        code: dbError?.code,
        stack: dbError?.stack,
      });
      
      // Check for specific database connection errors
      const isConnectionError = 
        dbError?.code === "ECONNREFUSED" ||
        dbError?.code === "ETIMEDOUT" ||
        dbError?.code === "ENOTFOUND" ||
        dbError?.message?.includes("connection") ||
        dbError?.message?.includes("timeout");
      
      if (isConnectionError) {
        throw new AppError(
          "خطا در اتصال به دیتابیس. لطفاً مطمئن شوید که دیتابیس در حال اجرا است.",
          503,
          "DATABASE_CONNECTION_ERROR",
          process.env.NODE_ENV === "development" ? dbError : undefined
        );
      }
      
      throw new AppError(
        `خطا در دریافت محصولات: ${dbError?.message || "خطای نامشخص"}`,
        500,
        "DATABASE_ERROR",
        process.env.NODE_ENV === "development" ? dbError : undefined
      );
    }

    // Parse JSON fields (PostgreSQL JSONB returns objects, not strings)
    const parsedProducts = products.map((p: any) => {
      // Normalize and validate images - be more lenient with base64
      const normalizedImages = normalizeImages(p.images);
      const validatedImages = normalizedImages
        .map((img: string) => {
          if (!img || typeof img !== 'string') return null;
          const trimmed = img.trim();
          if (trimmed === '') return null;
          
          // For base64 images, validate directly without normalization
          if (trimmed.startsWith('data:image') || trimmed.startsWith('data:')) {
            if (trimmed.includes(';base64,') && trimmed.length > 50) {
              return trimmed; // Accept base64 images with basic validation
            } else if (trimmed.startsWith('data:image') && trimmed.length > 50) {
              // Even without ;base64,, if it's data:image and long enough, accept it
              return trimmed;
            }
            return null;
          }
          
          // For other URLs (http, https, blob, relative), normalize and validate
          const normalized = normalizeImageUrl(trimmed);
          if (!normalized) return null;
          return validateImageUrl(normalized) ? normalized : null;
        })
        .filter((img: string | null): img is string => img !== null);

      return {
        ...p,
        images: validatedImages,
        tags: normalizeTags(p.tags),
        specifications: normalizeSpecifications(p.specifications),
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
        stockCount: Number(p.stockCount),
        inStock: Boolean(p.inStock),
        enabled: Boolean(p.enabled),
        featuredOrder: p.featuredOrder != null ? Number(p.featuredOrder) : null,
        vinEnabled: Boolean(p.vinEnabled),
        airShippingEnabled: Boolean(p.airShippingEnabled),
        seaShippingEnabled: Boolean(p.seaShippingEnabled),
        airShippingCost: p.airShippingCost !== null && p.airShippingCost !== undefined ? Number(p.airShippingCost) : null,
        seaShippingCost: p.seaShippingCost !== null && p.seaShippingCost !== undefined ? Number(p.seaShippingCost) : null,
        createdAt: p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt),
        updatedAt: p.updatedAt instanceof Date ? p.updatedAt : new Date(p.updatedAt),
      };
    });

    const totalPages = Math.ceil(total / limit);

    return createSuccessResponse(parsedProducts, 200, {
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
 * POST /api/products - Create new product OR Get filtered products with pagination (admin only)
 * Body for create: { name, description, price, brand, category, ... }
 * Body for filter: { filters: ProductFilters, page?: number, limit?: number }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    // Check if this is a create request (has name and price) or filter request (has filters property)
    if (body.name && body.price !== undefined && !body.filters) {
      // This is a create request
      // Validate with Zod schema
      let validatedData;
      try {
        validatedData = productSchema.parse(body);
      } catch (validationError: any) {
        const errors = validationError.errors || [];
        const firstError = errors[0];
        throw new AppError(
          firstError?.message || "اطلاعات محصول نامعتبر است",
          400,
          "VALIDATION_ERROR",
          errors
        );
      }

      const {
        name,
        description,
        price,
        originalPrice,
        brand,
        category,
        vehicle,
        model,
        vin,
        vinEnabled,
        airShippingEnabled,
        seaShippingEnabled,
        airShippingCost,
        seaShippingCost,
        stockCount,
        inStock,
        enabled,
        images,
        tags,
        specifications,
      } = validatedData;

      const id = `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Prepare data for database
      const productData: any = {
        id,
        name: name.trim(),
        description: (description ?? "").trim(),
        price: Math.round(price),
        originalPrice: originalPrice ? Math.round(originalPrice) : null,
        brand: (brand ?? "").trim(),
        category: (category ?? "").trim(),
        vehicle: vehicle ? vehicle.trim() : null,
        model: model ? model.trim() : null,
        vin: vin && vinEnabled ? vin.trim() : null,
        vinEnabled: vinEnabled ? true : false,
        airShippingEnabled: typeof airShippingEnabled === "boolean" ? airShippingEnabled : (airShippingEnabled === true || airShippingEnabled === "true" || airShippingEnabled === 1),
        seaShippingEnabled: typeof seaShippingEnabled === "boolean" ? seaShippingEnabled : (seaShippingEnabled === true || seaShippingEnabled === "true" || seaShippingEnabled === 1),
        airShippingCost: airShippingCost !== undefined && airShippingCost !== null ? Math.max(0, Math.round(airShippingCost)) : null,
        seaShippingCost: seaShippingCost !== undefined && seaShippingCost !== null ? Math.max(0, Math.round(seaShippingCost)) : null,
        stockCount: Math.max(0, Math.round(stockCount || 0)),
        inStock: inStock !== false,
        enabled: enabled !== false,
        // Validate and normalize images before saving
        images: Array.isArray(images)
          ? images
              .map((img: any) => {
                if (!img || typeof img !== 'string') return null;
                const trimmed = img.trim();
                if (trimmed === '') return null;
                
                // For base64 images, validate directly without normalization
                if (trimmed.startsWith('data:image') || trimmed.startsWith('data:')) {
                  if (trimmed.includes(';base64,') && trimmed.length > 50) {
                    return trimmed; // Accept base64 images with basic validation
                  } else if (trimmed.startsWith('data:image') && trimmed.length > 50) {
                    // Even without ;base64,, if it's data:image and long enough, accept it
                    return trimmed;
                  }
                  return null;
                }
                
                // For other URLs (http, https, blob, relative), normalize and validate
                const normalized = normalizeImageUrl(trimmed);
                if (!normalized) return null;
                return validateImageUrl(normalized) ? normalized : null;
              })
              .filter((img: string | null): img is string => img !== null)
          : [],
        tags: tags && Array.isArray(tags) ? tags : [],
        specifications: specifications && typeof specifications === "object" ? specifications : {},
        createdAt: now,
        updatedAt: now,
      };

      // Insert into database (wrapper will convert ? to $1, $2, etc. for PostgreSQL)
      try {
        const insertResult = await runQuery(
        `INSERT INTO products (id, name, description, price, \`originalPrice\`, brand, category, vehicle, model, vin, \`vinEnabled\`, \`airShippingEnabled\`, \`seaShippingEnabled\`, \`airShippingCost\`, \`seaShippingCost\`, \`stockCount\`, \`inStock\`, enabled, images, tags, specifications, \`createdAt\`, \`updatedAt\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productData.id,
          productData.name,
          productData.description,
          productData.price,
          productData.originalPrice,
          productData.brand,
          productData.category,
          productData.vehicle,
          productData.model,
          productData.vin,
          productData.vinEnabled,
          productData.airShippingEnabled,
          productData.seaShippingEnabled,
          productData.airShippingCost,
          productData.seaShippingCost,
          productData.stockCount,
          productData.inStock,
          productData.enabled,
          JSON.stringify(productData.images),
          JSON.stringify(productData.tags),
          JSON.stringify(productData.specifications),
          productData.createdAt,
          productData.updatedAt,
        ]
      );
        logger.debug("Product inserted successfully:", { id, changes: (insertResult as { changes?: number; affectedRows?: number })?.changes ?? (insertResult as { affectedRows?: number })?.affectedRows });
      } catch (insertError: any) {
        logger.error("Error inserting product:", insertError);
        throw new AppError(
          `خطا در ذخیره محصول: ${insertError?.message || "خطای نامشخص"}`,
          500,
          "INSERT_ERROR",
          process.env.NODE_ENV === "development" ? insertError : undefined
        );
      }

      // Get the created product
      const newProduct = await getRow<any>("SELECT * FROM products WHERE id = ?", [id]);
      
      if (!newProduct) {
        logger.error("Product not found after insert:", id);
        throw new AppError("محصول ایجاد شد اما پیدا نشد", 500, "PRODUCT_NOT_FOUND");
      }

      // Parse JSON fields with normalization
      const normalizedImages = normalizeImages(newProduct.images);
      const validatedImages = normalizedImages
        .map((img: string) => {
          if (!img || typeof img !== 'string') return null;
          const trimmed = img.trim();
          if (trimmed === '') return null;
          
          // For base64 images, be more lenient
          if (trimmed.startsWith('data:image')) {
            if (trimmed.includes(';base64,') && trimmed.length > 50) {
              return trimmed; // Accept base64 images with basic validation
            }
          }
          
          // For other URLs, normalize and validate
          const normalized = normalizeImageUrl(trimmed);
          return normalized && validateImageUrl(normalized) ? normalized : null;
        })
        .filter((img: string | null): img is string => img !== null);

      const parsedProduct: Product = {
        ...newProduct,
        images: validatedImages,
        tags: normalizeTags(newProduct.tags),
        specifications: normalizeSpecifications(newProduct.specifications),
        price: Number(newProduct.price),
        originalPrice: newProduct.originalPrice ? Number(newProduct.originalPrice) : undefined,
        stockCount: Number(newProduct.stockCount),
        inStock: Boolean(newProduct.inStock),
        enabled: Boolean(newProduct.enabled),
        vinEnabled: Boolean(newProduct.vinEnabled),
        airShippingEnabled: Boolean(newProduct.airShippingEnabled),
        seaShippingEnabled: Boolean(newProduct.seaShippingEnabled),
        airShippingCost: newProduct.airShippingCost !== null && newProduct.airShippingCost !== undefined ? Number(newProduct.airShippingCost) : null,
        seaShippingCost: newProduct.seaShippingCost !== null && newProduct.seaShippingCost !== undefined ? Number(newProduct.seaShippingCost) : null,
        createdAt: newProduct.createdAt instanceof Date ? newProduct.createdAt : new Date(newProduct.createdAt),
        updatedAt: newProduct.updatedAt instanceof Date ? newProduct.updatedAt : new Date(newProduct.updatedAt),
      };

      return createSuccessResponse(parsedProduct, 201);
    }

    // This is a filter request
    const filters: ProductFilters = body.filters || body || {};
    const page = Math.max(1, parseInt(body.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(body.limit || "50", 10)));
    const offset = (page - 1) * limit;

    // Build WHERE clause for filters
    let whereClause = "WHERE enabled = TRUE";
    const params: any[] = [];

    // Apply filters
    if (filters.vin) {
      // VIN search - exact match and case-insensitive
      whereClause += " AND vinEnabled = TRUE AND UPPER(vin) = UPPER(?)";
      params.push(filters.vin.trim());
    } else if (filters.search) {
      // Search in multiple fields - case-insensitive
      // Search in: name, description, brand, category, vin, tags (JSON), specifications (JSON)
      const searchTerm = `%${filters.search.trim()}%`;
      // For MySQL: CAST JSON fields to CHAR for LIKE search
      whereClause += " AND (UPPER(name) LIKE UPPER(?) OR UPPER(description) LIKE UPPER(?) OR UPPER(brand) LIKE UPPER(?) OR UPPER(category) LIKE UPPER(?) OR UPPER(vin) LIKE UPPER(?) OR UPPER(CAST(tags AS CHAR)) LIKE UPPER(?) OR UPPER(CAST(specifications AS CHAR)) LIKE UPPER(?))";
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.minPrice !== undefined) {
      whereClause += " AND price >= ?";
      params.push(filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      whereClause += " AND price <= ?";
      params.push(filters.maxPrice);
    }

    if (filters.brands && filters.brands.length > 0) {
      whereClause += ` AND brand IN (${filters.brands.map(() => "?").join(",")})`;
      params.push(...filters.brands);
    }

    if (filters.categories && filters.categories.length > 0) {
      whereClause += ` AND category IN (${filters.categories.map(() => "?").join(",")})`;
      params.push(...filters.categories);
    }

    if (filters.vehicle) {
      whereClause += " AND vehicle = ?";
      params.push(filters.vehicle);
    }

    if (filters.inStock !== undefined) {
      whereClause += " AND inStock = ?";
      params.push(filters.inStock ? true : false);
    }

    // Get total count with filters
    const countQuery = `SELECT COUNT(*) as count FROM products ${whereClause}`;
    const countResult = await getRows<{ count: number }>(countQuery, params);
    const total = countResult[0]?.count || 0;

    // Get paginated products
    const dataQuery = `SELECT * FROM products ${whereClause} ORDER BY \`createdAt\` DESC LIMIT ? OFFSET ?`;
    const products = await getRows<any>(dataQuery, [...params, limit, offset]);

    // Parse JSON fields (PostgreSQL JSONB returns objects, not strings)
    const parsedProducts = products.map((p: any) => {
      // Normalize and validate images - be more lenient with base64
      const normalizedImages = normalizeImages(p.images);
      const validatedImages = normalizedImages
        .map((img: string) => {
          if (!img || typeof img !== 'string') return null;
          const trimmed = img.trim();
          if (trimmed === '') return null;
          
          // For base64 images, validate directly without normalization
          if (trimmed.startsWith('data:image') || trimmed.startsWith('data:')) {
            if (trimmed.includes(';base64,') && trimmed.length > 50) {
              return trimmed; // Accept base64 images with basic validation
            } else if (trimmed.startsWith('data:image') && trimmed.length > 50) {
              // Even without ;base64,, if it's data:image and long enough, accept it
              return trimmed;
            }
            return null;
          }
          
          // For other URLs (http, https, blob, relative), normalize and validate
          const normalized = normalizeImageUrl(trimmed);
          if (!normalized) return null;
          return validateImageUrl(normalized) ? normalized : null;
        })
        .filter((img: string | null): img is string => img !== null);

      return {
        ...p,
        images: validatedImages,
        tags: normalizeTags(p.tags),
        specifications: normalizeSpecifications(p.specifications),
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
        stockCount: Number(p.stockCount),
        inStock: Boolean(p.inStock),
        enabled: Boolean(p.enabled),
        featuredOrder: p.featuredOrder != null ? Number(p.featuredOrder) : null,
        vinEnabled: Boolean(p.vinEnabled),
        airShippingEnabled: Boolean(p.airShippingEnabled),
        seaShippingEnabled: Boolean(p.seaShippingEnabled),
        airShippingCost: p.airShippingCost !== null && p.airShippingCost !== undefined ? Number(p.airShippingCost) : null,
        seaShippingCost: p.seaShippingCost !== null && p.seaShippingCost !== undefined ? Number(p.seaShippingCost) : null,
        createdAt: p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt),
        updatedAt: p.updatedAt instanceof Date ? p.updatedAt : new Date(p.updatedAt),
      };
    });

    const totalPages = Math.ceil(total / limit);

    return createSuccessResponse(parsedProducts, 200, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
