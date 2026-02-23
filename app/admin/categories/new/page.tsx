"use client";

import { CategoryForm } from "@/components/admin/category-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCategoryStore } from "@/store/category-store";
import { useEffect } from "react";

export default function NewCategoryPage() {
  const { loadCategoriesFromDB } = useCategoryStore();

  // Load categories from database on mount
  useEffect(() => {
    loadCategoriesFromDB();
  }, [loadCategoriesFromDB]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          افزودن دسته‌بندی جدید
        </h1>
        <p className="text-muted-foreground mt-1">
          اطلاعات دسته‌بندی جدید را وارد کنید
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>فرم دسته‌بندی</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm />
        </CardContent>
      </Card>
    </div>
  );
}

