import { GET, POST } from "@/app/api/products/route";
import { createMockRequest, setupTestEnv, cleanupTestEnv } from "../../helpers/test-setup";
import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("@/lib/db/index", () => ({
  getRows: jest.fn(),
  getRow: jest.fn(),
  runQuery: jest.fn(),
  testConnection: jest.fn(),
}));

jest.mock("@/lib/cache", () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
  },
  cacheKeys: {
    products: jest.fn((page, limit, type) => `products:${page}:${limit}:${type}`),
  },
}));

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn(() => () => null),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("GET /api/products", () => {
  const { getRows, testConnection } = require("@/lib/db/index");
  const { cache } = require("@/lib/cache");

  beforeEach(() => {
    setupTestEnv();
    jest.clearAllMocks();
    testConnection.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it("should return products with pagination", async () => {
    const mockProducts = [
      {
        id: "product-1",
        name: "Test Product 1",
        price: 100000,
        enabled: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "product-2",
        name: "Test Product 2",
        price: 200000,
        enabled: true,
        createdAt: new Date().toISOString(),
      },
    ];

    getRows
      .mockResolvedValueOnce([{ count: 2 }]) // Count query
      .mockResolvedValueOnce(mockProducts); // Products query

    cache.get.mockReturnValue(null);

    const request = createMockRequest("http://localhost:3000/api/products?page=1&limit=10");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.pagination).toBeDefined();
    expect(data.pagination.total).toBe(2);
  });

  it("should return cached products when available", async () => {
    const cachedData = {
      products: [{ id: "product-1", name: "Cached Product" }],
      total: 1,
    };

    cache.get.mockReturnValue(cachedData);

    const request = createMockRequest("http://localhost:3000/api/products");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(cachedData.products);
    expect(getRows).not.toHaveBeenCalled();
  });

  it("should handle database connection errors gracefully", async () => {
    testConnection.mockResolvedValue(false);

    const request = createMockRequest("http://localhost:3000/api/products");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);
    expect(data.pagination.total).toBe(0);
  });

  it("should filter enabled products by default", async () => {
    getRows
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([
        {
          id: "product-1",
          name: "Enabled Product",
          enabled: true,
        },
      ]);

    cache.get.mockReturnValue(null);

    const request = createMockRequest("http://localhost:3000/api/products");

    await GET(request);

    const productsQuery = getRows.mock.calls.find((call: [string, unknown[]]) =>
      call[0].includes("SELECT * FROM products")
    );
    expect(productsQuery?.[0]).toContain("enabled = TRUE");
  });

  it("should include all products when all=true", async () => {
    getRows
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([
        { id: "product-1", enabled: true },
        { id: "product-2", enabled: false },
      ]);

    cache.get.mockReturnValue(null);

    const request = createMockRequest("http://localhost:3000/api/products?all=true");

    await GET(request);

    const productsQuery = getRows.mock.calls.find((call: [string, unknown[]]) =>
      call[0].includes("SELECT * FROM products")
    );
    expect(productsQuery?.[0]).not.toContain("WHERE enabled");
  });
});

describe("POST /api/products", () => {
  const { runQuery, getRow } = require("@/lib/db/index");

  beforeEach(() => {
    setupTestEnv();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it("should create a new product", async () => {
    const newProduct = {
      name: "New Product",
      description: "Product Description",
      price: 100000,
      brand: "Test Brand",
      category: "Test Category",
      images: ["https://example.com/image.jpg"],
      enabled: true,
      inStock: true,
      stockCount: 10,
    };

    runQuery.mockResolvedValueOnce({ insertId: "product-123", affectedRows: 1 });
    getRow.mockResolvedValueOnce({
      id: "product-123",
      ...newProduct,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const request = createMockRequest("http://localhost:3000/api/products", {
      method: "POST",
      body: newProduct,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe(newProduct.name);
  });

  it("should reject product with missing name", async () => {
    const invalidProduct = {
      description: "Product Description",
      price: 100000,
    };

    const request = createMockRequest("http://localhost:3000/api/products", {
      method: "POST",
      body: invalidProduct,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it("should reject product with invalid price", async () => {
    const invalidProduct = {
      name: "Test Product",
      description: "Product Description",
      price: -100,
      brand: "Test Brand",
      category: "Test Category",
      images: [],
    };

    const request = createMockRequest("http://localhost:3000/api/products", {
      method: "POST",
      body: invalidProduct,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});


