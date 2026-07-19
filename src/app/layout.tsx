import type { Metadata, Viewport } from 'next'
import './globals.css'
import { getConfiguredTheme } from '@/lib/settings'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

export const metadata: Metadata = {
  title: 'LimitList',
  description: 'Personal anime watchlist tracker',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'LimitList',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const themeId = await getConfiguredTheme()

  return (
    <html lang="en" data-theme={themeId}>
      <body className="bg-surface-950 text-surface-100 min-h-screen">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
