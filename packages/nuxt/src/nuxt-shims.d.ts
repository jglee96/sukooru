declare module '#app' {
  import type { App } from 'vue'
  import type { SukooruInstance } from 'sukooru-core'

  export interface NuxtRouteLike {
    fullPath: string
  }

  export interface NuxtRouterLike {
    currentRoute: {
      value: NuxtRouteLike
    }
  }

  export interface NuxtApp {
    vueApp: App
    $router?: NuxtRouterLike
    $sukooru?: SukooruInstance<any>
    provide: (name: string, value: unknown) => void
  }

  export function defineNuxtPlugin<T>(
    plugin: (nuxtApp: NuxtApp) => T,
  ): (nuxtApp: NuxtApp) => T

  export function useNuxtApp(): NuxtApp
  export function useRoute(): NuxtRouteLike
}
