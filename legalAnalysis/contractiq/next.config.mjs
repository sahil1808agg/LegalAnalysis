/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Suppress optional canvas/path2d peer deps that pdfjs-dist tries to load
    config.resolve.alias.canvas = false
    config.resolve.alias['path2d-polyfill'] = false

    if (isServer) {
      // Stub out the pdf.js worker files — the legacy build runs in the
      // main thread so the worker is never actually used server-side.
      config.resolve.alias['pdfjs-dist/legacy/build/pdf.worker.js'] = false
      config.resolve.alias['pdfjs-dist/legacy/build/pdf.worker.min.js'] = false
      config.resolve.alias['pdfjs-dist/build/pdf.worker.js'] = false
    }

    return config
  },
}

export default nextConfig
