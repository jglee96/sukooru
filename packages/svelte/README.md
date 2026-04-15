# @sukooru/svelte

Svelte bindings for history-aware scroll restoration.

## Install

```bash
npm install @sukooru/svelte
```

## Agent Skill

```bash
npx skills add https://github.com/jglee96/sukooru --skill sukooru-integration
```

Use the repo skill when you want an AI coding agent to choose the right Sukooru package and wire full-window or element restoration correctly.

## Set Up Once

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { browser } from '$app/environment'
  import { page } from '$app/stores'
  import { onDestroy } from 'svelte'
  import { createSukooruProvider, setSukooruContext } from '@sukooru/svelte'

  const provider = browser
    ? createSukooruProvider({
      getKey: () => $page.url.pathname + $page.url.search,
    })
    : null

  if (provider) {
    setSukooruContext(provider.instance)
    onDestroy(() => provider.destroy())
  }
</script>

<slot />
```

Create the provider once in a browser-only boundary, then read the instance from context in child components.

## Restore The Full Window Scroll Position

```svelte
<!-- src/routes/products/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { getSukooruContext } from '@sukooru/svelte'

  let status = 'idle'
  const sukooru = getSukooruContext()

  onMount(() => {
    const handle = sukooru.registerContainer(window, 'window')

    void sukooru.restore('/products').then((nextStatus) => {
      status = nextStatus
    })

    return () => {
      void sukooru.save('/products')
      handle.unregister()
    }
  })
</script>

{#if status === 'restoring'}
  <p>Restoring products...</p>
{/if}

<ProductGrid />
```

Register `window` directly when the whole page scrolls.

## Restore A Specific Element

```svelte
<!-- src/routes/products/+page.svelte -->
<script lang="ts">
  import { getSukooruContext, createScrollRestore } from '@sukooru/svelte'

  const sukooru = getSukooruContext()
  const { action, status } = createScrollRestore(sukooru)
</script>

{#if $status === 'restoring'}
  <p>Restoring list...</p>
{/if}

<main
  use:action={{ containerId: 'product-list', scrollKey: '/products' }}
  style="height: 100vh; overflow-y: auto"
>
  <ProductGrid />
</main>
```

Use `createScrollRestore` when the scroll target is a specific element.

## Advanced: Restore List Data Before Scroll

```svelte
<!-- src/routes/products/+page.svelte -->
<script lang="ts">
  import { getSukooruContext, createScrollRestore } from '@sukooru/svelte'

  type ProductListState = {
    loadedPageCount: number
  }

  let loadedPageCount = 1

  const sukooru = getSukooruContext<ProductListState>()
  const { action } = createScrollRestore(sukooru)

  const stateHandler = {
    captureState: () => ({
      loadedPageCount,
    }),
    applyState: async (state: ProductListState) => {
      await loadPages(state.loadedPageCount)
      loadedPageCount = state.loadedPageCount
    },
  }
</script>

<main
  use:action={{
    containerId: 'product-list',
    scrollKey: '/products',
    stateHandler,
  }}
  style="height: 100vh; overflow-y: auto"
>
  <ProductGrid />
</main>
```

Use `stateHandler` when list data must be rebuilt before Sukooru reapplies scroll.

## Key Exports

- `createSukooruProvider`
- `getSukooruContext`
- `setSukooruContext`
- `createScrollRestore`
- `createScrollRestoreAction`
- `createVirtualScrollRestore`
- `createVirtualScrollRestoreAction`

## Notes

- For full-window restoration, use the core instance from context and register `window` directly.
- `@sukooru/svelte` is maintained against Svelte 4 and 5.
- If `sessionStorage` is blocked, Sukooru falls back to in-memory storage for the current tab session.
- If native browser restoration conflicts with your app, set `window.history.scrollRestoration = 'manual'` once on the client.

## See Also

- Root docs: https://github.com/jglee96/sukooru/blob/main/README.en.md
- React example app with the same patterns: https://github.com/jglee96/sukooru/tree/main/examples/vite-react
