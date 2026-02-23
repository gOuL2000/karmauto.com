import { renderHook, act, waitFor } from "@testing-library/react";
import { useCartStore, CartItem } from "@/store/cart-store";

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("CartStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    // Reset store state
    const { result } = renderHook(() => useCartStore());
    act(() => {
      result.current.clearCart();
    });
  });

  describe("addItem", () => {
    it("should add a new item to cart", () => {
      const { result } = renderHook(() => useCartStore());

      const newItem: Omit<CartItem, "quantity"> = {
        id: "product-1",
        name: "Test Product",
        price: 100000,
        image: "https://example.com/image.jpg",
      };

      act(() => {
        result.current.addItem(newItem);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toEqual({
        ...newItem,
        quantity: 1,
      });
    });

    it("should increment quantity if item already exists", () => {
      const { result } = renderHook(() => useCartStore());

      const item: Omit<CartItem, "quantity"> = {
        id: "product-1",
        name: "Test Product",
        price: 100000,
        image: "https://example.com/image.jpg",
      };

      act(() => {
        result.current.addItem(item);
        result.current.addItem(item);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(2);
    });

    it("should respect cart limit of 100 items", () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        // Add 100 items
        for (let i = 0; i < 100; i++) {
          result.current.addItem({
            id: `product-${i}`,
            name: `Product ${i}`,
            price: 10000,
            image: "",
          });
        }
      });

      expect(result.current.items).toHaveLength(100);

      // Try to add one more
      act(() => {
        result.current.addItem({
          id: "product-101",
          name: "Product 101",
          price: 10000,
          image: "",
        });
      });

      // Should still be 100
      expect(result.current.items).toHaveLength(100);
    });
  });

  describe("updateQuantity", () => {
    it("should update item quantity", () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({
          id: "product-1",
          name: "Test Product",
          price: 100000,
          image: "",
        });
        result.current.updateQuantity("product-1", 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
    });

    it("should remove item when quantity is 0", () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({
          id: "product-1",
          name: "Test Product",
          price: 100000,
          image: "",
        });
        result.current.updateQuantity("product-1", 0);
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe("removeItem", () => {
    it("should remove item from cart", () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({
          id: "product-1",
          name: "Test Product",
          price: 100000,
          image: "",
        });
        result.current.addItem({
          id: "product-2",
          name: "Test Product 2",
          price: 200000,
          image: "",
        });
        result.current.removeItem("product-1");
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe("product-2");
    });
  });

  describe("clearCart", () => {
    it("should clear all items from cart", () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({
          id: "product-1",
          name: "Test Product",
          price: 100000,
          image: "",
        });
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.shippingMethod).toBeNull();
    });
  });

  describe("getTotal", () => {
    it("should calculate total correctly", () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({
          id: "product-1",
          name: "Test Product",
          price: 100000,
          image: "",
          quantity: 2,
        });
        result.current.addItem({
          id: "product-2",
          name: "Test Product 2",
          price: 200000,
          image: "",
          quantity: 3,
        });
      });

      expect(result.current.getTotal()).toBe(100000 * 2 + 200000 * 3);
    });
  });

  describe("getItemCount", () => {
    it("should return total item count", () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({
          id: "product-1",
          name: "Test Product",
          price: 100000,
          image: "",
          quantity: 2,
        });
        result.current.addItem({
          id: "product-2",
          name: "Test Product 2",
          price: 200000,
          image: "",
          quantity: 3,
        });
      });

      expect(result.current.getItemCount()).toBe(5);
    });
  });

  describe("setShippingMethod", () => {
    it("should set shipping method", () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setShippingMethod("air");
      });

      expect(result.current.shippingMethod).toBe("air");

      act(() => {
        result.current.setShippingMethod("sea");
      });

      expect(result.current.shippingMethod).toBe("sea");
    });
  });

  describe("syncToDatabase", () => {
    it("should sync cart to database", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.initializeSession();
        result.current.addItem({
          id: "product-1",
          name: "Test Product",
          price: 100000,
          image: "",
        });
      });

      await act(async () => {
        await result.current.syncToDatabase();
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: expect.stringContaining("product-1"),
      });
    });
  });

  describe("loadFromDatabase", () => {
    it("should load cart from database", async () => {
      const mockCart = {
        items: [
          {
            id: "product-1",
            name: "Test Product",
            price: 100000,
            image: "",
            quantity: 2,
          },
        ],
        shippingMethod: "air",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockCart,
        }),
      });

      const { result } = renderHook(() => useCartStore());

      await act(async () => {
        await result.current.loadFromDatabase();
      });

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].id).toBe("product-1");
        expect(result.current.shippingMethod).toBe("air");
      });
    });
  });
});


