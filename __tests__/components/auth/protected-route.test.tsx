/// <reference types="@testing-library/jest-dom" />
import { render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuthStore } from "@/store/auth-store";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock auth store
jest.mock("@/store/auth-store");

describe("ProtectedRoute", () => {
  const mockRouter = {
    replace: jest.fn(),
    push: jest.fn(),
    refresh: jest.fn(),
  };

  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
  });

  describe("when auth is not required", () => {
    it("should render children immediately", () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        checkAuth: jest.fn(),
        isCheckingAuth: false,
        hasCheckedAuth: true,
      } as any);

      render(
        <ProtectedRoute requireAuth={false}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  describe("when auth is required", () => {
    it("should show loading while checking auth", () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        checkAuth: jest.fn(),
        isCheckingAuth: true,
        hasCheckedAuth: false,
      } as any);

      render(
        <ProtectedRoute requireAuth={true}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText("در حال بررسی...")).toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("should call checkAuth on mount if not checked", () => {
      const mockCheckAuth = jest.fn();
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        checkAuth: mockCheckAuth,
        isCheckingAuth: false,
        hasCheckedAuth: false,
      } as any);

      render(
        <ProtectedRoute requireAuth={true}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(mockCheckAuth).toHaveBeenCalled();
    });

    it("should redirect to login when not authenticated", async () => {
      const mockCheckAuth = jest.fn();
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        checkAuth: mockCheckAuth,
        isCheckingAuth: false,
        hasCheckedAuth: true,
      } as any);

      // Mock window.location
      Object.defineProperty(window, "location", {
        value: { pathname: "/profile" },
        writable: true,
      });

      render(
        <ProtectedRoute requireAuth={true}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          "/auth?redirect=" + encodeURIComponent("/profile")
        );
      });
    });

    it("should render children when authenticated", () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: "user-1",
          name: "Test User",
          phone: "09123456789",
          role: "user",
          createdAt: new Date(),
        },
        checkAuth: jest.fn(),
        isCheckingAuth: false,
        hasCheckedAuth: true,
      } as any);

      render(
        <ProtectedRoute requireAuth={true}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });

    it("should redirect non-admin users when admin access is required", async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: "user-1",
          name: "Test User",
          phone: "09123456789",
          role: "user",
          createdAt: new Date(),
        },
        checkAuth: jest.fn(),
        isCheckingAuth: false,
        hasCheckedAuth: true,
      } as any);

      render(
        <ProtectedRoute requireAuth={true} requireAdmin={true}>
          <div>Admin Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith("/");
      });
    });

    it("should render children for admin users", () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: "admin-1",
          name: "Admin User",
          phone: "09123456789",
          role: "admin",
          createdAt: new Date(),
        },
        checkAuth: jest.fn(),
        isCheckingAuth: false,
        hasCheckedAuth: true,
      } as any);

      render(
        <ProtectedRoute requireAuth={true} requireAdmin={true}>
          <div>Admin Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText("Admin Content")).toBeInTheDocument();
    });

    it("should show access denied message for non-admin users", () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: "user-1",
          name: "Test User",
          phone: "09123456789",
          role: "user",
          createdAt: new Date(),
        },
        checkAuth: jest.fn(),
        isCheckingAuth: false,
        hasCheckedAuth: true,
      } as any);

      render(
        <ProtectedRoute requireAuth={true} requireAdmin={true}>
          <div>Admin Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText("شما دسترسی به این بخش را ندارید")).toBeInTheDocument();
    });
  });
});


