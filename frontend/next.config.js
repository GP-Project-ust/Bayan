/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.STANDALONE === "true" || process.platform !== "win32" ? "standalone" : undefined,
  reactStrictMode: true,
};

export default nextConfig;
