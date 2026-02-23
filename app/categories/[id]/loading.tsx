import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

export default function CategoryProductsLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        {/* Category Header Skeleton */}
        <div className="mb-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>

        {/* Products Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <Card className="h-full flex flex-col">
                <CardContent className="p-0">
                  <div className="relative h-48 w-full bg-muted rounded-t-lg" />
                </CardContent>
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

