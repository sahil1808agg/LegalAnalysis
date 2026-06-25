/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },
  webpack: (config) => {
    // pdf-parse optionally requires 'canvas'; suppress the warning
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
