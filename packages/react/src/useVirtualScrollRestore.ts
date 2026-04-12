import { useMemo } from 'react'
import type { ScrollStateHandler } from 'sukooru-core'
import { useScrollRestore } from './useScrollRestore'

export interface VirtualItemLike {
  index: number
}

export interface VirtualizerLike {
  scrollOffset: number
  options: {
    count: number
  }
  getVirtualItems: () => VirtualItemLike[]
  scrollToOffset: (offset: number, options?: { align?: string }) => void
}

export interface VirtualScrollState {
  scrollOffset: number
  firstVisibleIndex: number
  itemCount: number
}

export interface UseVirtualScrollRestoreOptions {
  containerId: string
  scrollKey?: string
  virtualizer: VirtualizerLike
  invalidateOnCountChange?: boolean
}

export const useVirtualScrollRestore = ({
  containerId,
  scrollKey,
  virtualizer,
  invalidateOnCountChange = true,
}: UseVirtualScrollRestoreOptions) => {
  const stateHandler = useMemo<ScrollStateHandler<VirtualScrollState>>(
    () => ({
      captureState: () => ({
        scrollOffset: virtualizer.scrollOffset,
        firstVisibleIndex: virtualizer.getVirtualItems()[0]?.index ?? 0,
        itemCount: virtualizer.options.count,
      }),
      applyState: (state) => {
        const countChanged =
          invalidateOnCountChange && virtualizer.options.count !== state.itemCount

        if (countChanged) {
          return
        }

        virtualizer.scrollToOffset(state.scrollOffset, { align: 'start' })
      },
    }),
    [invalidateOnCountChange, virtualizer],
  )

  return useScrollRestore({
    containerId,
    scrollKey,
    stateHandler,
  })
}
