# Support Policy

## Runtime Support

Sukooru is intended for evergreen browsers that implement:

- History API: `pushState`, `replaceState`, `popstate`
- `sessionStorage`
- `requestAnimationFrame`

The library is designed for current Chrome, Edge, Firefox, and Safari releases. Older browsers and embedded webviews may work, but they are not treated as compatibility targets.

## Framework Support

- `@sukooru/react`: React 19
- `@sukooru/next`: Next.js 15 with React 19
- `@sukooru/vue`: Vue 3.3+
- `@sukooru/nuxt`: Nuxt 3+
- `@sukooru/svelte`: Svelte 4 or 5

## Verification Scope

- CI continuously runs typecheck, unit tests, package build verification, and Playwright E2E.
- Browser E2E is currently gated in Chromium on GitHub Actions.
- Firefox and Safari compatibility are intended, but regressions in those engines may not be caught before release unless explicitly tested.

## Storage Fallback Behavior

If the browser blocks `sessionStorage` for the current page session, Sukooru falls back to in-memory storage. Restoration will keep working for the current tab session, but state will not survive a full reload or a new tab.

## Getting Help

- Usage questions and bug reports: GitHub Issues
- Production regressions: include package version, framework version, browser, repro route flow, and whether native scroll restoration was disabled
