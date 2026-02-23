"use client";

import { useState, useMemo, useEffect } from "react";
import { OrderTable } from "@/components/admin/order-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrderStore } from "@/store/order-store";
import { useProductStore } from "@/store/product-store";
import { Search, Download, Filter, Package, Loader2, RefreshCw } from "lucide-react";
import { usePathname } from "next/navigation";
import type { OrderStatus, PaymentStatus } from "@/types/order";

export default function OrdersPage() {
  const { orders, setFilters, clearFilters, filters, loadOrdersFromDB, isLoading } = useOrderStore();
  const { loadProductsFromDB } = useProductStore();
  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const pathname = usePathname();

  // Load orders and products from database on mount and when pathname changes
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        // Load both orders and products in parallel
        await Promise.all([
          loadOrdersFromDB(),
          loadProductsFromDB(true), // Include inactive products for admin
        ]);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Reload orders when page becomes visible (admin might need to see new orders)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadOrdersFromDB();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadOrdersFromDB]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(query) ||
          o.customerName.toLowerCase().includes(query) ||
          o.customerPhone.includes(query) ||
          o.customerEmail?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    if (paymentFilter !== "all") {
      filtered = filtered.filter((o) => o.paymentStatus === paymentFilter);
    }

    return filtered;
  }, [orders, searchQuery, statusFilter, paymentFilter]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      setFilters({ search: query });
    } else {
      clearFilters();
    }
  };

  const handleExport = () => {
    const csvContent = [
      ["شماره سفارش", "مشتری", "تلفن", "مبلغ کل", "وضعیت", "وضعیت پرداخت", "تاریخ"],
      ...filteredOrders.map((o) => [
        o.orderNumber,
        o.customerName,
        o.customerPhone,
        (o.total + o.shippingCost).toString(),
        o.status,
        o.paymentStatus,
        o.createdAt.toISOString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `orders-${new Date().toISOString()}.csv`;
    link.click();
  };


  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b py-3 sm:py-4 px-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              سفارشات ({filteredOrders.length})
            </CardTitle>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <Button 
                variant="outline" 
                onClick={async () => {
                  await loadOrdersFromDB();
                }}
                size="sm"
                disabled={isLoading}
                className="h-8 sm:h-9 text-xs"
              >
                {isLoading ? (
                  <Loader2 className="ml-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="ml-1.5 h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">به‌روزرسانی</span>
              </Button>
              <Button 
                variant={showFilters ? "default" : "outline"} 
                onClick={() => setShowFilters(!showFilters)} 
                size="sm"
                className="h-8 sm:h-9 text-xs"
              >
                <Filter className="ml-1.5 h-3.5 w-3.5" />
                فیلتر
              </Button>
              <Button variant="outline" onClick={handleExport} size="sm" disabled={filteredOrders.length === 0} className="h-8 sm:h-9 text-xs">
                <Download className="ml-1.5 h-3.5 w-3.5" />
                CSV
              </Button>
            </div>
          </div>
          {showFilters && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/20">
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">جستجو</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="جستجو در سفارشات..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">وضعیت سفارش</label>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="همه وضعیت‌ها" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                      <SelectItem value="pending">در انتظار</SelectItem>
                      <SelectItem value="processing">در حال پردازش</SelectItem>
                      <SelectItem value="shipped">ارسال شده</SelectItem>
                      <SelectItem value="delivered">تحویل داده شده</SelectItem>
                      <SelectItem value="cancelled">لغو شده</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">وضعیت پرداخت</label>
                  <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="همه وضعیت‌ها" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                      <SelectItem value="pending">در انتظار پرداخت</SelectItem>
                      <SelectItem value="paid">پرداخت شده</SelectItem>
                      <SelectItem value="failed">پرداخت ناموفق</SelectItem>
                      <SelectItem value="refunded">بازگشت وجه</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(searchQuery || statusFilter !== "all" || paymentFilter !== "all") && (
                <div className="mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setPaymentFilter("all");
                      clearFilters();
                    }}
                  >
                    <Filter className="ml-2 h-4 w-4" />
                    پاک کردن فیلترها
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="py-3 sm:py-6 px-3 sm:px-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">در حال بارگذاری سفارش‌ها...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">هیچ سفارشی یافت نشد</p>
            </div>
          ) : (
            <OrderTable orders={filteredOrders} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}


