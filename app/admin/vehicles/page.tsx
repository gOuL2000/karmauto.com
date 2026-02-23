"use client";

import { VehicleTable } from "@/components/admin/vehicle-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVehicleStore } from "@/store/vehicle-store";
import { Plus, Car } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function VehiclesPage() {
  const { vehicles, loadVehiclesFromDB } = useVehicleStore();
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const loadVehicles = async () => {
      setIsLoading(true);
      try {
        await loadVehiclesFromDB();
      } catch (error) {
        console.error("Error loading vehicles:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadVehicles();
  }, [loadVehiclesFromDB, pathname]);

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              خودروها ({vehicles.length})
            </CardTitle>
            <Button asChild size="sm">
              <Link href="/admin/vehicles/new">
                <Plus className="ml-2 h-4 w-4" />
                افزودن خودرو
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">در حال بارگذاری...</div>
          ) : (
            <VehicleTable vehicles={vehicles} onRefresh={() => loadVehiclesFromDB()} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

