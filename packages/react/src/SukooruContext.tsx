import { createContext } from 'react'
import type { SukooruInstance } from 'sukooru-core'

export const SukooruContext = createContext<SukooruInstance<any> | null>(null)
