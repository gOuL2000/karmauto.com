import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductDetail } from "@/components/product/product-detail";
import { getRow } from "@/lib/db/index";
import type { Product } from "@/types/product";
import { getPlaceholderImage } from "@/lib/image-utils";
import { normalizeImages, normalizeTags, normalizeSpecifications } from "@/lib/product-utils";
import { getSiteSettings } from "@/lib/site-settings";
import { logger } from "@/lib/logger";

const baseUrl = process.env.NEXT_PUBLIC_URL || "https://saded.ir";
const defaultSiteName = "سعادد";

async function getProduct(id: string): Promise<Product | null> {
  try {
    const product = await getRow<any>(
      "SELECT * FROM products WHERE id = ? AND enabled = TRUE",
      [id]
    );

    if (!product) {
      return null;
    }

    // Parse JSON fields with normalization
    const parsedProduct: Product = {
      ...product,
      images: normalizeImages(product.images),
      tags: normalizeTags(product.tags),
      specifications: normalizeSpecifications(product.specifications),
      price: Number(product.price),
      originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
      stockCount: Number(product.stockCount),
      inStock: Boolean(product.inStock),
      enabled: Boolean(product.enabled),
      vinEnabled: Boolean(product.vinEnabled),
      airShippingEnabled: Boolean(product.airShippingEnabled),
      seaShippingEnabled: Boolean(product.seaShippingEnabled),
      airShippingCost: product.airShippingCost !== null && product.airShippingCost !== undefined 
        ? Number(product.airShippingCost) 
        : null,
      seaShippingCost: product.seaShippingCost !== null && product.seaShippingCost !== undefined 
        ? Number(product.seaShippingCost) 
        : null,
      createdAt: product.createdAt instanceof Date ? product.createdAt : new Date(product.createdAt),
      updatedAt: product.updatedAt instanceof Date ? product.updatedAt : new Date(product.updatedAt),
    };

    return parsedProduct;
  } catch (error) {
    logger.error("Error fetching product for metadata:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [product, settings] = await Promise.all([getProduct(id), getSiteSettings()]);
  const siteName = settings.siteName?.trim() || defaultSiteName;

  if (!product) {
    return {
      title: `محصول یافت نشد | ${siteName}`,
      description: "محصول مورد نظر شما یافت نشد",
    };
  }

  const productImage = product.images?.[0] || getPlaceholderImage(1200, 630);
  const productUrl = `${baseUrl}/products/${id}`;
  const description = product.description || `${product.name} - قطعه خودرو ${product.brand} با بهترین کیفیت و قیمت`;

  return {
    title: `${product.name} | ${siteName}`,
    description: description.substring(0, 160),
    keywords: [
      product.name,
      product.brand || "",
      product.category || "",
      "قطعات خودرو",
      "قطعات وارداتی",
      ...(product.tags || []),
    ],
    alternates: {
      canonical: productUrl,
    },
    openGraph: {
      title: product.name,
      description: description.substring(0, 160),
      url: productUrl,
      siteName: `${siteName} - فروشگاه قطعات خودرو`,
      images: [
        {
          url: productImage,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
      locale: "fa_IR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: description.substring(0, 160),
      images: [productImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-4 sm:py-6 md:py-8">
        <ProductDetail productId={id} />
      </main>
      <Footer />
    </div>
  );
}

