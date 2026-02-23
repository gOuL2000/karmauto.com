import type { Metadata } from "next";
import { getRow } from "@/lib/db/index";
import { getSiteSettings } from "@/lib/site-settings";

const baseUrl = process.env.NEXT_PUBLIC_URL || "https://saded.ir";

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const category = await getRow<{ name: string; description?: string | null }>(
    "SELECT name, description FROM categories WHERE id = ? AND (enabled = TRUE OR enabled = 1) LIMIT 1",
    [id]
  );

  if (!category?.name) {
    return {
      title: "دسته‌بندی",
    };
  }

  const settings = await getSiteSettings();
  const siteName = settings.siteName?.trim() || "سعادد";
  const title = `${category.name} - قطعات خودرو`;
  const description =
    (category.description && category.description.trim()) ||
    `خرید قطعات خودرو در دسته ${category.name}. فروشگاه آنلاین قطعات وارداتی.`;

  return {
    title,
    description: description.substring(0, 160),
    alternates: {
      canonical: `${baseUrl}/categories/${id}`,
    },
    openGraph: {
      title: `${category.name} | ${siteName}`,
      description: description.substring(0, 160),
      url: `${baseUrl}/categories/${id}`,
      siteName: `${siteName} - فروشگاه قطعات خودرو`,
      locale: "fa_IR",
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} | ${siteName}`,
      description: description.substring(0, 160),
    },
  };
}

export default function CategoryLayout({ children }: Props) {
  return <>{children}</>;
}
