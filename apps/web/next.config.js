/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@spades/shared', '@spades/rules'],
};

module.exports = nextConfig;
