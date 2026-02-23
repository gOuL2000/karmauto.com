"use client";

import { ProductForm } from "@/components/admin/product-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCategoryStore } from "@/store/category-store";
import { useVehicleStore } from "@/store/vehicle-store";
import { useEffect } from "react";

export default function NewProductPage() {
  const { loadCategoriesFromDB } = useCategoryStore();
  const { loadVehiclesFromDB } = useVehicleStore();

  // Load categories and vehicles from database on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          loadCategoriesFromDB(),
          loadVehiclesFromDB(),
        ]);
      } catch (error) {
        console.error("Error loading form data:", error);
      }
    };
    loadData();
  }, [loadCategoriesFromDB, loadVehiclesFromDB]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>فرم محصول</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm />
        </CardContent>
      </Card>
    </div>
  );
}


