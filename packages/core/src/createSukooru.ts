import { ContainerRegistry } from './containerRegistry'
import { TypedEventEmitter } from './events'
import { ScrollStateRegistry } from './scrollStateRegistry'
import { EntryManager } from './storage/entryManager'
import { createDefaultSerializer } from './storage/serializer'
import { sessionStorageAdapter } from './storage/sessionStorageAdapter'
import type {
  ContainerHandle,
  ScrollCustomState,
  ScrollEntry,
  ScrollKey,
  ScrollPosition,
  ScrollRestoreStatus,
  SukooruInstance,
  SukooruOptions,
} from './types'

const defaultGetKey = (): ScrollKey => {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.location.href
}

const delay = async (timeout: number): Promise<void> => {
  if (timeout <= 0) {
    return
  }

  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, timeout)
  })
}

const waitForNextFrame = async (): Promise<void> => {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return
  }

  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}

const isWindow = (target: Element | Window): target is Window => {
  return typeof window !== 'undefined' && target === window
}

const readScrollPosition = (containerId: string, target: Element | Window): ScrollPosition => {
  if (isWindow(target)) {
    return {
      containerId,
      x: target.scrollX,
      y: target.scrollY,
    }
  }

  return {
    containerId,
    x: target.scrollLeft,
    y: target.scrollTop,
  }
}

const applyScrollPosition = (target: Element | Window, position: ScrollPosition): void => {
  if (isWindow(target)) {
    target.scrollTo({
      left: position.x,
      top: position.y,
      behavior: 'auto',
    })
    return
  }

  target.scrollLeft = position.x
  target.scrollTop = position.y
}

export const createSukooru = <T = unknown>(
  options: SukooruOptions<T> = {},
): SukooruInstance<T> => {
  const {
    getKey = defaultGetKey,
    storage = sessionStorageAdapter,
    ttl,
    maxEntries = 50,
    hooks = {},
    restoreDelay = 0,
    waitForDomReady = true,
  } = options

  const emitter = new TypedEventEmitter<T>()
  const entryManager = new EntryManager(storage, createDefaultSerializer<T>(), maxEntries, ttl)
  const containerRegistry = new ContainerRegistry()
  const stateRegistry = new ScrollStateRegistry<T>()

  let mountedCleanup: (() => void) | null = null
  let currentTrackedKey = getKey()
  let activeRestore:
    | {
        key: ScrollKey
        controller: AbortController
        promise: Promise<ScrollRestoreStatus>
      }
    | null = null

  const resolveKey = (key?: ScrollKey): ScrollKey => key ?? getKey()

  const collectPositions = (): ScrollPosition[] => {
    return containerRegistry
      .getAll()
      .map(({ id, element }) => readScrollPosition(id, element))
  }

  const captureCustomState = (): ScrollCustomState<T> | null => {
    const stateEntries = stateRegistry.getAll()
    if (stateEntries.length === 0) {
      return null
    }

    return stateEntries.reduce<ScrollCustomState<T>>((captured, [containerId, handler]) => {
      captured[containerId] = handler.captureState()
      return captured
    }, {})
  }

  const applyCustomStates = async (
    entry: ScrollEntry<T>,
    signal: AbortSignal,
    key: ScrollKey,
  ): Promise<void> => {
    const customState = entry.customState
    if (!customState) {
      return
    }

    for (const [containerId, handler] of stateRegistry.getAll()) {
      if (signal.aborted) {
        return
      }

      const state = customState[containerId]
      if (state === undefined) {
        continue
      }

      try {
        await handler.applyState(state)
      } catch (error) {
        emitter.emit('restore:error', { key, entry, error })
      }
    }
  }

  const applyPositions = (entry: ScrollEntry<T>): void => {
    entry.positions.forEach((position) => {
      const target = containerRegistry.find(position.containerId)
      if (!target) {
        return
      }

      applyScrollPosition(target, position)
    })
  }

  const save = async (key?: ScrollKey): Promise<void> => {
    activeRestore?.controller.abort()
    activeRestore = null

    const resolvedKey = resolveKey(key)
    const entry: ScrollEntry<T> = {
      savedAt: Date.now(),
      positions: collectPositions(),
      customState: captureCustomState(),
    }

    let cancelled = false
    hooks.onBeforeSave?.({
      key: resolvedKey,
      entry,
      cancel: () => {
        cancelled = true
      },
    })

    if (cancelled) {
      return
    }

    emitter.emit('save:before', { key: resolvedKey, entry })

    try {
      entryManager.set(resolvedKey, entry)
      emitter.emit('save:after', { key: resolvedKey, entry })
    } catch (error) {
      emitter.emit('save:error', { key: resolvedKey, entry, error })
      throw error
    }
  }

  const restore = async (key?: ScrollKey): Promise<ScrollRestoreStatus> => {
    const resolvedKey = resolveKey(key)
    const entry = entryManager.get(resolvedKey)

    if (!entry) {
      emitter.emit('restore:miss', { key: resolvedKey })
      return 'missed'
    }

    let cancelled = false
    hooks.onBeforeRestore?.({
      key: resolvedKey,
      entry,
      cancel: () => {
        cancelled = true
      },
    })

    if (cancelled) {
      return 'idle'
    }

    if (activeRestore?.key === resolvedKey) {
      return activeRestore.promise
    }

    activeRestore?.controller.abort()
    const controller = new AbortController()
    const restorePromise = (async (): Promise<ScrollRestoreStatus> => {
      emitter.emit('restore:before', { key: resolvedKey, entry })

      try {
        await delay(restoreDelay)

        if (waitForDomReady) {
          await waitForNextFrame()
        }

        if (controller.signal.aborted) {
          return 'idle'
        }

        await applyCustomStates(entry, controller.signal, resolvedKey)

        if (controller.signal.aborted) {
          return 'idle'
        }

        if (waitForDomReady) {
          await waitForNextFrame()
        }

        if (controller.signal.aborted) {
          return 'idle'
        }

        applyPositions(entry)
        emitter.emit('restore:after', { key: resolvedKey, entry })
        return 'restored'
      } catch (error) {
        emitter.emit('restore:error', { key: resolvedKey, entry, error })
        return 'idle'
      } finally {
        if (activeRestore?.controller === controller) {
          activeRestore = null
        }
      }
    })()

    activeRestore = {
      key: resolvedKey,
      controller,
      promise: restorePromise,
    }

    return restorePromise
  }

  const clear = (key?: ScrollKey): void => {
    const resolvedKey = resolveKey(key)
    entryManager.delete(resolvedKey)
    emitter.emit('clear', { key: resolvedKey || null })
  }

  const clearAll = (): void => {
    entryManager.deleteAll()
    emitter.emit('clear', { key: null })
  }

  const registerContainer = (element: Element | Window, id: string): ContainerHandle => {
    const token = containerRegistry.register(element, id)
    return {
      unregister: () => {
        containerRegistry.unregister(id, token)
      },
    }
  }

  const setScrollStateHandler = (
    containerId: string,
    handler: Parameters<ScrollStateRegistry<T>['register']>[1],
  ): ContainerHandle => {
    const token = stateRegistry.register(containerId, handler)

    return {
      unregister: () => {
        stateRegistry.unregister(containerId, token)
      },
    }
  }

  const mount = (): (() => void) => {
    if (mountedCleanup) {
      return mountedCleanup
    }

    if (typeof window === 'undefined') {
      return () => {}
    }

    currentTrackedKey = getKey()
    const originalPushState = window.history.pushState.bind(window.history)
    const originalReplaceState = window.history.replaceState.bind(window.history)

    window.history.pushState = (...args) => {
      originalPushState(...args)
      currentTrackedKey = getKey()
    }

    window.history.replaceState = (...args) => {
      originalReplaceState(...args)
      currentTrackedKey = getKey()
    }

    const handlePopState = async (): Promise<void> => {
      const leavingKey = currentTrackedKey
      const arrivingKey = getKey()

      try {
        await save(leavingKey)
      } catch {
        // 저장 실패가 복원까지 막으면 사용자가 더 큰 어긋남을 겪게 된다.
      }

      await restore(arrivingKey)
      currentTrackedKey = arrivingKey
    }

    window.addEventListener('popstate', handlePopState)
    emitter.emit('mount', {})

    mountedCleanup = () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', handlePopState)
        window.history.pushState = originalPushState
        window.history.replaceState = originalReplaceState
      }

      activeRestore?.controller.abort()
      activeRestore = null
      mountedCleanup = null
      emitter.emit('unmount', {})
    }

    return mountedCleanup
  }

  return {
    save,
    restore,
    clear,
    clearAll,
    registerContainer,
    setScrollStateHandler,
    on: emitter.on.bind(emitter),
    mount,
    get keys() {
      return entryManager.getAllKeys()
    },
    get currentKey() {
      return getKey()
    },
  }
}
