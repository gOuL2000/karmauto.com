import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";

const baseUrl = process.env.NEXT_PUBLIC_URL || "https://saded.ir";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const siteName = settings.siteName?.trim() || "ساد";
  const description =
    settings.siteDescription ||
    "فروشگاه آنلاین قطعات خودرو وارداتی با بهترین کیفیت و قیمت. بیش از ۵۰,۰۰۰ قطعه خودرو از برندهای معتبر.";

  return {
    title: "محصولات - قطعات خودرو",
    description: description.substring(0, 160),
    alternates: {
      canonical: `${baseUrl}/products`,
    },
    openGraph: {
      title: `محصولات | ${siteName} - فروشگاه قطعات خودرو`,
      description: description.substring(0, 160),
      url: `${baseUrl}/products`,
      siteName: `${siteName} - فروشگاه قطعات خودرو`,
      locale: "fa_IR",
    },
    twitter: {
      card: "summary_large_image",
      title: `محصولات | ${siteName}`,
      description: description.substring(0, 160),
    },
  };
}

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
