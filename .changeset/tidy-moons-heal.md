---
'@sukooru/core': minor
'@sukooru/react': patch
'@sukooru/vue': patch
'@sukooru/svelte': patch
'@sukooru/next': patch
'@sukooru/nuxt': patch
---

Prepare the next package release after the production-readiness work merged on top of `0.1.2`.

- `@sukooru/core` adds duplicate registration guards, `hooks.onError`, and `strict` restore mode.
- Framework packages get patch releases so their published internal dependency graph moves forward with the new core release.
