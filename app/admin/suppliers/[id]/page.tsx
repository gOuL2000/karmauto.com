"use client";

import { use, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SupplierForm } from "@/components/admin/supplier-form";
import { SupplierTransactions } from "@/components/admin/supplier-transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupplierStore } from "@/store/supplier-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2, User, Package, Receipt, Phone, Mail, Building2 } from "lucide-react";
import Link from "next/link";

export default function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const supplier = useSupplierStore((state) => state.getSupplier(id));
  const [refreshKey, setRefreshKey] = useState(0);

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">در حال بارگذاری...</p>
      </div>
    );
  }

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const transactions = supplier.transactions || [];
  const totalTransactions = transactions.length;
  const totalAmount = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalProducts = supplier.products?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {supplier.name}
            </h1>
            <Badge variant={supplier.isActive ? "success" : "secondary"}>
              {supplier.isActive ? "فعال" : "غیرفعال"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            مدیریت اطلاعات و تراکنش‌های تامین‌کننده
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/suppliers">
            <ArrowRight className="ml-2 h-4 w-4" />
            بازگشت به لیست
          </Link>
        </Button>
      </div>

      {/* Supplier Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            اطلاعات تامین‌کننده
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">تماس</label>
                <div className="mt-1.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${supplier.phone}`}
                      className="text-sm hover:text-primary transition-colors"
                    >
                      {supplier.phone}
                    </a>
                  </div>
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${supplier.email}`}
                        className="text-sm hover:text-primary transition-colors"
                      >
                        {supplier.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">دسته‌بندی‌ها</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {supplier.categories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">محصولات</label>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">{totalProducts}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">تراکنش‌ها</label>
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">{totalTransactions}</span>
                  </div>
                </div>
              </div>

              {supplier.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">یادداشت‌ها</label>
                  <p className="mt-1.5 text-sm text-foreground">{supplier.notes}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-2">
              <TabsTrigger value="info" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                اطلاعات پایه
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                تراکنش‌ها
                {totalTransactions > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {totalTransactions}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-6">
              <SupplierForm supplier={supplier} />
            </TabsContent>

            <TabsContent value="transactions" className="mt-6">
              <SupplierTransactions
                key={refreshKey}
                supplier={supplier}
                onUpdate={handleRefresh}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

