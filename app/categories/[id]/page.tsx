"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductGrid } from "@/components/product/product-grid";
import { Loader2 } from "lucide-react";
import { useCategoryStore } from "@/store/category-store";
import { useProductStore } from "@/store/product-store";

function CategoryProductsContent() {
  const params = useParams();
  const categoryId = params?.id as string;
  const [category, setCategory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { loadCategoriesFromDB } = useCategoryStore();
  const { setFilters } = useProductStore();

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const response = await fetch(`/api/categories/${categoryId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setCategory(result.data);
          }
        }
      } catch (error) {
        console.error("Error fetching category:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (categoryId) {
      fetchCategory();
      loadCategoriesFromDB().catch(console.error);
      // Set category filter
      setFilters({ categories: [categoryId] });
    }

    // Cleanup: clear filters when component unmounts
    return () => {
      setFilters({ categories: [] });
    };
  }, [categoryId, loadCategoriesFromDB, setFilters]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">دسته‌بندی یافت نشد</h1>
            <p className="text-muted-foreground">دسته‌بندی مورد نظر وجود ندارد.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-4 sm:py-6 md:py-8 px-3 sm:px-4">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{category.name}</h1>
          {category.description && (
            <p className="text-sm sm:text-base text-muted-foreground">{category.description}</p>
          )}
        </div>

        <ProductGrid />
      </main>
      <Footer />
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
        <Footer />
      </div>
    }>
      <CategoryProductsContent />
    </Suspense>
  );
}

