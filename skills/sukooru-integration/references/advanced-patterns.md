# Advanced Patterns

## Pin one saved position to a list route

Use an explicit `scrollKey` such as `/products` when the UI leaves a list route and opens a detail route like `/products/123`, but the restored position should still belong to the list.

- Pass the same `scrollKey` in full-window and element-based restore calls.
- Use this for detail pages, modal routes, intercepted routes, or custom `pushState` flows.
- Skip this when the current URL should already be the restore key.

## Restore data before scroll

Use a custom state restore API when scroll alone is not enough.

- Use `stateHandler` in `@sukooru/core`, `@sukooru/react`, `@sukooru/vue`, `@sukooru/next`, and `@sukooru/nuxt`.
- Use `stateHandler` through `createScrollRestore` in `@sukooru/svelte`.
- Capture the minimum state needed to rebuild the list:
  - loaded page count
  - cursor
  - first visible item index
  - virtualizer offset
- Recreate data first, then let Sukooru reapply scroll.

## Restore virtual lists

Prefer the virtual-list helpers when the DOM only contains visible rows.

- Use `useVirtualScrollRestore` in React, Vue, Next.js, and Nuxt.
- Use `createVirtualScrollRestore` in Svelte.
- Keep `containerId` stable.
- Leave `invalidateOnCountChange` at its default unless the item count is guaranteed to match the saved state.

## Resolve browser-native restore conflicts

Set `window.history.scrollRestoration = 'manual'` once on the client when the browser's own restoration fights Sukooru.

Use this especially in:

- custom routers
- React SPA demos
- Next.js or Nuxt apps with client-side route transitions

## Verify against repo sources when maintaining Sukooru

If you are working inside the Sukooru repository, verify behavior against these files before changing docs or examples:

- `packages/*/src/index.ts` for public exports
- `packages/*/README.md` for package-level examples
- `README.md` and `README.en.md` for root positioning
- `examples/vite-react/src/App.tsx` for window, element, virtual, and infinite patterns
- `examples/vanilla/src/main.ts` for manual `@sukooru/core` integration
