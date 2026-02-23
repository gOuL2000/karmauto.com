"use client";

import { useState, useMemo } from "react";
import { ProductTable } from "@/components/admin/product-table";
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
import { useProductStore } from "@/store/product-store";
import { Plus, Search, Download, Filter } from "lucide-react";
import Link from "next/link";
import { useAdminStore } from "@/store/admin-store";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ProductsPage() {
  const { products, setFilters, clearFilters, filters, loadProductsFromDB } = useProductStore();
  const { refreshStats } = useAdminStore();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const [categoryFilter, setCategoryFilter] = useState<string>(
    filters.categories?.[0] || "all"
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Load products from database on mount and when pathname changes (navigation)
  // Include inactive products for admin page
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        await loadProductsFromDB(true); // true = include inactive products
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProducts();
  }, [loadProductsFromDB, pathname]);

  // Listen for custom events and storage events to refresh when product is created/updated
  useEffect(() => {
    const handleProductCreated = () => {
      loadProductsFromDB(true);
    };

    const handleProductUpdated = () => {
      loadProductsFromDB(true);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'product-created' || e.key === 'product-updated') {
        loadProductsFromDB(true);
      }
    };

    window.addEventListener('product-created', handleProductCreated);
    window.addEventListener('product-updated', handleProductUpdated);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('product-created', handleProductCreated);
      window.removeEventListener('product-updated', handleProductUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadProductsFromDB]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats, products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter out test products (products with "test" in name, or very low prices like 0 or 1)
    filtered = filtered.filter((p) => {
      const nameLower = p.name.toLowerCase();
      // Exclude products with "test" in name (case-insensitive)
      if (nameLower.includes("test") || nameLower.includes("تست")) {
        return false;
      }
      // Exclude products with suspiciously low prices (0 or 1) that might be test data
      // But allow real products with price 0 if they exist
      // We'll be conservative and only filter obvious test products
      return true;
    });

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.brand?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    if (statusFilter === "active") {
      filtered = filtered.filter((p) => p.enabled);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((p) => !p.enabled);
    }

    return filtered;
  }, [products, searchQuery, categoryFilter, statusFilter]);

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter((cat): cat is string => Boolean(cat)))
  );

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
      ["نام", "برند", "دسته‌بندی", "قیمت", "موجودی", "وضعیت"],
      ...filteredProducts.map((p) => [
        p.name,
        p.brand,
        p.category,
        p.price.toString(),
        p.stockCount.toString(),
        p.enabled ? "فعال" : "غیرفعال",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `products-${new Date().toISOString()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {showFilters && (
        <Card className="shadow-sm">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
            <CardTitle>فیلترها و جستجو</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">جستجو</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="جستجو در محصولات..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">دسته‌بندی</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="همه دسته‌بندی‌ها" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه دسته‌بندی‌ها</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">وضعیت</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="همه وضعیت‌ها" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                    <SelectItem value="active">فعال</SelectItem>
                    <SelectItem value="inactive">غیرفعال</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(searchQuery || categoryFilter !== "all" || statusFilter !== "all") && (
              <div className="mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all");
                    setStatusFilter("all");
                    clearFilters();
                  }}
                >
                  پاک کردن فیلترها
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
          <div className="flex items-center justify-between">
            <CardTitle>
              محصولات ({filteredProducts.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant={showFilters ? "default" : "outline"} 
                onClick={() => setShowFilters(!showFilters)} 
                size="sm"
              >
                <Filter className="ml-2 h-4 w-4" />
                فیلتر
              </Button>
              <Button variant="outline" onClick={handleExport} size="sm">
                <Download className="ml-2 h-4 w-4" />
                خروجی CSV
              </Button>
              <Button asChild size="sm">
                <Link href="/admin/products/new">
                  <Plus className="ml-2 h-4 w-4" />
                  محصول جدید
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">در حال بارگذاری محصولات...</p>
            </div>
          ) : (
            <ProductTable
              products={filteredProducts}
              onRefresh={async () => {
                await loadProductsFromDB(true); // true = include inactive products
                refreshStats();
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

