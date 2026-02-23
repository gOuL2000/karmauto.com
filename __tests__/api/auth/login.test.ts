import { POST } from "@/app/api/auth/login/route";
import { createMockRequest, createMockDb, setupTestEnv, cleanupTestEnv } from "../../helpers/test-setup";
import bcrypt from "bcryptjs";

// Mock dependencies
jest.mock("@/lib/db/index", () => ({
  getRow: jest.fn(),
  testConnection: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  createSession: jest.fn(async () => "mock-session-token"),
  setSessionCookie: jest.fn(),
  ensureAuthTables: jest.fn(async () => {}),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("POST /api/auth/login", () => {
  const { getRow } = require("@/lib/db/index");
  const { createSession, setSessionCookie, ensureAuthTables } = require("@/lib/auth/session");

  beforeEach(() => {
    setupTestEnv();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it("should login successfully with valid credentials", async () => {
    const hashedPassword = await bcrypt.hash("password123", 10);
    const mockUser = {
      id: "user-1",
      name: "Test User",
      phone: "09123456789",
      password: hashedPassword,
      role: "user",
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    getRow.mockResolvedValueOnce(mockUser);
    createSession.mockResolvedValueOnce("session-token-123");

    const request = createMockRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: {
        phone: "09123456789",
        password: "password123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.user.phone).toBe("09123456789");
    expect(setSessionCookie).toHaveBeenCalled();
  });

  it("should reject invalid phone number", async () => {
    const request = createMockRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: {
        phone: "1234567890",
        password: "password123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it("should reject empty password", async () => {
    const request = createMockRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: {
        phone: "09123456789",
        password: "",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it("should reject non-existent user", async () => {
    getRow.mockResolvedValueOnce(null);

    const request = createMockRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: {
        phone: "09123456789",
        password: "password123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain("اشتباه");
  });

  it("should reject wrong password", async () => {
    const hashedPassword = await bcrypt.hash("correctpassword", 10);
    const mockUser = {
      id: "user-1",
      name: "Test User",
      phone: "09123456789",
      password: hashedPassword,
      role: "user",
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    getRow.mockResolvedValueOnce(mockUser);

    const request = createMockRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: {
        phone: "09123456789",
        password: "wrongpassword",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain("اشتباه");
  });

  it("should reject disabled user", async () => {
    const hashedPassword = await bcrypt.hash("password123", 10);
    const mockUser = {
      id: "user-1",
      name: "Test User",
      phone: "09123456789",
      password: hashedPassword,
      role: "user",
      enabled: false,
      createdAt: new Date().toISOString(),
    };

    getRow.mockResolvedValueOnce(mockUser);

    const request = createMockRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: {
        phone: "09123456789",
        password: "password123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain("غیرفعال");
  });

  it("should handle invalid JSON", async () => {
    const { NextRequest } = await import("next/server");
    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Mock json() to throw
    (request as any).json = jest.fn().mockRejectedValueOnce(new Error("Invalid JSON"));

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it("should normalize phone number formats", async () => {
    const hashedPassword = await bcrypt.hash("password123", 10);
    const mockUser = {
      id: "user-1",
      name: "Test User",
      phone: "09123456789",
      password: hashedPassword,
      role: "user",
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    getRow.mockResolvedValueOnce(mockUser);
    createSession.mockResolvedValueOnce("session-token-123");

    // Test with different phone formats
    const formats = ["09123456789", "9123456789", "+989123456789", "00989123456789"];

    for (const phone of formats) {
      getRow.mockResolvedValueOnce(mockUser);
      const request = createMockRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: {
          phone,
          password: "password123",
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    }
  });
});

