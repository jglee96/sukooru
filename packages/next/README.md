# @sukooru/next

Next.js bindings for history-aware scroll restoration.

## Install

```bash
npm install @sukooru/next
```

## Agent Skill

```bash
npx skills add https://github.com/jglee96/sukooru --skill sukooru-integration
```

Use the repo skill when you want an AI coding agent to choose the right Sukooru package and wire full-window or element restoration correctly.

## Set Up Once

```tsx
// app/providers.tsx
'use client'

import type { ReactNode } from 'react'
import { SukooruProvider } from '@sukooru/next'

export function Providers({ children }: { children: ReactNode }) {
  return <SukooruProvider>{children}</SukooruProvider>
}
```

```tsx
// app/layout.tsx
import type { ReactNode } from 'react'
import { Providers } from './providers'

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

`@sukooru/next` derives its route key from `usePathname()` and `useSearchParams()` for you.

## Restore The Full Window Scroll Position

```tsx
// app/products/page.tsx
'use client'

import { useScrollRestore } from '@sukooru/next'

export default function ProductsPage() {
  const { status } = useScrollRestore()

  return (
    <>
      {status === 'restoring' ? <p>Restoring products...</p> : null}
      <ProductGrid />
    </>
  )
}
```

Leave `containerId` unset when the page scrolls the browser window.

## Restore A Specific Element

```tsx
// app/products/page.tsx
'use client'

import { useScrollRestore } from '@sukooru/next'

export default function ProductsPage() {
  const { ref, status } = useScrollRestore({
    containerId: 'product-list',
  })

  return (
    <main ref={ref} style={{ height: '100vh', overflowY: 'auto' }}>
      {status === 'restoring' ? <p>Restoring list...</p> : null}
      <ProductGrid />
    </main>
  )
}
```

Use a custom `containerId` when only one panel inside the page should be restored.

## Advanced: Pin Restore State To A Stable List Route

```tsx
// app/products/page.tsx
'use client'

import { useState } from 'react'
import { useScrollRestore } from '@sukooru/next'

type ProductListState = {
  loadedPageCount: number
}

export default function ProductsPage() {
  const [loadedPageCount, setLoadedPageCount] = useState(1)

  const { ref } = useScrollRestore<ProductListState>({
    containerId: 'product-list',
    scrollKey: '/products',
    stateHandler: {
      captureState: () => ({
        loadedPageCount,
      }),
      applyState: async (state) => {
        await loadPages(state.loadedPageCount)
        setLoadedPageCount(state.loadedPageCount)
      },
    },
  })

  return <main ref={ref} style={{ height: '100vh', overflowY: 'auto' }}>{/* rows */}</main>
}
```

Override `scrollKey` when intercepted routes, nested details, or shared layouts should restore back to the same list bucket.

## Key Exports

- `SukooruProvider`
- `useSukooru`
- `useScrollRestore`
- `useVirtualScrollRestore`
- `withSukooruRestore`

## Notes

- The default route key is `pathname + searchParams`.
- If native browser restoration conflicts with your app, set `window.history.scrollRestoration = 'manual'` once in client code.

## See Also

- Root docs: https://github.com/jglee96/sukooru/blob/main/README.en.md
- React example app with the same patterns: https://github.com/jglee96/sukooru/tree/main/examples/vite-react
