"use client";

import { useMemo } from "react";
import { useSupplierStore } from "@/store/supplier-store";
import { useProductStore } from "@/store/product-store";
import { useOrderStore } from "@/store/order-store";
import { useAdminStore } from "@/store/admin-store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CreditCard,
  Package,
  ShoppingCart,
  X,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function AdminAlerts() {
  const { suppliers } = useSupplierStore();
  const { products } = useProductStore();
  const { orders } = useOrderStore();
  const { settings } = useAdminStore();
  const lowStockThreshold = settings.lowStockThreshold ?? 10;
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Calculate alerts
  const alerts = useMemo(() => {
    const alertList: Array<{
      id: string;
      type: "check" | "lowStock" | "newOrder";
      title: string;
      description: string;
      count: number;
      link?: string;
      severity: "high" | "medium" | "low";
    }> = [];

    // 1. Check due dates (2 days from now)
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingChecks: Array<{
      supplierName: string;
      checkNumber: string;
      dueDate: string;
      amount: number;
    }> = [];

    suppliers.forEach((supplier) => {
      supplier.transactions?.forEach((transaction) => {
        if (
          transaction.paymentMethod === "check" &&
          transaction.checkDetails
        ) {
          const dueDate = new Date(transaction.checkDetails.dueDate);
          dueDate.setHours(0, 0, 0, 0);

          // Check if due date is within 2 days and not past
          if (dueDate >= today && dueDate <= twoDaysFromNow) {
            upcomingChecks.push({
              supplierName: supplier.name,
              checkNumber: transaction.checkDetails.checkNumber,
              dueDate: transaction.checkDetails.dueDate,
              amount: transaction.totalAmount,
            });
          }
        }
      });
    });

    if (upcomingChecks.length > 0) {
      alertList.push({
        id: "upcoming-checks",
        type: "check",
        title: "چک‌های نزدیک به سررسید",
        description: `${upcomingChecks.length} چک در 2 روز آینده سررسید می‌شود`,
        count: upcomingChecks.length,
        link: "/admin/suppliers",
        severity: "high",
      });
    }

    // 2. Low stock products (use site setting threshold)
    const lowStockProducts = products.filter((product) => product.stockCount <= lowStockThreshold);

    if (lowStockProducts.length > 0) {
      alertList.push({
        id: "low-stock",
        type: "lowStock",
        title: "موجودی کم",
        description: `${lowStockProducts.length} محصول موجودی کم دارد`,
        count: lowStockProducts.length,
        link: "/admin/products",
        severity: "high",
      });
    }

    // 3. New orders (orders created in last 24 hours)
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const newOrders = orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= last24Hours && order.status !== "cancelled";
    });

    if (newOrders.length > 0) {
      alertList.push({
        id: "new-orders",
        type: "newOrder",
        title: "سفارش‌های جدید",
        description: `${newOrders.length} سفارش جدید در 24 ساعت گذشته`,
        count: newOrders.length,
        link: "/admin/orders",
        severity: "medium",
      });
    }

    return alertList;
  }, [suppliers, products, orders, lowStockThreshold]);

  // Filter out dismissed alerts
  const activeAlerts = alerts.filter((alert) => !dismissedAlerts.has(alert.id));

  if (activeAlerts.length === 0) {
    return null;
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "check":
        return <CreditCard className="h-5 w-5" />;
      case "lowStock":
        return <Package className="h-5 w-5" />;
      case "newOrder":
        return <ShoppingCart className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getAlertVariant = (severity: string, type: string): "default" | "destructive" | "warning" => {
    if (type === "check") {
      return "warning";
    }
    switch (severity) {
      case "high":
        return "destructive";
      case "medium":
      default:
        return "default";
    }
  };

  return (
    <div className="border-b border-border/30 bg-background/95 backdrop-blur">
      <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 space-y-1.5 sm:space-y-2">
        {activeAlerts.map((alert) => (
          <Alert
            key={alert.id}
            variant={getAlertVariant(alert.severity, alert.type)}
            className="flex items-center justify-between gap-2 sm:gap-4 py-2 sm:py-3"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-shrink-0">{getAlertIcon(alert.type)}</div>
              <div className="flex-1 min-w-0">
                <AlertTitle className="flex items-center gap-2 mb-1">
                  {alert.title}
                  <Badge variant="secondary" className="text-xs">
                    {alert.count}
                  </Badge>
                </AlertTitle>
                <AlertDescription>{alert.description}</AlertDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {alert.link && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={alert.link}>
                    مشاهده
                    <ChevronLeft className="h-4 w-4 mr-1" />
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setDismissedAlerts((prev) => new Set(prev).add(alert.id));
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>
        ))}
      </div>
    </div>
  );
}
