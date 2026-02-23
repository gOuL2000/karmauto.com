"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  AlertTriangle,
  DollarSign,
  Box,
  ShoppingCart,
  Users,
  Clock,
  CheckCircle,
  Info,
} from "lucide-react";
import { useAdminStore } from "@/store/admin-store";
import { useProductStore } from "@/store/product-store";
import { useOrderStore } from "@/store/order-store";
import { useUserStore } from "@/store/user-store";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";

export type RevenueOrderFilter = "paid" | "delivered" | "paid_or_delivered";

export function DashboardStats() {
  const { stats, refreshStats, isLoading } = useAdminStore();
  const products = useProductStore((state) => state.products);
  const orders = useOrderStore((state) => state.orders);
  const users = useUserStore((state) => state.users);
  const [revenueDialogOpen, setRevenueDialogOpen] = useState(false);
  const [revenueIncludeShipping, setRevenueIncludeShipping] = useState(true);
  const [revenueOrderFilter, setRevenueOrderFilter] = useState<RevenueOrderFilter>("paid");

  useEffect(() => {
    refreshStats();
  }, [products, orders, users, refreshStats]);

  // All hooks must run unconditionally (before any early return)
  const ordersForRevenue = useMemo(() => {
    switch (revenueOrderFilter) {
      case "paid":
        return orders.filter((o) => o.paymentStatus === "paid");
      case "delivered":
        return orders.filter((o) => o.status === "delivered");
      case "paid_or_delivered":
        return orders.filter(
          (o) => o.paymentStatus === "paid" || o.status === "delivered"
        );
      default:
        return orders.filter((o) => o.paymentStatus === "paid");
    }
  }, [orders, revenueOrderFilter]);

  const totalRevenue = useMemo(
    () =>
      ordersForRevenue.reduce(
        (sum, o) => sum + o.total + (revenueIncludeShipping ? o.shippingCost : 0),
        0
      ),
    [ordersForRevenue, revenueIncludeShipping]
  );

  const revenueExplanation = useMemo(() => {
    const orderLabel =
      revenueOrderFilter === "paid"
        ? "فقط سفارش‌های پرداخت‌شده"
        : revenueOrderFilter === "delivered"
          ? "فقط سفارش‌های تحویل‌شده"
          : "سفارش‌های پرداخت‌شده یا تحویل‌شده";
    const shippingLabel = revenueIncludeShipping
      ? "شامل هزینه ارسال هر سفارش"
      : "بدون هزینه ارسال (فقط مبلغ کالا)";
    return `جمع (مبلغ سفارش ${revenueIncludeShipping ? "+ هزینه ارسال" : ""}) برای ${orderLabel}. ${shippingLabel}.`;
  }, [revenueOrderFilter, revenueIncludeShipping]);

  if (isLoading || !stats) {
    return (
      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
              <div className="h-3 sm:h-4 w-16 sm:w-24 bg-muted rounded" />
              <div className="h-3 w-3 sm:h-4 sm:w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="h-6 sm:h-8 w-12 sm:w-16 bg-muted rounded mb-1 sm:mb-2" />
              <div className="h-2.5 sm:h-3 w-14 sm:w-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate additional stats (after early return; stats is defined here)
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "pending" || o.paymentStatus === "pending").length;
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;

  const safeStats = {
    totalProducts: stats.totalProducts ?? 0,
    activeProducts: stats.activeProducts ?? 0,
    totalStock: stats.totalStock ?? 0,
    lowStockProducts: stats.lowStockProducts ?? 0,
    averagePrice: stats.averagePrice ?? 0,
    totalOrders,
    pendingOrders,
    totalRevenue,
    totalUsers,
    activeUsers,
  };

  const statCards = [
    {
      title: "کل محصولات",
      value: safeStats.totalProducts,
      icon: Package,
      description: `${safeStats.activeProducts} فعال`,
      trend: null,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "کل سفارشات",
      value: safeStats.totalOrders,
      icon: ShoppingCart,
      description: `${safeStats.pendingOrders} در انتظار`,
      trend: safeStats.pendingOrders > 0 ? "warning" : null,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "درآمد کل",
      value: new Intl.NumberFormat("fa-IR").format(totalRevenue / 1000) + "K",
      icon: DollarSign,
      description: "تومان — کلیک برای جزئیات",
      trend: null,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
      isRevenue: true,
    },
    {
      title: "کل کاربران",
      value: safeStats.totalUsers,
      icon: Users,
      description: `${safeStats.activeUsers} فعال`,
      trend: null,
      color: "text-orange-600",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "موجودی کل",
      value: safeStats.totalStock.toLocaleString("fa-IR"),
      icon: Box,
      description: "عدد",
      trend: null,
      color: "text-indigo-600",
      bgColor: "bg-indigo-500/10",
    },
    {
      title: "محصولات کم‌موجود",
      value: safeStats.lowStockProducts,
      icon: AlertTriangle,
      description: "نیاز به بررسی",
      trend: safeStats.lowStockProducts > 0 ? "warning" : "success",
      color: "text-red-600",
      bgColor: "bg-red-500/10",
    },
  ];

  return (
    <>
      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const isRevenue = "isRevenue" in stat && stat.isRevenue;
          const card = (
            <Card
              key={stat.title}
              className={`relative overflow-hidden border-2 hover:shadow-lg transition-shadow ${isRevenue ? "cursor-pointer hover:border-emerald-500/50" : ""}`}
              onClick={isRevenue ? () => setRevenueDialogOpen(true) : undefined}
              role={isRevenue ? "button" : undefined}
              tabIndex={isRevenue ? 0 : undefined}
              onKeyDown={
                isRevenue
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setRevenueDialogOpen(true);
                      }
                    }
                  : undefined
              }
            >
              <div className={`absolute top-0 right-0 w-20 h-20 sm:w-32 sm:h-32 ${stat.bgColor} rounded-full -mr-10 -mt-10 sm:-mr-16 sm:-mt-16 opacity-50`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2 relative z-10">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{stat.title}</CardTitle>
                <div className="flex items-center gap-1">
                  {isRevenue && (
                    <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                  )}
                  <div className={`p-1.5 sm:p-2 rounded-lg ${stat.bgColor} shrink-0`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 p-3 sm:p-4 pt-0">
                <div className="text-lg sm:text-2xl lg:text-3xl font-bold mb-0.5 sm:mb-2">{stat.value}</div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{stat.description}</p>
                  {stat.trend && (
                    <Badge
                      variant={stat.trend === "warning" ? "warning" : "success"}
                      className="text-xs"
                    >
                      {stat.trend === "warning" ? (
                        <>
                          <Clock className="h-3 w-3 ml-1" />
                          نیاز به اقدام
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 ml-1" />
                          خوب
                        </>
                      )}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
          return card;
        })}
      </div>

      <Dialog open={revenueDialogOpen} onOpenChange={setRevenueDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg" variant="default">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              نحوه محاسبه درآمد کل
            </DialogTitle>
            <DialogDescription className="text-right">
              گزینه‌های زیر تعیین می‌کنند کدام سفارشات و با چه مبلغی در «درآمد کل» جمع می‌شوند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-foreground">
              <p className="font-medium mb-1">فرمول فعلی:</p>
              <p className="text-muted-foreground leading-relaxed">{revenueExplanation}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="revenue-shipping" className="text-sm cursor-pointer flex-1">
                  شامل هزینه ارسال
                </Label>
                <Switch
                  id="revenue-shipping"
                  checked={revenueIncludeShipping}
                  onCheckedChange={setRevenueIncludeShipping}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">نوع سفارشات برای درآمد</Label>
                <Select
                  value={revenueOrderFilter}
                  onValueChange={(v) => setRevenueOrderFilter(v as RevenueOrderFilter)}
                >
                  <SelectTrigger id="revenue-order-filter" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">فقط پرداخت‌شده</SelectItem>
                    <SelectItem value="delivered">فقط تحویل‌شده</SelectItem>
                    <SelectItem value="paid_or_delivered">پرداخت‌شده یا تحویل‌شده</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4 flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">درآمد کل با این تنظیمات:</span>
              <span className="text-lg font-bold text-emerald-600">
                {new Intl.NumberFormat("fa-IR").format(totalRevenue)} تومان
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              تعداد سفارشات لحاظ‌شده: {new Intl.NumberFormat("fa-IR").format(ordersForRevenue.length)}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


