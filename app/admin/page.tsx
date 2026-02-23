"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProductStore } from "@/store/product-store";
import { useOrderStore } from "@/store/order-store";
import { useUserStore } from "@/store/user-store";
import { RefreshCw, Plus, Package, ShoppingCart, ArrowLeft, Eye, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useAdminStore } from "@/store/admin-store";
import { useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { faIR } from "date-fns/locale";

// Lazy load DashboardStats component
const DashboardStats = dynamic(
  () => import("@/components/admin/dashboard-stats").then((mod) => ({ default: mod.DashboardStats })),
  {
    loading: () => <div className="animate-pulse h-48 bg-muted rounded-lg" />,
    ssr: false,
  }
);

export default function AdminDashboard() {
  const { refreshStats, settings } = useAdminStore();
  const products = useProductStore((state) => state.products);
  const orders = useOrderStore((state) => state.orders);
  const enabledProducts = useProductStore((state) => state.getEnabledProducts());
  const { loadProductsFromDB } = useProductStore();
  const { loadOrdersFromDB } = useOrderStore();
  const { loadUsersFromDB } = useUserStore();

  // Load data only after admin session is ready (layout dispatches "admin-ready" after /api/admin/me)
  useEffect(() => {
    const loadAllData = async () => {
      try {
        await Promise.all([
          loadProductsFromDB(true),
          loadOrdersFromDB(),
          loadUsersFromDB(),
        ]);
        refreshStats();
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };

    const onAdminReady = () => loadAllData();
    window.addEventListener("admin-ready", onAdminReady);
    // اگر رویداد admin-ready را از دست دادیم (مثلاً mount دیر بود)، بعد از تأخیر کوتاه یک بار بارگذاری کن
    const fallback = setTimeout(() => {
      if (typeof window !== "undefined" && window.sessionStorage.getItem("adminUserId")) {
        loadAllData();
      }
    }, 250);
    return () => {
      window.removeEventListener("admin-ready", onAdminReady);
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also refresh stats when data changes
  useEffect(() => {
    if (products.length > 0 || orders.length > 0) {
      refreshStats();
    }
  }, [products, orders, refreshStats]);

  const recentProducts = useMemo(() => {
    return products
      .map((p) => ({
        ...p,
        createdAt: p.createdAt instanceof Date 
          ? p.createdAt 
          : new Date(p.createdAt),
      }))
      .sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [products]);

  const lowStockThreshold = settings.lowStockThreshold ?? 10;
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stockCount <= lowStockThreshold).slice(0, 5);
  }, [products, lowStockThreshold]);

  const recentOrders = useMemo(() => {
    return orders
      .map((o) => ({
        ...o,
        createdAt: o.createdAt instanceof Date 
          ? o.createdAt 
          : new Date(o.createdAt),
      }))
      .sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [orders]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            داشبورد
          </h1>
          <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
            خوش آمدید به پنل مدیریت فروشگاه
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Button variant="outline" size="sm" onClick={refreshStats} className="h-8 sm:h-9 text-xs">
            <RefreshCw className="ml-1.5 h-3.5 w-3.5" />
            بروزرسانی
          </Button>
          <Button size="sm" asChild className="h-8 sm:h-9 text-xs">
            <Link href="/admin/products/new">
              <Plus className="ml-1.5 h-3.5 w-3.5" />
              محصول جدید
            </Link>
          </Button>
        </div>
      </div>

      <DashboardStats />

      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b py-3 sm:py-4 px-3 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  آخرین سفارشات
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">سفارشات اخیراً ثبت شده</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-8 sm:h-9 text-xs self-start sm:self-auto">
                <Link href="/admin/orders">
                  <ArrowLeft className="ml-1.5 h-3.5 w-3.5" />
                  مشاهده همه
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>شماره سفارش</TableHead>
                      <TableHead>مشتری</TableHead>
                      <TableHead>مبلغ</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>تاریخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("fa-IR").format(order.total + order.shippingCost)} تومان
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === "delivered"
                                ? "success"
                                : order.status === "pending"
                                ? "warning"
                                : "default"
                            }
                          >
                            {order.status === "pending" && "در انتظار"}
                            {order.status === "processing" && "در حال پردازش"}
                            {order.status === "shipped" && "ارسال شده"}
                            {order.status === "delivered" && "تحویل شده"}
                            {order.status === "cancelled" && "لغو شده"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(order.createdAt, "yyyy/MM/dd", { locale: faIR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-border/30 rounded-lg">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">هیچ سفارشی وجود ندارد</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-red-500/5 to-transparent border-b py-3 sm:py-4 px-3 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  هشدار موجودی
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">محصولات با موجودی کم</CardDescription>
              </div>
              <Badge variant="warning" className="h-6 text-xs">
                {products.filter((p) => p.stockCount <= lowStockThreshold).length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
            {lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        موجودی: {product.stockCount}
                      </p>
                    </div>
                    <Badge variant="warning" className="ml-2">
                      {product.stockCount}
                    </Badge>
                  </div>
                ))}
                {products.filter((p) => p.stockCount <= lowStockThreshold).length > 5 && (
                  <Button variant="outline" className="w-full mt-4" asChild>
                    <Link href="/admin/products">
                      مشاهده همه ({products.filter((p) => p.stockCount <= lowStockThreshold).length})
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground text-sm">
                  همه محصولات موجودی کافی دارند
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Products */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b py-3 sm:py-4 px-3 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                آخرین محصولات
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">محصولات اخیراً اضافه شده</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-8 sm:h-9 text-xs self-start sm:self-auto">
              <Link href="/admin/products">
                <ArrowLeft className="ml-1.5 h-3.5 w-3.5" />
                مشاهده همه
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
          {recentProducts.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام</TableHead>
                    <TableHead>قیمت</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>موجودی</TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("fa-IR").format(product.price || 0)} تومان
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={product.enabled ? "success" : "secondary"}
                        >
                          {product.enabled ? "فعال" : "غیرفعال"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.stockCount <= lowStockThreshold ? "warning" : "default"}>
                          {product.stockCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/products/${product.id}`}>
                            <Eye className="h-4 w-4 ml-1" />
                            مشاهده
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-border/30 rounded-lg">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">محصولی وجود ندارد</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

