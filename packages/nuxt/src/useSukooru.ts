import { useNuxtApp } from '#app'
import type { SukooruInstance } from '@sukooru/core'

export const useSukooru = <T = unknown>(): SukooruInstance<T> => {
  const instance = useNuxtApp().$sukooru

  if (!instance) {
    throw new Error('createSukooruNuxtPlugin으로 등록된 Nuxt 앱 내부에서만 useSukooru를 사용할 수 있습니다.')
  }

  return instance as SukooruInstance<T>
}
