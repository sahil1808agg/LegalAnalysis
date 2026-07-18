/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdfjs-dist optionally requires 'canvas' and 'path2d-polyfill' for
    // rendering. We only need text extraction, so stub them out.
    config.resolve.alias.canvas = false
    config.resolve.alias['path2d-polyfill'] = false
    return config
  },
}

export default nextConfig
