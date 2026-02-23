"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCartStore } from "@/store/cart-store";
import { useOrderStore } from "@/store/order-store";

function PaymentVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { clearCart } = useCartStore();
  const { addOrder, updatePaymentStatus } = useOrderStore();
  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading"
  );
  const [refId, setRefId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const authority = searchParams.get("Authority");
      const status = searchParams.get("Status");

      // اگر Status برابر OK نباشد، پرداخت ناموفق بوده
      if (status !== "OK" || !authority) {
        setStatus("failed");
        setError("پرداخت انجام نشد یا توسط کاربر لغو شد");
        return;
      }

      // دریافت اطلاعات سفارش از localStorage
      const pendingOrderStr = localStorage.getItem("pendingOrder");
      if (!pendingOrderStr) {
        setStatus("failed");
        setError("اطلاعات سفارش یافت نشد");
        return;
      }

      const pendingOrder = JSON.parse(pendingOrderStr);
      const amount = pendingOrder.total;

      try {
        // تایید پرداخت
        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            authority,
            amount,
          }),
        });

        const data = await response.json();

        if (data.success && data.refId) {
          setStatus("success");
          setRefId(data.refId.toString());

          // ذخیره سفارش در store (اگر قبلاً ذخیره نشده باشد)
          if (pendingOrder.order) {
            // به‌روزرسانی وضعیت پرداخت به "paid"
            const orderWithPayment = {
              ...pendingOrder.order,
              paymentStatus: "paid" as const,
            };
            
            // بررسی اینکه آیا سفارش قبلاً در store وجود دارد
            const existingOrder = useOrderStore.getState().getOrder(pendingOrder.order.id);
            if (existingOrder) {
              // اگر وجود دارد، فقط وضعیت پرداخت را به‌روزرسانی کن
              updatePaymentStatus(pendingOrder.order.id, "paid");
            } else {
              // اگر وجود ندارد، سفارش جدید را اضافه کن
              addOrder(orderWithPayment);
            }
          }

          // پاک کردن سبد خرید (فقط بعد از پرداخت موفق)
          clearCart();

          // حذف اطلاعات سفارش و checkout از localStorage
          localStorage.removeItem("pendingOrder");
          localStorage.removeItem("checkoutData");

          toast({
            title: "پرداخت موفق",
            description: "سفارش شما با موفقیت ثبت شد",
          });
        } else {
          setStatus("failed");
          setError(data.error || "پرداخت تایید نشد");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("failed");
        setError("خطا در تایید پرداخت");
      }
    };

    verifyPayment();
  }, [searchParams, clearCart, toast, addOrder, updatePaymentStatus]);

  return (
    <div className="container mx-auto px-4 py-12 sm:py-20">
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="pt-6">
            {status === "loading" && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <h2 className="text-xl font-bold mb-2">در حال تایید پرداخت...</h2>
                <p className="text-sm text-muted-foreground text-center">
                  لطفاً صبر کنید
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
                <h2 className="text-xl font-bold mb-2 text-center">
                  پرداخت با موفقیت انجام شد
                </h2>
                {refId && (
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    شماره پیگیری: <span className="font-mono font-bold">{refId}</span>
                  </p>
                )}
                <p className="text-sm text-muted-foreground mb-6 text-center">
                  سفارش شما ثبت شد و در اسرع وقت پردازش خواهد شد
                </p>
                <div className="flex gap-3 w-full">
                  <Link href="/" className="flex-1">
                    <Button className="w-full">بازگشت به صفحه اصلی</Button>
                  </Link>
                  <Link href="/products" className="flex-1">
                    <Button variant="outline" className="w-full">
                      ادامه خرید
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {status === "failed" && (
              <div className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-16 w-16 text-destructive mb-4" />
                <h2 className="text-xl font-bold mb-2 text-center">
                  پرداخت ناموفق
                </h2>
                {error && (
                  <p className="text-sm text-muted-foreground mb-6 text-center">
                    {error}
                  </p>
                )}
                <div className="flex gap-3 w-full">
                  <Link href="/cart" className="flex-1">
                    <Button className="w-full">بازگشت به سبد خرید</Button>
                  </Link>
                  <Link href="/" className="flex-1">
                    <Button variant="outline" className="w-full">
                      صفحه اصلی
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-6">در حال بارگذاری...</div>}>
      <PaymentVerifyContent />
    </Suspense>
  );
}

