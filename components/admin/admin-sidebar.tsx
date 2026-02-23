"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  X,
  Truck,
  FolderTree,
  Car,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const menuItems = [
  {
    title: "داشبورد",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "محصولات",
    href: "/admin/products",
    icon: Package,
  },
  {
    title: "سفارشات",
    href: "/admin/orders",
    icon: ShoppingCart,
    disabled: false,
  },
  {
    title: "کاربران",
    href: "/admin/users",
    icon: Users,
    disabled: false,
  },
  {
    title: "تامین‌کنندگان",
    href: "/admin/suppliers",
    icon: Truck,
    disabled: false,
  },
  {
    title: "دسته‌بندی‌ها",
    href: "/admin/categories",
    icon: FolderTree,
    disabled: false,
  },
  {
    title: "خودروها",
    href: "/admin/vehicles",
    icon: Car,
    disabled: false,
  },
  {
    title: "چت",
    href: "/admin/chat",
    icon: MessageCircle,
    disabled: false,
  },
  {
    title: "تنظیمات",
    href: "/admin/settings",
    icon: Settings,
    disabled: false,
  },
];

interface AdminSidebarProps {
  className?: string;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function AdminSidebar({ className, mobileOpen = false, onMobileOpenChange }: AdminSidebarProps) {
  const pathname = usePathname();
  const setMobileOpen = onMobileOpenChange ?? (() => {});

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <nav className="p-3 sm:p-4 space-y-0.5 sm:space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
            const isDisabled = item.disabled;

            return (
              <Link
                key={item.href}
                href={isDisabled ? "#" : item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 min-h-[44px] sm:min-h-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-[-2px]",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span>{item.title}</span>
                {isDisabled && (
                  <span className="mr-auto text-xs opacity-60">(به زودی)</span>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-3 sm:p-4 border-t border-border/30">
        <Link href="/">
          <Button variant="outline" className="w-full justify-start gap-2 h-10 sm:h-11 text-xs sm:text-sm">
            <X className="h-4 w-4" />
            بازگشت به سایت
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col w-64 border-l border-border/30 bg-background/95 backdrop-blur",
          className
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-[min(16rem,85vw)] sm:w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>منوی مدیریت</SheetTitle>
          </SheetHeader>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}

