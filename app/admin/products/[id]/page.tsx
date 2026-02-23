"use client";

import { use, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProductStore } from "@/store/product-store";
import { useCategoryStore } from "@/store/category-store";
import { useVehicleStore } from "@/store/vehicle-store";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Product } from "@/types/product";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const { getProduct, loadProductsFromDB, addProduct } = useProductStore();
  const { loadCategoriesFromDB } = useCategoryStore();
  const { loadVehiclesFromDB } = useVehicleStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all required data on mount
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Load all data in parallel
        await Promise.all([
          loadProductsFromDB(true), // Include inactive products
          loadCategoriesFromDB(),
          loadVehiclesFromDB(),
        ]);

        // Try to get product from store first
        let productData = getProduct(id);
        
        // If not in store, fetch from API
        if (!productData) {
          const response = await fetch(`/api/products/${id}`);
          if (!response.ok) {
            if (response.status === 404) {
              setError("محصول یافت نشد");
              return;
            }
            throw new Error("خطا در دریافت محصول");
          }
          const result = await response.json();
          if (result.success && result.data) {
            productData = result.data;
            // Add to store for future use
            if (productData) {
              addProduct(productData);
            }
          } else {
            setError("محصول یافت نشد");
            return;
          }
        }

        if (productData) {
          setProduct(productData);
        } else {
          setError("محصول یافت نشد");
        }
      } catch (err) {
        console.error("Error loading product data:", err);
        setError(err instanceof Error ? err.message : "خطا در بارگذاری داده‌ها");
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, [id, getProduct, loadProductsFromDB, loadCategoriesFromDB, loadVehiclesFromDB, addProduct]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">در حال بارگذاری...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-destructive">{error || "محصول یافت نشد"}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/products">
            <ArrowRight className="ml-2 h-4 w-4" />
            بازگشت به لیست
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ویرایش محصول</h1>
          <p className="text-muted-foreground mt-1">
            ویرایش اطلاعات محصول: {product.name}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/products">
            <ArrowRight className="ml-2 h-4 w-4" />
            بازگشت به لیست
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>فرم ویرایش محصول</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm product={product} />
        </CardContent>
      </Card>
    </div>
  );
}


