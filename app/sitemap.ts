import { MetadataRoute } from 'next';
import { getRows } from '@/lib/db/index';
import { logger } from '@/lib/logger';

const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://saded.ir';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/cart`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/orders`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  // Dynamic product pages
  let productPages: MetadataRoute.Sitemap = [];
  
  try {
    const products = await getRows<any>(
      "SELECT id, `updatedAt` FROM products WHERE enabled = TRUE ORDER BY `updatedAt` DESC LIMIT 10000"
    );

    productPages = products.map((product: any) => ({
      url: `${baseUrl}/products/${product.id}`,
      lastModified: product.updatedAt instanceof Date 
        ? product.updatedAt 
        : new Date(product.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (error) {
    logger.error('Error generating product sitemap:', error);
    // Continue with static pages even if products fail
  }

  return [...staticPages, ...productPages];
}

