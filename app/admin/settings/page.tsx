"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, Save, PanelBottom, FileText, Globe, Upload, X, Image as ImageIcon } from "lucide-react";
import { useAdminStore } from "@/store/admin-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FooterContentEditor } from "@/components/admin/footer-content-editor";
import { PageContentEditor } from "@/components/admin/page-content-editor";

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  logoUrl: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  emailNotifications: boolean;
  lowStockThreshold: number;
  itemsPerPage: number;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { updateSettings: updateAdminSettings } = useAdminStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: "",
    siteDescription: "",
    logoUrl: "",
    maintenanceMode: false,
    allowRegistration: true,
    emailNotifications: true,
    lowStockThreshold: 10,
    itemsPerPage: 10,
  });

  // داخل layout ادمین هستیم؛ دسترسی قبلاً با توکن بررسی شده — فقط تنظیمات را بار کن
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Load from API
      const response = await fetch("/api/site-settings");
      // #region agent log - Disabled
      // #endregion
      if (response.ok) {
        const result = await response.json();
        // #region agent log - Disabled
        // #endregion
        if (result.success && result.data) {
          setSettings(prev => ({ ...prev, ...result.data }));
        
        // Sync with admin store
        updateAdminSettings({
            siteName: result.data.siteName ?? "",
            logoUrl: result.data.logoUrl ?? "",
            lowStockThreshold: result.data.lowStockThreshold ?? 10,
            itemsPerPage: result.data.itemsPerPage ?? 10,
        });
        } else {
          // #region agent log - Disabled
          // #endregion
          throw new Error(result.error || "ساختار پاسخ نامعتبر است");
        }
      } else {
        const errorText = await response.text().catch(() => "Unknown error");
        // #region agent log - Disabled
        // #endregion
        throw new Error(`خطا در بارگذاری تنظیمات از سرور: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      // #region agent log - Disabled to prevent ERR_CONNECTION_REFUSED errors
      // #endregion
      console.error("Error loading settings:", error);
      toast({
        title: "خطا",
        description: error.message || "خطا در بارگذاری تنظیمات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // #region agent log - Disabled to prevent ERR_CONNECTION_REFUSED errors
      // #endregion
      
      const response = await fetch("/api/site-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      // #region agent log - Disabled
      // #endregion

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "خطا در ذخیره تنظیمات");
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "خطا در ذخیره تنظیمات");
      }
      
      // Sync with admin store
      updateAdminSettings({
        siteName: settings.siteName,
        logoUrl: settings.logoUrl,
        lowStockThreshold: settings.lowStockThreshold,
        itemsPerPage: settings.itemsPerPage,
      });
      
      // Save to localStorage for Header/Sidebar components
      try {
        localStorage.setItem("admin_site_settings", JSON.stringify(settings));
      } catch (storageError) {
        console.warn("Failed to save settings to localStorage:", storageError);
      }
      
      // Dispatch custom event to update header/sidebar in same tab
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("settingsUpdated"));
      }
      
      toast({
        title: "موفق",
        description: "تنظیمات با موفقیت در دیتابیس ذخیره شد",
      });
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message || "خطا در ذخیره تنظیمات",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="w-full max-w-6xl mx-auto px-0 py-8 sm:px-4 sm:py-12">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              دسترسی غیرمجاز
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-0 py-8 sm:px-4 sm:py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-0 py-4 sm:px-4 sm:py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="h-8 w-8" />
          تنظیمات سایت
        </h1>
        <p className="text-muted-foreground mt-2">
          مدیریت تنظیمات عمومی سایت، فوتر و محتوای صفحات
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            تنظیمات عمومی
          </TabsTrigger>
          <TabsTrigger value="footer" className="flex items-center gap-2">
            <PanelBottom className="h-4 w-4" />
            فوتر
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            محتوای صفحات
          </TabsTrigger>
        </TabsList>

        {/* تنظیمات عمومی */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>تنظیمات عمومی سایت</CardTitle>
              <CardDescription>
                تنظیمات اصلی و عمومی سایت
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">
                      نام سایت <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="siteName"
                      placeholder="نام سایت را وارد کنید"
                      value={settings.siteName}
                      onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                      disabled={isSaving}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo">لوگوی سایت</Label>
                    <div className="space-y-3">
                      {settings.logoUrl ? (
                        <div className="relative inline-block">
                          <div className="relative w-32 h-32 border-2 border-border rounded-lg overflow-hidden bg-muted">
                            <img
                              src={settings.logoUrl}
                              alt="لوگوی سایت"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={() => setSettings({ ...settings, logoUrl: "" })}
                            disabled={isSaving}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div
                            onClick={() => {
                              if (!isSaving) {
                                document.getElementById("logo-upload")?.click();
                              }
                            }}
                            className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors bg-muted/20"
                          >
                            <div className="text-center">
                              <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">آپلود لوگو</p>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground mb-2">
                              فرمت‌های مجاز: JPG, PNG, WebP
                            </p>
                            <p className="text-sm text-muted-foreground">
                              حداکثر حجم: 5 مگابایت
                            </p>
                          </div>
                        </div>
                      )}
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          // Validate file type
                          if (!file.type.startsWith("image/")) {
                            toast({
                              title: "خطا",
                              description: "فقط فایل‌های تصویری مجاز هستند",
                              variant: "destructive",
                            });
                            return;
                          }

                          // Validate file size (max 5MB)
                          if (file.size > 5 * 1024 * 1024) {
                            toast({
                              title: "خطا",
                              description: "حجم فایل باید کمتر از 5 مگابایت باشد",
                              variant: "destructive",
                            });
                            return;
                          }

                          try {
                            // Convert to base64
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = event.target?.result as string;
                              setSettings({ ...settings, logoUrl: base64 });
                              toast({
                                title: "موفق",
                                description: "لوگو با موفقیت آپلود شد",
                              });
                            };
                            reader.onerror = () => {
                              toast({
                                title: "خطا",
                                description: "خطا در خواندن فایل",
                                variant: "destructive",
                              });
                            };
                            reader.readAsDataURL(file);
                          } catch (error) {
                            toast({
                              title: "خطا",
                              description: "خطا در آپلود لوگو",
                              variant: "destructive",
                            });
                          }

                          // Reset input
                          e.target.value = "";
                        }}
                        disabled={isSaving}
                      />
                      {!settings.logoUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("logo-upload")?.click()}
                          disabled={isSaving}
                          className="gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          انتخاب لوگو
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siteDescription">توضیحات سایت</Label>
                  <Textarea
                    id="siteDescription"
                    placeholder="توضیحات سایت را وارد کنید"
                    value={settings.siteDescription}
                    onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                    disabled={isSaving}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="lowStockThreshold">حد آستانه موجودی کم</Label>
                    <Input
                      id="lowStockThreshold"
                      type="number"
                      min="0"
                      step="1"
                      value={settings.lowStockThreshold}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setSettings({ ...settings, lowStockThreshold: Math.max(0, value) });
                      }}
                      disabled={isSaving}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      محصولاتی که موجودی آنها کمتر از این عدد باشد، به عنوان موجودی کم نمایش داده می‌شوند
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemsPerPage">تعداد آیتم در هر صفحه</Label>
                    <Input
                      id="itemsPerPage"
                      type="number"
                      min="1"
                      step="1"
                      value={settings.itemsPerPage}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 10;
                        setSettings({ ...settings, itemsPerPage: Math.max(1, value) });
                      }}
                      disabled={isSaving}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      تعداد محصولاتی که در هر صفحه نمایش داده می‌شوند
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        در حال ذخیره...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        ذخیره تنظیمات
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تنظیمات فوتر */}
        <TabsContent value="footer">
          <Card>
            <CardHeader>
              <CardTitle>تنظیمات فوتر</CardTitle>
              <CardDescription>
                مدیریت محتوای فوتر سایت
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FooterContentEditor />
            </CardContent>
          </Card>
        </TabsContent>

        {/* محتوای صفحات */}
        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>محتوای صفحات</CardTitle>
              <CardDescription>
                ویرایش محتوای صفحات مختلف سایت
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PageContentEditor />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
