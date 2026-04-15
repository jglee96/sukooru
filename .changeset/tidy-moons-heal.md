---
'@sukooru/core': minor
'@sukooru/react': minor
'@sukooru/vue': minor
'@sukooru/svelte': minor
'@sukooru/next': minor
'@sukooru/nuxt': minor
---

Prepare the next package release after the production-readiness work merged on top of `0.1.2`.

- `@sukooru/core` adds duplicate registration guards, `hooks.onError`, and `strict` restore mode.
- Framework packages get minor releases because they re-export `SukooruOptions`, so wrapper consumers can also use the new `hooks.onError` and `strict` options.
