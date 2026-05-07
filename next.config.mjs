/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  trailingSlash: false,
};
export default nextConfig;