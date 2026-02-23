import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Package, Truck, CheckCircle2, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "راهنمای خرید - ساد",
  description: "راهنمای کامل خرید از فروشگاه ساد",
};

export default function GuidePage() {
  const steps = [
    {
      icon: ShoppingCart,
      title: "انتخاب محصول",
      description: "محصول مورد نظر خود را از بین دسته‌بندی‌ها انتخاب کنید و به سبد خرید اضافه کنید.",
    },
    {
      icon: Package,
      title: "تکمیل اطلاعات",
      description: "اطلاعات شخصی و آدرس ارسال را تکمیل کنید.",
    },
    {
      icon: Truck,
      title: "انتخاب روش ارسال",
      description: "روش ارسال (هوایی یا دریایی) را انتخاب کنید.",
    },
    {
      icon: CheckCircle2,
      title: "پرداخت و ثبت سفارش",
      description: "پرداخت را انجام دهید و سفارش خود را ثبت کنید.",
    },
  ];

  const faqs = [
    {
      question: "چگونه می‌توانم محصول مورد نظر را پیدا کنم؟",
      answer: "می‌توانید از طریق جستجو یا دسته‌بندی‌ها محصول مورد نظر خود را پیدا کنید.",
    },
    {
      question: "روش‌های پرداخت چیست؟",
      answer: "پرداخت از طریق درگاه پرداخت آنلاین انجام می‌شود.",
    },
    {
      question: "زمان تحویل چقدر است؟",
      answer: "زمان تحویل بسته به روش ارسال انتخابی شما (هوایی یا دریایی) متفاوت است.",
    },
    {
      question: "آیا امکان بازگشت کالا وجود دارد؟",
      answer: "بله، در صورت وجود مشکل در محصول می‌توانید درخواست بازگشت کالا را ثبت کنید.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">راهنمای خرید</h1>
          
          {/* مراحل خرید */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>مراحل خرید</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* سوالات متداول */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                سوالات متداول
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div key={index} className="border-b border-border pb-4 last:border-0">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

