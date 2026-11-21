/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg'],
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
};

export default nextConfig;
