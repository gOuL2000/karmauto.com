"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Category } from "@/types/category";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCategoryStore } from "@/store/category-store";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Package } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const categorySchema = z.object({
  name: z.string().min(1, "نام دسته‌بندی الزامی است"),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  category?: Category;
  onSuccess?: () => void;
}

export function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const router = useRouter();
  const { addCategory, updateCategory, loadCategoriesFromDB } = useCategoryStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? {
          name: category.name,
          description: category.description || "",
          isActive: category.isActive,
        }
      : {
          name: "",
          description: "",
          isActive: true,
        },
  });

  const isActive = watch("isActive");

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (category) {
        // Update existing category via API
        const response = await fetch(`/api/categories/${category.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // API returns 'error' field, but also check 'message' for compatibility
          throw new Error(errorData.error || errorData.message || "خطا در به‌روزرسانی دسته‌بندی");
        }

        const updatedCategory = await response.json();
        updateCategory(updatedCategory.data);
        
        // Invalidate React Query cache to refresh categories in all components
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        
        // Reload categories to ensure sync
        await loadCategoriesFromDB();
        
        toast({
          title: "موفق",
          description: "دسته‌بندی با موفقیت به‌روزرسانی شد",
        });
      } else {
        // Create new category via API
        const response = await fetch("/api/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              // API returns 'error' field, but also check 'message' for compatibility
              const errorMessage = errorData.error || errorData.message || "خطا در ایجاد دسته‌بندی";
              
              // اگر مشکل از دیتابیس است، پیام راهنمایی اضافه کن
              if (errorData.code === "DATABASE_NOT_AVAILABLE") {
                throw new Error(
                  `${errorMessage}\n\nبرای رفع این مشکل:\n1. اطمینان حاصل کنید که PostgreSQL نصب و در حال اجرا است\n2. بررسی کنید که متغیرهای محیطی (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD) به درستی تنظیم شده‌اند\n3. دستور "pnpm setup-postgres-retry" را برای راه‌اندازی دیتابیس اجرا کنید`
                );
              }
              
              throw new Error(errorMessage);
            }

        const newCategory = await response.json();
        addCategory(newCategory.data);
        
        // Invalidate React Query cache to refresh categories in all components
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        
        // Reload categories to ensure sync
        await loadCategoriesFromDB();
        
        toast({
          title: "موفق",
          description: "دسته‌بندی با موفقیت اضافه شد",
        });
      }

      // Invalidate React Query cache to refresh categories in all components
      // (loadCategoriesFromDB already called above for both create and update)
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      
      onSuccess?.();
      router.push("/admin/categories");
    } catch (error) {
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطایی رخ داد. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            اطلاعات دسته‌بندی
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="name">نام دسته‌بندی *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="مثال: تعلیق و ترمز"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">توضیحات</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="توضیحات اختیاری درباره این دسته‌بندی..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/30">
            <div className="space-y-0.5">
              <Label>فعال</Label>
              <p className="text-sm text-muted-foreground">
                دسته‌بندی فعال است و در لیست‌ها نمایش داده می‌شود
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 pt-4 border-t border-border/30">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          size="lg"
        >
          انصراف
        </Button>
        <Button type="submit" disabled={isSubmitting} size="lg" className="min-w-[140px]">
          {isSubmitting ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              در حال ذخیره...
            </>
          ) : category ? (
            "ذخیره تغییرات"
          ) : (
            "افزودن دسته‌بندی"
          )}
        </Button>
      </div>
    </form>
  );
}

