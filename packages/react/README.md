# @sukooru/react

React bindings for history-aware scroll restoration.

## Install

```bash
npm install @sukooru/react
```

## Agent Skill

```bash
npx skills add https://github.com/jglee96/sukooru --skill sukooru-integration
```

Use the repo skill when you want an AI coding agent to choose the right Sukooru package and wire full-window or element restoration correctly.

## Set Up Once

```tsx
import type { ReactNode } from 'react'
import { SukooruProvider } from '@sukooru/react'

export function AppShell({ children }: { children: ReactNode }) {
  return <SukooruProvider>{children}</SukooruProvider>
}
```

Place `SukooruProvider` above the routes or layouts that should share scroll state.

## Restore The Full Window Scroll Position

```tsx
import { useScrollRestore } from '@sukooru/react'

export function ProductsPage() {
  const { status } = useScrollRestore({
    scrollKey: '/products',
  })

  return (
    <>
      {status === 'restoring' ? <p>Restoring products...</p> : null}
      <ProductGrid />
    </>
  )
}
```

Leave `containerId` unset when the page itself scrolls the browser window.

## Restore A Specific Element

```tsx
import { useScrollRestore } from '@sukooru/react'

export function ProductsPanel() {
  const { ref, status } = useScrollRestore({
    containerId: 'product-list',
    scrollKey: '/products',
  })

  return (
    <main ref={ref} style={{ height: '100vh', overflowY: 'auto' }}>
      {status === 'restoring' ? <p>Restoring list...</p> : null}
      <ProductGrid />
    </main>
  )
}
```

Use a stable `containerId` when the scrollable area is a nested element instead of the window.

## Advanced: Restore List Data Before Scroll

```tsx
import { useState } from 'react'
import { useScrollRestore } from '@sukooru/react'

type ProductListState = {
  loadedPageCount: number
}

export function InfiniteProducts() {
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

  return <div ref={ref} style={{ height: 480, overflowY: 'auto' }}>{/* rows */}</div>
}
```

Use `stateHandler` when you need data, pagination, or other UI state restored before scroll is applied.

## Key Exports

- `SukooruProvider`
- `useSukooru`
- `useScrollRestore`
- `useVirtualScrollRestore`

## Notes

- Use a fixed `scrollKey` such as `/products` when the list view and detail view should share one restore bucket.
- `@sukooru/react` is maintained against React 19.
- If `sessionStorage` is blocked, Sukooru falls back to in-memory storage for the current tab session.
- If native browser restoration conflicts with your router, set `window.history.scrollRestoration = 'manual'` once on the client.

## See Also

- Root docs: https://github.com/jglee96/sukooru/blob/main/README.en.md
- React example app: https://github.com/jglee96/sukooru/tree/main/examples/vite-react
