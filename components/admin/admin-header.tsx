"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { User, LogOut, Bell, Search, Lock, MessageCircle, Eye, EyeOff, CheckCircle2, Loader2, Menu, X, Pencil, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
export type AdminHeaderUser = {
  id: string;
  name: string;
  phone: string;
  role?: string;
};

interface AdminHeaderProps {
  adminUser: AdminHeaderUser | null;
  onSearch?: (query: string) => void;
  onOpenMobileMenu?: () => void;
}

export function AdminHeader({ adminUser, onSearch, onOpenMobileMenu }: AdminHeaderProps) {
  const router = useRouter();
  const user = adminUser;
  const [mounted, setMounted] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync profile fields when dialog opens or user changes
  useEffect(() => {
    if (user) {
      setProfileName(user.name || "ادمین");
      setProfilePhone(user.phone || "");
    }
  }, [user, profileDialogOpen]);

  const getAdminAuthHeaders = (): HeadersInit => {
    return { "Content-Type": "application/json" };
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    const name = profileName.trim();
    if (!name) {
      toast({ title: "خطا", description: "نام نمی‌تواند خالی باشد", variant: "destructive" });
      return;
    }
    setIsLoadingProfile(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: getAdminAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ name, phone: profilePhone.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "خطا", description: data.error || "خطا در به‌روزرسانی", variant: "destructive" });
        return;
      }
      // به‌روزرسانی نمایشی در همین کامپوننت؛ layout دوباره /api/admin/me نمی‌زند مگر رفرش
      setProfileName(name);
      setProfilePhone(profilePhone.trim() || "");
      toast({ title: "موفق", description: "نام و شماره با موفقیت به‌روزرسانی شد" });
      setIsEditingProfile(false);
    } catch (e) {
      toast({ title: "خطا", description: "خطا در ارتباط با سرور", variant: "destructive" });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // بی‌درنگ و قابل اعتماد: poll کوتاه + refetch روی رویداد/visibility/focus
  const fetchTotalUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/chat/unread-count?all=true", {
        credentials: "include",
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data?.chats)) {
          const total = data.data.chats.reduce(
            (sum: number, chat: { unreadCount?: number }) => sum + (Number(chat?.unreadCount) || 0),
            0
          );
          setTotalUnreadCount(total);
        }
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, []);

  useEffect(() => {
    fetchTotalUnreadCount();
    const delayed = setTimeout(fetchTotalUnreadCount, 200);
    const interval = setInterval(fetchTotalUnreadCount, 2000);
    const onInvalidate = () => fetchTotalUnreadCount();
    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") fetchTotalUnreadCount();
    };
    const onFocus = () => fetchTotalUnreadCount();
    window.addEventListener("adminChatUnreadInvalidate", onInvalidate);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(delayed);
      clearInterval(interval);
      window.removeEventListener("adminChatUnreadInvalidate", onInvalidate);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchTotalUnreadCount]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword.trim()) {
      toast({
        title: "خطا",
        description: "لطفاً رمز عبور جدید را وارد کنید",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "خطا",
        description: "رمز عبور باید حداقل 6 کاراکتر باشد",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "خطا",
        description: "رمز عبور جدید و تأیید آن مطابقت ندارند",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingPassword(true);

    try {
      const response = await fetch("/api/admin/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          password: newPassword,
          currentPassword: currentPassword || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "موفق",
          description: "رمز عبور با موفقیت تغییر کرد",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordDialogOpen(false);
      } else {
        toast({
          title: "خطا",
          description: result.error || "خطا در تغییر رمز عبور",
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
      setIsLoadingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    try {
      sessionStorage.removeItem("adminUserId");
      sessionStorage.removeItem("adminToken");
    } catch {
      // ignore
    }
    window.location.href = "/admin/login";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex h-12 sm:h-14 lg:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-4 lg:px-6">
        {/* Mobile menu button - only one, inside header so it doesn't stack */}
        {onOpenMobileMenu && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0 h-9 w-9 sm:h-10 sm:w-10"
            onClick={onOpenMobileMenu}
            title="منوی مدیریت"
            aria-label="منوی مدیریت"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {/* Search */}
        {onSearch && (
          <div className="flex-1 min-w-0 max-w-md">
            <div className="relative">
              <Search className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="جستجو..."
                className="pr-8 sm:pr-10 h-9 sm:h-10 text-sm"
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-2 md:gap-4 mr-auto shrink-0">
          {/* Chat */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 sm:h-10 sm:w-10"
            onClick={() => router.push("/admin/chat")}
            title="چت با کاربران"
          >
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            {totalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center border-2 border-background shadow-sm">
                !
              </span>
            )}
          </Button>

          {/* Notifications - dot shown only when notification feature is implemented */}
          <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10" title="اعلان‌ها">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {/* User / Account - Dialog like main site profile */}
          {mounted ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 sm:h-10 sm:w-10"
                onClick={() => setProfileDialogOpen(true)}
                aria-label="حساب کاربری"
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
                <DialogContent className="bg-transparent border-0 shadow-none p-0 max-w-none w-auto min-w-0 overflow-visible">
                  <div className="admin-account-dialog-panel w-full max-w-[min(420px,calc(100vw-2rem))] mx-auto rounded-lg border border-border/30 bg-background p-4 sm:p-6 shadow-lg">
                    <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
                      <DialogTitle className="text-lg font-semibold">حساب کاربری</DialogTitle>
                      <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full shrink-0">
                          <X className="h-5 w-5" />
                          <span className="sr-only">بستن</span>
                        </Button>
                      </DialogClose>
                    </div>
                    <div className="space-y-4 pt-1">
                      <div className="rounded-lg bg-muted/50 p-4">
                        {isEditingProfile ? (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">نام نمایشی</Label>
                              <Input
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                placeholder="نام ادمین"
                                className="mt-1 h-9"
                                disabled={isLoadingProfile}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">شماره تماس (اختیاری)</Label>
                              <Input
                                value={profilePhone}
                                onChange={(e) => setProfilePhone(e.target.value)}
                                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                                className="mt-1 h-9"
                                disabled={isLoadingProfile}
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                className="gap-1.5"
                                onClick={handleSaveProfile}
                                disabled={isLoadingProfile}
                              >
                                {isLoadingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                ذخیره
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setIsEditingProfile(false);
                                  setProfileName(user?.name || "ادمین");
                                  setProfilePhone(user?.phone || "");
                                }}
                                disabled={isLoadingProfile}
                              >
                                انصراف
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-semibold">{user?.name || "ادمین"}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {user?.phone ? user.phone : "شماره تماس ثبت نشده"}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 gap-1.5 h-8 text-xs"
                              onClick={() => setIsEditingProfile(true)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              ویرایش نام و شماره
                            </Button>
                          </>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2 h-11"
                        onClick={() => {
                          setProfileDialogOpen(false);
                          setPasswordDialogOpen(true);
                        }}
                      >
                        <Lock className="h-4 w-4" />
                        تغییر رمز عبور
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2 h-11 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          setProfileDialogOpen(false);
                          handleLogout();
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        خروج از حساب
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 sm:h-10 sm:w-10" disabled>
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              تغییر رمز عبور ادمین
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">
                رمز عبور فعلی (اختیاری برای اولین بار)
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="رمز عبور فعلی را وارد کنید"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isLoadingPassword}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={isLoadingPassword}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">
                رمز عبور جدید <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="رمز عبور جدید را وارد کنید (حداقل 6 کاراکتر)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoadingPassword}
                  className="pr-10"
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isLoadingPassword}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                تأیید رمز عبور جدید <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="رمز عبور جدید را دوباره وارد کنید"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoadingPassword}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoadingPassword}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">
                  رمز عبور جدید و تأیید آن مطابقت ندارند
                </p>
              )}
              {confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  رمز عبور جدید معتبر است
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPasswordDialogOpen(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                disabled={isLoadingPassword}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoadingPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
              >
                {isLoadingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    در حال تغییر...
                  </>
                ) : (
                  "تغییر رمز عبور"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}

