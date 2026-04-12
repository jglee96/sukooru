[English](./README.en.md)

# Sukooru

페이지를 이동할 때 스크롤 위치가 초기화되는 문제를 겪어봤다면, Sukooru가 그 문제를 해결합니다. 브라우저 History API와 연동해서 스크롤 위치를 기억하고, 사용자가 돌아왔을 때 그대로 복원합니다. 특정 프레임워크에 의존하지 않습니다.

## 핵심 개념

스크롤 위치는 URL에 귀속된 상태입니다.

사용자는 무엇을 복원할지만 선언합니다. 언제 저장하고 언제 복원할지는 Sukooru가 담당합니다. 이 구분이 무너지면 `save()`와 `restore()` 호출 타이밍을 직접 고민해야 하고, 복잡도가 라이브러리 밖으로 새어나옵니다. Sukooru는 그 타이밍 로직을 프레임워크 어댑터와 코어 생명주기 안에 가둬둡니다.

## 현재 구현 범위

- `@sukooru/core`: 구현 완료
- `@sukooru/react`: 구현 완료
- `@sukooru/vue`: 구현 완료
- `@sukooru/next`: 구현 완료
- `@sukooru/nuxt`: 구현 완료
- `@sukooru/svelte`: 구현 완료

## Feature TODO List

### 완료된 기능

- [x] `@sukooru/core` 기본 저장/복원 API
- [x] `sessionStorage` 기반 저장소와 테스트용 메모리 저장소
- [x] TTL 및 최대 저장 개수 관리
- [x] `popstate` 기반 브라우저 뒤로가기 복원
- [x] `pushState`/`replaceState` 이후 현재 키 추적
- [x] 커스텀 `ScrollStateHandler` 기반 상태 복원
- [x] `@sukooru/react`의 `SukooruProvider`
- [x] `@sukooru/react`의 `useScrollRestore`
- [x] 브라우저 뒤로가기 복원을 고정하는 Playwright E2E 테스트
- [x] React `StrictMode`에서 복원 중 중복 저장 방지
- [x] `useVirtualScrollRestore` 실사용 React 예제
- [x] infinite scroll 예제와 문서 보강
- [x] 라우터별 연동 가이드 정리
- [x] React, Vanilla 실행 예제

### 해야 할 기능

- [x] `@sukooru/vue` 실제 어댑터 구현
- [x] `@sukooru/next` 실제 어댑터 구현
- [x] `@sukooru/nuxt` 실제 어댑터 구현
- [x] `@sukooru/svelte` 실제 어댑터 구현

## 패키지 구조

```text
packages/
  core/
  react/
  vue/
  next/
  nuxt/
  svelte/
examples/
  vanilla/
  vite-react/
```

## 빠른 시작

### React

`SukooruProvider`로 앱을 감싸고, 복원이 필요한 컨테이너에 `useScrollRestore`를 달면 됩니다. `save()`나 `restore()`를 직접 호출할 필요는 없습니다. 훅이 컨테이너 등록, 복원, unmount 시 저장을 모두 처리합니다.

```tsx
import { SukooruProvider, useScrollRestore } from '@sukooru/react'

function ProductListPage() {
  const { ref, status } = useScrollRestore({
    containerId: 'product-list',
  })

  return (
    <main ref={ref} style={{ height: '100vh', overflowY: 'auto' }}>
      {status === 'restoring' ? '복원 중...' : null}
      {/* 상품 목록 */}
    </main>
  )
}

export function App() {
  return (
    <SukooruProvider>
      <ProductListPage />
    </SukooruProvider>
  )
}
```

### Vanilla

Vanilla 환경에서는 명령형 API를 씁니다. 저장소와 복원 로직은 여전히 하나의 인스턴스가 책임집니다.

```ts
import { createSukooru } from '@sukooru/core'

const sukooru = createSukooru()
const container = document.querySelector('#product-list')

if (container) {
  const handle = sukooru.registerContainer(container, 'product-list')
  const unmount = sukooru.mount()

  void sukooru.restore()

  window.addEventListener('beforeunload', () => {
    void sukooru.save()
    handle.unregister()
    unmount()
  })
}
```

## React 예제 모드

React 예제 앱은 하나의 실행 서버에서 세 가지 복원 패턴을 보여줍니다.

- `/products`: window 전체 스크롤 복원
- `/virtual`: `useVirtualScrollRestore` 기반 virtual list 복원
- `/infinite`: `useScrollRestore` + `ScrollStateHandler` 기반 infinite scroll 복원

## Virtual Scroll 복원

virtual scroll에서는 현재 DOM에 보이는 행만 렌더링되기 때문에, 단순한 `scrollTop`만 저장하면 복원 타이밍이 어긋날 수 있습니다. `useVirtualScrollRestore`는 virtualizer offset과 첫 visible item 인덱스를 같이 다룹니다.

상세 페이지로 `pushState` 한 뒤 리스트가 unmount 되는 구조라면, 저장 키를 리스트 경로에 고정하기 위해 `scrollKey`를 같이 넘기는 편이 안전합니다.

```tsx
import { useVirtualScrollRestore } from '@sukooru/react'

function VirtualProductList({ rowVirtualizer }) {
  const { ref, status } = useVirtualScrollRestore({
    containerId: 'virtual-list',
    scrollKey: '/products',
    virtualizer: rowVirtualizer,
  })

  return (
    <div ref={ref} style={{ height: '80vh', overflowY: 'auto' }}>
      {status === 'restoring' ? '복원 중...' : null}
      {/* virtual rows */}
    </div>
  )
}
```

## Infinite Scroll 복원

일반 스크롤 컨테이너는 `scrollTop`과 `scrollLeft`로 충분하지만, infinite scroll은 그것만으로 부족합니다. Sukooru는 커스텀 상태를 먼저 복원하고, 그 다음 스크롤 위치를 적용합니다. 데이터가 준비된 다음에 위치를 잡아야 하는 패턴에 맞춘 순서입니다.

```tsx
import { useMemo } from 'react'
import { useScrollRestore } from '@sukooru/react'
import type { ScrollStateHandler } from '@sukooru/core'

type InfiniteState = {
  loadedPageCount: number
}

function ProductList() {
  const stateHandler = useMemo<ScrollStateHandler<InfiniteState>>(
    () => ({
      captureState: () => ({
        loadedPageCount: pageCountRef.current,
      }),
      applyState: async ({ loadedPageCount }) => {
        while (pageCountRef.current < loadedPageCount) {
          await loadNextPage()
        }
      },
    }),
    [],
  )

  const { ref } = useScrollRestore({
    containerId: 'infinite-list',
    scrollKey: '/products',
    stateHandler,
  })

  return <div ref={ref} />
}
```

## 라우터 연동 가이드

아래 가이드는 아직 공식 어댑터가 없는 프레임워크를 붙일 때의 권장 패턴입니다. 지금 저장소에 실제 구현이 완료된 패키지는 `@sukooru/react`뿐입니다.

- React Router / 커스텀 client router: `SukooruProvider`는 앱 루트에 두고 `getKey`는 `pathname + search` 기준으로 맞춥니다. 리스트가 detail route로 `pushState` 된 뒤 unmount 된다면 `scrollKey`를 리스트 경로로 고정합니다.
- Next.js App Router: `SukooruProvider`는 `'use client'` 경계 안에 두고 `usePathname()` 기준으로 키를 맞춥니다. 리스트와 상세가 같은 layout을 공유해도, 복원 대상이 커스텀 컨테이너라면 `scrollKey`를 리스트 route로 넘기는 편이 안전합니다.
- Vue Router / Nuxt: `currentRoute.value.fullPath`를 키로 삼고, 컨테이너 등록과 해제를 composable의 `onMounted`/`onUnmounted` 안에 둡니다.
- SvelteKit: 브라우저 전용 모듈에서 인스턴스를 만들고 `$page.url.pathname + $page.url.search`를 키로 사용합니다. 라우트 컴포넌트가 mount 된 뒤에 복원 훅을 붙입니다.

## 공개 API

### `@sukooru/core`

- `createSukooru(options?)`
- `sessionStorageAdapter`
- `createMemoryStorageAdapter()`
- `ScrollEntry`
- `ScrollStateHandler`
- `ScrollRestoreStatus`

### `@sukooru/react`

- `SukooruProvider`
- `useSukooru()`
- `useScrollRestore()`
- `useVirtualScrollRestore()`

`useVirtualScrollRestore()`는 `containerId`, `virtualizer`, optional `scrollKey`, `invalidateOnCountChange`를 받습니다.

## 개발

Node 22 이상을 권장합니다. 이 저장소에는 `.nvmrc`가 포함되어 있습니다.

```bash
nvm use
pnpm install
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## 예제 실행

### React 예제

```bash
nvm use
pnpm install
pnpm dev:example:react
```

브라우저에서 `http://127.0.0.1:4173`을 열면 됩니다. 예제 앱은 `/products`, `/virtual`, `/infinite` 세 가지 모드를 포함합니다.

동작 확인 순서:

1. `/products`에서 window 전체를 충분히 스크롤한 뒤 상세로 이동하고 돌아옵니다.
2. `/virtual`에서 custom scroll container를 내린 뒤 `보이는 첫 카드 열기`로 상세에 진입하고 돌아옵니다.
3. `/infinite`에서 추가 페이지를 몇 번 더 로드한 뒤 상세에 진입하고 돌아옵니다.
4. 각 모드에서 떠나기 전 위치가 그대로 복원되는지 확인합니다.

### Vanilla 예제

```bash
nvm use
pnpm install
pnpm dev:example:vanilla
```

브라우저에서 `http://127.0.0.1:4174`를 열면 됩니다.

동작 확인 순서:

1. 목록을 아래로 스크롤합니다.
2. 상품 상세로 이동합니다.
3. `목록으로 돌아가기`를 누릅니다.
4. 저장된 위치로 다시 복원되는지 확인합니다.

## 테스트 범위

- 코어 저장 및 복원
- TTL 만료 처리
- 최대 저장 개수 초과 시 오래된 항목 제거
- 커스텀 상태 복원 실패 시 기본 위치 복원 유지
- `popstate` 기반 저장/복원 흐름
- Playwright 기반 브라우저 뒤로가기 E2E
- React Provider mount/unmount
- React 훅의 컨테이너 등록, 복원, 저장
- `useVirtualScrollRestore`의 `scrollKey` 전달
- 상태 핸들러 교체 시 불필요한 컨테이너 재등록 방지

## 예제

- 바닐라 예제: [examples/vanilla/src/main.ts](examples/vanilla/src/main.ts)
- 리액트 예제: [examples/vite-react/src/App.tsx](examples/vite-react/src/App.tsx)
- 리액트 virtualizer 예제: [examples/vite-react/src/useDemoVirtualizer.ts](examples/vite-react/src/useDemoVirtualizer.ts)
