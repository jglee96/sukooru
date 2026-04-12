'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { createSukooru } from 'sukooru-core'
import type { ReactNode } from 'react'
import type { SukooruInstance, SukooruOptions } from 'sukooru-core'
import { SukooruContext } from './SukooruContext'

export interface SukooruProviderProps<T = unknown> {
  children: ReactNode
  options?: SukooruOptions<T>
  instance?: SukooruInstance<T>
}

const useSafeLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export const SukooruProvider = <T,>({
  children,
  options,
  instance,
}: SukooruProviderProps<T>) => {
  const instanceRef = useRef<SukooruInstance<T> | null>(instance ?? null)

  if (instanceRef.current === null) {
    instanceRef.current = createSukooru(options)
  }

  useSafeLayoutEffect(() => {
    const cleanup = instanceRef.current?.mount()
    return cleanup
  }, [])

  return (
    <SukooruContext.Provider value={instanceRef.current}>
      {children}
    </SukooruContext.Provider>
  )
}
