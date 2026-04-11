# Sukooru (スクロール) — 기술 명세서

## 목차

1. [개요 및 목적](#1-개요-및-목적)
2. [패키지 구조](#2-패키지-구조-monorepo)
3. [빌드 툴링](#3-빌드-툴링)
4. [핵심 타입 시스템](#4-핵심-타입-시스템-sukoorucore)
5. [스토리지 전략](#5-스토리지-전략)
6. [내부 아키텍처](#6-내부-아키텍처)
7. [Virtual / Infinite Scroll 처리](#7-virtual-scroll-및-infinite-scroll-처리)
8. [프레임워크 어댑터](#8-프레임워크-어댑터)
9. [시나리오별 사용 예시](#9-전체-사용-시나리오별-예시)
10. [엣지 케이스 및 예외 처리](#10-엣지-케이스-및-예외-처리)
11. [테스트 전략](#11-테스트-전략)
12. [버전 관리 및 릴리즈](#12-버전-관리-및-릴리즈)
13. [성능 고려사항](#13-성능-고려사항)

---

## 1. 개요 및 목적

**Sukooru**는 브라우저 History API와 통합되어 페이지 탐색 시 스크롤 위치를 정확하게 복원하는 프레임워크 비종속적(framework-agnostic) 스크롤 복원 라이브러리입니다.

### 핵심 Mental Model

> **스크롤 위치는 URL에 귀속된 상태다. 사용자는 "무엇을" 복원할지만 선언하고, 라이브러리가 탐색 타이밍에 맞춰 저장과 복원을 전담한다.**

TanStack Query가 "서버 상태의 생명주기를 내가 관리한다"는 mental model로 모든 API 결정을 정렬하듯, Sukooru의 모든 설계는 이 한 문장으로 수렴해야 합니다. 사용자가 `save()` / `restore()`를 언제 호출해야 하는지 고민하는 순간, 그것은 라이브러리의 설계 실패입니다.

### 핵심 문제 정의

현재 웹 생태계에서 스크롤 복원의 주요 한계점:

| 방법 | 한계 |
|---|---|
| 브라우저 기본 복원 (`history.scrollRestoration = 'auto'`) | SPA 클라이언트 사이드 라우팅과 충돌, 동작 불안정 |
| Next.js `experimental.scrollRestoration` | `window` / `document.documentElement` 기준만 지원, 커스텀 스크롤 컨테이너 미지원 |
| Virtual / Infinite Scroll | 단순 Y 좌표 외에 로드된 아이템 범위, 가상 오프셋, 페이지 번호 등 도메인 특화 상태 필요 |

### 설계 철학

- **선언적 API (Declarative First)**: 사용자는 *무엇을* 복원할지 선언한다. *언제* 저장/복원할지는 라이브러리가 결정한다.
- **명시적 키 (Explicit ScrollKey)**: TanStack Query의 `queryKey`처럼 `scrollKey`를 선택적으로 명시할 수 있어 디버깅과 수동 제어가 가능하다.
- **상태 노출 (Status Model)**: 복원 상태를 reactive하게 제공하여 사용자가 UI 피드백을 만들 수 있다.
- **범위 격리 (Scoped Handler)**: `ScrollStateHandler`는 전역이 아닌 `containerId` 단위로 scope된다.
- **최소 코어 (Minimal Core)**: `@sukooru/core`는 브라우저 API 이외 어떠한 외부 의존성도 없다.
- **타입 안전성 (Type Safety)**: 전체 공개 API를 TypeScript generic으로 설계한다.

---

## 2. 패키지 구조 (Monorepo)

```
sukooru/
├── packages/
│   ├── core/               @sukooru/core
│   ├── react/              @sukooru/react
│   ├── vue/                @sukooru/vue
│   ├── next/               @sukooru/next
│   ├── nuxt/               @sukooru/nuxt
│   └── svelte/             @sukooru/svelte
├── examples/
│   ├── next-app/
│   ├── vite-react/
│   ├── nuxt-app/
│   └── vanilla/
├── docs/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### 패키지 간 의존 관계

```
@sukooru/react   ──┐
@sukooru/vue     ──┤
@sukooru/next    ──┤──► @sukooru/core
@sukooru/nuxt    ──┤
@sukooru/svelte  ──┘
```

프레임워크 패키지는 `@sukooru/core`를 `peerDependency`가 아닌 `dependency`로 번들합니다. 코어가 경량(< 3 KB gzip)이므로 중복 포함 비용이 낮고, 버전 불일치 문제를 방지합니다.

---

## 3. 빌드 툴링

### Turborepo + pnpm workspace

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {}
  }
}
```

### tsup (각 패키지의 번들러)

tsup을 선택한 이유: esbuild 기반으로 빠르고, CJS/ESM 듀얼 출력, `.d.ts` 자동 생성이 간단합니다.

```typescript
// packages/core/tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2017',
})
```

### 패키지별 `package.json` exports 필드

```json
{
  "name": "@sukooru/core",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"]
}
```

---

## 4. 핵심 타입 시스템 (`@sukooru/core`)

### 4.1 기반 인터페이스

```typescript
// packages/core/src/types.ts

/**
 * 스크롤 복원 대상을 식별하는 키.
 * 기본값은 URL의 pathname + search + hash.
 * 커스텀 라우터(e.g. hash routing)에서는 오버라이드 가능.
 */
export type ScrollKey = string

/**
 * 스크롤 위치를 저장하는 최소 단위.
 * T: 도메인 특화 커스텀 상태 (virtual scroll, infinite scroll 등)
 */
export interface ScrollEntry<T = unknown> {
  /** 저장 시각 (Unix timestamp ms) */
  savedAt: number
  /** 기본 스크롤 컨테이너들의 위치 목록 */
  positions: ScrollPosition[]
  /** 커스텀 도메인 상태 (virtual/infinite scroll 등) */
  customState: T | null
}

export interface ScrollPosition {
  /** 스크롤 컨테이너를 식별하는 selector 또는 고유 ID */
  containerId: string
  x: number
  y: number
}

/**
 * 저장/복원 시점에 개입할 수 있는 생명주기 훅.
 * cancel()을 호출하면 해당 동작을 취소합니다.
 */
export interface ScrollHooks<T = unknown> {
  onBeforeSave?: (context: { key: ScrollKey; entry: ScrollEntry<T>; cancel: () => void }) => void
  onBeforeRestore?: (context: { key: ScrollKey; entry: ScrollEntry<T>; cancel: () => void }) => void
}

/**
 * 복원 진행 상태. 프레임워크 어댑터가 reactive하게 노출한다.
 *
 * idle      — 복원 대상이 없거나 아직 시도하지 않음
 * restoring — 복원 진행 중 (DOM 대기 또는 applyState 실행 중)
 * restored  — 복원 완료
 * missed    — 저장된 데이터 없음 (첫 방문 등)
 */
export type ScrollRestoreStatus = 'idle' | 'restoring' | 'restored' | 'missed'

/**
 * 커스텀 스크롤 상태 제공자.
 * 예: virtual scroll의 startIndex, 현재 보이는 아이템 범위 등
 */
export interface ScrollStateHandler<T = unknown> {
  /** 현재 스크롤 상태를 캡처하여 반환 */
  captureState: () => T
  /** 캡처된 상태를 받아 스크롤 위치를 복원 */
  applyState: (state: T) => void | Promise<void>
}

/**
 * SessionStorage 이외의 저장 백엔드를 교체할 때 사용.
 * 예: IndexedDB, 인메모리(테스트용)
 */
export interface StorageAdapter {
  get: (key: string) => string | null
  set: (key: string, value: string) => void
  delete: (key: string) => void
  keys: () => string[]
}

export interface SukooruOptions<T = unknown> {
  /** 스크롤 키 생성 전략. 기본값: () => location.href */
  getKey?: () => ScrollKey
  /** 커스텀 저장 백엔드. 기본값: sessionStorageAdapter */
  storage?: StorageAdapter
  /** 저장 항목의 TTL (ms). 기본값: undefined (무제한) */
  ttl?: number
  /** 최대 저장 항목 수. 기본값: 50 */
  maxEntries?: number
  /** 생명주기 훅 */
  hooks?: ScrollHooks<T>
  /** 스크롤 복원 시 딜레이 (ms). SSR hydration 완료 대기 등에 사용. 기본값: 0 */
  restoreDelay?: number
  /**
   * true이면 DOM이 안정화된 후 복원 (requestAnimationFrame 대기).
   * SSR/hydration 환경에서 복원 위치 어긋남 방지. 기본값: true
   */
  waitForDomReady?: boolean
}
```

### 4.2 SukooruInstance (공개 API)

```typescript
// packages/core/src/instance.ts

/**
 * registerContainer의 반환값. 등록 해제를 문자열 커플링 없이 처리한다.
 *
 * 기존: registerContainer(el, 'id') + unregisterContainer('id')  ← 문자열 커플링
 * 개선: const handle = registerContainer(el, 'id') → handle.unregister()
 */
export interface ContainerHandle {
  unregister: () => void
}

export interface SukooruInstance<T = unknown> {
  // ─── 저수준 명령형 API (프레임워크 어댑터와 Vanilla JS용) ───────────────

  /** 현재 키로 스크롤 상태를 저장한다. */
  save: (key?: ScrollKey) => Promise<void>

  /**
   * 지정 키(또는 현재 URL 키)의 스크롤 상태를 복원한다.
   * 반환: 복원 성공 여부
   */
  restore: (key?: ScrollKey) => Promise<ScrollRestoreStatus>

  /** 특정 키의 저장 데이터를 삭제한다. */
  clear: (key?: ScrollKey) => void

  /** 모든 저장 데이터를 삭제한다. */
  clearAll: () => void

  /**
   * 스크롤 컨테이너를 등록한다.
   * 반환된 handle.unregister()로 등록을 해제한다 (문자열 커플링 방지).
   */
  registerContainer: (element: Element | Window, id: string) => ContainerHandle

  /**
   * containerId에 귀속된 ScrollStateHandler를 등록한다.
   * 같은 containerId로 재호출하면 교체된다.
   * 반환된 handle.unregister()로 해제한다.
   */
  setScrollStateHandler: (containerId: string, handler: ScrollStateHandler<T>) => ContainerHandle

  /** 라이프사이클 이벤트 구독. 반환값은 구독 해제 함수. */
  on: <E extends SukooruEvent>(event: E, handler: SukooruEventHandler<E, T>) => () => void

  /**
   * popstate 이벤트 감지를 시작한다.
   * Provider/Plugin에서 한 번만 호출한다. 반환값: 정리 함수.
   */
  mount: () => () => void

  /** 현재 저장된 모든 스크롤 키 목록. */
  readonly keys: ScrollKey[]

  /**
   * 현재 적용될 scrollKey를 반환한다.
   * getKey 옵션을 오버라이드하지 않았다면 location.href.
   * 디버깅 시 "어떤 키로 저장됐지?"를 확인할 때 사용한다.
   */
  readonly currentKey: ScrollKey
}
```

---

## 5. 스토리지 전략

### 5.1 키 설계

```
sukooru:{version}:{normalizedKey}

예시:
sukooru:1:https://example.com/products?category=shoes
sukooru:1:https://example.com/products?category=shoes#section-2
```

- `version` 필드를 통해 스키마 변경 시 기존 데이터를 무효화합니다.
- `normalizedKey` 생성 시 trailing slash 정규화, 기본 포트 제거 등을 처리합니다.
- sessionStorage 기본 사용: 탭 종료 시 자동 정리, 탭 간 격리.

### 5.2 기본 StorageAdapter 구현

```typescript
// packages/core/src/storage/sessionStorageAdapter.ts

export const sessionStorageAdapter: StorageAdapter = {
  get: (key) => {
    try { return sessionStorage.getItem(key) }
    catch { return null }  // SSR, 프라이빗 브라우징 예외 처리
  },
  set: (key, value) => {
    try { sessionStorage.setItem(key, value) }
    catch (e) {
      // QuotaExceededError: LRU 방식으로 가장 오래된 항목 제거 후 재시도
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        evictOldestEntries()
        try { sessionStorage.setItem(key, value) } catch { /* silent fail */ }
      }
    }
  },
  delete: (key) => { try { sessionStorage.removeItem(key) } catch {} },
  keys: () => {
    try { return Object.keys(sessionStorage).filter(k => k.startsWith('sukooru:')) }
    catch { return [] }
  },
}
```

### 5.3 직렬화 / 역직렬화

```typescript
// packages/core/src/storage/serializer.ts

export interface Serializer<T> {
  serialize: (entry: ScrollEntry<T>) => string
  deserialize: (raw: string) => ScrollEntry<T> | null
}

export function createDefaultSerializer<T>(): Serializer<T> {
  return {
    serialize: (entry) => JSON.stringify(entry),
    deserialize: (raw) => {
      try {
        const parsed = JSON.parse(raw)
        if (typeof parsed.savedAt !== 'number') return null
        if (!Array.isArray(parsed.positions)) return null
        return parsed as ScrollEntry<T>
      } catch {
        return null
      }
    },
  }
}
```

### 5.4 TTL 및 LRU 관리

```typescript
// packages/core/src/storage/entryManager.ts

export class EntryManager<T> {
  constructor(
    private storage: StorageAdapter,
    private serializer: Serializer<T>,
    private maxEntries: number,
    private ttl?: number,
  ) {}

  set(key: ScrollKey, entry: ScrollEntry<T>): void {
    this.evictExpired()   // TTL 초과 항목 정리
    this.evictOverflow()  // maxEntries 초과 시 savedAt 기준 LRU 제거
    this.storage.set(this.toStorageKey(key), this.serializer.serialize(entry))
  }

  get(key: ScrollKey): ScrollEntry<T> | null {
    const raw = this.storage.get(this.toStorageKey(key))
    if (!raw) return null
    return this.serializer.deserialize(raw)
  }

  isExpired(entry: ScrollEntry<T>): boolean {
    return !!this.ttl && Date.now() - entry.savedAt > this.ttl
  }

  private toStorageKey(key: ScrollKey): string {
    return `sukooru:1:${key}`
  }
}
```

---

## 6. 내부 아키텍처

### 6.1 상태 머신

각 스크롤 복원 세션은 다음 상태를 가집니다:

```
                   mount()
   [IDLE] ──────────────────► [LISTENING]
     ▲                             │
     │          unmount()          │  popstate event
     │◄────────────────────────────┤
     │                             ▼
     │                        [RESTORING]
     │                             │
     │          restored / failed  │
     └─────────────────────────────┘

save() 호출은 상태와 무관하게 언제든 가능 (SAVING은 별도 병렬 상태)
```

### 6.2 이벤트 버스

```typescript
// packages/core/src/events.ts

export type SukooruEvent =
  | 'save:before'
  | 'save:after'
  | 'save:error'
  | 'restore:before'
  | 'restore:after'
  | 'restore:miss'
  | 'restore:error'
  | 'clear'
  | 'mount'
  | 'unmount'

export type SukooruEventPayload<E extends SukooruEvent, T> =
  E extends 'save:before' | 'save:after' ? { key: ScrollKey; entry: ScrollEntry<T> } :
  E extends 'restore:before' | 'restore:after' ? { key: ScrollKey; entry: ScrollEntry<T> | null } :
  E extends 'restore:miss' ? { key: ScrollKey } :
  E extends 'clear' ? { key: ScrollKey } :
  never

export class TypedEventEmitter<T> {
  private listeners = new Map<SukooruEvent, Set<Function>>()

  emit<E extends SukooruEvent>(event: E, payload: SukooruEventPayload<E, T>): void { /* ... */ }
  on<E extends SukooruEvent>(event: E, handler: (payload: SukooruEventPayload<E, T>) => void): () => void { /* ... */ }
  off<E extends SukooruEvent>(event: E, handler: Function): void { /* ... */ }
}
```

### 6.3 핵심 `createSukooru` 팩토리

책임을 4개의 내부 객체로 분리하여 각 함수가 한 가지 일만 합니다.

```typescript
// packages/core/src/createSukooru.ts

export function createSukooru<T = unknown>(options: SukooruOptions<T> = {}): SukooruInstance<T> {
  const {
    getKey = () => location.href,
    storage = sessionStorageAdapter,
    ttl,
    maxEntries = 50,
    hooks = {},
    restoreDelay = 0,
    waitForDomReady = true,
  } = options

  // 단일 책임 내부 객체
  const emitter = new TypedEventEmitter<T>()
  const entryManager = new EntryManager<T>(storage, createDefaultSerializer<T>(), maxEntries, ttl)
  const containerRegistry = new ContainerRegistry()
  // ScrollStateHandler는 containerId 단위로 scope됨
  const stateHandlers = new Map<string, ScrollStateHandler<T>>()

  // --- 히스토리 탐색 추적 ---
  // 현재 페이지 키를 메모리에서 관리하여
  // history.go(-N) 같은 다단계 이동 시에도 출발 페이지를 정확히 저장
  let currentTrackedKey = getKey()

  const mount = (): (() => void) => {
    const onPopState = async () => {
      const leavingKey = currentTrackedKey
      const arrivingKey = getKey()

      await save(leavingKey)
      await restore(arrivingKey)

      currentTrackedKey = arrivingKey
    }

    window.addEventListener('popstate', onPopState)
    emitter.emit('mount', {})

    return () => {
      window.removeEventListener('popstate', onPopState)
      emitter.emit('unmount', {})
    }
  }

  // --- 저장 ---

  const readScrollPosition = (id: string, element: Element | Window): ScrollPosition => ({
    containerId: id,
    x: element === window ? window.scrollX : (element as Element).scrollLeft,
    y: element === window ? window.scrollY : (element as Element).scrollTop,
  })

  const collectScrollPositions = (): ScrollPosition[] =>
    containerRegistry.getAll().map(({ id, element }) => readScrollPosition(id, element))

  // --- 저장 ---

  // containerId별로 등록된 모든 핸들러의 상태를 캡처
  const captureAllStates = (): T | null => {
    if (stateHandlers.size === 0) return null
    const captured: Record<string, unknown> = {}
    for (const [id, handler] of stateHandlers) {
      captured[id] = handler.captureState()
    }
    return captured as T
  }

  const save = async (key?: ScrollKey): Promise<void> => {
    const resolvedKey = key ?? getKey()
    const entry: ScrollEntry<T> = {
      savedAt: Date.now(),
      positions: collectScrollPositions(),
      customState: captureAllStates(),
    }

    let cancelled = false
    hooks.onBeforeSave?.({ key: resolvedKey, entry, cancel: () => { cancelled = true } })
    if (cancelled) return

    emitter.emit('save:before', { key: resolvedKey, entry })
    entryManager.set(resolvedKey, entry)
    emitter.emit('save:after', { key: resolvedKey, entry })
  }

  // --- 복원 ---

  const applyPosition = (pos: ScrollPosition): void => {
    const element = containerRegistry.find(pos.containerId)
    if (!element) return
    if (element === window) {
      window.scrollTo({ left: pos.x, top: pos.y, behavior: 'instant' })
    } else {
      (element as Element).scrollLeft = pos.x
      ;(element as Element).scrollTop = pos.y
    }
  }

  const applyEntry = async (entry: ScrollEntry<T>): Promise<void> => {
    entry.positions.forEach(applyPosition)

    if (entry.customState !== null) {
      for (const [id, handler] of stateHandlers) {
        const state = (entry.customState as Record<string, unknown>)[id]
        if (state !== undefined) await handler.applyState(state as T)
      }
    }
  }

  const restore = async (key?: ScrollKey): Promise<ScrollRestoreStatus> => {
    const resolvedKey = key ?? getKey()
    const entry = entryManager.get(resolvedKey)

    if (!entry || entryManager.isExpired(entry)) {
      emitter.emit('restore:miss', { key: resolvedKey })
      return 'missed'
    }

    let cancelled = false
    hooks.onBeforeRestore?.({ key: resolvedKey, entry, cancel: () => { cancelled = true } })
    if (cancelled) return 'idle'

    emitter.emit('restore:before', { key: resolvedKey, entry })

    if (restoreDelay > 0) await new Promise(r => setTimeout(r, restoreDelay))

    if (waitForDomReady) {
      await new Promise<void>(resolve => requestAnimationFrame(() => applyEntry(entry).then(resolve)))
    } else {
      await applyEntry(entry)
    }

    emitter.emit('restore:after', { key: resolvedKey, entry })
    return 'restored'
  }

  const registerContainer = (el: Element | Window, id: string): ContainerHandle => {
    containerRegistry.register(el, id)
    return { unregister: () => containerRegistry.unregister(id) }
  }

  const setScrollStateHandler = (containerId: string, handler: ScrollStateHandler<T>): ContainerHandle => {
    stateHandlers.set(containerId, handler)
    return { unregister: () => stateHandlers.delete(containerId) }
  }

  return {
    save,
    restore,
    mount,
    clear: (key) => entryManager.delete(key ?? getKey()),
    clearAll: () => entryManager.deleteAll(),
    registerContainer,
    setScrollStateHandler,
    on: emitter.on.bind(emitter),
    get keys() { return entryManager.getAllKeys() },
    get currentKey() { return getKey() },
  }
}
```

---

## 7. Virtual Scroll 및 Infinite Scroll 처리

### 7.1 설계 원칙

Virtual Scroll과 Infinite Scroll은 단순 Y좌표만으로 복원이 불가능합니다.

| 스크롤 유형 | 저장해야 할 상태 |
|---|---|
| 일반 스크롤 | `scrollTop`, `scrollLeft` |
| Virtual Scroll | `scrollOffset`, `firstVisibleIndex`, `itemCount` |
| Infinite Scroll | `loadedPages`, `totalItems`, `scrollTop` |
| 조합 (Infinite + Virtual) | 위 모두 |

복원 로직은 도메인에 종속되므로 라이브러리가 직접 구현하지 않고, `ScrollStateHandler.applyState` 콜백에 위임합니다.

### 7.2 Virtual Scroll 핸들러 (TanStack Virtual)

```typescript
interface VirtualScrollState {
  scrollOffset: number
  firstVisibleIndex: number
  itemCount: number
}

const virtualScrollHandler: ScrollStateHandler<VirtualScrollState> = {
  captureState: () => ({
    scrollOffset: rowVirtualizer.scrollOffset,
    firstVisibleIndex: rowVirtualizer.getVirtualItems()[0]?.index ?? 0,
    itemCount: rowVirtualizer.options.count,
  }),
  applyState: (state) => {
    const countChanged = rowVirtualizer.options.count !== state.itemCount
    if (countChanged) return
    rowVirtualizer.scrollToOffset(state.scrollOffset, { align: 'start' })
  },
}

sukooru.setScrollStateHandler(virtualScrollHandler)
```

### 7.3 Infinite Scroll 핸들러

```typescript
interface InfiniteScrollState {
  loadedPageKeys: string[]  // cursor 기반이면 cursor 값
  scrollTop: number
  totalLoadedItems: number
}

const infiniteScrollHandler: ScrollStateHandler<InfiniteScrollState> = {
  captureState: () => ({
    loadedPageKeys: loadedPages.map(p => p.cursor),
    scrollTop: containerEl.scrollTop,
    totalLoadedItems: items.length,
  }),
  applyState: async (state) => {
    for (const cursor of state.loadedPageKeys) {
      await fetchPage(cursor)
    }
    await nextTick()
    containerEl.scrollTop = state.scrollTop
  },
}
```

---

## 8. 프레임워크 어댑터

### 8.1 `@sukooru/react`

#### Context Provider

```tsx
// packages/react/src/SukooruProvider.tsx
'use client'  // Next.js App Router 호환

interface SukooruProviderProps<T> {
  children: React.ReactNode
  options?: SukooruOptions<T>
  instance?: SukooruInstance<T>  // 테스트용 주입
}

export function SukooruProvider<T>({ children, options, instance }: SukooruProviderProps<T>) {
  const sukooruRef = useRef(instance ?? createSukooru<T>(options))

  useEffect(() => {
    const unmount = sukooruRef.current.mount()
    return unmount
  }, [])

  return (
    <SukooruContext.Provider value={sukooruRef.current}>
      {children}
    </SukooruContext.Provider>
  )
}
```

#### `useScrollRestore` 훅

사용자는 *무엇을* 복원할지만 선언한다. `save`/`restore` 호출 타이밍은 훅이 전담한다.

```typescript
// packages/react/src/useScrollRestore.ts

interface UseScrollRestoreOptions<T = unknown> {
  /** 스크롤 컨테이너를 식별하는 ID. 기본값: 'window' */
  containerId?: string
  /**
   * 명시적 스크롤 키. TanStack Query의 queryKey와 동일한 역할.
   * 생략하면 현재 URL을 키로 사용한다.
   * 디버깅 시 sukooru.currentKey로 확인 가능.
   */
  scrollKey?: string
  /**
   * Virtual / Infinite Scroll용 상태 핸들러.
   * containerId에 scope되므로 전역 오염 없음.
   */
  stateHandler?: ScrollStateHandler<T>
}

export function useScrollRestore<T = unknown>(options: UseScrollRestoreOptions<T> = {}) {
  const { containerId = 'window', scrollKey, stateHandler } = options
  const sukooru = useSukooru<T>()
  const containerRef = useRef<HTMLElement | null>(null)
  const [status, setStatus] = useState<ScrollRestoreStatus>('idle')

  useEffect(() => {
    const el = containerId === 'window' ? window : containerRef.current
    if (!el) return

    const containerHandle = sukooru.registerContainer(el, containerId)
    const handlerHandle = stateHandler
      ? sukooru.setScrollStateHandler(containerId, stateHandler)
      : null

    setStatus('restoring')
    sukooru.restore(scrollKey).then(setStatus)

    return () => {
      sukooru.save(scrollKey)
      containerHandle.unregister()
      handlerHandle?.unregister()
    }
  }, [containerId, scrollKey])

  // stateHandler가 교체될 때 핸들러만 갱신 (컨테이너 재등록 없음)
  useEffect(() => {
    if (!stateHandler) return
    const handle = sukooru.setScrollStateHandler(containerId, stateHandler)
    return () => handle.unregister()
  }, [stateHandler])

  return { ref: containerRef, status }
  // sukooru 인스턴스를 노출하지 않음:
  // 훅이 생명주기를 완전히 관리하므로 사용자가 직접 개입할 필요가 없다.
  // 고급 제어가 필요하면 useSukooru()로 별도 접근한다.
}
```

#### `useVirtualScrollRestore` 훅 (TanStack Virtual)

`useScrollRestore`의 `stateHandler` 옵션으로 통합할 수 있지만, TanStack Virtual 전용 타입 안전성과
`invalidateOnCountChange` 기본값을 제공하는 편의 훅으로 유지한다.

```typescript
// packages/react/src/useVirtualScrollRestore.ts

interface UseVirtualScrollRestoreOptions {
  containerId: string
  virtualizer: Virtualizer<any, any>
  /** 아이템 수 변화 시 복원 무효화. 기본값: true */
  invalidateOnCountChange?: boolean
}

export function useVirtualScrollRestore(options: UseVirtualScrollRestoreOptions) {
  const { containerId, virtualizer, invalidateOnCountChange = true } = options

  const stateHandler: ScrollStateHandler<VirtualScrollState> = useMemo(() => ({
    captureState: () => ({
      scrollOffset: virtualizer.scrollOffset,
      firstVisibleIndex: virtualizer.getVirtualItems()[0]?.index ?? 0,
      itemCount: virtualizer.options.count,
    }),
    applyState: (state) => {
      const countChanged = invalidateOnCountChange && virtualizer.options.count !== state.itemCount
      if (countChanged) return
      virtualizer.scrollToOffset(state.scrollOffset, { align: 'start' })
    },
  }), [virtualizer, invalidateOnCountChange])

  // useScrollRestore에 stateHandler를 위임 — 중복 로직 없음
  return useScrollRestore({ containerId, stateHandler })
}
```

---

### 8.2 `@sukooru/vue`

#### Vue Plugin

```typescript
// packages/vue/src/plugin.ts

import { App, InjectionKey } from 'vue'
import { createSukooru, SukooruInstance, SukooruOptions } from '@sukooru/core'

export const SUKOORU_KEY: InjectionKey<SukooruInstance> = Symbol('sukooru')

export function createSukooruPlugin<T>(options?: SukooruOptions<T>) {
  return {
    install(app: App) {
      const instance = createSukooru<T>(options)
      app.provide(SUKOORU_KEY, instance)
    },
  }
}
```

#### `useScrollRestore` 컴포저블

`mount()`는 Plugin 설치 시 한 번만 호출된다. 컴포저블은 컨테이너 등록과 상태 선언만 담당한다.

```typescript
// packages/vue/src/useScrollRestore.ts

import { onMounted, onBeforeUnmount, ref, Ref, shallowRef, watch } from 'vue'
import type { ScrollStateHandler, ScrollRestoreStatus } from '@sukooru/core'

interface UseScrollRestoreOptions<T = unknown> {
  containerId?: string
  scrollKey?: string
  stateHandler?: ScrollStateHandler<T>
}

export function useScrollRestore<T = unknown>(options: UseScrollRestoreOptions<T> = {}) {
  const { containerId = 'window', scrollKey, stateHandler } = options
  const sukooru = useSukooru<T>()
  const containerRef: Ref<HTMLElement | null> = ref(null)
  const status = shallowRef<ScrollRestoreStatus>('idle')

  onMounted(async () => {
    // mount()는 Plugin이 이미 호출함 — 여기서 호출하지 않는다
    const el = containerId === 'window' ? window : containerRef.value
    if (!el) return

    const containerHandle = sukooru.registerContainer(el, containerId)
    const handlerHandle = stateHandler
      ? sukooru.setScrollStateHandler(containerId, stateHandler)
      : null

    status.value = 'restoring'
    status.value = await sukooru.restore(scrollKey)

    onBeforeUnmount(() => {
      sukooru.save(scrollKey)
      containerHandle.unregister()
      handlerHandle?.unregister()
    })
  })

  return { containerRef, status }
}
```

#### Vue 사용 예시

```vue
<!-- ProductList.vue -->
<template>
  <div ref="containerRef" class="product-scroll-container">
    <ProductCard v-for="product in products" :key="product.id" :product="product" />
  </div>
</template>

<script setup lang="ts">
import { useScrollRestore } from '@sukooru/vue'

const { containerRef } = useScrollRestore('product-list')
</script>
```

```typescript
// main.ts
import { createApp } from 'vue'
import { createSukooruPlugin } from '@sukooru/vue'

createApp(App)
  .use(createSukooruPlugin({ restoreDelay: 50 }))
  .mount('#app')
```

---

### 8.3 `@sukooru/next`

Next.js는 App Router와 Pages Router의 구조가 다르므로 각각 대응합니다.

#### App Router 전용 Provider

App Router는 soft navigation 시 `popstate`를 발생시키지 않으므로, `usePathname` 변화를 감지하는 방식으로 대응합니다.

```tsx
// packages/next/src/SukooruProvider.tsx
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { createSukooru } from '@sukooru/core'

export function SukooruProvider({ children, options }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sukooru = useRef(createSukooru({
    ...options,
    getKey: () => pathname + '?' + searchParams.toString(),
  }))
  const prevKey = useRef<string | null>(null)

  useEffect(() => {
    const currentKey = pathname + '?' + searchParams.toString()

    if (prevKey.current && prevKey.current !== currentKey) {
      sukooru.current.save(prevKey.current)
    }

    prevKey.current = currentKey
  }, [pathname, searchParams])

  return (
    <SukooruContext.Provider value={sukooru.current}>
      {children}
    </SukooruContext.Provider>
  )
}
```

#### Pages Router HOC

```typescript
// pages/_app.tsx 에서 사용

export function withSukooruRestore<P>(WrappedComponent: React.ComponentType<P>) {
  return function SukooruWrapped(props: P) {
    const router = useRouter()
    const sukooru = useSukooru()

    useEffect(() => {
      const handleRouteChangeStart = () => { sukooru.save(router.asPath) }
      const handleRouteChangeComplete = (url: string) => { sukooru.restore(url) }

      router.events.on('routeChangeStart', handleRouteChangeStart)
      router.events.on('routeChangeComplete', handleRouteChangeComplete)

      return () => {
        router.events.off('routeChangeStart', handleRouteChangeStart)
        router.events.off('routeChangeComplete', handleRouteChangeComplete)
      }
    }, [router])

    return <WrappedComponent {...props} />
  }
}
```

---

### 8.4 `@sukooru/nuxt`

```typescript
// packages/nuxt/src/module.ts

import { defineNuxtModule, addPlugin, addImports } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: '@sukooru/nuxt',
    configKey: 'sukooru',
  },
  setup(options, nuxt) {
    addPlugin(resolve('./runtime/plugin'))
    addImports([
      { name: 'useScrollRestore', from: resolve('./runtime/composables') },
      { name: 'useVirtualScrollRestore', from: resolve('./runtime/composables') },
    ])
  },
})
```

```typescript
// packages/nuxt/src/runtime/plugin.ts

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const sukooru = createSukooru({
    getKey: () => router.currentRoute.value.fullPath,
  })

  router.beforeEach((to, from) => {
    sukooru.save(from.fullPath)
  })

  router.afterEach((to) => {
    // navigation.type === 2: 뒤로/앞으로 가기
    if (typeof window !== 'undefined' &&
        window.performance?.navigation?.type === 2) {
      sukooru.restore(to.fullPath)
    }
  })

  return { provide: { sukooru } }
})
```

---

### 8.5 `@sukooru/svelte`

Svelte action(`use:`) 문법으로 제공하여 관용적인 사용을 지원합니다.

```typescript
// packages/svelte/src/index.ts

export function createScrollRestoreAction(sukooru: SukooruInstance) {
  return function scrollRestore(node: HTMLElement, containerId: string) {
    sukooru.registerContainer(node, containerId)
    sukooru.restore()

    return {
      destroy() {
        sukooru.save()
        sukooru.unregisterContainer(containerId)
      },
    }
  }
}
```

```svelte
<!-- ProductList.svelte -->
<script>
  import { getContext } from 'svelte'
  import { createScrollRestoreAction } from '@sukooru/svelte'

  const sukooru = getContext('sukooru')
  const scrollRestore = createScrollRestoreAction(sukooru)
</script>

<div use:scrollRestore={'product-list'} class="scroll-container">
  {#each products as product}
    <ProductCard {product} />
  {/each}
</div>
```

---

## 9. 전체 사용 시나리오별 예시

### 시나리오 1: 일반 PLP → PDP → 뒤로가기 (Next.js App Router)

```tsx
// app/layout.tsx — Provider 한 번 설치
export default function Layout({ children }) {
  return (
    <SukooruProvider options={{ restoreDelay: 80 }}>
      {children}
    </SukooruProvider>
  )
}

// app/products/page.tsx — 선언만 하면 끝
export default function ProductListPage() {
  const { ref, status } = useScrollRestore({ containerId: 'plp-scroll' })

  return (
    <main ref={ref} style={{ overflowY: 'auto', height: '100vh' }}>
      {status === 'restoring' && <ScrollPositionLoader />}
      {products.map(p => (
        <Link key={p.id} href={`/products/${p.id}`}>
          <ProductCard product={p} />
        </Link>
      ))}
    </main>
  )
}
```

`save`/`restore`를 직접 호출하지 않는다. 탐색 타이밍 제어는 라이브러리가 전담한다.

### 시나리오 2: TanStack Virtual + Sukooru

```tsx
function VirtualProductList({ products }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
  })

  // containerId와 virtualizer만 선언
  const { status } = useVirtualScrollRestore({
    containerId: 'virtual-list',
    virtualizer: rowVirtualizer,
  })

  return (
    <div ref={parentRef} style={{ height: '80vh', overflow: 'auto' }}>
      <div style={{ height: rowVirtualizer.getTotalSize() }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{ position: 'absolute', transform: `translateY(${virtualRow.start}px)` }}
          >
            <ProductCard product={products[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 시나리오 3: Infinite Scroll (TanStack Query)

`captureState`는 렌더마다 최신 `data`를 참조해야 하므로 `useMemo`로 안정화한다.
`applyState`는 데이터 복원만 담당하고, 스크롤 좌표 복원은 라이브러리가 처리한다.

```tsx
interface InfiniteScrollState {
  pageParams: string[]
}

function InfiniteProductList() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { data, fetchNextPage } = useInfiniteQuery({ /* ... */ })

  // stateHandler를 useMemo로 안정화 — data 변경 시 최신 참조 유지
  const stateHandler = useMemo<ScrollStateHandler<InfiniteScrollState>>(() => ({
    captureState: () => ({
      pageParams: (data?.pageParams ?? []) as string[],
    }),
    applyState: async ({ pageParams }) => {
      // 역할: 데이터 복원만. 스크롤 좌표는 라이브러리가 처리
      for (const pageParam of pageParams.slice(1)) {
        await fetchNextPage({ pageParam })
      }
    },
  }), [data?.pageParams, fetchNextPage])

  const { ref, status } = useScrollRestore({
    containerId: 'infinite-list',
    stateHandler,
  })

  return (
    <div ref={ref} style={{ height: '80vh', overflow: 'auto' }}>
      {data?.pages.flatMap(p => p.products).map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### 시나리오 4: Vanilla JavaScript

```javascript
import { createSukooru } from '@sukooru/core'

const sukooru = createSukooru({ restoreDelay: 50 })

// 라이프사이클 관찰은 on()으로 통일
sukooru.on('save:after',      ({ key }) => console.log('[sukooru] saved', key))
sukooru.on('restore:after',   ({ key }) => console.log('[sukooru] restored', key))
sukooru.on('restore:miss',    ({ key }) => console.log('[sukooru] no entry for', key))

const listContainer = document.querySelector('#product-list')
const handle = sukooru.registerContainer(listContainer, 'product-list')

const unmount = sukooru.mount()

// SPA 라우터 연동 (mount()가 popstate는 자동 처리)
// push 기반 뒤로가기가 있다면 navigate() 래퍼 사용
router.beforeNavigate(() => sukooru.save())

window.addEventListener('beforeunload', () => {
  handle.unregister()
  unmount()
})
```

---

## 10. 엣지 케이스 및 예외 처리

### SSR 안전성

- `sessionStorage`, `window`, `document` 접근은 모두 `typeof window !== 'undefined'` 가드로 보호합니다.
- `createSukooru` 호출 자체는 서버에서도 안전하지만, `mount()` 및 실제 복원 동작은 클라이언트 전용입니다.
- Next.js App Router에서 `SukooruProvider`는 반드시 `'use client'` 지시어를 포함합니다.

### 동시 탐색 경쟁 조건 (Race Condition)

`restore()` 호출 중 다시 `save()`가 호출되는 경우를 `AbortController`로 처리합니다.

```typescript
private restoreAbortController: AbortController | null = null

const restore = async (key?: ScrollKey) => {
  this.restoreAbortController?.abort()
  this.restoreAbortController = new AbortController()
  const { signal } = this.restoreAbortController

  await doRestore()
  if (signal.aborted) return false
  // ...
}
```

### `QuotaExceededError` 처리

`EntryManager.set()` 내에서 `savedAt` 기준 LRU 방식으로 가장 오래된 항목부터 제거 후 재시도합니다.

### `applyState` 실패 처리

커스텀 상태 복원 실패 시 기본 스크롤 위치만 복원하고 계속 진행합니다. 실패는 이벤트 버스로 관찰합니다.

```typescript
try {
  await scrollStateHandler.applyState(entry.customState)
} catch (error) {
  emitter.emit('restore:error', { key: resolvedKey, error })
  // 기본 위치 복원(applyPositions)은 이미 완료된 상태이므로 계속 진행
}
```

### 라이프사이클 관찰

`hooks`와 이벤트 버스 중복 없이, 모든 라이프사이클 관찰은 `on()`으로 통일합니다.

```typescript
sukooru.on('restore:miss', ({ key }) => console.warn('복원 데이터 없음:', key))
sukooru.on('restore:error', ({ key, error }) => console.error('복원 실패:', key, error))
sukooru.on('save:after', ({ key }) => console.log('저장 완료:', key))
```

---

## 11. 테스트 전략

### 단위 테스트 (vitest)

```typescript
// packages/core/src/__tests__/createSukooru.test.ts

describe('createSukooru', () => {
  it('should save and restore scroll position', async () => {
    const sukooru = createSukooru({ storage: createMemoryStorageAdapter() })
    const mockEl = { scrollTop: 300, scrollLeft: 0 } as HTMLElement
    sukooru.registerContainer(mockEl, 'test')

    await sukooru.save('test-key')
    mockEl.scrollTop = 0

    const restored = await sukooru.restore('test-key')
    expect(restored).toBe(true)
    expect(mockEl.scrollTop).toBe(300)
  })

  it('should call onMiss when no entry exists', async () => {
    const onMiss = vi.fn()
    const sukooru = createSukooru({ storage: createMemoryStorageAdapter(), hooks: { onMiss } })
    await sukooru.restore('nonexistent-key')
    expect(onMiss).toHaveBeenCalledWith('nonexistent-key')
  })

  it('should evict oldest entries when maxEntries is exceeded', async () => {
    const sukooru = createSukooru({ storage: createMemoryStorageAdapter(), maxEntries: 2 })
    await sukooru.save('key-1')
    await sukooru.save('key-2')
    await sukooru.save('key-3')
    expect(sukooru.keys).not.toContain('key-1')
  })
})
```

### E2E 테스트 (Playwright)

```typescript
// e2e/scroll-restore.spec.ts

test('restores scroll position on back navigation', async ({ page }) => {
  await page.goto('/products')
  await page.evaluate(() => window.scrollTo(0, 800))
  await page.click('[data-testid="product-1"]')
  await page.waitForURL('/products/1')
  await page.goBack()
  await page.waitForURL('/products')

  const scrollY = await page.evaluate(() => window.scrollY)
  expect(scrollY).toBeCloseTo(800, -1)  // ±10px 허용
})

test('restores custom scroll container position', async ({ page }) => {
  await page.goto('/products')
  await page.evaluate(() => {
    document.querySelector('#product-list')!.scrollTop = 500
  })
  await page.click('[data-testid="product-1"]')
  await page.goBack()

  const scrollTop = await page.evaluate(
    () => document.querySelector('#product-list')!.scrollTop
  )
  expect(scrollTop).toBeCloseTo(500, -1)
})
```

---

## 12. 버전 관리 및 릴리즈

### Changeset 기반 버전 관리

```bash
pnpm add -D @changesets/cli -w
pnpm changeset init
```

모든 패키지는 동일한 버전으로 동기화(synchronized versioning)하여 어댑터와 코어 간 호환성 문제를 방지합니다.

### 초기 릴리즈 로드맵

| 버전 | 내용 |
|---|---|
| `0.1.0` | `@sukooru/core` + `@sukooru/react` MVP |
| `0.2.0` | `@sukooru/vue`, `@sukooru/next` |
| `0.3.0` | `@sukooru/nuxt`, `@sukooru/svelte` |
| `1.0.0` | API 안정화, 문서 완성, 성능 벤치마크 |

---

## 13. 성능 고려사항

| 항목 | 전략 |
|---|---|
| 저장 빈도 | scroll 이벤트 기반 자동 저장 대신 명시적 `save()` 호출 방식 — 불필요한 직렬화 비용 제거 |
| 직렬화 비용 | `customState`는 최소 필요 데이터만 직렬화 권장 (대용량 아이템 메타데이터 주의) |
| 복원 타이밍 | `restoreDelay` + `requestAnimationFrame` 조합으로 레이아웃 스래싱 없이 복원 |
| 번들 크기 목표 | `@sukooru/core` < 3 KB gzip, 각 어댑터 < 2 KB gzip (코어 포함 기준 < 5 KB) |
| Tree-shaking | tsup `treeshake: true`로 사용하지 않는 코드 제거 보장 |
