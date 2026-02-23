"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, FileText } from "lucide-react";
import Link from "next/link";
import { useOrderStore } from "@/store/order-store";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNumber = searchParams.get("orderNumber");
  const { orders } = useOrderStore();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (orderNumber) {
      // پیدا کردن سفارش با orderNumber
      const foundOrder = orders.find(
        (o) => o.orderNumber === orderNumber || o.id === orderNumber
      );
      if (foundOrder) {
        setOrder(foundOrder);
      } else {
        // اگر سفارش پیدا نشد، آخرین سفارش را نمایش می‌دهیم
        if (orders.length > 0) {
          setOrder(orders[0]);
        }
      }
    } else if (orders.length > 0) {
      // اگر orderNumber وجود نداشت، آخرین سفارش را نمایش می‌دهیم
      setOrder(orders[0]);
    }
  }, [orderNumber, orders]);

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-12 sm:py-20">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-center">
                  در حال بارگذاری اطلاعات سفارش...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 sm:py-20">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <div className="mb-6">
                <div className="relative">
                  <CheckCircle2 className="h-20 w-20 text-green-600" />
                  <div className="absolute inset-0 bg-green-600/20 rounded-full blur-xl" />
                </div>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center">
                سفارش شما با موفقیت ثبت شد
              </h1>
              
              <p className="text-muted-foreground mb-6 text-center">
                سفارش شما دریافت شد و در حال پردازش است
              </p>

              <div className="w-full space-y-4 mb-8">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">شماره سفارش:</span>
                    <span className="font-mono font-bold text-lg">{order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">مبلغ کل:</span>
                    <span className="font-bold text-lg">
                      {(order.total + order.shippingCost).toLocaleString("fa-IR")} تومان
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">وضعیت سفارش:</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      در انتظار پردازش
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">وضعیت پرداخت:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      order.paymentStatus === "paid" 
                        ? "bg-green-100 text-green-800" 
                        : order.paymentStatus === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {order.paymentStatus === "paid" 
                        ? "پرداخت شده" 
                        : order.paymentStatus === "pending"
                        ? "در انتظار پرداخت"
                        : "پرداخت ناموفق"}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>نکته:</strong> برای پیگیری سفارش خود، می‌توانید از شماره سفارش استفاده کنید.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Link href={`/order/track?orderNumber=${order.orderNumber}`} className="flex-1">
                  <Button className="w-full" size="lg">
                    <Package className="ml-2 h-4 w-4" />
                    پیگیری سفارش
                  </Button>
                </Link>
                <Link href="/products" className="flex-1">
                  <Button variant="outline" className="w-full" size="lg">
                    ادامه خرید
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-6">در حال بارگذاری...</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}

