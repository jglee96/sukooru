# @sukooru/nuxt

Nuxt bindings for history-aware scroll restoration.

## Install

```bash
npm install @sukooru/nuxt
```

## Agent Skill

```bash
npx skills add https://github.com/jglee96/sukooru --skill sukooru-integration
```

Use the repo skill when you want an AI coding agent to choose the right Sukooru package and wire full-window or element restoration correctly.

## Set Up Once

```ts
// plugins/sukooru.client.ts
import { createSukooruNuxtPlugin } from '@sukooru/nuxt'

export default createSukooruNuxtPlugin()
```

`@sukooru/nuxt` uses `route.fullPath` as the default route key.

## Restore The Full Window Scroll Position

```vue
<script setup lang="ts">
import { useScrollRestore } from '@sukooru/nuxt'

const { status } = useScrollRestore()
</script>

<template>
  <p v-if="status === 'restoring'">Restoring products...</p>
  <ProductGrid />
</template>
```

Leave `containerId` unset when the page scrolls the browser window.

## Restore A Specific Element

```vue
<script setup lang="ts">
import { useScrollRestore } from '@sukooru/nuxt'

const { containerRef, status } = useScrollRestore({
  containerId: 'product-list',
})
</script>

<template>
  <main ref="containerRef" style="height: 100vh; overflow-y: auto">
    <p v-if="status === 'restoring'">Restoring list...</p>
    <ProductGrid />
  </main>
</template>
```

Use `containerRef` when the scrollable area is a nested element instead of the page window.

## Advanced: Pin Restore State To A Stable List Route

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useScrollRestore } from '@sukooru/nuxt'

type ProductListState = {
  loadedPageCount: number
}

const loadedPageCount = ref(1)

const { containerRef } = useScrollRestore<ProductListState>({
  containerId: 'product-list',
  scrollKey: '/products',
  stateHandler: {
    captureState: () => ({
      loadedPageCount: loadedPageCount.value,
    }),
    applyState: async (state) => {
      await loadPages(state.loadedPageCount)
      loadedPageCount.value = state.loadedPageCount
    },
  },
})
</script>

<template>
  <main ref="containerRef" style="height: 100vh; overflow-y: auto">
    <ProductGrid />
  </main>
</template>
```

Override `scrollKey` when multiple Nuxt routes should restore into the same list state.

## Key Exports

- `createSukooruNuxtPlugin`
- `useSukooru`
- `useScrollRestore`
- `useVirtualScrollRestore`

## Notes

- The default route key is `route.fullPath`.
- If native browser restoration conflicts with your app, set `window.history.scrollRestoration = 'manual'` once on the client.

## See Also

- Root docs: https://github.com/jglee96/sukooru/blob/main/README.en.md
- React example app with the same patterns: https://github.com/jglee96/sukooru/tree/main/examples/vite-react
