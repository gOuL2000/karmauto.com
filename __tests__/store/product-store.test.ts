import { renderHook, act } from "@testing-library/react";
import { useProductStore } from "@/store/product-store";
import type { Product } from "@/types/product";

// Mock fetch
global.fetch = jest.fn();

// Mock logger
jest.mock("@/lib/logger-client", () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

describe("ProductStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { result } = renderHook(() => useProductStore());
    act(() => {
      result.current.setProducts([]);
      result.current.clearFilters();
    });
  });

  const mockProduct: Product = {
    id: "product-1",
    name: "Test Product",
    description: "Test Description",
    price: 100000,
    brand: "Test Brand",
    category: "Test Category",
    images: ["https://example.com/image.jpg"],
    tags: [],
    specifications: {},
    enabled: true,
    inStock: true,
    stockCount: 10,
    vinEnabled: false,
    airShippingEnabled: false,
    seaShippingEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("setProducts", () => {
    it("should set products", () => {
      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.setProducts([mockProduct]);
      });

      expect(result.current.products).toHaveLength(1);
      expect(result.current.products[0]).toEqual(mockProduct);
    });
  });

  describe("addProduct", () => {
    it("should add a new product", () => {
      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.addProduct(mockProduct);
      });

      expect(result.current.products).toHaveLength(1);
      expect(result.current.products[0]).toEqual(mockProduct);
    });

    it("should update existing product", () => {
      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.addProduct(mockProduct);
        result.current.addProduct({ ...mockProduct, name: "Updated Name" });
      });

      expect(result.current.products).toHaveLength(1);
      expect(result.current.products[0].name).toBe("Updated Name");
    });
  });

  describe("updateProduct", () => {
    it("should update existing product", () => {
      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.addProduct(mockProduct);
        result.current.updateProduct({ ...mockProduct, name: "Updated Name" });
      });

      expect(result.current.products[0].name).toBe("Updated Name");
    });
  });

  describe("removeProduct", () => {
    it("should remove product", () => {
      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.addProduct(mockProduct);
        result.current.addProduct({ ...mockProduct, id: "product-2" });
        result.current.removeProduct("product-1");
      });

      expect(result.current.products).toHaveLength(1);
      expect(result.current.products[0].id).toBe("product-2");
    });
  });

  describe("getProduct", () => {
    it("should get product by id", () => {
      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.addProduct(mockProduct);
      });

      const product = result.current.getProduct("product-1");
      expect(product).toEqual(mockProduct);
    });

    it("should return undefined for non-existent product", () => {
      const { result } = renderHook(() => useProductStore());

      const product = result.current.getProduct("non-existent");
      expect(product).toBeUndefined();
    });
  });

  describe("getEnabledProducts", () => {
    it("should return only enabled products", () => {
      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.addProduct(mockProduct);
        result.current.addProduct({ ...mockProduct, id: "product-2", enabled: false });
      });

      const enabledProducts = result.current.getEnabledProducts();
      expect(enabledProducts).toHaveLength(1);
      expect(enabledProducts[0].id).toBe("product-1");
    });
  });

  describe("getFilteredProducts", () => {
    it("should filter by search", () => {
      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.addProduct(mockProduct);
        result.current.addProduct({ ...mockProduct, id: "product-2", name: "Another Product" });
        result.current.setFilters({ search: "Test Product" }); // More specific search
      });

      const filtered = result.current.getFilteredProducts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Test Product");
    });

    it("should filter by price range", () => {
      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.addProduct(mockProduct);
        result.current.addProduct({ ...mockProduct, id: "product-2", price: 200000 });
        result.current.setFilters({ minPrice: 150000, maxPrice: 250000 });
      });

      const filtered = result.current.getFilteredProducts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("product-2");
    });

    it("should filter by brand", () => {
      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.addProduct(mockProduct);
        result.current.addProduct({ ...mockProduct, id: "product-2", brand: "Another Brand" });
        result.current.setFilters({ brands: ["Test Brand"] });
      });

      const filtered = result.current.getFilteredProducts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].brand).toBe("Test Brand");
    });

    it("should filter by category", () => {
      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.addProduct(mockProduct);
        result.current.addProduct({ ...mockProduct, id: "product-2", category: "Another Category" });
        result.current.setFilters({ categories: ["Test Category"] });
      });

      const filtered = result.current.getFilteredProducts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe("Test Category");
    });

    it("should filter by stock status", () => {
      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.addProduct(mockProduct);
        result.current.addProduct({ ...mockProduct, id: "product-2", inStock: false });
        result.current.setFilters({ inStock: true });
      });

      const filtered = result.current.getFilteredProducts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].inStock).toBe(true);
    });
  });

  describe("setFilters", () => {
    it("should set filters", () => {
      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.setFilters({ search: "test", minPrice: 10000 });
      });

      expect(result.current.filters.search).toBe("test");
      expect(result.current.filters.minPrice).toBe(10000);
    });
  });

  describe("clearFilters", () => {
    it("should clear all filters", () => {
      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.setFilters({ search: "test", minPrice: 10000 });
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({});
    });
  });

  describe("createProduct", () => {
    it("should create product via API", async () => {
      const newProduct = { ...mockProduct, id: "new-product" };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: newProduct,
        }),
      });

      const { result } = renderHook(() => useProductStore());

      await act(async () => {
        const created = await result.current.createProduct({
          name: "New Product",
          description: "Description",
          price: 100000,
          brand: "Brand",
          category: "Category",
          images: [],
          tags: [],
          specifications: {},
          enabled: true,
          inStock: true,
          stockCount: 10,
          vinEnabled: false,
          airShippingEnabled: false,
          seaShippingEnabled: false,
        });
        expect(created).toEqual(newProduct);
      });

      expect(result.current.products).toHaveLength(1);
    });
  });

  describe("updateProductInDB", () => {
    it("should update product via API", async () => {
      const updatedProduct = { ...mockProduct, name: "Updated Name" };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: updatedProduct,
        }),
      });

      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.addProduct(mockProduct);
      });

      await act(async () => {
        const updated = await result.current.updateProductInDB("product-1", {
          name: "Updated Name",
        });
        expect(updated).toEqual(updatedProduct);
      });

      expect(result.current.products[0].name).toBe("Updated Name");
    });
  });

  describe("deleteProductFromDB", () => {
    it("should delete product via API", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useProductStore());

      act(() => {
        result.current.addProduct(mockProduct);
      });

      await act(async () => {
        await result.current.deleteProductFromDB("product-1");
      });

      expect(result.current.products).toHaveLength(0);
    });
  });
});

