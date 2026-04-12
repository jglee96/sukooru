'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createSukooru } from '@sukooru/core'
import { SukooruContext } from '@sukooru/react'
import type { ReactNode } from 'react'
import type { SukooruInstance, SukooruOptions } from '@sukooru/core'
import { RouteKeyContext, buildRouteKey } from './routeKey'

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
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = buildRouteKey(pathname, searchParams)
  const routeKeyRef = useRef(routeKey)
  const instanceRef = useRef<SukooruInstance<T> | null>(instance ?? null)

  routeKeyRef.current = routeKey

  if (instanceRef.current === null) {
    instanceRef.current = createSukooru<T>({
      ...options,
      getKey: () => routeKeyRef.current,
    })
  }

  useSafeLayoutEffect(() => {
    const cleanup = instanceRef.current?.mount()
    return cleanup
  }, [])

  return (
    <SukooruContext.Provider value={instanceRef.current}>
      <RouteKeyContext.Provider value={routeKey}>
        {children}
      </RouteKeyContext.Provider>
    </SukooruContext.Provider>
  )
}
