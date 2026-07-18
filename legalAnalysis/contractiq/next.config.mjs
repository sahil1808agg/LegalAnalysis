/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent webpack from bundling pdfjs-dist — it must be loaded from node_modules
  // at runtime so the Node.js legacy build is used instead of the browser bundle.
  serverExternalPackages: ['pdfjs-dist'],
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
