"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

interface FAQItem {
  question: string;
  answer: string;
}

const defaultFAQs: FAQItem[] = [
  {
    question: "چگونه می‌توانم سفارش بدهم؟",
    answer: "شما می‌توانید با مراجعه به صفحه محصولات، محصول مورد نظر خود را انتخاب کرده و به سبد خرید اضافه کنید.",
  },
  {
    question: "روش‌های پرداخت چیست؟",
    answer: "پرداخت از طریق درگاه پرداخت آنلاین انجام می‌شود.",
  },
  {
    question: "زمان تحویل چقدر است؟",
    answer: "زمان تحویل بسته به روش ارسال انتخابی شما متفاوت است.",
  },
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>(defaultFAQs);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // اضافه کردن timestamp برای جلوگیری از cache
        const response = await fetch(`/api/settings/page-content?page=faq&t=${Date.now()}`, {
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json();
          if (data.data?.content) {
            const content = typeof data.data.content === "string" 
              ? JSON.parse(data.data.content) 
              : data.data.content;
            // اگر array بود و محتوا داشت، استفاده کن، در غیر این صورت از default استفاده می‌شود
            if (Array.isArray(content) && content.length > 0) {
              setFaqs(content);
            } else {
              setFaqs(defaultFAQs);
            }
          } else {
            // اگر محتوا موجود نبود، از default استفاده می‌شود
            setFaqs(defaultFAQs);
          }
        } else {
          // اگر خطا بود، از default استفاده می‌شود
          setFaqs(defaultFAQs);
        }
      } catch (error) {
        console.error("Error fetching FAQ content:", error);
        // در صورت خطا، از default استفاده می‌شود
        setFaqs(defaultFAQs);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">سوالات متداول</h1>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {faqs.length === 0 ? (
                <p className="text-muted-foreground">در حال حاضر سوالی ثبت نشده است.</p>
              ) : (
                faqs.map((faq, index) => (
                  <div key={index} className="border-b border-border pb-4">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

