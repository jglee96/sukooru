# Framework Recipes

## Package map

| Runtime | Package | One-time setup | Base APIs |
| --- | --- | --- | --- |
| Vanilla / custom router | `@sukooru/core` | `createSukooru()` + `mount()` | `registerContainer`, `save`, `restore` |
| React | `@sukooru/react` | `SukooruProvider` | `useScrollRestore`, `useVirtualScrollRestore` |
| Next.js App Router | `@sukooru/next` | `SukooruProvider` in a client boundary | `useScrollRestore`, `useVirtualScrollRestore` |
| Vue | `@sukooru/vue` | `createSukooruPlugin()` | `useScrollRestore`, `useVirtualScrollRestore` |
| Nuxt | `@sukooru/nuxt` | `createSukooruNuxtPlugin()` | `useScrollRestore`, `useVirtualScrollRestore` |
| Svelte / SvelteKit | `@sukooru/svelte` | `createSukooruProvider()` + context | `createScrollRestore`, `createVirtualScrollRestore` |

## Vanilla / `@sukooru/core`

Use `createSukooru()` when you control routing yourself.

### One-time setup

```ts
import { createSukooru } from '@sukooru/core'

const sukooru = createSukooru({
  getKey: () => window.location.pathname,
})

const stop = sukooru.mount()
window.history.scrollRestoration = 'manual'
```

### Full-window restore

```ts
const handle = sukooru.registerContainer(window, 'window')
await sukooru.restore('/products')
```

### Specific-element restore

```ts
const container = document.querySelector<HTMLElement>('#product-list')!
const handle = sukooru.registerContainer(container, 'product-list')
await sukooru.restore('/products')
```

Call `save('/products')` before leaving the view and unregister the handle during cleanup.

## React / `@sukooru/react`

### One-time setup

```tsx
import { SukooruProvider } from '@sukooru/react'

export function AppShell({ children }: { children: React.ReactNode }) {
  return <SukooruProvider>{children}</SukooruProvider>
}
```

### Full-window restore

```tsx
const { status } = useScrollRestore({
  scrollKey: '/products',
})
```

### Specific-element restore

```tsx
const { ref, status } = useScrollRestore({
  containerId: 'product-list',
  scrollKey: '/products',
})
```

Attach `ref` to the scrollable element.

## Next.js / `@sukooru/next`

### One-time setup

Put `SukooruProvider` in a client component used by `app/layout.tsx`.

### Full-window restore

```tsx
const { status } = useScrollRestore()
```

### Specific-element restore

```tsx
const { ref, status } = useScrollRestore({
  containerId: 'product-list',
})
```

Let `@sukooru/next` choose the default route key. Override `scrollKey` only when multiple URLs should share one saved list position.

## Vue / `@sukooru/vue`

### One-time setup

```ts
app.use(
  createSukooruPlugin({
    getKey: () => router.currentRoute.value.fullPath,
  }),
)
```

### Full-window restore

```ts
const { status } = useScrollRestore({
  scrollKey: '/products',
})
```

### Specific-element restore

```ts
const { containerRef, status } = useScrollRestore({
  containerId: 'product-list',
  scrollKey: '/products',
})
```

Bind `containerRef` to the scrollable element.

## Nuxt / `@sukooru/nuxt`

### One-time setup

Create `plugins/sukooru.client.ts`:

```ts
import { createSukooruNuxtPlugin } from '@sukooru/nuxt'

export default createSukooruNuxtPlugin()
```

### Full-window restore

```ts
const { status } = useScrollRestore()
```

### Specific-element restore

```ts
const { containerRef, status } = useScrollRestore({
  containerId: 'product-list',
})
```

Let Nuxt derive the default route key from `route.fullPath`.

## Svelte / `@sukooru/svelte`

### One-time setup

Create the provider in a browser-only boundary, then publish the instance via context.

```svelte
<script lang="ts">
  import { browser } from '$app/environment'
  import { page } from '$app/stores'
  import { createSukooruProvider, setSukooruContext } from '@sukooru/svelte'

  if (browser) {
    const provider = createSukooruProvider({
      getKey: () => $page.url.pathname + $page.url.search,
    })

    setSukooruContext(provider.instance)
  }
</script>
```

### Full-window restore

Use the context instance directly:

```ts
const handle = sukooru.registerContainer(window, 'window')
await sukooru.restore('/products')
```

### Specific-element restore

```ts
const { action, status } = createScrollRestore(sukooru)
```

```svelte
<main use:action={{ containerId: 'product-list', scrollKey: '/products' }} />
```

Use `createScrollRestore` for element-based restore and the core instance directly for full-window restore.
