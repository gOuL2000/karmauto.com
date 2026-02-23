"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, FileText } from "lucide-react";
import Link from "next/link";
import { useOrderStore } from "@/store/order-store";

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNumber = searchParams.get("orderNumber");
  const { orders } = useOrderStore();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (orderNumber) {
      // Ù¾ÛŒØ¯Ø§ Ú©Ø±Ø¯Ù† Ø³ÙØ§Ø±Ø´ Ø¨Ø§ orderNumber
      const foundOrder = orders.find(
        (o) => o.orderNumber === orderNumber || o.id === orderNumber
      );
      if (foundOrder) {
        setOrder(foundOrder);
      } else {
        // Ø§Ú¯Ø± Ø³ÙØ§Ø±Ø´ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯ØŒ Ø¢Ø®Ø±ÛŒÙ† Ø³ÙØ§Ø±Ø´ Ø±Ø§ Ù†Ù…Ø§ÛŒØ´ Ù…ÛŒâ€ŒØ¯Ù‡ÛŒÙ…
        if (orders.length > 0) {
          setOrder(orders[0]);
        }
      }
    } else if (orders.length > 0) {
      // Ø§Ú¯Ø± orderNumber ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø´ØªØŒ Ø¢Ø®Ø±ÛŒÙ† Ø³ÙØ§Ø±Ø´ Ø±Ø§ Ù†Ù…Ø§ÛŒØ´ Ù…ÛŒâ€ŒØ¯Ù‡ÛŒÙ…
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
                  Ø¯Ø± Ø­Ø§Ù„ Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø³ÙØ§Ø±Ø´...
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
                Ø³ÙØ§Ø±Ø´ Ø´Ù…Ø§ Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª Ø«Ø¨Øª Ø´Ø¯
              </h1>
              
              <p className="text-muted-foreground mb-6 text-center">
                Ø³ÙØ§Ø±Ø´ Ø´Ù…Ø§ Ø¯Ø±ÛŒØ§ÙØª Ø´Ø¯ Ùˆ Ø¯Ø± Ø­Ø§Ù„ Ù¾Ø±Ø¯Ø§Ø²Ø´ Ø§Ø³Øª
              </p>

              <div className="w-full space-y-4 mb-8">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ø´Ù…Ø§Ø±Ù‡ Ø³ÙØ§Ø±Ø´:</span>
                    <span className="font-mono font-bold text-lg">{order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ù…Ø¨Ù„Øº Ú©Ù„:</span>
                    <span className="font-bold text-lg">
                      {(order.total + order.shippingCost).toLocaleString("fa-IR")} ØªÙˆÙ…Ø§Ù†
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">ÙˆØ¶Ø¹ÛŒØª Ø³ÙØ§Ø±Ø´:</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø± Ù¾Ø±Ø¯Ø§Ø²Ø´
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">ÙˆØ¶Ø¹ÛŒØª Ù¾Ø±Ø¯Ø§Ø®Øª:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      order.paymentStatus === "paid" 
                        ? "bg-green-100 text-green-800" 
                        : order.paymentStatus === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {order.paymentStatus === "paid" 
                        ? "Ù¾Ø±Ø¯Ø§Ø®Øª Ø´Ø¯Ù‡" 
                        : order.paymentStatus === "pending"
                        ? "Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø± Ù¾Ø±Ø¯Ø§Ø®Øª"
                        : "Ù¾Ø±Ø¯Ø§Ø®Øª Ù†Ø§Ù…ÙˆÙÙ‚"}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Ù†Ú©ØªÙ‡:</strong> Ø¨Ø±Ø§ÛŒ Ù¾ÛŒÚ¯ÛŒØ±ÛŒ Ø³ÙØ§Ø±Ø´ Ø®ÙˆØ¯ØŒ Ù…ÛŒâ€ŒØªÙˆØ§Ù†ÛŒØ¯ Ø§Ø² Ø´Ù…Ø§Ø±Ù‡ Ø³ÙØ§Ø±Ø´ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†ÛŒØ¯.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Link href={`/order/track?orderNumber=${order.orderNumber}`} className="flex-1">
                  <Button className="w-full" size="lg">
                    <Package className="ml-2 h-4 w-4" />
                    Ù¾ÛŒÚ¯ÛŒØ±ÛŒ Ø³ÙØ§Ø±Ø´
                  </Button>
                </Link>
                <Link href="/products" className="flex-1">
                  <Button variant="outline" className="w-full" size="lg">
                    Ø§Ø¯Ø§Ù…Ù‡ Ø®Ø±ÛŒØ¯
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


