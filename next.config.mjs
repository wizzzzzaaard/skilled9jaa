/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // keep this, but accept the rebuild limitation
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  trailingSlash: false,
};
export default nextConfig;