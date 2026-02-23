import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/page-loader";

export default function OrdersLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-4 sm:py-6 md:py-8 px-3 sm:px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-muted rounded animate-pulse" />
            <div>
              <div className="h-6 w-32 sm:h-8 sm:w-40 bg-muted rounded animate-pulse mb-1" />
              <div className="h-4 w-48 sm:w-64 bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* Orders Skeleton */}
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-6">
              <div className="h-6 w-40 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent className="pt-3 sm:pt-6">
              <div className="space-y-3 sm:space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="border-l-4">
                    <CardContent className="pt-3 sm:pt-6">
                      <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="h-4 w-4 sm:h-5 sm:w-5 bg-muted rounded animate-pulse mt-0.5" />
                          <div className="flex-1">
                            <div className="h-4 w-48 sm:h-5 sm:w-64 bg-muted rounded animate-pulse mb-2" />
                            <div className="h-3 w-32 sm:h-4 sm:w-40 bg-muted rounded animate-pulse" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                          <div className="h-4 w-24 sm:h-5 sm:w-32 bg-muted rounded animate-pulse" />
                          <div className="h-6 w-20 sm:h-7 sm:w-24 bg-muted rounded animate-pulse" />
                        </div>
                        <div className="h-9 w-full sm:h-10 sm:w-32 bg-muted rounded animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
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

