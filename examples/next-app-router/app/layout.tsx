import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { Providers } from './providers'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div />}>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  )
}
