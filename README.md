# Sukooru

브라우저 History API와 통합되어 페이지 탐색 시 스크롤 위치를 복원하는 프레임워크 비종속 스크롤 복원 라이브러리입니다.

## 핵심 mental model

**스크롤 위치는 URL에 귀속된 상태다.**

사용자는 `무엇을 복원할지`만 선언합니다.  
`언제 저장하고 언제 복원할지`는 Sukooru가 담당합니다.

이 mental model이 흔들리면 API가 복잡해지고, 사용자는 `save()`와 `restore()` 호출 타이밍을 고민하게 됩니다. Sukooru는 그 부담을 프레임워크 어댑터와 코어 생명주기 안으로 밀어 넣는 방향으로 설계되어 있습니다.

## 현재 구현 범위

- `@sukooru/core`: 구현 완료
- `@sukooru/react`: 구현 완료
- `@sukooru/vue`: 패키지 골격만 제공
- `@sukooru/next`: 패키지 골격만 제공
- `@sukooru/nuxt`: 패키지 골격만 제공
- `@sukooru/svelte`: 패키지 골격만 제공

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

직접 `save()`나 `restore()`를 호출하지 않습니다.  
훅이 컨테이너 등록, 복원, unmount 시 저장을 관리합니다.

### Vanilla

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

Vanilla 환경에서는 명령형 API를 사용하지만, 저장소와 복원 로직은 여전히 한 인스턴스가 책임집니다.

## 커스텀 상태 복원

일반 스크롤 컨테이너는 `scrollTop`과 `scrollLeft`만으로 충분하지만, virtual scroll이나 infinite scroll은 추가 상태가 필요합니다.

```tsx
import { useScrollRestore } from '@sukooru/react'
import type { ScrollStateHandler } from '@sukooru/core'

type InfiniteState = {
  pageParams: string[]
}

function ProductList() {
  const stateHandler: ScrollStateHandler<InfiniteState> = {
    captureState: () => ({
      pageParams: ['cursor-1', 'cursor-2'],
    }),
    applyState: async ({ pageParams }) => {
      for (const pageParam of pageParams.slice(1)) {
        await fetch(`/api/products?cursor=${pageParam}`)
      }
    },
  }

  const { ref } = useScrollRestore({
    containerId: 'infinite-list',
    stateHandler,
  })

  return <div ref={ref} />
}
```

Sukooru는 커스텀 상태를 먼저 복원하고, 그 다음 컨테이너 위치를 적용합니다.  
이 순서 덕분에 infinite scroll처럼 데이터가 먼저 준비되어야 하는 경우에도 자연스럽게 맞출 수 있습니다.

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

## 개발

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## 테스트 범위

- 코어 저장 및 복원
- TTL 만료 처리
- 최대 저장 개수 초과 시 오래된 항목 제거
- 커스텀 상태 복원 실패 시 기본 위치 복원 유지
- `popstate` 기반 저장/복원 흐름
- React Provider mount/unmount
- React 훅의 컨테이너 등록, 복원, 저장
- 상태 핸들러 교체 시 불필요한 컨테이너 재등록 방지

## 예제

- 바닐라 예제: [examples/vanilla/src/main.ts](examples/vanilla/src/main.ts)
- 리액트 예제: [examples/vite-react/src/App.tsx](examples/vite-react/src/App.tsx)

