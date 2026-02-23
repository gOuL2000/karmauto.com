import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuthStore } from "@/store/auth-store";

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

describe("AuthStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    // Reset store state
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.logout();
    });
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const mockUser = {
        id: "user-1",
        name: "Test User",
        phone: "09123456789",
        role: "user",
        createdAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUser,
            message: "ثبت‌نام موفق",
          },
        }),
      });

      // Mock /api/auth/me for checkAuth
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            authenticated: true,
            user: mockUser,
          },
        }),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register("Test User", "09123456789", "password123");
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual({
          ...mockUser,
          role: "user",
        });
      });
    });

    it("should throw error on registration failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: "شماره تماس قبلاً ثبت شده است",
        }),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await expect(
          result.current.register("Test User", "09123456789", "password123")
        ).rejects.toThrow("شماره تماس قبلاً ثبت شده است");
      });
    });
  });

  describe("login", () => {
    it("should login successfully", async () => {
      const mockUser = {
        id: "user-1",
        name: "Test User",
        phone: "09123456789",
        role: "user",
        createdAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUser,
            message: "ورود موفق",
          },
        }),
      });

      // Mock /api/auth/me for checkAuth
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            authenticated: true,
            user: mockUser,
          },
        }),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const success = await result.current.login("09123456789", "password123");
        expect(success).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual({
          ...mockUser,
          role: "user",
        });
      });
    });

    it("should return false on login failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: "شماره تماس یا رمز عبور اشتباه است",
        }),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const success = await result.current.login("09123456789", "wrongpassword");
        expect(success).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("logout", () => {
    it("should clear user state on logout", async () => {
      const mockUser = {
        id: "user-1",
        name: "Test User",
        phone: "09123456789",
        role: "user",
        createdAt: new Date().toISOString(),
      };

      // Set initial authenticated state
      const { result } = renderHook(() => useAuthStore());
      act(() => {
        result.current.updateUser(mockUser);
        useAuthStore.setState({
          isAuthenticated: true,
          user: mockUser,
        });
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe("checkAuth", () => {
    it("should set authenticated state when user is logged in", async () => {
      const mockUser = {
        id: "user-1",
        name: "Test User",
        phone: "09123456789",
        role: "user",
        createdAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            authenticated: true,
            user: mockUser,
          },
        }),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuth();
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual({
          ...mockUser,
          role: "user",
        });
        expect(result.current.hasCheckedAuth).toBe(true);
      });
    });

    it("should clear state when user is not authenticated", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            authenticated: false,
            user: null,
          },
        }),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuth();
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.hasCheckedAuth).toBe(true);
      });
    });

    it("should handle network errors gracefully", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuth();
      });

      // Should not throw, but mark as checked
      await waitFor(() => {
        expect(result.current.hasCheckedAuth).toBe(true);
        expect(result.current.isCheckingAuth).toBe(false);
      });
    });
  });

  describe("updateUser", () => {
    it("should update user data", () => {
      const initialUser = {
        id: "user-1",
        name: "Test User",
        phone: "09123456789",
        role: "user",
        createdAt: new Date().toISOString(),
      };

      const { result } = renderHook(() => useAuthStore());
      
      act(() => {
        useAuthStore.setState({
          user: initialUser,
          isAuthenticated: true,
        });
        result.current.updateUser({ name: "Updated Name" });
      });

      expect(result.current.user?.name).toBe("Updated Name");
      expect(result.current.user?.phone).toBe("09123456789");
    });
  });
});


