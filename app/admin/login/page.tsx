"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Loader2 } from "lucide-react";
export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  // اگر قبلاً با کوکی سشن ادمین وارد شده‌اند، به پنل هدایت شوند (هیچ توکنی در کلاینت ذخیره نمی‌شود)
  useEffect(() => {
    fetch("/api/admin/me", {
      method: "GET",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json) => {
        if (json?.success && json?.data?.user) router.push("/admin");
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast({
        title: "خطا",
        description: "لطفاً رمز عبور را وارد کنید",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "موفق",
          description: "ورود با موفقیت انجام شد",
        });
        // نشست با کوکی سشن ست شده؛ با بستن تب پاک می‌شود. ریدایرکت با بارگذاری کامل تا کوکی در درخواست بعدی فرستاده شود.
        window.location.href = "/admin";
      } else {
        toast({
          title: "خطا",
          description: result.error || "رمز عبور اشتباه است",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message || "خطا در اتصال به سرور",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-page min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-6 sm:px-6 sm:py-8">
      <Card className="admin-login-card w-full max-w-md min-w-0 overflow-hidden shadow-lg">
        <CardHeader className="space-y-1 text-center px-4 sm:px-6 pt-6 pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Lock className="h-8 w-8 text-primary" aria-hidden />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">ورود ادمین</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            برای دسترسی به پنل مدیریت، رمز عبور ادمین را وارد کنید
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4 w-full min-w-0">
            <div className="space-y-2 w-full min-w-0">
              <Label htmlFor="password" className="text-sm sm:text-base">رمز عبور ادمین</Label>
              <Input
                id="password"
                type="password"
                placeholder="رمز عبور را وارد کنید"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoFocus
                autoComplete="current-password"
                className="w-full min-w-0 text-center text-base max-w-full box-border"
              />
            </div>
            <Button
              type="submit"
              className="w-full min-w-0"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  در حال ورود...
                </>
              ) : (
                "ورود"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

