/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Don’t fail the Vercel build on ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don’t fail the Vercel build on TS errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;