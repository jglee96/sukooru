[한국어](./README.md)

# Sukooru

If you've ever clicked back to a page only to land at the top instead of where you left off, that's the problem Sukooru fixes. It connects to the browser History API to remember scroll positions and restore them when a user navigates back. It has no dependency on any specific framework.

## Core idea

Scroll position is state that belongs to a URL.

You declare what should be restored. Sukooru handles when to save and when to restore. That separation matters because the moment you start thinking about `save()` and `restore()` call timing yourself, that complexity leaks out of the library and into your application. Sukooru keeps that timing logic inside the framework adapters and the core lifecycle.

## What's implemented

- `@sukooru/core`: complete
- `@sukooru/react`: complete
- `@sukooru/vue`: complete
- `@sukooru/next`: complete
- `@sukooru/nuxt`: complete
- `@sukooru/svelte`: complete

## Feature TODO List

### Done

- [x] `@sukooru/core` basic save/restore API
- [x] `sessionStorage`-based store and in-memory store for testing
- [x] TTL and max-entry management
- [x] `popstate`-based back-navigation restore
- [x] Current key tracking after `pushState`/`replaceState`
- [x] Custom `ScrollStateHandler` for state restoration
- [x] `SukooruProvider` for `@sukooru/react`
- [x] `useScrollRestore` for `@sukooru/react`
- [x] Playwright E2E coverage for back-navigation restore
- [x] Duplicate-save prevention during restoration in React `StrictMode`
- [x] Real React example for `useVirtualScrollRestore`
- [x] Infinite scroll example and docs
- [x] Router integration guides
- [x] React and Vanilla runnable examples

### Planned

- [x] Actual adapter implementation for `@sukooru/vue`
- [x] Actual adapter implementation for `@sukooru/next`
- [x] Actual adapter implementation for `@sukooru/nuxt`
- [x] Actual adapter implementation for `@sukooru/svelte`

## Package structure

```text
packages/
  core/
  react/
  vue/
  next/
  nuxt/
  svelte/
examples/
  vanilla/
  vite-react/
```

## Quick start

### React

Wrap your app in `SukooruProvider` and attach `useScrollRestore` to any container that needs position tracking. You don't call `save()` or `restore()` directly. The hook takes care of registering the container, restoring on mount, and saving on unmount.

```tsx
import { SukooruProvider, useScrollRestore } from '@sukooru/react'

function ProductListPage() {
  const { ref, status } = useScrollRestore({
    containerId: 'product-list',
  })

  return (
    <main ref={ref} style={{ height: '100vh', overflowY: 'auto' }}>
      {status === 'restoring' ? 'Restoring...' : null}
      {/* product list */}
    </main>
  )
}

export function App() {
  return (
    <SukooruProvider>
      <ProductListPage />
    </SukooruProvider>
  )
}
```

### Vanilla

In a vanilla environment you use the imperative API, but a single instance still owns the store and the restore logic.

```ts
import { createSukooru } from '@sukooru/core'

const sukooru = createSukooru()
const container = document.querySelector('#product-list')

if (container) {
  const handle = sukooru.registerContainer(container, 'product-list')
  const unmount = sukooru.mount()

  void sukooru.restore()

  window.addEventListener('beforeunload', () => {
    void sukooru.save()
    handle.unregister()
    unmount()
  })
}
```

## React example modes

The React example app now demonstrates three restore patterns from the same dev server.

- `/products`: full window scroll restoration
- `/virtual`: virtual-list restoration via `useVirtualScrollRestore`
- `/infinite`: infinite-scroll restoration via `useScrollRestore` + `ScrollStateHandler`

## Virtual scroll restoration

With a virtualized list, saving only `scrollTop` is not always enough because the DOM only contains the currently visible rows. `useVirtualScrollRestore` restores both the virtualizer offset and the visible range metadata.

If your list route pushes to a detail route before unmounting, pass an explicit `scrollKey` so the saved entry stays attached to the list URL.

```tsx
import { useVirtualScrollRestore } from '@sukooru/react'

function VirtualProductList({ rowVirtualizer }) {
  const { ref, status } = useVirtualScrollRestore({
    containerId: 'virtual-list',
    scrollKey: '/products',
    virtualizer: rowVirtualizer,
  })

  return (
    <div ref={ref} style={{ height: '80vh', overflowY: 'auto' }}>
      {status === 'restoring' ? 'Restoring...' : null}
      {/* virtual rows */}
    </div>
  )
}
```

## Infinite scroll restoration

For a plain scroll container, `scrollTop` and `scrollLeft` are enough. Infinite scroll needs more than that. Sukooru restores custom state first and then applies the scroll position, which fits the pattern where data must exist before the final offset can be applied.

```tsx
import { useMemo } from 'react'
import { useScrollRestore } from '@sukooru/react'
import type { ScrollStateHandler } from '@sukooru/core'

type InfiniteState = {
  loadedPageCount: number
}

function ProductList() {
  const stateHandler = useMemo<ScrollStateHandler<InfiniteState>>(
    () => ({
      captureState: () => ({
        loadedPageCount: pageCountRef.current,
      }),
      applyState: async ({ loadedPageCount }) => {
        while (pageCountRef.current < loadedPageCount) {
          await loadNextPage()
        }
      },
    }),
    [],
  )

  const { ref } = useScrollRestore({
    containerId: 'infinite-list',
    scrollKey: '/products',
    stateHandler,
  })

  return <div ref={ref} />
}
```

## Router integration guide

These are recommended integration patterns for frameworks that do not yet have a finished first-party adapter in this repo. Right now only `@sukooru/react` is fully implemented.

- React Router or any client-side router: keep `SukooruProvider` at the app root and derive the key from `pathname + search`. If the list unmounts after a detail `pushState`, pin the list route with an explicit `scrollKey`.
- Next.js App Router: place `SukooruProvider` inside a `'use client'` boundary and derive keys from `usePathname()` (plus search params if needed). For custom scroll containers, pass the list route as `scrollKey`.
- Vue Router or Nuxt: use `currentRoute.value.fullPath` as the key and keep container registration inside a composable tied to `onMounted` / `onUnmounted`.
- SvelteKit: create the Sukooru instance in a browser-only module, use `$page.url.pathname + $page.url.search` as the key, and restore only after the route component mounts.

## Public API

### `@sukooru/core`

- `createSukooru(options?)`
- `sessionStorageAdapter`
- `createMemoryStorageAdapter()`
- `ScrollEntry`
- `ScrollStateHandler`
- `ScrollRestoreStatus`

### `@sukooru/react`

- `SukooruProvider`
- `useSukooru()`
- `useScrollRestore()`
- `useVirtualScrollRestore()`

`useVirtualScrollRestore()` accepts `containerId`, `virtualizer`, optional `scrollKey`, and `invalidateOnCountChange`.

## Development

Node 22 or later is recommended. A `.nvmrc` is included in this repo.

```bash
nvm use
pnpm install
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## Running the examples

### React example

```bash
nvm use
pnpm install
pnpm dev:example:react
```

Open `http://127.0.0.1:4173` in a browser. The example app includes `/products`, `/virtual`, and `/infinite`.

Steps to verify:

1. In `/products`, scroll the full window and return from a detail page.
2. In `/virtual`, scroll the custom container and use "Open first visible card" before coming back.
3. In `/infinite`, load more pages, enter a detail page, and come back.
4. Confirm each mode restores the position it had before navigation.

### Vanilla example

```bash
nvm use
pnpm install
pnpm dev:example:vanilla
```

Open `http://127.0.0.1:4174` in a browser.

Steps to verify:

1. Scroll down in the list.
2. Navigate to a product detail page.
3. Click "Back to list".
4. Confirm the saved position is restored.

## Test coverage

- Core save and restore
- TTL expiration
- Eviction of oldest entries when the max count is exceeded
- Fallback to default position when custom state restoration fails
- `popstate`-based save/restore flow
- Browser E2E coverage for back navigation via Playwright
- React Provider mount and unmount
- Container registration, restoration, and saving via the React hook
- `scrollKey` passthrough for `useVirtualScrollRestore`
- No unnecessary container re-registration when the state handler changes

## Examples

- Vanilla: [examples/vanilla/src/main.ts](examples/vanilla/src/main.ts)
- React: [examples/vite-react/src/App.tsx](examples/vite-react/src/App.tsx)
- React virtualizer helper: [examples/vite-react/src/useDemoVirtualizer.ts](examples/vite-react/src/useDemoVirtualizer.ts)
