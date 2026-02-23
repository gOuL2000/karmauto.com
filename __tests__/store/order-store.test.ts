import { renderHook, act, waitFor } from "@testing-library/react";
import { useOrderStore } from "@/store/order-store";
import type { Order } from "@/types/order";

// Mock fetch
global.fetch = jest.fn();

// Mock logger
jest.mock("@/lib/logger-client", () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock fetchWithAuth
jest.mock("@/lib/api/fetch-with-auth", () => ({
  fetchWithAuth: jest.fn((url, options) => {
    return global.fetch(url, options);
  }),
}));

describe("OrderStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { result } = renderHook(() => useOrderStore());
    act(() => {
      result.current.setOrders([]);
      result.current.clearFilters();
    });
  });

  const mockOrder: Order = {
    id: "order-1",
    orderNumber: "ORD-001",
    userId: "user-1",
    customerName: "Test User",
    customerPhone: "09123456789",
    customerEmail: "test@example.com",
    items: [
      {
        id: "product-1",
        productId: "product-1",
        name: "Test Product",
        price: 100000,
        quantity: 2,
        image: "",
      },
    ],
    total: 200000,
    shippingCost: 50000,
    shippingMethod: "air",
    shippingAddress: {
      city: "Tehran",
      address: "Test Address",
    },
    status: "pending",
    paymentStatus: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("setOrders", () => {
    it("should set orders", () => {
      const { result } = renderHook(() => useOrderStore());

      act(() => {
        result.current.setOrders([mockOrder]);
      });

      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0]).toEqual(mockOrder);
    });
  });

  describe("addOrder", () => {
    it("should add a new order", () => {
      const { result } = renderHook(() => useOrderStore());

      act(() => {
        result.current.addOrder(mockOrder);
      });

      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0]).toEqual(mockOrder);
    });

    it("should update existing order", () => {
      const { result } = renderHook(() => useOrderStore());

      act(() => {
        result.current.addOrder(mockOrder);
        result.current.addOrder({ ...mockOrder, status: "processing" });
      });

      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0].status).toBe("processing");
    });
  });

  describe("updateOrder", () => {
    it("should update order", () => {
      const { result } = renderHook(() => useOrderStore());

      act(() => {
        result.current.addOrder(mockOrder);
        result.current.updateOrder("order-1", { status: "processing" });
      });

      expect(result.current.orders[0].status).toBe("processing");
    });
  });

  describe("updateOrderStatus", () => {
    it("should update order status", () => {
      const { result } = renderHook(() => useOrderStore());

      act(() => {
        result.current.addOrder(mockOrder);
        result.current.updateOrderStatus("order-1", "processing");
      });

      expect(result.current.orders[0].status).toBe("processing");
    });
  });

  describe("updatePaymentStatus", () => {
    it("should update payment status", () => {
      const { result } = renderHook(() => useOrderStore());

      act(() => {
        result.current.addOrder(mockOrder);
        result.current.updatePaymentStatus("order-1", "paid");
      });

      expect(result.current.orders[0].paymentStatus).toBe("paid");
    });
  });

  describe("deleteOrder", () => {
    it("should delete order", () => {
      const { result } = renderHook(() => useOrderStore());

      act(() => {
        result.current.addOrder(mockOrder);
        result.current.addOrder({ ...mockOrder, id: "order-2" });
        result.current.deleteOrder("order-1");
      });

      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0].id).toBe("order-2");
    });
  });

  describe("getOrder", () => {
    it("should get order by id", () => {
      const { result } = renderHook(() => useOrderStore());

      act(() => {
        result.current.addOrder(mockOrder);
      });

      const order = result.current.getOrder("order-1");
      expect(order).toEqual(mockOrder);
    });
  });

  describe("loadOrdersFromDB", () => {
    it("should load orders from database", async () => {
      const mockOrders = [mockOrder];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockOrders,
        }),
      });

      const { result } = renderHook(() => useOrderStore());

      await act(async () => {
        await result.current.loadOrdersFromDB();
      });

      await waitFor(() => {
        expect(result.current.orders).toHaveLength(1);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle API errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      const { result } = renderHook(() => useOrderStore());

      await act(async () => {
        await result.current.loadOrdersFromDB();
      });

      await waitFor(() => {
        expect(result.current.orders).toHaveLength(0);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle network errors", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useOrderStore());

      await act(async () => {
        await result.current.loadOrdersFromDB();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});


