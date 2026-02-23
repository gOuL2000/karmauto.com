import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PageLoader } from "@/components/ui/page-loader";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-col relative">
      <Header />
      <main className="flex-1 relative z-0">
        <PageLoader message="در حال بارگذاری صفحه اصلی..." fullScreen={false} />
      </main>
      <Footer />
    </div>
  );
}

