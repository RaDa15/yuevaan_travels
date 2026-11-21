import { site } from '@/data/site';

export const dynamic = 'force-static';

export default function robots() {
  const baseUrl = site.url.replace(/\/+$/, '');
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
