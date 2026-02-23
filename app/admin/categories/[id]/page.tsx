"use client";

import { use, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CategoryForm } from "@/components/admin/category-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCategoryStore } from "@/store/category-store";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Category } from "@/types/category";

export default function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const { getCategory, loadCategoriesFromDB, addCategory } = useCategoryStore();
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load category data on mount
  useEffect(() => {
    const loadCategoryData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Load categories first
        await loadCategoriesFromDB();
        
        // Try to get category from store
        let categoryData = getCategory(id);
        
        // If not in store, fetch from API
        if (!categoryData) {
          const response = await fetch(`/api/categories/${id}`);
          if (!response.ok) {
            if (response.status === 404) {
              setError("دسته‌بندی یافت نشد");
              return;
            }
            throw new Error("خطا در دریافت دسته‌بندی");
          }
          const result = await response.json();
          if (result.success && result.data) {
            categoryData = result.data;
            // Add to store for future use
            if (categoryData) {
              addCategory(categoryData);
            }
          } else {
            setError("دسته‌بندی یافت نشد");
            return;
          }
        }

        if (categoryData) {
          setCategory(categoryData);
        } else {
          setError("دسته‌بندی یافت نشد");
        }
      } catch (err) {
        console.error("Error loading category:", err);
        setError(err instanceof Error ? err.message : "خطا در بارگذاری داده‌ها");
      } finally {
        setIsLoading(false);
      }
    };

    loadCategoryData();
  }, [id, getCategory, loadCategoriesFromDB, addCategory]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">در حال بارگذاری...</p>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-destructive">{error || "دسته‌بندی یافت نشد"}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/categories">
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            ویرایش دسته‌بندی
          </h1>
          <p className="text-muted-foreground mt-1">
            ویرایش اطلاعات: {category.name}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/categories">
            <ArrowRight className="ml-2 h-4 w-4" />
            بازگشت به لیست
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>فرم ویرایش دسته‌بندی</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm category={category} />
        </CardContent>
      </Card>
    </div>
  );
}

