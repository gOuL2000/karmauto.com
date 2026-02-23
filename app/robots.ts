import { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://saded.ir';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/checkout/',
        '/payment/',
        '/order/',
        '/orders/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

