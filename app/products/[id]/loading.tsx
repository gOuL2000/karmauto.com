import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

export default function ProductDetailLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-4 sm:py-6 md:py-8">
        <div className="space-y-4 sm:space-y-6 md:space-y-8 px-2 sm:px-0">
          {/* Breadcrumb Skeleton */}
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          
          {/* Category Skeleton */}
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {/* Image Gallery Skeleton */}
            <div className="space-y-2 sm:space-y-3">
              <div className="relative aspect-square w-full bg-muted rounded-lg animate-pulse" />
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            </div>

            {/* Product Info Skeleton */}
            <div className="space-y-4">
              <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-6 w-1/2 bg-muted rounded animate-pulse" />
              <div className="h-12 w-full bg-muted rounded animate-pulse" />
              <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

