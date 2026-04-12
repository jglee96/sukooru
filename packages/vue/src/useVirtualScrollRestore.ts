import { computed, toValue } from 'vue'
import type { ScrollStateHandler } from '@sukooru/core'
import type { MaybeRefOrGetter } from 'vue'
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
  containerId?: MaybeRefOrGetter<string | undefined>
  scrollKey?: MaybeRefOrGetter<string | undefined>
  virtualizer: MaybeRefOrGetter<VirtualizerLike>
  invalidateOnCountChange?: MaybeRefOrGetter<boolean | undefined>
}

export const useVirtualScrollRestore = ({
  containerId = 'window',
  scrollKey,
  virtualizer,
  invalidateOnCountChange = true,
}: UseVirtualScrollRestoreOptions) => {
  const stateHandler = computed<ScrollStateHandler<VirtualScrollState>>(() => ({
    captureState: () => {
      const resolvedVirtualizer = toValue(virtualizer)

      return {
        scrollOffset: resolvedVirtualizer.scrollOffset,
        firstVisibleIndex: resolvedVirtualizer.getVirtualItems()[0]?.index ?? 0,
        itemCount: resolvedVirtualizer.options.count,
      }
    },
    applyState: (state) => {
      const resolvedVirtualizer = toValue(virtualizer)
      const shouldInvalidateOnCountChange = toValue(invalidateOnCountChange) ?? true
      const countChanged =
        shouldInvalidateOnCountChange &&
        resolvedVirtualizer.options.count !== state.itemCount

      if (countChanged) {
        return
      }

      resolvedVirtualizer.scrollToOffset(state.scrollOffset, { align: 'start' })
    },
  }))

  return useScrollRestore({
    containerId,
    scrollKey,
    stateHandler,
  })
}
