"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, Lock, ArrowRight, ArrowLeft, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { validateIranianPhone, normalizePhone, validateStrongPassword } from "@/lib/validations/auth";

export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { register, login, isAuthenticated, checkAuth, hasCheckedAuth, isCheckingAuth, user } = useAuthStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  
  // IMPORTANT: Prevent admin from using regular user login/register page
  // Admin should use /admin/login instead
  useEffect(() => {
    if (hasCheckedAuth && user?.role === "admin") {
      router.replace("/admin");
      return;
    }
  }, [hasCheckedAuth, user, router]);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  // State برای اعتبارسنجی real-time
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  // پیام خطای ورود/ثبت‌نام از سرور (نمایش در فرم)
  const [formError, setFormError] = useState<string | null>(null);

  // اعتبارسنجی real-time
  const validateField = (field: string, value: string) => {
    const errors: typeof validationErrors = { ...validationErrors };

    if (field === "phone") {
      if (!value.trim()) {
        errors.phone = "شماره تماس الزامی است";
      } else if (!validateIranianPhone(value)) {
        errors.phone = "شماره تماس معتبر نیست. فرمت صحیح: 09123456789";
      } else {
        delete errors.phone;
      }
    }

    if (field === "password") {
      if (!value) {
        errors.password = "رمز عبور الزامی است";
      } else {
        const passwordValidation = validateStrongPassword(value);
        if (!passwordValidation.valid) {
          errors.password = passwordValidation.errors[0] || "رمز عبور ضعیف است";
        } else {
          delete errors.password;
        }
      }

      // بررسی تطابق با confirmPassword
      if (mode === "register" && formData.confirmPassword) {
        if (value !== formData.confirmPassword) {
          errors.confirmPassword = "رمز عبور و تکرار آن یکسان نیستند";
        } else {
          delete errors.confirmPassword;
        }
      }
    }

    if (field === "confirmPassword" && mode === "register") {
      if (!value) {
        errors.confirmPassword = "تکرار رمز عبور الزامی است";
      } else if (value !== formData.password) {
        errors.confirmPassword = "رمز عبور و تکرار آن یکسان نیستند";
      } else {
        delete errors.confirmPassword;
      }
    }

    if (field === "name" && mode === "register") {
      if (!value.trim()) {
        errors.name = "نام الزامی است";
      } else if (value.trim().length < 2) {
        errors.name = "نام باید حداقل 2 کاراکتر باشد";
      } else if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(value.trim())) {
        errors.name = "نام باید فقط شامل حروف فارسی یا انگلیسی باشد";
      } else {
        delete errors.name;
      }
    }

    setValidationErrors(errors);
  };

  // Check cookie-based session before redirecting away from /auth
  useEffect(() => {
    if (!hasCheckedAuth && !isCheckingAuth) {
      checkAuth();
    }
  }, [hasCheckedAuth, isCheckingAuth, checkAuth]);

  // Redirect if already authenticated - use store only
  useEffect(() => {
    if (!hasCheckedAuth) return; // Wait for auth check to complete
    
    if (isAuthenticated) {
      // IMPORTANT: If user is admin, redirect to admin panel instead of regular user pages
      // Admin should use /admin/login, not /auth
      const { user } = useAuthStore.getState();
      if (user?.role === "admin") {
        router.replace("/admin");
        return;
      }
      
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get("redirect") || "/";
      
      // Only redirect if not already on target page and not auth page
      if (redirectTo !== window.location.pathname && redirectTo !== "/auth" && window.location.pathname === "/auth") {
        router.replace(redirectTo);
      }
    }
  }, [hasCheckedAuth, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsLoading(true);

    try {
      if (mode === "register") {
        // Validation
        if (!formData.name.trim()) {
          toast({
            title: "خطا",
            description: "لطفاً نام خود را وارد کنید",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        if (!formData.phone.trim() || formData.phone.length < 10) {
          toast({
            title: "خطا",
            description: "لطفاً شماره تماس معتبر وارد کنید",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          toast({
            title: "خطا",
            description: "رمز عبور باید حداقل 6 کاراکتر باشد",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          toast({
            title: "خطا",
            description: "رمز عبور و تکرار آن یکسان نیستند",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        try {
          await register(formData.name, formData.phone, formData.password);
          
          toast({
            title: "ثبت‌نام موفق",
            description: "حساب کاربری شما با موفقیت ایجاد شد",
          });

          // Redirect immediately - user is already set in store
          const urlParams = new URLSearchParams(window.location.search);
          const redirectTo = urlParams.get("redirect") || "/";
          router.replace(redirectTo);
        } catch (registerError: any) {
          const errorMessage = registerError?.message || "خطا در ثبت‌نام. لطفاً دوباره تلاش کنید";
          setFormError(errorMessage);
          toast({
            title: "خطا در ثبت‌نام",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } else {
        // Login
        if (!formData.phone.trim() || !formData.password.trim()) {
          toast({
            title: "خطا",
            description: "لطفاً شماره تماس و رمز عبور را وارد کنید",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const result = await login(formData.phone, formData.password);
        
        if (result.success) {
          toast({
            title: "ورود موفق",
            description: "به ساد خوش آمدید",
          });
          const urlParams = new URLSearchParams(window.location.search);
          const redirectTo = urlParams.get("redirect") || "/";
          router.replace(redirectTo);
        } else {
          setFormError(result.error);
        }
      }
    } catch (error: any) {
      const msg = error.message || "خطایی رخ داد. لطفاً دوباره تلاش کنید";
      setFormError(msg);
      toast({
        title: "خطا",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // تا پایان بررسی سشن، فرم را نشان نده تا از فلش و ریدایرکت ناگهانی جلوگیری شود
  if (!hasCheckedAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">در حال بررسی...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-border/30 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {mode === "login" ? "ورود به حساب کاربری" : "ثبت‌نام"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "برای ادامه وارد حساب کاربری خود شوید"
                : "حساب کاربری جدید ایجاد کنید"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    نام و نام خانوادگی
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="مثال: علی احمدی"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      validateField("name", e.target.value);
                    }}
                    onBlur={(e) => validateField("name", e.target.value)}
                    required={mode === "register"}
                    className={`h-11 ${validationErrors.name ? "border-destructive" : ""}`}
                  />
                  {validationErrors.name && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.name}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  شماره تماس
                </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="09123456789"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      validateField("phone", e.target.value);
                    }}
                    onBlur={(e) => validateField("phone", e.target.value)}
                    required
                    className={`h-11 ${validationErrors.phone ? "border-destructive" : ""}`}
                  />
                  {validationErrors.phone && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.phone}
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  رمز عبور
                </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={mode === "register" ? "حداقل 6 کاراکتر" : "رمز عبور خود را وارد کنید"}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      validateField("password", e.target.value);
                    }}
                    onBlur={(e) => validateField("password", e.target.value)}
                    required
                    minLength={mode === "register" ? 6 : undefined}
                    className={`h-11 ${validationErrors.password ? "border-destructive" : ""}`}
                  />
                  {validationErrors.password && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.password}
                    </p>
                  )}
                  {mode === "register" && formData.password && !validationErrors.password && (
                    <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3 w-3" />
                      رمز عبور معتبر است
                    </p>
                  )}
              </div>

              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    تکرار رمز عبور
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="رمز عبور را دوباره وارد کنید"
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value });
                      validateField("confirmPassword", e.target.value);
                    }}
                    onBlur={(e) => validateField("confirmPassword", e.target.value)}
                    required
                    className={`h-11 ${validationErrors.confirmPassword ? "border-destructive" : ""}`}
                  />
                  {validationErrors.confirmPassword && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.confirmPassword}
                    </p>
                  )}
                  {formData.confirmPassword && !validationErrors.confirmPassword && formData.password === formData.confirmPassword && (
                    <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3 w-3" />
                      رمز عبورها یکسان هستند
                    </p>
                  )}
                </div>
              )}

              {formError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{formError}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  "در حال پردازش..."
                ) : mode === "login" ? (
                  <>
                    ورود
                    <ArrowLeft className="h-4 w-4 mr-2" />
                  </>
                ) : (
                  <>
                    ثبت‌نام
                    <ArrowRight className="h-4 w-4 mr-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setFormData({
                    name: "",
                    phone: "",
                    password: "",
                    confirmPassword: "",
                  });
                  setValidationErrors({});
                  setFormError(null);
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {mode === "login" ? (
                  <>
                    حساب کاربری ندارید؟{" "}
                    <span className="text-primary font-semibold">ثبت‌نام کنید</span>
                  </>
                ) : (
                  <>
                    قبلاً ثبت‌نام کرده‌اید؟{" "}
                    <span className="text-primary font-semibold">وارد شوید</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 text-center">
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                بازگشت به صفحه اصلی
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}


