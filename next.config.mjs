/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "cdn.sanity.io",
      },
      { hostname: "fonts.gstatic.com" },
    ],
  },
};

export default nextConfig;
