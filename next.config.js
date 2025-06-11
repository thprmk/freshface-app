// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... other configurations
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com', // This is Cloudinary's hostname
        port: '',
        pathname: '/**',
      },
      // You can keep the localhost one for testing if you want
      {
        protocol: 'http',
        hostname: 'localhost',
      }
    ],
  },
};

module.exports = nextConfig;