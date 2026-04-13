# @sukooru/core

Framework-agnostic scroll restoration core for browser apps.

## Install

```bash
npm install @sukooru/core
```

## When To Use This Package

Use `@sukooru/core` when you want full control over routing integration in a vanilla app or you are building your own adapter on top of Sukooru.

## Restore The Full Window Scroll Position

```ts
import { createSukooru } from '@sukooru/core'

const sukooru = createSukooru({
  getKey: () => window.location.pathname,
})

const stop = sukooru.mount()
window.history.scrollRestoration = 'manual'

export const mountProductsPage = async () => {
  const handle = sukooru.registerContainer(window, 'window')
  const scrollKey = '/products'

  const status = await sukooru.restore(scrollKey)
  console.log('restore status:', status)

  return async () => {
    await sukooru.save(scrollKey)
    handle.unregister()
  }
}

// Later, when your app shuts down:
// stop()
```

Leave `containerId` as `window` when the browser viewport itself is the thing that scrolls.

## Restore A Specific Element

```ts
import { createSukooru } from '@sukooru/core'

const sukooru = createSukooru({
  getKey: () => window.location.pathname,
})

const stop = sukooru.mount()

export const mountProductsPanel = async () => {
  const container = document.querySelector<HTMLElement>('#product-list')

  if (!container) {
    throw new Error('Missing #product-list')
  }

  const handle = sukooru.registerContainer(container, 'product-list')
  const scrollKey = '/products'

  await sukooru.restore(scrollKey)

  return async () => {
    await sukooru.save(scrollKey)
    handle.unregister()
  }
}

// Later, when your app shuts down:
// stop()
```

Use a stable `containerId` for every scrollable element that should keep its own position.

## Advanced: Restore Custom List State Before Scroll

```ts
import { createSukooru } from '@sukooru/core'

const sukooru = createSukooru({
  getKey: () => window.location.pathname,
})

export const mountInfiniteProducts = async () => {
  const container = document.querySelector<HTMLElement>('#product-list')

  if (!container) {
    throw new Error('Missing #product-list')
  }

  const stateHandle = sukooru.setScrollStateHandler('product-list', {
    captureState: () => ({
      loadedPageCount,
    }),
    applyState: async (state) => {
      await loadPages(state.loadedPageCount)
    },
  })

  const containerHandle = sukooru.registerContainer(container, 'product-list')
  const scrollKey = '/products'

  await sukooru.restore(scrollKey)

  return async () => {
    await sukooru.save(scrollKey)
    containerHandle.unregister()
    stateHandle.unregister()
  }
}
```

`ScrollStateHandler` lets you restore list data first, then apply scroll after the DOM is ready again.

## Key Exports

- `createSukooru`
- `sessionStorageAdapter`
- `createMemoryStorageAdapter`
- `createDefaultSerializer`
- Types such as `SukooruOptions`, `SukooruInstance`, and `ScrollStateHandler`

## Notes

- Set `window.history.scrollRestoration = 'manual'` once on the client if the browser's native restoration conflicts with your app.
- Use a stable `scrollKey` such as `/products` when you want the saved position to belong to a list route instead of the current detail URL.

## See Also

- Root docs: https://github.com/jglee96/sukooru/blob/main/README.en.md
- Vanilla example: https://github.com/jglee96/sukooru/tree/main/examples/vanilla
