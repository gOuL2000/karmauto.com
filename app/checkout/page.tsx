"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCartStore } from "@/store/cart-store";
import { useOrderStore } from "@/store/order-store";
import { useProductStore } from "@/store/product-store";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Loader2, ArrowRight, AlertCircle, Package, MapPin, User, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { checkoutFormSchema, sanitizeCheckoutInput, type CheckoutFormData } from "@/lib/validations/checkout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { LocationPicker } from "@/components/checkout/location-picker";
import { cn } from "@/lib/utils";

function CheckoutPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { items, getTotal, shippingMethod, clearCart } = useCartStore();
  const { addOrder, loadOrdersFromDB } = useOrderStore();
  const { getProduct } = useProductStore();
  const { user, isAuthenticated, checkAuth, hasCheckedAuth, isCheckingAuth } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [addressType, setAddressType] = useState<"location" | "postalCode" | "address">("address");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    mode: "onChange", // اعتبارسنجی هنگام تغییر
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      addressType: "address",
      location: "",
      address: "",
      city: "",
      postalCode: "",
      province: "",
      notes: "",
    },
  });

  // Watch addressType برای همگام‌سازی با state
  const watchedAddressType = watch("addressType");
  
  // Watch all form fields to check if they have values
  const firstName = watch("firstName");
  const lastName = watch("lastName");
  const phone = watch("phone");
  const email = watch("email");
  const postalCode = watch("postalCode");
  const address = watch("address");
  const notes = watch("notes");
  const location = watch("location");
  
  // همگام‌سازی state با form value
  useEffect(() => {
    if (watchedAddressType && watchedAddressType !== addressType) {
      setAddressType(watchedAddressType as "location" | "postalCode" | "address");
    }
  }, [watchedAddressType, addressType]);

  // Authentication removed - checkout is now open to everyone

  // بارگذاری اطلاعات checkout از localStorage یا auth store
  useEffect(() => {
    if (isAuthenticated && user) {
      // اگر کاربر لاگین است، از اطلاعات کاربر استفاده کن
      const nameParts = user.name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      reset({
        firstName,
        lastName,
        phone: user.phone || "",
        email: "",
        addressType: "address",
        location: "",
        address: "",
        city: "",
        postalCode: "",
        province: "",
        notes: "",
      });
    } else {
      // اگر لاگین نیست، از localStorage استفاده کن
      const checkoutData = localStorage.getItem("checkoutData");
      if (checkoutData) {
        try {
          const data = JSON.parse(checkoutData);
          if (data.formData) {
            reset({
              firstName: data.formData.firstName || "",
              lastName: data.formData.lastName || "",
              phone: data.formData.phone || "",
              email: data.formData.email || "",
              addressType: data.formData.addressType || "address",
              location: data.formData.location || "",
              address: data.formData.address || "",
              city: data.formData.city || "",
              postalCode: data.formData.postalCode || "",
              province: data.formData.province || "",
              notes: data.formData.notes || "",
            });
            if (data.formData.addressType) {
              setAddressType(data.formData.addressType);
            }
          }
        } catch (error) {
          console.error("Error loading checkout data:", error);
        }
      }
    }
  }, [reset, isAuthenticated, user]);

  const total = getTotal();
  
  // Calculate shipping cost based on products and selected shipping method
  const calculateShippingCost = () => {
    if (!shippingMethod || items.length === 0) return 0;
    
    // Get the maximum shipping cost from all products (if multiple products, use the highest)
    let maxShippingCost = 0;
    
    for (const item of items) {
      const product = getProduct(item.id);
      if (product) {
        const productShippingCost = shippingMethod === "air" 
          ? (product.airShippingCost ?? null)
          : (product.seaShippingCost ?? null);
        
        if (productShippingCost !== null && productShippingCost > maxShippingCost) {
          maxShippingCost = productShippingCost;
        }
      }
    }
    
    // If no shipping cost is set for products, use default logic (free over 500k)
    if (maxShippingCost === 0) {
      return total > 500000 ? 0 : 50000;
    }
    
    return maxShippingCost;
  };
  
  const shipping = calculateShippingCost();
  const finalTotal = total + shipping;

  // Sanitize phone input (only numbers)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) {
      setValue("phone", value);
    }
  };

  // Sanitize postal code input (only numbers)
  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) {
      setValue("postalCode", value);
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    try {
      console.log("onSubmit called with data:", data);
      setSubmitAttempted(true);
      setIsSubmitting(true);

      // Sanitize data
      const sanitizedData = sanitizeCheckoutInput(data);
      console.log("Sanitized data:", sanitizedData);
      console.log("Items count:", items.length);
      console.log("Items:", items);

      // بررسی اینکه سبد خرید خالی نباشد
      if (items.length === 0) {
        console.error("Cart is empty!");
        toast({
          title: "خطا",
          description: "سبد خرید شما خالی است",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // بررسی اینکه مبلغ نهایی معتبر باشد
      console.log("Final total:", finalTotal);
      if (finalTotal <= 0 || !isFinite(finalTotal)) {
        console.error("Invalid final total:", finalTotal);
        toast({
          title: "خطا",
          description: "مبلغ سفارش نامعتبر است",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // بررسی و اعتبارسنجی items قبل از ارسال
      console.log("Validating items...");
      let validatedItems;
      try {
        validatedItems = items.map((item) => {
          console.log("Validating item:", item);
          // بررسی فیلدهای ضروری
          if (!item || typeof item !== "object") {
            console.error("Invalid item object:", item);
            throw new Error("آیتم سفارش نامعتبر است");
          }

          if (!item.id || String(item.id).trim() === "") {
            console.error("Item missing id:", item);
            throw new Error("شناسه محصول مشخص نشده است");
          }

          if (!item.name || String(item.name).trim() === "") {
            console.error("Item missing name:", item);
            throw new Error(`نام محصول برای شناسه "${item.id}" مشخص نشده است`);
          }

          if (item.price === undefined || item.price === null || isNaN(Number(item.price))) {
            console.error("Item missing or invalid price:", item);
            throw new Error(`قیمت محصول "${item.name || item.id}" مشخص نشده است`);
          }

          if (item.quantity === undefined || item.quantity === null || isNaN(Number(item.quantity))) {
            console.error("Item missing or invalid quantity:", item);
            throw new Error(`تعداد محصول "${item.name || item.id}" مشخص نشده است`);
          }

          // اگر image خالی بود، از product store بگیر
          let imageUrl = item.image ? String(item.image).trim() : "";
          if (!imageUrl) {
            const product = getProduct(item.id);
            if (product && product.images && product.images.length > 0) {
              imageUrl = product.images[0];
            }
          }

          const validatedItem = {
            id: String(item.id).trim(),
            name: String(item.name).trim(),
            price: Number(item.price),
            quantity: Number(item.quantity),
            image: imageUrl || "",
          };
          console.log("Validated item:", validatedItem);
          return validatedItem;
        });
        console.log("All items validated:", validatedItems);
      } catch (validationError) {
        console.error("Validation error:", validationError);
        toast({
          title: "خطا",
          description: validationError instanceof Error ? validationError.message : "خطا در اعتبارسنجی محصولات",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // ابتدا سفارش را ثبت می‌کنیم (بدون پرداخت)
      console.log("Sending order creation request...");
      
      // Prepare headers
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      // In development, send userId in header as fallback if session cookie fails
      if (process.env.NODE_ENV === 'development' && user?.id) {
        headers['x-user-id'] = user.id;
        console.log('[Checkout] Adding userId header (development fallback):', user.id);
      }
      
      const orderResponse = await fetch("/api/orders/create", {
        method: "POST",
        credentials: "include", // CRITICAL: Include cookies for session
        headers,
        body: JSON.stringify({
          items: validatedItems,
          formData: sanitizedData,
          total: finalTotal,
          shippingCost: shipping,
          shippingMethod,
        }),
      });

      console.log("Order response status:", orderResponse.status);
      if (!orderResponse.ok) {
        let errorData: any = {};
        try {
          const responseText = await orderResponse.text();
          console.error("Order creation failed - response text:", responseText);
          if (responseText) {
            errorData = JSON.parse(responseText);
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
          errorData = { error: `HTTP error! status: ${orderResponse.status}` };
        }
        console.error("Order creation failed:", errorData);
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${orderResponse.status}`);
      }

      const orderResult = await orderResponse.json();
      console.log("Order created successfully:", orderResult);

      // بررسی ساختار response: {success: true, data: {order: ...}}
      const order = orderResult.data?.order || orderResult.order;
      
      if (!orderResult.success || !order) {
        const errorMessage = orderResult.error || "خطا در ثبت سفارش";
        const isDbError = errorMessage.includes('database') || errorMessage.includes('connection') || errorMessage.includes('دیتابیس');
        
        toast({
          title: "خطا",
          description: isDbError 
            ? "خطا در اتصال به دیتابیس. لطفاً بعداً تلاش کنید."
            : errorMessage,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // ============================================
      // پرداخت Mock برای توسعه و تست
      // در این حالت، پرداخت همیشه موفق می‌شود
      // ============================================
      console.log("[Mock Payment] Updating payment status to paid for order:", order.id);
      
      // به‌روزرسانی وضعیت پرداخت سفارش به "paid"
      const updatePaymentResponse = await fetch(`/api/orders/${order.id}/payment-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentStatus: "paid",
        }),
      });

      if (!updatePaymentResponse.ok) {
        const errorData = await updatePaymentResponse.json().catch(() => ({}));
        console.error("[Mock Payment] Failed to update payment status:", errorData);
        throw new Error(errorData.error || "خطا در به‌روزرسانی وضعیت پرداخت");
      }

      const paymentUpdateResult = await updatePaymentResponse.json();
      console.log("[Mock Payment] Payment status updated successfully:", paymentUpdateResult);

      // استفاده از سفارش به‌روزرسانی شده از API
      const updatedOrder = paymentUpdateResult.success && paymentUpdateResult.data 
        ? paymentUpdateResult.data 
        : { ...order, paymentStatus: "paid" as const };

      // ذخیره سفارش در store با وضعیت paid
      console.log("[Mock Payment] Adding order to store:", updatedOrder);
      addOrder(updatedOrder);

      // بارگذاری مجدد سفارش‌ها از دیتابیس برای اطمینان از همگام‌سازی
      console.log("[Mock Payment] Reloading orders from database...");
      try {
        await loadOrdersFromDB();
      } catch (reloadError) {
        console.error("[Mock Payment] Error reloading orders:", reloadError);
        // ادامه می‌دهیم حتی اگر reload خطا داشته باشد
      }

      // پاک کردن سبد خرید
      console.log("[Mock Payment] Clearing cart...");
      clearCart();

      // حذف اطلاعات checkout از localStorage
      console.log("[Mock Payment] Clearing localStorage...");
      localStorage.removeItem("checkoutData");
      localStorage.removeItem("pendingOrder");
      // Clear dismissed order status bar so new order shows in status bar
      localStorage.removeItem("dismissedOrderStatusBar");

      // نمایش پیام موفقیت
      console.log("[Mock Payment] Showing success toast...");
      toast({
        title: "پرداخت موفق",
        description: "سفارش شما با موفقیت ثبت و پرداخت شد",
      });

      // هدایت به صفحه پیگیری سفارش
      const orderNumber = updatedOrder.orderNumber || order.orderNumber;
      console.log("[Mock Payment] Redirecting to track page with orderNumber:", orderNumber);
      console.log("[Mock Payment] Order details:", {
        id: updatedOrder.id,
        orderNumber: orderNumber,
        userId: updatedOrder.userId,
        customerPhone: updatedOrder.customerPhone,
      });
      
      // استفاده از router.push برای هدایت بهتر (به جای window.location.href)
      // کمی تاخیر برای اطمینان از ذخیره شدن در دیتابیس
      setTimeout(() => {
        router.push(`/order/track?orderNumber=${encodeURIComponent(orderNumber)}`);
      }, 1500); // افزایش تاخیر برای اطمینان از ذخیره شدن در دیتابیس
    } catch (error) {
      console.error("[Checkout] Order creation error:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        ...(process.env.NODE_ENV === 'development' && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      });
      
      const errorMessage = error instanceof Error ? error.message : "خطایی در پردازش درخواست رخ داد";
      const isDbError = errorMessage.includes('database') || errorMessage.includes('connection') || errorMessage.includes('دیتابیس');
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch');
      
      toast({
        title: "خطا",
        description: isDbError
          ? "خطا در اتصال به دیتابیس. لطفاً بعداً تلاش کنید."
          : isNetworkError
          ? "خطا در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید."
          : errorMessage,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  // Authentication removed - no loading or redirect needed

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 sm:py-20">
        <div className="flex flex-col items-center justify-center py-12 sm:py-20">
          <ShoppingBag className="h-16 w-16 sm:h-24 sm:w-24 text-muted-foreground mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center">
            سبد خرید شما خالی است
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 text-center">
            محصولات مورد نظر خود را به سبد خرید اضافه کنید
          </p>
          <Link href="/products">
            <Button size="lg" className="h-11 sm:h-12">
              مشاهده محصولات
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold">
          تکمیل اطلاعات و پرداخت
        </h1>
        <div className="flex-1 h-0.5 sm:h-1 bg-background dark:bg-foreground"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* فرم اطلاعات */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>اطلاعات تحویل</CardTitle>
            </CardHeader>
            <CardContent>
              {/* باکس اطلاعات کاربر */}
              {user && (
                <div className="mb-6 p-4 sm:p-5 rounded-lg bg-primary dark:bg-primary border border-primary/30">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                        <User className="h-8 w-8 sm:h-10 sm:w-10 text-primary-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-primary-foreground flex-shrink-0" />
                        <span className="font-semibold text-base sm:text-lg text-primary-foreground truncate">
                          {user?.name || "کاربر"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-primary-foreground/80 flex-shrink-0" />
                        <span className="text-sm sm:text-base text-primary-foreground/80 truncate">
                          {(user as any)?.phone || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(
                    (data) => {
                      onSubmit(data);
                    },
                    (errors) => {
                      setSubmitAttempted(true);
                      // نمایش پیام خطا برای کاربر
                      const firstError = Object.values(errors)[0];
                      if (firstError) {
                        toast({
                          title: "خطا در اعتبارسنجی",
                          description: firstError.message || "لطفاً تمام فیلدهای الزامی را پر کنید",
                          variant: "destructive",
                        });
                      }
                    }
                  )(e);
                }} 
                className="space-y-4 sm:space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lastName">
                      نام خانوادگی <span className="text-muted-foreground text-xs">(پیشنهادی)</span>
                    </Label>
                    <Input
                      id="lastName"
                      {...register("lastName")}
                      placeholder="نام خانوادگی"
                      className={cn(errors.lastName && "!border-destructive")}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      ایمیل <span className="text-muted-foreground text-xs">(اختیاری)</span>
                    </Label>
                    <Input
                      id="email"
                      {...register("email")}
                      type="email"
                      placeholder="example@email.com"
                      className={cn(errors.email && "!border-destructive")}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* انتخاب نوع آدرس */}
                <div className="space-y-2">
                  <Label>
                    نوع آدرس <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    لطفاً یکی از گزینه‌های زیر را انتخاب کنید
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAddressType("location");
                        setValue("addressType", "location");
                        // پاک کردن فیلدهای دیگر
                        setValue("postalCode", "");
                        setValue("address", "");
                        setValue("city", "");
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-right ${
                        addressType === "location"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-sm font-medium">لوکیشن</div>
                      <div className="text-xs text-muted-foreground mt-1">استفاده از موقعیت جغرافیایی</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddressType("postalCode");
                        setValue("addressType", "postalCode");
                        // پاک کردن فیلدهای دیگر
                        setValue("location", "");
                        setValue("address", "");
                        setValue("city", "");
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-right ${
                        addressType === "postalCode"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-sm font-medium">کد پستی</div>
                      <div className="text-xs text-muted-foreground mt-1">فقط کد پستی</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddressType("address");
                        setValue("addressType", "address");
                        // پاک کردن فیلدهای دیگر
                        setValue("location", "");
                        setValue("postalCode", "");
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-right ${
                        addressType === "address"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-sm font-medium">اطلاعات آدرس</div>
                      <div className="text-xs text-muted-foreground mt-1">آدرس کامل</div>
                    </button>
                  </div>
                  <input type="hidden" {...register("addressType")} />
                  {errors.addressType && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.addressType.message}
                    </p>
                  )}
                </div>

                {/* نمایش فیلدهای مربوط به نوع آدرس انتخاب شده */}
                {addressType === "location" && (
                  <div className="space-y-2">
                    <Label>
                      لوکیشن <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        readOnly
                        value={selectedLocation ? `${selectedLocation.lat},${selectedLocation.lng}` : ""}
                        placeholder="انتخاب موقعیت روی نقشه"
                        className="flex-1 font-mono text-xs sm:text-sm"
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowLocationPicker(true);
                        }}
                        className="flex-shrink-0"
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                    <input
                      type="hidden"
                      {...register("location")}
                      value={selectedLocation ? `${selectedLocation.lat},${selectedLocation.lng}` : ""}
                    />
                    {/* نمایش مختصات دقیق برای کاربر */}
                    {selectedLocation && (
                      <Input
                        type="text"
                        readOnly
                        value={`مختصات دقیق: ${selectedLocation.lat}, ${selectedLocation.lng}`}
                        className="text-xs sm:text-sm font-mono bg-muted/50"
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      />
                    )}
                    {errors.location && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.location.message}
                      </p>
                    )}
                  </div>
                )}

                {addressType === "postalCode" && (
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">
                      کد پستی <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="postalCode"
                      {...register("postalCode")}
                      onChange={handlePostalCodeChange}
                      placeholder="1234567890"
                      maxLength={10}
                      className={cn(errors.postalCode && "!border-destructive")}
                    />
                    {errors.postalCode && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.postalCode.message}
                      </p>
                    )}
                  </div>
                )}

                {addressType === "address" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="address">
                        آدرس کامل <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="address"
                        {...register("address")}
                        placeholder="آدرس کامل تحویل"
                        rows={3}
                        className={cn(errors.address && "!border-destructive")}
                      />
                      {errors.address && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.address.message}
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">یادداشت (اختیاری)</Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="یادداشت یا توضیحات اضافی"
                    rows={3}
                    className={cn(errors.notes && "!border-destructive")}
                  />
                  {errors.notes && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.notes.message}
                    </p>
                  )}
                </div>

                {/* نمایش خطاهای کلی فرم */}
                {submitAttempted && Object.keys(errors).length > 0 && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium mb-2">
                      لطفاً خطاهای زیر را برطرف کنید:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
                      {Object.entries(errors).map(([field, error]) => (
                        <li key={field}>
                          {error?.message || `${field} نامعتبر است`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 sm:h-12 text-sm sm:text-base"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      در حال اتصال به درگاه...
                    </>
                  ) : (
                    <>
                      ادامه به درگاه پرداخت
                      <ArrowRight className="mr-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* خلاصه سفارش */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20 sm:top-24">
            <CardHeader>
              <CardTitle>خلاصه سفارش</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {items.map((item) => {
                  // Validate URL - must be a valid URL string
                  const isValidUrl = (url: string): boolean => {
                    if (!url || typeof url !== 'string' || url.trim() === '') {
                      return false;
                    }
                    // Allow blob: and data: URLs
                    if (url.startsWith('blob:') || url.startsWith('data:')) {
                      return true;
                    }
                    // Try to construct URL to validate
                    try {
                      new URL(url);
                      return true;
                    } catch {
                      return false;
                    }
                  };
                  
                  const hasValidImage = item.image && isValidUrl(item.image);
                  
                  return (
                    <div key={item.id} className="flex gap-3 pb-3 border-b border-border/30 last:border-0">
                      <div className="relative w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {hasValidImage ? (
                          <Image
                            src={item.image}
                            alt={item.name || 'Product image'}
                            fill
                            className="object-cover"
                            priority
                            loading="eager"
                            unoptimized={item.image.startsWith('blob:') || item.image.startsWith('data:')}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target) {
                                target.style.display = 'none';
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">
                        {item.name}
                      </h3>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>تعداد: {item.quantity}</span>
                        <span className="font-semibold text-foreground">
                          {(item.price * item.quantity).toLocaleString("fa-IR")}{" "}
                          تومان
                        </span>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              <div className="space-y-2 pt-2 border-t border-border/30">
                <div className="flex justify-between text-sm sm:text-base">
                  <span>جمع کل:</span>
                  <span className="font-semibold">
                    {total.toLocaleString("fa-IR")} تومان
                  </span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span>هزینه ارسال:</span>
                  <span className="font-semibold">
                    {shipping === 0 ? (
                      <span className="text-green-600">رایگان</span>
                    ) : (
                      `${shipping.toLocaleString("fa-IR")} تومان`
                    )}
                  </span>
                </div>
                {shippingMethod && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>روش ارسال:</span>
                    <span>{shippingMethod === "air" ? "هوایی" : "دریایی"}</span>
                  </div>
                )}
                <div className="flex justify-between text-base sm:text-lg font-bold pt-2 border-t border-border/30">
                  <span>مبلغ نهایی:</span>
                  <span className="text-primary">
                    {finalTotal.toLocaleString("fa-IR")} تومان
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Location Picker Modal */}
      <LocationPicker
        open={showLocationPicker}
        onOpenChange={setShowLocationPicker}
        onLocationSelect={(location) => {
          setSelectedLocation({ lat: location.lat, lng: location.lng });
          // همیشه مختصات را ذخیره کن (lat,lng)
          setValue("location", `${location.lat},${location.lng}`);
          setShowLocationPicker(false);
        }}
        initialLocation={selectedLocation || undefined}
      />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <CheckoutPageContent />
    </ProtectedRoute>
  );
}


