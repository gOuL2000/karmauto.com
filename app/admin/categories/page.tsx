"use client";

import { CategoryTable } from "@/components/admin/category-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCategoryStore } from "@/store/category-store";
import { Plus, FolderTree } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function CategoriesPage() {
  const { categories, loadCategoriesFromDB } = useCategoryStore();
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  // Load categories from database on mount and when pathname changes (navigation)
  // Include inactive categories for admin page
  useEffect(() => {
    const loadCategories = async () => {
      setIsLoading(true);
      try {
        await loadCategoriesFromDB(true); // true = include inactive categories
      } catch (error) {
        console.error("Error loading categories:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadCategories();
  }, [loadCategoriesFromDB, pathname]);

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-primary" />
              دسته‌بندی‌ها ({categories.length})
            </CardTitle>
            <Button asChild size="sm">
              <Link href="/admin/categories/new">
                <Plus className="ml-2 h-4 w-4" />
                افزودن دسته‌بندی
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <CategoryTable categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}

