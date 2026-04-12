import { inject } from 'vue'
import type { SukooruInstance } from '@sukooru/core'
import { SUKOORU_KEY } from './plugin'

export const useSukooru = <T = unknown>(): SukooruInstance<T> => {
  const instance = inject(SUKOORU_KEY, null)

  if (!instance) {
    throw new Error('createSukooruPlugin으로 등록된 Vue 앱 내부에서만 useSukooru를 사용할 수 있습니다.')
  }

  return instance as SukooruInstance<T>
}
