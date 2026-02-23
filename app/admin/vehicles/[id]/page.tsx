"use client";

import { VehicleForm } from "@/components/admin/vehicle-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVehicleStore } from "@/store/vehicle-store";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function EditVehiclePage() {
  const params = useParams();
  const id = params.id as string;
  const { getVehicle, loadVehiclesFromDB } = useVehicleStore();
  const [vehicle, setVehicle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadVehicle = async () => {
      setIsLoading(true);
      try {
        await loadVehiclesFromDB();
        const vehicleData = getVehicle(id);
        if (!vehicleData) {
          // Try to fetch from API
          const response = await fetch(`/api/vehicles/${id}`);
          if (response.ok) {
            const result = await response.json();
            setVehicle(result.data);
          }
        } else {
          setVehicle(vehicleData);
        }
      } catch (error) {
        console.error("Error loading vehicle:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadVehicle();
  }, [id, getVehicle, loadVehiclesFromDB]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">خودرو یافت نشد</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          ویرایش خودرو
        </h1>
        <p className="text-muted-foreground mt-1">
          اطلاعات خودرو را ویرایش کنید
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>فرم خودرو</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm vehicle={vehicle} />
        </CardContent>
      </Card>
    </div>
  );
}

