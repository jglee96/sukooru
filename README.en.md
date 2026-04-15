[한국어](./README.md)

# Sukooru

[![CI](https://github.com/jglee96/sukooru/actions/workflows/ci.yml/badge.svg)](https://github.com/jglee96/sukooru/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/jglee96/sukooru/graph/badge.svg)](https://codecov.io/gh/jglee96/sukooru)

Sukooru is a history-aware scroll restoration library for browser apps. It stores scroll state by URL and restores it when users come back, so back navigation and client-side route changes can land where the user actually left off.

## Core Idea

- Scroll position is state that belongs to a URL.
- Sukooru owns the save/restore timing around `popstate`, `pushState`, `replaceState`, and component mount/unmount.
- The same model works for full-window scrolling, specific scroll containers, and virtual or infinite lists.

## Choose A Package

| Package | Use it when | Docs |
| --- | --- | --- |
| `@sukooru/core` | You want to wire Sukooru into a vanilla app or a custom router yourself | [README](./packages/core/README.md) |
| `@sukooru/react` | You want provider + hook integration in a React app | [README](./packages/react/README.md) |
| `@sukooru/vue` | You want plugin + composable integration in a Vue app | [README](./packages/vue/README.md) |
| `@sukooru/next` | You want route-key integration for Next.js App Router | [README](./packages/next/README.md) |
| `@sukooru/nuxt` | You want a route-aware plugin for Nuxt | [README](./packages/nuxt/README.md) |
| `@sukooru/svelte` | You want context + action integration in Svelte or SvelteKit | [README](./packages/svelte/README.md) |

## Examples

- [Vite React demo](./examples/vite-react) - full-window, specific-element, virtual-list, and infinite-list restoration
- [Vanilla demo](./examples/vanilla) - `@sukooru/core` with manual route integration

## Intended Support

| Area | Intended support range |
| --- | --- |
| Browsers | Intended for current Chrome, Edge, Firefox, and Safari releases with History API, `sessionStorage`, and `requestAnimationFrame` |
| React | React 19 |
| Next.js | Next.js 15 with React 19 |
| Vue | Vue 3.3+ |
| Nuxt | Nuxt 3+ |
| Svelte | Svelte 4 or 5 |
| Storage backends | Any sync or async adapter that implements the `StorageAdapter` contract |
| Node for repo tooling | Node 22.18+ in this workspace |

## What CI Verifies Today

- GitHub Actions runs `pnpm typecheck`, `pnpm test -- --coverage`, and `pnpm build` on `ubuntu-latest` with Node `22.18.0`.
- Browser E2E coverage is currently a single Playwright target: the Vite React demo on the Chrome channel, covering back-navigation restore on `/products` and `/virtual`.
- Framework adapters are validated with package-level unit tests for React, Vue, Svelte, Next.js, and Nuxt.

## What Is Not Yet Continuously Verified

- Firefox, WebKit, Safari, and Edge remain target browsers, but they are not yet part of the required CI browser matrix.
- Next.js and Nuxt have package API coverage, but main-branch CI does not yet boot real consumer apps for them.

## Runtime Notes

- If the browser blocks `sessionStorage`, Sukooru falls back to in-memory storage for the current tab session.
- That fallback keeps save/restore working in restricted environments, but the stored state will not survive a full reload or a new tab.
- Custom storage adapters may be synchronous or asynchronous, so wrappers around `localStorage`, cookies, IndexedDB, or remote caches can be plugged in from user code.
- If native browser restoration conflicts with your router, set `window.history.scrollRestoration = 'manual'` once on the client.

## Package Size Policy

- Treat npm `packed size`, `unpacked size`, and application runtime bundle size as different metrics.
- Sukooru release packages do not publish sourcemaps, and `pnpm verify:sizes` checks the published file list and package-size budgets.

## Agent Skill

Install the repo skill for agent-assisted integration:

```bash
npx skills add https://github.com/jglee96/sukooru --skill sukooru-integration
```

The skill lives in [skills/sukooru-integration](./skills/sukooru-integration) and teaches agents how to pick the right Sukooru package, wire full-window or element restoration, and handle pinned `scrollKey` or stateful list restore flows.

## Completed Features

- `@sukooru/core` save/restore API
- browser history integration for `popstate`, `pushState`, and `replaceState`
- full-window and element-level scroll restoration
- `sessionStorage` storage and in-memory storage adapter
- TTL and max-entry management
- custom `ScrollStateHandler` support for virtual and infinite lists
- React, Vue, Next.js, Nuxt, and Svelte adapters
- runnable React and vanilla examples
- Chromium Playwright E2E coverage for back-navigation restore in the Vite React demo

## Roadmap

Upcoming work is tracked in [GitHub issues](https://github.com/jglee96/sukooru/issues). Framework-specific usage details and API examples now live in each package README.

## Policies

- [Support Policy](./SUPPORT.md)
- [Security Policy](./SECURITY.md)
