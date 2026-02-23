"use client";

import { VehicleForm } from "@/components/admin/vehicle-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVehicleStore } from "@/store/vehicle-store";
import { useEffect } from "react";

export default function NewVehiclePage() {
  const { loadVehiclesFromDB } = useVehicleStore();

  useEffect(() => {
    loadVehiclesFromDB();
  }, [loadVehiclesFromDB]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          افزودن خودرو جدید
        </h1>
        <p className="text-muted-foreground mt-1">
          اطلاعات خودرو جدید را وارد کنید
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>فرم خودرو</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm />
        </CardContent>
      </Card>
    </div>
  );
}

