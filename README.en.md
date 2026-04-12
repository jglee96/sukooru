[한국어](./README.md)

# Sukooru

If you've ever clicked back to a page only to land at the top instead of where you left off, that's the problem Sukooru fixes. It connects to the browser History API to remember scroll positions and restore them when a user navigates back. It has no dependency on any specific framework.

## Core idea

Scroll position is state that belongs to a URL.

You declare what should be restored. Sukooru handles when to save and when to restore. That separation matters because the moment you start thinking about `save()` and `restore()` call timing yourself, that complexity leaks out of the library and into your application. Sukooru keeps that timing logic inside the framework adapters and the core lifecycle.

## What's implemented

- `@sukooru/core`: complete
- `@sukooru/react`: complete
- `@sukooru/vue`: package skeleton only
- `@sukooru/next`: package skeleton only
- `@sukooru/nuxt`: package skeleton only
- `@sukooru/svelte`: package skeleton only

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
- [x] Duplicate-save prevention during restoration in React `StrictMode`
- [x] React and Vanilla runnable examples

### Planned

- [ ] E2E tests that pin back-navigation restore behavior
- [ ] Real usage example for `useVirtualScrollRestore`
- [ ] Infinite scroll example and documentation
- [ ] Actual adapter implementation for `@sukooru/vue`
- [ ] Actual adapter implementation for `@sukooru/next`
- [ ] Actual adapter implementation for `@sukooru/nuxt`
- [ ] Actual adapter implementation for `@sukooru/svelte`
- [ ] Router integration guides

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

## Custom state restoration

For a normal scroll container, `scrollTop` and `scrollLeft` are all you need. For virtual scroll or infinite scroll, that's not enough. Pass a `ScrollStateHandler` to define exactly what additional state to capture and replay.

Sukooru restores the custom state first, then applies the scroll position. That order matches the infinite scroll pattern where data has to be loaded before the position can be set.

```tsx
import { useScrollRestore } from '@sukooru/react'
import type { ScrollStateHandler } from '@sukooru/core'

type InfiniteState = {
  pageParams: string[]
}

function ProductList() {
  const stateHandler: ScrollStateHandler<InfiniteState> = {
    captureState: () => ({
      pageParams: ['cursor-1', 'cursor-2'],
    }),
    applyState: async ({ pageParams }) => {
      for (const pageParam of pageParams.slice(1)) {
        await fetch(`/api/products?cursor=${pageParam}`)
      }
    },
  }

  const { ref } = useScrollRestore({
    containerId: 'infinite-list',
    stateHandler,
  })

  return <div ref={ref} />
}
```

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

## Development

Node 22 or later is recommended. A `.nvmrc` is included in this repo.

```bash
nvm use
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## Running the examples

### React example

```bash
nvm use
pnpm install
pnpm dev:example:react
```

Open `http://127.0.0.1:4173` in a browser.

Steps to verify:

1. Scroll down far enough in the list.
2. Click any product to go to the detail page.
3. Click "Back to list".
4. Confirm the previous scroll position is restored.

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
- React Provider mount and unmount
- Container registration, restoration, and saving via the React hook
- No unnecessary container re-registration when the state handler changes

## Examples

- Vanilla: [examples/vanilla/src/main.ts](examples/vanilla/src/main.ts)
- React: [examples/vite-react/src/App.tsx](examples/vite-react/src/App.tsx)
