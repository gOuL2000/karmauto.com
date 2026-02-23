import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartContent } from "@/components/cart/cart-content";

export default function CartPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-4 sm:py-6 md:py-8 px-3 sm:px-4">
        <div className="flex items-center gap-3 mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">سبد خرید</h1>
          <div className="flex-1 h-0.5 sm:h-1 bg-background dark:bg-foreground"></div>
        </div>
        <CartContent />
      </main>
      <Footer />
    </div>
  );
}

