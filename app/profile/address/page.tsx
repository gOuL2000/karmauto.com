"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, ChevronRight, Loader2 } from "lucide-react";
import { LocationPicker } from "@/components/checkout/location-picker";
import { ProtectedRoute } from "@/components/auth/protected-route";

function ProfileAddressContent() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [profile, setProfile] = useState<{ address?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [initialLocation, setInitialLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile", { credentials: "include" });
        const data = await res.json();
        if (data.success && data.data?.user) {
          setProfile(data.data.user);
          const addr = data.data.user.address;
          if (addr) {
            try {
              const parsed = JSON.parse(addr);
              if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
                setInitialLocation({ lat: parsed.lat, lng: parsed.lng });
              }
            } catch {
              // address is plain string
            }
          }
        }
      } catch {
        toast({ title: "خطا", description: "بارگذاری پروفایل ناموفق بود", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [toast]);

  const displayAddress = (() => {
    if (!profile?.address) return null;
    try {
      const parsed = JSON.parse(profile.address);
      return typeof parsed.address === "string" ? parsed.address : profile.address;
    } catch {
      return profile.address;
    }
  })();

  const handleLocationSelect = async (location: { lat: number; lng: number; address?: string }) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const payload = JSON.stringify({
        lat: location.lat,
        lng: location.lng,
        address: location.address || `${location.lat}, ${location.lng}`,
      });
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ address: payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "خطا در ذخیره");
      }
      setProfile((prev) => (prev ? { ...prev, address: payload } : { address: payload }));
      setInitialLocation({ lat: location.lat, lng: location.lng });
      toast({ title: "ذخیره شد", description: "لوکیشن انتخوابی با موفقیت ذخیره شد." });
      setShowLocationPicker(false);
    } catch (e: any) {
      toast({
        title: "خطا",
        description: e.message || "ذخیره لوکیشن ناموفق بود",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/profile" className="hover:text-foreground">
            پروفایل
          </Link>
          <ChevronRight className="h-4 w-4 rotate-180" />
          <span className="text-foreground">لوکیشن انتخوابی</span>
        </div>

        <h1 className="text-xl font-semibold mb-4">لوکیشن انتخوابی</h1>
        <p className="text-sm text-muted-foreground mb-6">
          روی نقشه موقعیت خود را انتخاب کنید تا در سفارش‌ها از آن استفاده شود.
        </p>

        <div className="bg-card rounded-lg border border-border/30 overflow-hidden">
          {displayAddress && (
            <div className="p-4 border-b border-border/30 flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">آدرس ذخیره‌شده</p>
                <p className="text-sm font-medium break-words">{displayAddress}</p>
              </div>
            </div>
          )}
          <div className="p-4">
            <Button
              onClick={() => setShowLocationPicker(true)}
              disabled={saving}
              className="w-full justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {displayAddress ? "تغییر لوکیشن روی نقشه" : "انتخاب لوکیشن روی نقشه"}
            </Button>
          </div>
        </div>
      </div>

      <LocationPicker
        open={showLocationPicker}
        onOpenChange={setShowLocationPicker}
        onLocationSelect={handleLocationSelect}
        initialLocation={initialLocation}
      />
    </div>
  );
}

export default function ProfileAddressPage() {
  return (
    <ProtectedRoute>
      <ProfileAddressContent />
    </ProtectedRoute>
  );
}
