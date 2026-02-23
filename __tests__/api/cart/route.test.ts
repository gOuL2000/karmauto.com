import { GET, POST } from "@/app/api/cart/route";
import { createMockRequest, setupTestEnv, cleanupTestEnv } from "../../helpers/test-setup";

// Mock dependencies
jest.mock("@/lib/db/index", () => ({
  getRow: jest.fn(),
  getRows: jest.fn(),
  runQuery: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("GET /api/cart", () => {
  const { getRow } = require("@/lib/db/index");

  beforeEach(() => {
    setupTestEnv();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it("should return cart for valid session", async () => {
    const mockCart = {
      id: "cart-1",
      sessionId: "session-123",
      items: [
        {
          id: "product-1",
          name: "Test Product",
          price: 100000,
          quantity: 2,
          image: "",
        },
      ],
      shippingMethod: "air",
    };

    getRow.mockResolvedValueOnce(mockCart);

    const request = createMockRequest("http://localhost:3000/api/cart", {
      headers: {
        "x-cart-session-id": "session-123",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.items).toHaveLength(1);
  });

  it("should return empty cart for new session", async () => {
    getRow.mockResolvedValueOnce(null);

    const request = createMockRequest("http://localhost:3000/api/cart", {
      headers: {
        "x-cart-session-id": "new-session",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.items).toEqual([]);
  });
});

describe("POST /api/cart", () => {
  const { getRow, runQuery } = require("@/lib/db/index");

  beforeEach(() => {
    setupTestEnv();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it("should create or update cart", async () => {
    const cartData = {
      sessionId: "session-123",
      items: [
        {
          id: "product-1",
          name: "Test Product",
          price: 100000,
          quantity: 2,
          image: "",
        },
      ],
      shippingMethod: "air",
    };

    getRow.mockResolvedValueOnce(null); // Cart doesn't exist
    runQuery.mockResolvedValueOnce({ insertId: "cart-1", affectedRows: 1 });

    const request = createMockRequest("http://localhost:3000/api/cart", {
      method: "POST",
      body: cartData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should update existing cart", async () => {
    const existingCart = {
      id: "cart-1",
      sessionId: "session-123",
      items: [],
    };

    const cartData = {
      sessionId: "session-123",
      items: [
        {
          id: "product-1",
          name: "Test Product",
          price: 100000,
          quantity: 1,
          image: "",
        },
      ],
      shippingMethod: "air",
    };

    getRow.mockResolvedValueOnce(existingCart);
    runQuery.mockResolvedValueOnce({ affectedRows: 1 });

    const request = createMockRequest("http://localhost:3000/api/cart", {
      method: "POST",
      body: cartData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});


