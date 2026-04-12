import { defineNuxtPlugin } from '#app'
import { createSukooru } from 'sukooru-core'
import { createSukooruPlugin } from 'sukooru-vue'
import type { NuxtApp } from '#app'
import type { SukooruInstance, SukooruOptions } from 'sukooru-core'

export interface CreateSukooruNuxtPluginOptions<T = unknown>
  extends SukooruOptions<T> {
  instance?: SukooruInstance<T>
}

const resolveNuxtRouteKey = (nuxtApp: NuxtApp): string => {
  const fullPath = nuxtApp.$router?.currentRoute.value.fullPath

  if (typeof fullPath === 'string') {
    return fullPath
  }

  if (typeof window === 'undefined') {
    return ''
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export const createSukooruNuxtPlugin = <T = unknown>(
  { instance, ...options }: CreateSukooruNuxtPluginOptions<T> = {},
) =>
  defineNuxtPlugin((nuxtApp) => {
    const sukooru =
      instance ??
      createSukooru<T>({
        ...options,
        getKey: options.getKey ?? (() => resolveNuxtRouteKey(nuxtApp)),
      })

    nuxtApp.vueApp.use(createSukooruPlugin({ instance: sukooru }))
    nuxtApp.provide('sukooru', sukooru)
  })
