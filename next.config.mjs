const isStaticExport = process.env.STATIC_EXPORT === '1';
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isStaticExport ? { output: 'export' } : { serverExternalPackages: ['pg'] }),
  ...(basePath ? { basePath } : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: isStaticExport,
};

export default nextConfig;
