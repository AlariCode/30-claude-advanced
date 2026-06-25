import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Geist, Geist_Mono, Inter } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Video Meetings',
  description: 'Video meetings application',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${inter.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
