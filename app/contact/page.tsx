"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Phone, Mail, MapPin } from "lucide-react";

interface ContactInfo {
  phone: string;
  email: string;
  address: string;
}

const defaultContact: ContactInfo = {
  phone: "021-12345678",
  email: "info@saded.ir",
  address: "تهران، ایران",
};

export default function ContactPage() {
  const [contact, setContact] = useState<ContactInfo>(defaultContact);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // اضافه کردن timestamp برای جلوگیری از cache
        const response = await fetch(`/api/settings/page-content?page=contact&t=${Date.now()}`, {
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json();
          if (data.data?.content) {
            const content = typeof data.data.content === "string" 
              ? JSON.parse(data.data.content) 
              : data.data.content;
            // اگر object بود و محتوا داشت، استفاده کن، در غیر این صورت از default استفاده می‌شود
            if (content && typeof content === "object" && Object.keys(content).length > 0) {
              setContact(content);
            } else {
              setContact(defaultContact);
            }
          } else {
            // اگر محتوا موجود نبود، از default استفاده می‌شود
            setContact(defaultContact);
          }
        } else {
          // اگر خطا بود، از default استفاده می‌شود
          setContact(defaultContact);
        }
      } catch (error) {
        console.error("Error fetching contact content:", error);
        // در صورت خطا، از default استفاده می‌شود
        setContact(defaultContact);
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
          <h1 className="text-3xl font-bold mb-6">تماس با ما</h1>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {contact.phone && (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">تلفن</h3>
                      <p className="text-muted-foreground">{contact.phone}</p>
                    </div>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">ایمیل</h3>
                      <p className="text-muted-foreground">{contact.email}</p>
                    </div>
                  </div>
                )}
                {contact.address && (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">آدرس</h3>
                      <p className="text-muted-foreground">{contact.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

