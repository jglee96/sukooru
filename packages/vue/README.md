# @sukooru/vue

Vue bindings for history-aware scroll restoration.

## Install

```bash
npm install @sukooru/vue
```

## Agent Skill

```bash
npx skills add https://github.com/jglee96/sukooru --skill sukooru-integration
```

Use the repo skill when you want an AI coding agent to choose the right Sukooru package and wire full-window or element restoration correctly.

## Set Up Once

```ts
// main.ts
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createSukooruPlugin } from '@sukooru/vue'
import App from './App.vue'
import routes from './routes'

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const app = createApp(App)

app.use(router)
app.use(
  createSukooruPlugin({
    getKey: () => router.currentRoute.value.fullPath,
  }),
)
app.mount('#app')
```

Register the plugin once near your app root.

## Restore The Full Window Scroll Position

```vue
<script setup lang="ts">
import { useScrollRestore } from '@sukooru/vue'

const { status } = useScrollRestore({
  scrollKey: '/products',
})
</script>

<template>
  <p v-if="status === 'restoring'">Restoring products...</p>
  <ProductGrid />
</template>
```

Leave `containerId` unset when the page itself scrolls the browser window.

## Restore A Specific Element

```vue
<script setup lang="ts">
import { useScrollRestore } from '@sukooru/vue'

const { containerRef, status } = useScrollRestore({
  containerId: 'product-list',
  scrollKey: '/products',
})
</script>

<template>
  <main ref="containerRef" style="height: 100vh; overflow-y: auto">
    <p v-if="status === 'restoring'">Restoring list...</p>
    <ProductGrid />
  </main>
</template>
```

Use `containerRef` when your scrollable area is a nested element.

## Advanced: Restore List Data Before Scroll

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useScrollRestore } from '@sukooru/vue'

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
  <div ref="containerRef" style="height: 100vh; overflow-y: auto">
    <ProductGrid />
  </div>
</template>
```

Use `stateHandler` when list data must be recreated before Sukooru reapplies scroll.

## Key Exports

- `createSukooruPlugin`
- `useSukooru`
- `useScrollRestore`
- `useVirtualScrollRestore`

## Notes

- Use a fixed `scrollKey` such as `/products` when the saved position should stay tied to the list route.
- If native browser restoration conflicts with your router, set `window.history.scrollRestoration = 'manual'` once on the client.

## See Also

- Root docs: https://github.com/jglee96/sukooru/blob/main/README.en.md
- React example app with the same patterns: https://github.com/jglee96/sukooru/tree/main/examples/vite-react
