import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ContractIQ — AI Contract Review',
  description:
    'Review NDAs and MSAs in minutes, not hours. AI-powered key term extraction with confidence scoring.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
