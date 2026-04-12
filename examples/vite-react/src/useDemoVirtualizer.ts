import { useMemo, useRef, useState } from 'react'
import type { MutableRefObject, UIEvent } from 'react'
import type { VirtualizerLike } from '@sukooru/react'

export interface DemoVirtualRow {
  index: number
  start: number
  size: number
}

export interface UseDemoVirtualizerOptions {
  containerRef: MutableRefObject<HTMLDivElement | null>
  count: number
  itemHeight: number
  viewportHeight: number
  overscan?: number
}

export interface UseDemoVirtualizerResult {
  handleScroll: (event: UIEvent<HTMLDivElement>) => void
  totalHeight: number
  virtualItems: DemoVirtualRow[]
  virtualizer: VirtualizerLike
}

const clampOffset = (offset: number, maxOffset: number): number => {
  return Math.max(0, Math.min(offset, maxOffset))
}

export const useDemoVirtualizer = ({
  containerRef,
  count,
  itemHeight,
  viewportHeight,
  overscan = 4,
}: UseDemoVirtualizerOptions): UseDemoVirtualizerResult => {
  const [scrollOffset, setScrollOffset] = useState(0)
  const scrollOffsetRef = useRef(0)
  const totalHeight = count * itemHeight
  const maxOffset = Math.max(0, totalHeight - viewportHeight)

  const buildVirtualItems = (offset: number): DemoVirtualRow[] => {
    const visibleItemCount = Math.ceil(viewportHeight / itemHeight)
    const startIndex = Math.max(Math.floor(offset / itemHeight) - overscan, 0)
    const endIndex = Math.min(startIndex + visibleItemCount + overscan * 2, count)

    return Array.from({ length: endIndex - startIndex }, (_, offset) => {
      const index = startIndex + offset

      return {
        index,
        start: index * itemHeight,
        size: itemHeight,
      }
    })
  }

  const virtualItems = useMemo(
    () => buildVirtualItems(scrollOffset),
    [count, itemHeight, overscan, scrollOffset, viewportHeight],
  )

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const nextOffset = clampOffset(event.currentTarget.scrollTop, maxOffset)

    scrollOffsetRef.current = nextOffset
    setScrollOffset(nextOffset)
  }

  const virtualizer = useMemo<VirtualizerLike>(
    () => ({
      get scrollOffset() {
        return containerRef.current?.scrollTop ?? scrollOffsetRef.current
      },
      options: {
        get count() {
          return count
        },
      },
      getVirtualItems: () =>
        buildVirtualItems(containerRef.current?.scrollTop ?? scrollOffsetRef.current).map(
          ({ index }) => ({ index }),
        ),
      scrollToOffset: (offset) => {
        const nextOffset = clampOffset(offset, maxOffset)

        scrollOffsetRef.current = nextOffset
        setScrollOffset(nextOffset)
        containerRef.current?.scrollTo({
          top: nextOffset,
          left: 0,
          behavior: 'auto',
        })
      },
    }),
    [containerRef, count, itemHeight, maxOffset, overscan, viewportHeight],
  )

  return {
    handleScroll,
    totalHeight,
    virtualItems,
    virtualizer,
  }
}
