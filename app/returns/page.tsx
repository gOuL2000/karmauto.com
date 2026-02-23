"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const defaultContent = `در صورت وجود مشکل در محصول، می‌توانید درخواست بازگشت کالا را ثبت کنید.

لطفاً قبل از ثبت درخواست، با پشتیبانی تماس بگیرید.`;

export default function ReturnsPage() {
  const [content, setContent] = useState(defaultContent);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // اضافه کردن timestamp برای جلوگیری از cache
        const response = await fetch(`/api/settings/page-content?page=returns&t=${Date.now()}`, {
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json();
          // استفاده از محتوای API یا default content
          const apiContent = data.data?.content;
          if (apiContent && apiContent.trim() !== "" && apiContent !== "null") {
            setContent(apiContent);
          } else {
            // اگر محتوا موجود نبود یا خالی بود، از default استفاده می‌شود
            setContent(defaultContent);
          }
        } else {
          // اگر خطا بود، از default استفاده می‌شود
          setContent(defaultContent);
        }
      } catch (error) {
        console.error("Error fetching returns content:", error);
        // در صورت خطا، از default استفاده می‌شود
        setContent(defaultContent);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const paragraphs = content.split("\n").filter((p: string) => p.trim() !== "");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">بازگشت کالا</h1>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="prose prose-lg max-w-none">
              {paragraphs.map((paragraph: string, index: number) => (
                <p key={index} className="text-muted-foreground mb-4">
                  {paragraph.trim()}
                </p>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

