"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  Package, 
  MessageCircle, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  ChevronLeft,
  MapPin,
  Bell,
  Globe,
  Edit2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function ProfileContent() {
  const { user, logout, updateUser } = useAuthStore();
  const { toast } = useToast();
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: (user as any)?.phone || "",
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.name.trim()) {
      newErrors.name = "نام الزامی است";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "نام باید حداقل 2 کاراکتر باشد";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "شماره تماس الزامی است";
    } else if (!/^09\d{9}$/.test(formData.phone.trim())) {
      newErrors.phone = "شماره تماس باید با 09 شروع شود و 11 رقم باشد";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors: typeof errors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "رمز عبور فعلی الزامی است";
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = "رمز عبور جدید الزامی است";
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = "رمز عبور باید حداقل 6 کاراکتر باشد";
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = "تکرار رمز عبور الزامی است";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "رمز عبور و تکرار آن یکسان نیستند";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      toast({
        title: "خطا",
        description: "لطفاً خطاهای فرم را برطرف کنید",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "خطا",
        description: "کاربر یافت نشد",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || "خطا در به‌روزرسانی اطلاعات");
      }

      updateUser({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
      } as any);

      setIsEditingProfile(false);
      toast({
        title: "موفق",
        description: "اطلاعات با موفقیت به‌روزرسانی شد",
      });
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message || "خطا در به‌روزرسانی اطلاعات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) {
      toast({
        title: "خطا",
        description: "لطفاً خطاهای فرم را برطرف کنید",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "خطا",
        description: "کاربر یافت نشد",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          phone: (user as any)?.phone,
          password: passwordData.currentPassword,
        }),
      });

      const loginResult = await loginResponse.json();

      if (!loginResponse.ok || !loginResult.success) {
        setErrors({ currentPassword: "رمز عبور فعلی اشتباه است" });
        throw new Error("رمز عبور فعلی اشتباه است");
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          password: passwordData.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || "خطا در تغییر رمز عبور");
      }

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsEditingPassword(false);
      setShowPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      toast({
        title: "موفق",
        description: "رمز عبور با موفقیت تغییر کرد",
      });
    } catch (error: any) {
      if (error.message !== "رمز عبور فعلی اشتباه است") {
        toast({
          title: "خطا",
          description: error.message || "خطا در تغییر رمز عبور",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelProfile = () => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: (user as any)?.phone || "",
      });
    }
    setErrors({});
    setIsEditingProfile(false);
  };

  const handleCancelPassword = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setErrors({});
    setIsEditingPassword(false);
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">لطفاً ابتدا وارد حساب کاربری خود شوید</p>
          <Button asChild>
            <Link href="/auth">ورود / ثبت‌نام</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section with Gradient */}
      <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary-foreground/20 backdrop-blur-sm border-4 border-primary-foreground/30 flex items-center justify-center text-3xl sm:text-4xl font-bold text-primary-foreground">
                {getInitials(user.name || "U")}
              </div>
            </div>
            
            {/* Name */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{user.name || "کاربر"}</h1>
              <p className="text-primary-foreground/80 text-sm sm:text-base mt-1">
                {(user as any)?.phone || "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Account & Security Section */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            حساب کاربری و امنیت
          </h2>
          <div className="bg-card rounded-lg border border-border/30 divide-y divide-border/30">
            {/* Profile Item */}
            <button
              onClick={() => setIsEditingProfile(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium text-sm">ادیت پرفایل</span>
              </div>
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* Address Item */}
            <Link
              href="/profile/address"
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium text-sm">لوکیشن انتخوابی</span>
              </div>
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </Link>

            {/* Password Item */}
            <button
              onClick={() => setIsEditingPassword(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium text-sm">رمز عبور</span>
              </div>
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            تنظیمات
          </h2>
          <div className="bg-card rounded-lg border border-border/30 divide-y divide-border/30">
            {/* Orders Item */}
            <Link
              href="/orders"
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium text-sm">سفارش‌های من</span>
              </div>
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </Link>

            {/* Support Item */}
            <Link
              href="/chat"
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium text-sm">پشتیبانی</span>
              </div>
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 p-4 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors font-medium"
        >
          <LogOut className="h-5 w-5" />
          خروج از حساب
        </button>
      </div>

      {/* Edit Profile Sheet */}
      <Sheet open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>ویرایش پروفایل</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">نام</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                placeholder="نام خود را وارد کنید"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">شماره تماس</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData({ ...formData, phone: value });
                  if (errors.phone) setErrors({ ...errors, phone: undefined });
                }}
                placeholder="09123456789"
                maxLength={11}
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.phone}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "در حال ذخیره..." : "ذخیره"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelProfile}
                disabled={isLoading}
              >
                لغو
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Change Password Sheet */}
      <Sheet open={isEditingPassword} onOpenChange={setIsEditingPassword}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>تغییر رمز عبور</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">رمز عبور فعلی</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => {
                    setPasswordData({ ...passwordData, currentPassword: e.target.value });
                    if (errors.currentPassword) setErrors({ ...errors, currentPassword: undefined });
                  }}
                  placeholder="رمز عبور فعلی را وارد کنید"
                  className={`pr-10 ${errors.currentPassword ? "border-destructive" : ""}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.currentPassword}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">رمز عبور جدید</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => {
                    setPasswordData({ ...passwordData, newPassword: e.target.value });
                    if (errors.newPassword) setErrors({ ...errors, newPassword: undefined });
                  }}
                  placeholder="رمز عبور جدید را وارد کنید"
                  className={`pr-10 ${errors.newPassword ? "border-destructive" : ""}`}
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.newPassword}
                </p>
              )}
              {passwordData.newPassword && !errors.newPassword && passwordData.newPassword.length >= 6 && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  رمز عبور معتبر است
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">تکرار رمز عبور جدید</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => {
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                  }}
                  placeholder="رمز عبور جدید را دوباره وارد کنید"
                  className={`pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.confirmPassword}
                </p>
              )}
              {passwordData.confirmPassword &&
                !errors.confirmPassword &&
                passwordData.newPassword === passwordData.confirmPassword &&
                passwordData.confirmPassword.length >= 6 && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    رمز عبورها یکسان هستند
                  </p>
                )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleChangePassword}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "در حال تغییر..." : "تغییر رمز عبور"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelPassword}
                disabled={isLoading}
              >
                لغو
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function ProfilePage() {
  return <ProfileContent />;
}
