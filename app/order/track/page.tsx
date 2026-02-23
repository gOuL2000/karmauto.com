"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrderStore } from "@/store/order-store";
import { useProductStore } from "@/store/product-store";
import { Search, Package, MapPin, Phone, Mail, Calendar, Truck, CheckCircle2, Clock, XCircle, ShoppingCart, Box, CheckCircle, MessageCircle, ExternalLink } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { QuickBuyChat } from "@/components/chat/quick-buy-chat";

const statusConfig = {
  pending: {
    label: "در انتظار",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  processing: {
    label: "در حال پردازش",
    color: "bg-blue-100 text-blue-800",
    icon: Package,
  },
  shipped: {
    label: "ارسال شده",
    color: "bg-purple-100 text-purple-800",
    icon: Truck,
  },
  delivered: {
    label: "تحویل داده شده",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "لغو شده",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
};

const paymentStatusConfig = {
  pending: {
    label: "در انتظار پرداخت",
    color: "bg-yellow-100 text-yellow-800",
  },
  paid: {
    label: "پرداخت شده",
    color: "bg-green-100 text-green-800",
  },
  failed: {
    label: "پرداخت ناموفق",
    color: "bg-red-100 text-red-800",
  },
  refunded: {
    label: "بازگشت وجه",
    color: "bg-gray-100 text-gray-800",
  },
};

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialOrderNumber = searchParams.get("orderNumber") || "";
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [order, setOrder] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // برای تشخیص اینکه آیا جستجویی انجام شده یا نه
  const [chatOpen, setChatOpen] = useState(false);
  const { orders, updateOrder } = useOrderStore();
  const { getProduct, loadProductsFromDB } = useProductStore();

  const handleSearch = () => {
    setNotFound(false);
    setOrder(null);
    setHasSearched(true); // نشان می‌دهد که جستجو انجام شده

    if (!orderNumber.trim()) {
      setHasSearched(false); // اگر شماره سفارش خالی باشد، جستجو محسوب نمی‌شود
      return;
    }

    fetchOrder(orderNumber);
  };

  // دریافت سفارش از API
  const fetchOrder = async (orderNum: string) => {
    try {
      // ابتدا از store جستجو کن
      const foundOrder = orders.find(
        (o) =>
          o.orderNumber.toLowerCase() === orderNum.toLowerCase().trim() ||
          o.id === orderNum.trim()
      );
      
      if (foundOrder) {
        setOrder(foundOrder);
        setNotFound(false);
        return;
      }

      // اگر در store پیدا نشد، از API جستجو کن
      console.log('[Track Order] Fetching order from API:', orderNum);
      const response = await fetch(`/api/orders?orderNumber=${encodeURIComponent(orderNum)}`, {
        credentials: 'include', // Ensure cookies are sent
      });
      
      console.log('[Track Order] API response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('[Track Order] API result:', {
          success: result.success,
          dataLength: result.data?.length || 0,
          hasData: !!result.data,
        });
        
        if (result.success && result.data && result.data.length > 0) {
          const apiOrder = result.data[0];
          console.log('[Track Order] Order found:', apiOrder.orderNumber);
          setOrder(apiOrder);
          setNotFound(false);
          updateOrder(apiOrder.id, apiOrder);
        } else {
          console.log('[Track Order] Order not found in API response');
          setNotFound(true);
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('[Track Order] API error:', response.status, errorText);
        setNotFound(true);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      setNotFound(true);
    }
  };

  // بارگذاری محصولات برای نمایش تصاویر
  useEffect(() => {
    loadProductsFromDB(true).catch((error) => {
      console.error("Error loading products for order tracking:", error);
    });
  }, [loadProductsFromDB]);

  // اگر orderNumber در URL وجود داشت، جستجو را انجام بده
  useEffect(() => {
    if (initialOrderNumber && initialOrderNumber.trim()) {
      setHasSearched(true);
      fetchOrder(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  // Polling برای به‌روزرسانی وضعیت سفارش (هر 10 ثانیه)
  useEffect(() => {
    if (!order?.id) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/${order.id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setOrder(result.data);
            updateOrder(result.data.id, result.data);
          }
        }
      } catch (error) {
        console.error("Error polling order status:", error);
      }
    }, 10000); // هر 10 ثانیه

    return () => clearInterval(interval);
  }, [order?.id, updateOrder]);

  const StatusIcon = order ? statusConfig[order.status as keyof typeof statusConfig]?.icon || Clock : Clock;

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">
            پیگیری سفارش
          </h1>
          <Button
            onClick={() => setChatOpen(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">چت با ادمین</span>
            <span className="sm:hidden">چت</span>
          </Button>
        </div>

        {/* جستجوی سفارش */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">جستجوی سفارش</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 sm:pt-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1">
                <Label htmlFor="orderNumber" className="text-sm sm:text-base">شماره سفارش</Label>
                <Input
                  id="orderNumber"
                  placeholder="ORD-1234567890-001"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  className="mt-1 text-sm sm:text-base"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} size="lg" className="w-full sm:w-auto">
                  <Search className="ml-2 h-4 w-4" />
                  جستجو
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* پیام سفارش پیدا نشد - فقط زمانی که جستجو انجام شده باشد */}
        {notFound && hasSearched && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold mb-2">سفارش یافت نشد</h2>
                <p className="text-muted-foreground text-center mb-6">
                  شماره سفارش وارد شده معتبر نیست. لطفاً شماره سفارش را بررسی کنید.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* نمایش اطلاعات سفارش */}
        {order && (
          <div className="space-y-4 sm:space-y-6">
            {/* نمایش وضعیت لغو شده */}
            {order.status === "cancelled" && (
              <Card className="border-2 border-red-500 bg-red-50 dark:bg-red-950/30">
                <CardContent className="pt-4 sm:pt-6">
                  {/* موبایل: چینش مینیمال */}
                  <div className="flex sm:hidden items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-700 dark:text-red-400 flex-shrink-0" />
                    <Badge variant="destructive" className="bg-red-600 text-white text-xs">
                      {statusConfig.cancelled.label}
                    </Badge>
                    <span className="text-sm font-semibold text-red-900 dark:text-red-50 flex-1">
                      سفارش لغو شده
                    </span>
                  </div>
                  
                  {/* دسکتاپ: چینش کامل */}
                  <div className="hidden sm:flex items-center gap-3">
                    <XCircle className="h-6 w-6 text-red-700 dark:text-red-400 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-red-900 dark:text-red-50 mb-1">
                        سفارش لغو شده است
                      </h3>
                      <p className="text-sm text-red-800 dark:text-red-100">
                        این سفارش توسط مدیریت لغو شده است.
                        {order.updatedAt && (
                          <span className="block mt-1 text-red-900 dark:text-red-50">
                            تاریخ لغو: {new Date(order.updatedAt).toLocaleDateString("fa-IR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge variant="destructive" className="bg-red-600 text-white">
                      {statusConfig.cancelled.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* نوار پیشرفت سفارش */}
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <span className="hidden sm:inline">پیگیری سفارش</span>
                  <span className="sm:hidden">وضعیت سفارش</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6">
                {/* موبایل: نمایش ساده */}
                <div className="sm:hidden space-y-3">
                  {[
                    { status: "pending", label: "در انتظار", icon: ShoppingCart },
                    { status: "processing", label: "در حال پردازش", icon: Box },
                    { status: "shipped", label: "ارسال شده", icon: Truck },
                    { status: "delivered", label: "تحویل شده", icon: CheckCircle2 },
                  ].map((stage) => {
                    const statusOrder = ["pending", "processing", "shipped", "delivered"];
                    const currentIndex = statusOrder.indexOf(order.status);
                    const stageIndex = statusOrder.indexOf(stage.status);
                    const isCompleted = currentIndex >= stageIndex && order.status !== "cancelled";
                    const isCurrent = currentIndex === stageIndex && order.status !== "cancelled";
                    const Icon = stage.icon;

                    return (
                      <div key={stage.status} className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCompleted
                              ? "bg-primary text-primary-foreground"
                              : isCurrent
                              ? "bg-primary/20 text-primary border border-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <span
                          className={`text-sm flex-1 ${
                            isCompleted || isCurrent ? "font-semibold" : "text-muted-foreground"
                          }`}
                        >
                          {stage.label}
                        </span>
                        {isCurrent && (
                          <Badge variant="default" className="text-xs animate-pulse">
                            فعلی
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* نوار پیشرفت موبایل */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">پیشرفت</span>
                      <span className="text-xs font-medium">
                        {(() => {
                          const statusOrder = ["pending", "processing", "shipped", "delivered"];
                          const currentIndex = statusOrder.indexOf(order.status);
                          if (currentIndex === -1) return "0%";
                          return `${Math.round(((currentIndex + 1) / statusOrder.length) * 100)}%`;
                        })()}
                      </span>
                    </div>
                    <Progress
                      value={(() => {
                        const statusOrder = ["pending", "processing", "shipped", "delivered"];
                        const currentIndex = statusOrder.indexOf(order.status);
                        if (currentIndex === -1) return 0;
                        return ((currentIndex + 1) / statusOrder.length) * 100;
                      })()}
                      className="h-2"
                    />
                  </div>
                </div>

                {/* دسکتاپ: نمایش کامل */}
                <div className="hidden sm:block">
                  {/* مراحل سفارش */}
                  <div className="relative">
                    {/* خط پیشرفت */}
                    <div className="absolute right-8 top-0 bottom-0 w-0.5 bg-border">
                      <div
                        className="absolute top-0 right-0 w-full bg-primary transition-all duration-500 ease-in-out"
                        style={{
                          height: `${(() => {
                            const statusOrder = ["pending", "processing", "shipped", "delivered"];
                            const currentIndex = statusOrder.indexOf(order.status);
                            if (currentIndex === -1) return 0;
                            return ((currentIndex + 1) / statusOrder.length) * 100;
                          })()}%`,
                        }}
                      />
                    </div>

                    {/* مراحل */}
                    <div className="space-y-8 relative z-10">
                      {[
                        { status: "pending", label: "در انتظار", icon: ShoppingCart, description: "سفارش شما ثبت شد" },
                        { status: "processing", label: "در حال پردازش", icon: Box, description: "در حال آماده‌سازی" },
                        { status: "shipped", label: "ارسال شده", icon: Truck, description: "در مسیر تحویل" },
                        { status: "delivered", label: "تحویل شده", icon: CheckCircle2, description: "تحویل با موفقیت انجام شد" },
                      ].map((stage, index) => {
                        const statusOrder = ["pending", "processing", "shipped", "delivered"];
                        const currentIndex = statusOrder.indexOf(order.status);
                        const stageIndex = statusOrder.indexOf(stage.status);
                        const isCompleted = currentIndex >= stageIndex && order.status !== "cancelled";
                        const isCurrent = currentIndex === stageIndex && order.status !== "cancelled";
                        const Icon = stage.icon;

                        return (
                          <div key={stage.status} className="flex items-start gap-4">
                            <div className="relative z-10">
                              <div
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                                  isCompleted
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/50"
                                    : isCurrent
                                    ? "bg-primary/20 text-primary border-2 border-primary"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle className="h-8 w-8" />
                                ) : (
                                  <Icon className="h-8 w-8" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 pt-2">
                              <div className="flex items-center justify-between mb-1">
                                <h3
                                  className={`font-semibold text-lg ${
                                    isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
                                  }`}
                                >
                                  {stage.label}
                                </h3>
                                {isCurrent && (
                                  <Badge variant="default" className="animate-pulse">
                                    در حال انجام
                                  </Badge>
                                )}
                                {isCompleted && !isCurrent && (
                                  <Badge variant="success" className="gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    تکمیل شد
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{stage.description}</p>
                              {isCurrent && order.updatedAt && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  آخرین به‌روزرسانی:{" "}
                                  {new Date(order.updatedAt).toLocaleDateString("fa-IR", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* نوار پیشرفت */}
                  <div className="mt-8 pt-6 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">پیشرفت کلی</span>
                      <span className="text-sm text-muted-foreground">
                        {(() => {
                          const statusOrder = ["pending", "processing", "shipped", "delivered"];
                          const currentIndex = statusOrder.indexOf(order.status);
                          if (currentIndex === -1) return "0%";
                          return `${Math.round(((currentIndex + 1) / statusOrder.length) * 100)}%`;
                        })()}
                      </span>
                    </div>
                    <Progress
                      value={(() => {
                        const statusOrder = ["pending", "processing", "shipped", "delivered"];
                        const currentIndex = statusOrder.indexOf(order.status);
                        if (currentIndex === -1) return 0;
                        return ((currentIndex + 1) / statusOrder.length) * 100;
                      })()}
                      className="h-3"
                    />
                  </div>

                  {/* اطلاعات اضافی */}
                  <div className="mt-6 pt-6 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">شماره سفارش</p>
                        <p className="font-semibold font-mono">{order.orderNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">تاریخ ثبت</p>
                        <p className="font-semibold">
                          {new Date(order.createdAt).toLocaleDateString("fa-IR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* محصولات سفارش */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">محصولات سفارش</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 sm:pt-6">
                <div className="space-y-3 sm:space-y-4">
                  {Array.isArray(order.items) ? order.items.map((item: any) => {
                    // Get image from item first, then from product store
                    const product = getProduct(item.productId || item.id);
                    let imageUrl = item.image && item.image.trim() !== "" ? item.image : "";
                    if (!imageUrl && product && product.images && product.images.length > 0) {
                      imageUrl = product.images[0];
                    }
                    
                    // Validate URL - must be a valid URL string
                    const isValidUrl = (url: string): boolean => {
                      if (!url || typeof url !== 'string' || url.trim() === '') {
                        return false;
                      }
                      // Allow blob: and data: URLs
                      if (url.startsWith('blob:') || url.startsWith('data:')) {
                        return true;
                      }
                      // Try to construct URL to validate
                      try {
                        new URL(url);
                        return true;
                      } catch {
                        return false;
                      }
                    };
                    
                    const hasImage = imageUrl && isValidUrl(imageUrl);
                    
                    return (
                      <div
                        key={item.id}
                        className="flex gap-2 sm:gap-4 pb-3 sm:pb-4 border-b last:border-0"
                      >
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0 border">
                          <SafeImage
                            src={hasImage ? imageUrl : null}
                            alt={item.name || 'Product image'}
                            fill
                            className="w-full h-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold mb-1 text-sm sm:text-base truncate">{item.name}</h3>
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                            <span className="text-xs sm:text-sm text-muted-foreground">تعداد: {item.quantity}</span>
                            <span className="font-semibold text-sm sm:text-base text-foreground">
                              {(item.price * item.quantity).toLocaleString("fa-IR")} تومان
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground">
                      <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                      <p className="text-sm sm:text-base">محصولات سفارش در دسترس نیست</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* اطلاعات مشتری و ارسال */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-base sm:text-lg">اطلاعات شما</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 pt-0 sm:pt-6">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-muted rounded-lg flex-shrink-0">
                      <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">نام</p>
                      <p className="font-semibold text-sm sm:text-base truncate">{order.customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-muted rounded-lg flex-shrink-0">
                      <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">شماره تماس</p>
                      <p className="font-semibold text-sm sm:text-base">{order.customerPhone}</p>
                    </div>
                  </div>
                  {order.customerEmail && (
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-muted rounded-lg flex-shrink-0">
                        <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-muted-foreground">ایمیل</p>
                        <p className="font-semibold text-sm sm:text-base truncate">{order.customerEmail}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-base sm:text-lg">آدرس ارسال</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 pt-0 sm:pt-6">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-muted rounded-lg flex-shrink-0">
                      <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">آدرس</p>
                      {(() => {
                        const locationStr = order.shippingAddress.location;
                        // بررسی اینکه آیا location به صورت مختصات است (lat,lng)
                        const isCoordinates = locationStr && 
                          locationStr.includes(',') && 
                          /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(locationStr.trim());
                        
                        // اگر addressType location است یا location به صورت مختصات است
                        if ((order.shippingAddress.addressType === "location" || isCoordinates) && locationStr) {
                          const [lat, lng] = locationStr.split(',').map((s: string) => s.trim());
                          // استفاده از مختصات دقیق بدون تغییر
                          const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                          return (
                            <div className="space-y-2">
                              <p className="font-semibold text-sm sm:text-base break-words font-mono">
                                {lat}, {lng}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                مختصات دقیق انتخاب شده توسط شما
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => window.open(mapUrl, '_blank')}
                              >
                                <MapPin className="h-3 w-3 ml-1" />
                                مشاهده در نقشه
                                <ExternalLink className="h-3 w-3 mr-1" />
                              </Button>
                            </div>
                          );
                        }
                        
                        // اگر postalCode است
                        if (order.shippingAddress.addressType === "postalCode" && order.shippingAddress.postalCode) {
                          return (
                            <p className="font-semibold text-sm sm:text-base break-words">
                              کد پستی: {order.shippingAddress.postalCode}
                            </p>
                          );
                        }
                        
                        // در غیر این صورت آدرس معمولی
                        return (
                          <>
                            {order.shippingAddress.city && (
                              <p className="font-semibold text-sm sm:text-base break-words">
                                {order.shippingAddress.city}{order.shippingAddress.address ? `، ${order.shippingAddress.address}` : ''}
                              </p>
                            )}
                            {order.shippingAddress.postalCode && (
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                کد پستی: {order.shippingAddress.postalCode}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-muted rounded-lg flex-shrink-0">
                      <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">روش ارسال</p>
                      <p className="font-semibold text-sm sm:text-base">
                        {order.shippingMethod === "air" ? "هوایی" : "دریایی"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* خلاصه سفارش */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">خلاصه سفارش</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 sm:pt-6">
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-muted-foreground">جمع کل:</span>
                    <span className="font-semibold">
                      {order.total.toLocaleString("fa-IR")} تومان
                    </span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-muted-foreground">هزینه ارسال:</span>
                    <span className="font-semibold">
                      {order.shippingCost === 0 ? (
                        <span className="text-green-600">رایگان</span>
                      ) : (
                        `${order.shippingCost.toLocaleString("fa-IR")} تومان`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2.5 sm:pt-3 border-t text-base sm:text-lg">
                    <span className="font-bold">مبلغ نهایی:</span>
                    <span className="font-bold text-primary">
                      {(order.total + order.shippingCost).toLocaleString("fa-IR")} تومان
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2.5 sm:pt-3 border-t text-sm sm:text-base">
                    <span className="text-muted-foreground">وضعیت پرداخت:</span>
                    <Badge className={`text-xs sm:text-sm ${paymentStatusConfig[order.paymentStatus as keyof typeof paymentStatusConfig]?.color}`}>
                      {paymentStatusConfig[order.paymentStatus as keyof typeof paymentStatusConfig]?.label}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* چت با ادمین */}
      <QuickBuyChat 
        isOpen={chatOpen} 
        onOpenChange={setChatOpen}
      />
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-6">در حال بارگذاری...</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}

