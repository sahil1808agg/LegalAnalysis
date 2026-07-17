/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prevents webpack from bundling pdf-parse (it reads files at runtime)
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
