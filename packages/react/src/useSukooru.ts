import { useContext } from 'react'
import type { SukooruInstance } from 'sukooru-core'
import { SukooruContext } from './SukooruContext'

export const useSukooru = <T = unknown>(): SukooruInstance<T> => {
  const instance = useContext(SukooruContext)

  if (!instance) {
    throw new Error('SukooruProvider 내부에서만 useSukooru를 사용할 수 있습니다.')
  }

  return instance as SukooruInstance<T>
}
