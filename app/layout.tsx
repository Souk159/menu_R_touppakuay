import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ເມນູຮ້ານອາຫານ',
  description: 'ລະບົບເມນູຮ້ານອາຫານ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lo">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Phetsarath:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
