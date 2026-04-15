'use client'

import type { ReactNode } from 'react'
import { SukooruProvider } from '@sukooru/next'

export function Providers({ children }: { children: ReactNode }) {
  return <SukooruProvider>{children}</SukooruProvider>
}
