---
name: sukooru-integration
description: Integrate Sukooru scroll restoration into browser apps. Use when choosing between `@sukooru/core`, `@sukooru/react`, `@sukooru/vue`, `@sukooru/next`, `@sukooru/nuxt`, and `@sukooru/svelte`; when adding full-window or specific-element scroll restoration; or when pinning `scrollKey` and restoring list state for virtual or infinite views.
---

# Sukooru Integration

Integrate Sukooru with the first-party package that matches the app runtime. Start with the simplest restore pattern first, then add pinned keys or custom state only when the navigation flow needs them.

## Quick start

1. Identify the runtime.
2. Install the matching package.
3. Add one-time app setup.
4. Implement one base pattern:
   - Restore the full window scroll position.
   - Restore a specific scrollable element with a stable `containerId`.
5. Pin `scrollKey` to the list route when detail navigation changes the URL but should restore into the same saved position.
6. Restore list data before scroll when the UI depends on pagination, cursors, or virtualization.
7. Set `window.history.scrollRestoration = 'manual'` on the client if native browser restoration conflicts with Sukooru.

## Choose the package

- Use `@sukooru/core` for vanilla apps, custom routers, or custom adapters.
- Use `@sukooru/react` for React apps with provider + hook integration.
- Use `@sukooru/next` for Next.js App Router. It derives the route key from pathname + search params.
- Use `@sukooru/vue` for Vue apps with plugin + composable integration.
- Use `@sukooru/nuxt` for Nuxt apps. It derives the route key from `route.fullPath`.
- Use `@sukooru/svelte` for Svelte or SvelteKit apps with context + actions.

Read `references/framework-recipes.md` for concrete setup and base examples.  
Read `references/advanced-patterns.md` only when you need pinned keys, custom state, virtual lists, or repo-maintenance guidance.

## Follow these rules

- Prefer the framework adapter over `@sukooru/core` when a first-party package exists.
- Prefer hooks, composables, or actions over manual `save()` / `restore()` calls in adapter packages.
- Treat `'window'` as the default container for page-level scrolling.
- Keep `containerId` stable across renders and visits.
- Use an explicit `scrollKey` when multiple URLs should share one saved list position.
- Restore data first and scroll second for virtual or infinite lists.
- Verify public exports before coding if the package version is uncertain.
- Use package READMEs and `packages/*/src/index.ts` as the source of truth when working inside the Sukooru repository.

## Validate the integration

- Confirm the chosen package exports the API you plan to use.
- Confirm one base example matches the app structure before adding advanced behavior.
- Confirm back navigation restores to the previous position.
- Confirm pinned `scrollKey` flows restore to the list route's saved position.
- Confirm stateful lists load their data before the final scroll offset is applied.
