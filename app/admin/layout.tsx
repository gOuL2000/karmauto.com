"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminAlerts } from "@/components/admin/admin-alerts";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import { AdminChatPolling } from "@/components/admin/admin-chat-polling";
import { NotificationCenter } from "@/components/notifications";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import "./admin.css";

export type AdminSessionUser = {
  id: string;
  name: string;
  phone: string;
  role: string;
  createdAt?: string;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState<AdminSessionUser | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const adminCheckInFlight = useRef(false);

  // نشست ادمین فقط با کوکی سشن (با بستن تب پاک می‌شود). تا وقتی پنل باز است هر ۳ دقیقه تمدید.
  useEffect(() => {
    if (pathname === "/admin/login" || !adminUser) return;
    const keepAlive = async () => {
      try {
        await fetch("/api/auth/keep-alive", {
          method: "GET",
          credentials: "include",
        });
      } catch {
        // ignore
      }
    };
    const t = setTimeout(keepAlive, 30_000);
    const id = setInterval(keepAlive, 3 * 60 * 1000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, [pathname, adminUser]);

  // بررسی دسترسی ادمین فقط با کوکی سشن و /api/admin/me (هیچ توکنی در کلاینت ذخیره نمی‌شود)
  useEffect(() => {
    if (pathname === "/admin/login") {
      setIsChecking(false);
      return;
    }

    if (adminCheckInFlight.current) return;
    adminCheckInFlight.current = true;
    let cancelled = false;

    fetch("/api/admin/me", {
      method: "GET",
      credentials: "include",
    })
      .then((r) => {
        if (cancelled) return null;
        if (r.status === 401) return Promise.resolve({ _unauthorized: true });
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (json && (json as any)._unauthorized) {
          try {
            sessionStorage.removeItem("adminUserId");
            sessionStorage.removeItem("adminToken");
          } catch {
            // ignore
          }
          router.push("/admin/login");
          return;
        }
        if (json?.success && json?.data?.user) {
          const u = json.data.user;
          setAdminUser({
            id: u.id,
            name: u.name,
            phone: u.phone ?? "",
            role: u.role ?? "admin",
            createdAt: u.createdAt,
          });
          try {
            sessionStorage.setItem("adminUserId", u.id);
            if (typeof window !== "undefined") {
              // بعد از رندر داشبورد فرستاده شود تا listener ثبت شده باشد
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent("admin-ready", { detail: { userId: u.id } }));
              }, 0);
            }
          } catch {
            // ignore
          }
        } else {
          try {
            sessionStorage.removeItem("adminUserId");
            sessionStorage.removeItem("adminToken");
          } catch {
            // ignore
          }
          router.push("/admin/login");
        }
      })
      .catch(() => {
        if (!cancelled) {
          try {
            sessionStorage.removeItem("adminUserId");
            sessionStorage.removeItem("adminToken");
          } catch {
            // ignore
          }
          router.push("/admin/login");
        }
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
        adminCheckInFlight.current = false;
      });

    return () => {
      cancelled = true;
      adminCheckInFlight.current = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    // Disable body and html scroll when in admin panel
    // Also prevent horizontal overflow
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyHeight = document.body.style.height;
    const originalBodyOverflowX = document.body.style.overflowX;
    const originalBodyMaxWidth = document.body.style.maxWidth;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlHeight = document.documentElement.style.height;
    const originalHtmlOverflowX = document.documentElement.style.overflowX;
    const originalHtmlMaxWidth = document.documentElement.style.maxWidth;
    
    // Add admin panel class
    document.body.classList.add('admin-panel-active');
    document.documentElement.classList.add('admin-panel-active');
    
    // Set overflow and dimensions
    document.body.style.overflow = "hidden";
    document.body.style.overflowX = "hidden";
    document.body.style.height = "100vh";
    document.body.style.maxWidth = "100%";
    document.body.style.width = "100%";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overflowX = "hidden";
    document.documentElement.style.height = "100vh";
    document.documentElement.style.maxWidth = "100%";
    document.documentElement.style.width = "100%";
    
    return () => {
      // Re-enable scroll when leaving admin panel
      document.body.classList.remove('admin-panel-active');
      document.documentElement.classList.remove('admin-panel-active');
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.height = originalBodyHeight;
      document.body.style.overflowX = originalBodyOverflowX;
      document.body.style.maxWidth = originalBodyMaxWidth;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.height = originalHtmlHeight;
      document.documentElement.style.overflowX = originalHtmlOverflowX;
      document.documentElement.style.maxWidth = originalHtmlMaxWidth;
    };
  }, []);

  // Show loading while checking auth
  if (isChecking && pathname !== "/admin/login") {
    return (
      <div className="h-screen w-full flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">در حال بررسی دسترسی...</p>
        </div>
      </div>
    );
  }

  // Don't render layout for login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Full screen layout for chat page
  if (pathname === "/admin/chat") {
    return (
      <ErrorBoundary>
        {children}
        <Toaster />
        <AdminChatPolling />
        <NotificationCenter position="top-right" maxNotifications={5} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen w-full max-w-full flex overflow-hidden">
        <AdminSidebar mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 max-w-full">
          <AdminHeader adminUser={adminUser} onOpenMobileMenu={() => setMobileMenuOpen(true)} />
          <AdminAlerts />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 lg:p-6 max-w-full">
            <div className="max-w-full overflow-x-hidden">
              {children}
            </div>
          </main>
        </div>
        <Toaster />
        <AdminChatPolling />
        <NotificationCenter position="top-right" maxNotifications={5} />
      </div>
    </ErrorBoundary>
  );
}
