import { useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import type {
  ContainerHandle,
  ScrollStateHandler,
  ScrollRestoreStatus,
} from '@sukooru/core'
import { useSukooru } from './useSukooru'

export interface UseScrollRestoreOptions<T = unknown> {
  containerId?: string
  scrollKey?: string
  stateHandler?: ScrollStateHandler<T>
}

export interface UseScrollRestoreResult {
  ref: MutableRefObject<HTMLElement | null>
  status: ScrollRestoreStatus
}

export const useScrollRestore = <T = unknown>({
  containerId = 'window',
  scrollKey,
  stateHandler,
}: UseScrollRestoreOptions<T> = {}): UseScrollRestoreResult => {
  const sukooru = useSukooru<T>()
  const containerRef = useRef<HTMLElement | null>(null)
  const handlerHandleRef = useRef<ContainerHandle | null>(null)
  const latestStateHandlerRef = useRef<ScrollStateHandler<T> | undefined>(stateHandler)
  const skipNextHandlerSyncRef = useRef(false)
  const [status, setStatus] = useState<ScrollRestoreStatus>('idle')

  latestStateHandlerRef.current = stateHandler

  useEffect(() => {
    const element = containerId === 'window' ? window : containerRef.current
    if (!element) {
      return
    }

    skipNextHandlerSyncRef.current = true
    handlerHandleRef.current?.unregister()
    handlerHandleRef.current = latestStateHandlerRef.current
      ? sukooru.setScrollStateHandler(containerId, latestStateHandlerRef.current)
      : null

    const containerHandle = sukooru.registerContainer(element, containerId)
    let cancelled = false

    setStatus('restoring')
    void sukooru
      .restore(scrollKey)
      .then((nextStatus) => {
        if (!cancelled) {
          setStatus(nextStatus)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('idle')
        }
      })

    return () => {
      cancelled = true
      void sukooru.save(scrollKey)
      containerHandle.unregister()
      handlerHandleRef.current?.unregister()
      handlerHandleRef.current = null
    }
  }, [containerId, scrollKey, sukooru])

  useEffect(() => {
    if (skipNextHandlerSyncRef.current) {
      skipNextHandlerSyncRef.current = false
      return
    }

    handlerHandleRef.current?.unregister()
    handlerHandleRef.current = stateHandler
      ? sukooru.setScrollStateHandler(containerId, stateHandler)
      : null
  }, [containerId, stateHandler, sukooru])

  return {
    ref: containerRef,
    status,
  }
}
