/**
 * Test setup helpers for integration tests
 */

import { NextRequest } from "next/server";

/**
 * Create a mock NextRequest for testing
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = "GET", body, headers = {}, cookies = {} } = options;

  const request = new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  // Add cookies
  Object.entries(cookies).forEach(([key, value]) => {
    request.cookies.set(key, value);
  });

  // Mock json() method if body is provided
  if (body && method !== "GET") {
    (request as any).json = async () => body;
  }

  return request;
}

/**
 * Mock database functions for testing
 */
export function createMockDb() {
  const mockData: Record<string, any[]> = {
    users: [],
    products: [],
    orders: [],
    categories: [],
    carts: [],
  };

  return {
    getRow: jest.fn(async <T = any>(query: string, params?: any[]): Promise<T | null> => {
      // Simple mock implementation
      if (query.includes("FROM users")) {
        return (mockData.users[0] as T) || null;
      }
      if (query.includes("FROM products")) {
        return (mockData.products[0] as T) || null;
      }
      return null;
    }),
    getRows: jest.fn(async <T = any>(query: string, params?: any[]): Promise<T[]> => {
      if (query.includes("FROM users")) {
        return mockData.users as T[];
      }
      if (query.includes("FROM products")) {
        return mockData.products as T[];
      }
      if (query.includes("FROM orders")) {
        return mockData.orders as T[];
      }
      if (query.includes("FROM categories")) {
        return mockData.categories as T[];
      }
      return [];
    }),
    runQuery: jest.fn(async (query: string, params?: any[]) => {
      // Mock INSERT
      if (query.includes("INSERT INTO")) {
        const id = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return { insertId: id, affectedRows: 1 };
      }
      // Mock UPDATE
      if (query.includes("UPDATE")) {
        return { affectedRows: 1 };
      }
      // Mock DELETE
      if (query.includes("DELETE")) {
        return { affectedRows: 1 };
      }
      return { affectedRows: 0 };
    }),
    testConnection: jest.fn(async () => true),
    mockData,
  };
}

/**
 * Setup test environment
 */
export function setupTestEnv() {
  // Mock environment variables
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process.env as any).NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-key";
  process.env.DB_HOST = "localhost";
  process.env.DB_PORT = "3306";
  process.env.DB_NAME = "test_db";
  process.env.DB_USER = "test_user";
  process.env.DB_PASSWORD = "test_password";
}

/**
 * Cleanup test environment
 */
export function cleanupTestEnv() {
  jest.clearAllMocks();
}


