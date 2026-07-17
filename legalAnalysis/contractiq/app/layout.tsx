import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'ContractIQ — AI Contract Review for SMBs',
  description:
    'Review NDAs and MSAs in minutes. AI-powered key term extraction with source citations and confidence scores.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-grey-25 text-grey-900 font-sans antialiased">{children}</body>
    </html>
  )
}
