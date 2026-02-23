import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function TrackOrderLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-4 sm:py-6 md:py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="h-6 w-32 sm:h-8 sm:w-40 bg-muted rounded animate-pulse" />
            <div className="h-8 w-24 sm:h-10 sm:w-32 bg-muted rounded animate-pulse" />
          </div>

          {/* Search Skeleton */}
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-6">
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent className="pt-0 sm:pt-6">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex-1 h-10 bg-muted rounded animate-pulse" />
                <div className="h-10 w-full sm:w-24 bg-muted rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>

          {/* Order Status Skeleton */}
          <Card className="border-2 mb-4 sm:mb-6">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b pb-3 sm:pb-6">
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6">
              <div className="space-y-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full animate-pulse" />
                    <div className="flex-1">
                      <div className="h-5 w-32 bg-muted rounded animate-pulse mb-2" />
                      <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                    </div>
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

