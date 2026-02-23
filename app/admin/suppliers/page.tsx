"use client";

import { useState, useEffect, useMemo } from "react";
import { SuppliersGrid } from "@/components/admin/suppliers-grid";
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
import { useSupplierStore } from "@/store/supplier-store";
import { Plus, Users, Search, Filter, X } from "lucide-react";
import Link from "next/link";

export default function SuppliersPage() {
  const { suppliers } = useSupplierStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Force re-render when suppliers change
  useEffect(() => {
    setRefreshKey((prev) => prev + 1);
  }, [suppliers]);

  // Get unique categories
  const allCategories = useMemo(
    () => Array.from(new Set(suppliers.flatMap((s) => s.categories))),
    [suppliers]
  );

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          supplier.name.toLowerCase().includes(query) ||
          supplier.phone.includes(query) ||
          supplier.email?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter === "active" && !supplier.isActive) return false;
      if (statusFilter === "inactive" && supplier.isActive) return false;

      // Category filter
      if (categoryFilter !== "all" && !supplier.categories.includes(categoryFilter))
        return false;

      return true;
    });
  }, [suppliers, searchQuery, statusFilter, categoryFilter]);

  const activeCount = suppliers.filter((s) => s.isActive).length;
  const inactiveCount = suppliers.filter((s) => !s.isActive).length;

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              تامین‌کنندگان ({filteredSuppliers.length})
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
              <Button asChild size="sm">
                <Link href="/admin/suppliers/new">
                  <Plus className="ml-2 h-4 w-4" />
                  افزودن تامین‌کننده
                </Link>
              </Button>
            </div>
          </div>
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border/20">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">جستجو</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="جستجو بر اساس نام، شماره تماس یا ایمیل..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">وضعیت</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="وضعیت" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                      <SelectItem value="active">فعال ({activeCount})</SelectItem>
                      <SelectItem value="inactive">غیرفعال ({inactiveCount})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {allCategories.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">دسته‌بندی</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="دسته‌بندی" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه دسته‌بندی‌ها</SelectItem>
                        {allCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {(searchQuery || statusFilter !== "all" || categoryFilter !== "all") && (
                <div className="mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setCategoryFilter("all");
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
        <CardContent className="pt-6">
          <SuppliersGrid
            key={refreshKey}
            suppliers={filteredSuppliers}
            onRefresh={() => setRefreshKey((prev) => prev + 1)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

