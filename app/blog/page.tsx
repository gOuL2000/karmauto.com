import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "وبلاگ - ساد",
  description: "مقالات و مطالب مفید درباره قطعات خودرو",
};

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">وبلاگ</h1>
          <div className="prose prose-lg max-w-none">
            <p className="text-muted-foreground mb-4">
              به زودی مقالات و مطالب مفید درباره قطعات خودرو در این بخش قرار خواهد گرفت.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

