"use client";

import { SupplierForm } from "@/components/admin/supplier-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewSupplierPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          افزودن تامین‌کننده جدید
        </h1>
        <p className="text-muted-foreground mt-1">
          اطلاعات تامین‌کننده جدید را وارد کنید
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>فرم تامین‌کننده</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm />
        </CardContent>
      </Card>
    </div>
  );
}

