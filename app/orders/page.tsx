"use client";

import { useMemo, useEffect } from "react";
import { useOrderStore } from "@/store/order-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, CheckCircle2, XCircle, CreditCard } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/auth-store";
import { ProtectedRoute } from "@/components/auth/protected-route";

function MyOrdersPageContent() {
  const { orders, loadOrdersFromDB, isLoading } = useOrderStore();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, hasCheckedAuth } = useAuthStore();
  
  // Load orders on mount and when user changes
  useEffect(() => {
    // Load orders after auth check completes and user is authenticated
    if (hasCheckedAuth && isAuthenticated && user?.id) {
      loadOrdersFromDB().then(() => {
        // Use setTimeout to ensure state is updated
        setTimeout(() => {}, 100);
      }).catch(err => {
        // If 401 error, user will be redirected by ProtectedRoute
        if (err?.status !== 401) {
          toast({
            title: "خطا",
            description: "خطا در بارگذاری سفارش‌ها",
            variant: "destructive",
          });
        }
      });
    }
  }, [hasCheckedAuth, isAuthenticated, user?.id, loadOrdersFromDB, toast]);

  // Reload orders when page becomes visible (user might have created order in another tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasCheckedAuth) {
        loadOrdersFromDB();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hasCheckedAuth, loadOrdersFromDB]);

  // Poll for order updates every 30 seconds to show status changes (like cancellation)
  useEffect(() => {
    if (!hasCheckedAuth || !isAuthenticated) return;

    const interval = setInterval(() => {
      loadOrdersFromDB().catch((error) => {
        console.error('[Orders Page] Error polling orders:', error);
      });
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [hasCheckedAuth, isAuthenticated, loadOrdersFromDB]);

  // دسته‌بندی سفارش‌ها
  const ordersByStatus = useMemo(() => {
    const pending = orders.filter((o) => o.paymentStatus === "pending");
    const paid = orders.filter((o) => o.paymentStatus === "paid");
    const failed = orders.filter((o) => o.paymentStatus === "failed");
    const cancelled = orders.filter((o) => o.status === "cancelled");
    
    return { pending, paid, failed, cancelled };
  }, [orders]);

  const handleContinuePayment = async (order: any) => {
    try {
      // دریافت اطلاعات سفارش از localStorage یا ساخت مجدد
      const checkoutData = localStorage.getItem("checkoutData");
      const pendingOrder = localStorage.getItem("pendingOrder");

      if (!checkoutData && !pendingOrder) {
        toast({
          title: "خطا",
          description: "اطلاعات سفارش یافت نشد. لطفاً سفارش جدیدی ثبت کنید.",
          variant: "destructive",
        });
        return;
      }

      // اگر pendingOrder وجود دارد، از آن استفاده کن
      if (pendingOrder) {
        const orderData = JSON.parse(pendingOrder);
        const amount = orderData.total;

        // ایجاد درخواست پرداخت جدید
        const response = await fetch("/api/payment/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            description: `سفارش ${order.items.length} محصول - ${order.orderNumber}`,
            callbackUrl: `${window.location.origin}/payment/verify`,
            mobile: order.customerPhone,
            email: order.customerEmail,
          }),
        });

        const result = await response.json();

        if (result.success && result.paymentUrl) {
          // به‌روزرسانی pendingOrder با authority جدید
          const updatedPendingOrder = {
            ...orderData,
            authority: result.authority,
          };
          localStorage.setItem("pendingOrder", JSON.stringify(updatedPendingOrder));

          // هدایت به درگاه پرداخت
          window.location.href = result.paymentUrl;
        } else {
          toast({
            title: "خطا",
            description: result.error || "خطا در اتصال به درگاه پرداخت",
            variant: "destructive",
          });
        }
      } else {
        // اگر pendingOrder وجود ندارد، به checkout برگرد
        router.push("/checkout");
      }
    } catch (error) {
      console.error("Continue payment error:", error);
      toast({
        title: "خطا",
        description: "خطایی در پردازش درخواست رخ داد",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 lg:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1 flex items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">سفارش‌های من</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                مدیریت و پیگیری سفارش‌های خود
              </p>
            </div>
            <div className="flex-1 h-0.5 sm:h-1 bg-background dark:bg-foreground"></div>
          </div>
        </div>

        {/* سفارش‌های در انتظار پرداخت */}
        {ordersByStatus.pending.length > 0 && (
          <Card className="mb-4 sm:mb-6 border-yellow-200 dark:border-yellow-800">
            <CardHeader className="bg-yellow-50 dark:bg-yellow-950/20 pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                <span className="hidden sm:inline">سفارش‌های در انتظار پرداخت</span>
                <span className="sm:hidden">در انتظار پرداخت</span>
                <span className="text-sm sm:text-base">({ordersByStatus.pending.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 sm:pt-6">
              <div className="space-y-3 sm:space-y-4">
                {ordersByStatus.pending.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-yellow-500">
                    <CardContent className="pt-3 sm:pt-6">
                      <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex-1">
                          <div className="mb-3">
                            <div className="bg-muted/50 dark:bg-muted/30 rounded-lg p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                                <p className="font-semibold text-sm sm:text-base truncate font-mono">
                                  <span className="text-muted-foreground">شماره سفارش:</span>{" "}
                                  <span className="text-foreground">{order.orderNumber}</span>
                                </p>
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                              {new Date(order.createdAt).toLocaleDateString("fa-IR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-3">
                            <div className="text-xs sm:text-sm">
                              <span className="text-muted-foreground">مبلغ کل: </span>
                              <span className="font-bold">
                                {(order.total + order.shippingCost).toLocaleString("fa-IR")} تومان
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                                در انتظار پرداخت
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleContinuePayment(order)}
                            className="flex-1 sm:flex-none text-xs sm:text-sm h-9 sm:h-10 bg-gradient-to-r from-black via-purple-600 to-black text-white hover:from-black/90 hover:via-purple-700 hover:to-black/90 border-0"
                            size="sm"
                          >
                            <CreditCard className="ml-1.5 sm:ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">ادامه پرداخت</span>
                            <span className="sm:hidden">پرداخت</span>
                          </Button>
                          <Link href={`/order/track?orderNumber=${order.orderNumber}`} className="flex-1 sm:flex-none">
                            <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10">
                              <Package className="ml-1.5 sm:ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              جزئیات
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* سفارش‌های پرداخت شده */}
        {ordersByStatus.paid.length > 0 && (
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                <span className="hidden sm:inline">سفارش‌های پرداخت شده</span>
                <span className="sm:hidden">پرداخت شده</span>
                <span className="text-sm sm:text-base">({ordersByStatus.paid.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 sm:pt-6">
              <div className="space-y-3 sm:space-y-4">
                {ordersByStatus.paid.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-green-500">
                    <CardContent className="pt-3 sm:pt-6">
                      <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex-1">
                          <div className="mb-3">
                            <div className="bg-muted/50 dark:bg-muted/30 rounded-lg p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                                <p className="font-semibold text-sm sm:text-base truncate font-mono">
                                  <span className="text-muted-foreground">شماره سفارش:</span>{" "}
                                  <span className="text-foreground">{order.orderNumber}</span>
                                </p>
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                              {new Date(order.createdAt).toLocaleDateString("fa-IR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-3">
                            <div className="text-xs sm:text-sm">
                              <span className="text-muted-foreground">مبلغ کل: </span>
                              <span className="font-bold">
                                {(order.total + order.shippingCost).toLocaleString("fa-IR")} تومان
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                پرداخت شده
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {order.status === "pending" && "در انتظار پردازش"}
                                {order.status === "processing" && "در حال پردازش"}
                                {order.status === "shipped" && "ارسال شده"}
                                {order.status === "delivered" && "تحویل داده شده"}
                                {order.status === "cancelled" && "لغو شده"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Link href={`/order/track?orderNumber=${order.orderNumber}`} className="w-full sm:w-auto">
                          <Button 
                            size="sm" 
                            className={`w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10 text-white border-0 ${
                              order.status === "delivered"
                                ? "bg-gradient-to-r from-black via-green-600 to-black hover:from-black/90 hover:via-green-700 hover:to-black/90"
                                : "bg-gradient-to-r from-black via-purple-600 to-black hover:from-black/90 hover:via-purple-700 hover:to-black/90"
                            }`}
                          >
                            <Package className="ml-1.5 sm:ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">پیگیری سفارش</span>
                            <span className="sm:hidden">پیگیری</span>
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* سفارش‌های ناموفق */}
        {ordersByStatus.failed.length > 0 && (
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                <span className="hidden sm:inline">سفارش‌های ناموفق</span>
                <span className="sm:hidden">ناموفق</span>
                <span className="text-sm sm:text-base">({ordersByStatus.failed.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 sm:pt-6">
              <div className="space-y-3 sm:space-y-4">
                {ordersByStatus.failed.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-red-500">
                    <CardContent className="pt-3 sm:pt-6">
                      <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex-1">
                          <div className="mb-3">
                            <div className="bg-muted/50 dark:bg-muted/30 rounded-lg p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                                <p className="font-semibold text-sm sm:text-base truncate font-mono">
                                  <span className="text-muted-foreground">شماره سفارش:</span>{" "}
                                  <span className="text-foreground">{order.orderNumber}</span>
                                </p>
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                              {new Date(order.createdAt).toLocaleDateString("fa-IR")}
                            </p>
                          </div>
                          <Badge variant="destructive" className="mt-2 text-xs">
                            پرداخت ناموفق
                          </Badge>
                        </div>
                        <Button
                          onClick={() => handleContinuePayment(order)}
                          size="sm"
                          className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10 bg-gradient-to-r from-black via-purple-600 to-black text-white hover:from-black/90 hover:via-purple-700 hover:to-black/90 border-0"
                        >
                          <CreditCard className="ml-1.5 sm:ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          تلاش مجدد
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* سفارش‌های لغو شده */}
        {ordersByStatus.cancelled.length > 0 && (
          <Card className="mb-4 sm:mb-6 border-red-200 dark:border-red-800">
            <CardHeader className="bg-red-50 dark:bg-red-950/20 pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                <span className="hidden sm:inline">سفارش‌های لغو شده</span>
                <span className="sm:hidden">لغو شده</span>
                <span className="text-sm sm:text-base">({ordersByStatus.cancelled.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 sm:pt-6">
              <div className="space-y-3 sm:space-y-4">
                {ordersByStatus.cancelled.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-red-500">
                    <CardContent className="pt-3 sm:pt-6">
                      <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex-1">
                          <div className="mb-3">
                            <div className="bg-muted/50 dark:bg-muted/30 rounded-lg p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                                <p className="font-semibold text-sm sm:text-base truncate font-mono">
                                  <span className="text-muted-foreground">شماره سفارش:</span>{" "}
                                  <span className="text-foreground">{order.orderNumber}</span>
                                </p>
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                              {new Date(order.createdAt).toLocaleDateString("fa-IR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-3">
                            <div className="text-xs sm:text-sm">
                              <span className="text-muted-foreground">مبلغ کل: </span>
                              <span className="font-bold">
                                {(order.total + order.shippingCost).toLocaleString("fa-IR")} تومان
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300 text-xs">
                                لغو شده
                              </Badge>
                              {order.paymentStatus === "paid" && (
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-xs">
                                  پرداخت شده
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Link href={`/order/track?orderNumber=${order.orderNumber}`} className="w-full sm:w-auto">
                          <Button size="sm" className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10 bg-gradient-to-r from-black via-purple-600 to-black text-white hover:from-black/90 hover:via-purple-700 hover:to-black/90 border-0">
                            <Package className="ml-1.5 sm:ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            جزئیات
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* پیام خالی */}
        {orders.length === 0 && (
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                <Package className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-3 sm:mb-4" />
                <h2 className="text-lg sm:text-xl font-bold mb-1.5 sm:mb-2 text-center px-4">شما هنوز سفارشی ثبت نکرده‌اید</h2>
                <p className="text-sm sm:text-base text-muted-foreground text-center mb-4 sm:mb-6 px-4">
                  برای ثبت سفارش جدید، به صفحه محصولات بروید
                </p>
                <Link href="/products">
                  <Button size="sm" className="sm:size-lg text-xs sm:text-sm">مشاهده محصولات</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function MyOrdersPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <MyOrdersPageContent />
    </ProtectedRoute>
  );
}





