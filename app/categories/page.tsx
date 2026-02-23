"use client";

import { useCategories } from "@/services/categories";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-6 sm:py-10 px-3 sm:px-4">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">دسته‌بندی‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">
            انتخاب دسته‌بندی برای مشاهده محصولات
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            دسته‌بندی‌ای یافت نشد
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {categories
              .filter((c) => c.enabled && c.isActive)
              .map((category) => (
                <Link key={category.id} href={`/categories/${category.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="font-semibold">{category.name}</div>
                      {category.description ? (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {category.description}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}


