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
- [x] React `StrictMode`에서 복원 중 중복 저장 방지
- [x] React, Vanilla 실행 예제

### 해야 할 기능

- [ ] 브라우저 뒤로가기 복원을 고정하는 E2E 테스트 추가
- [ ] `useVirtualScrollRestore` 실사용 예제 추가
- [ ] infinite scroll 예제와 문서 보강
- [ ] `@sukooru/vue` 실제 어댑터 구현
- [ ] `@sukooru/next` 실제 어댑터 구현
- [ ] `@sukooru/nuxt` 실제 어댑터 구현
- [ ] `@sukooru/svelte` 실제 어댑터 구현
- [ ] 라우터별 연동 가이드 정리

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

Node 22 이상을 권장합니다. 이 저장소에는 [.nvmrc](/Users/zakklee/dev/sukooru/.nvmrc)가 포함되어 있습니다.

```bash
nvm use
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## 예제 실행

### React 예제

```bash
nvm use
pnpm install
pnpm dev:example:react
```

브라우저에서 `http://127.0.0.1:4173`을 열면 됩니다.

동작 확인 순서:

1. 목록을 아래로 충분히 스크롤합니다.
2. 아무 상품이나 눌러 상세 화면으로 이동합니다.
3. `목록으로 돌아가기`를 누릅니다.
4. 이전 스크롤 위치가 복원되는지 확인합니다.

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
- React Provider mount/unmount
- React 훅의 컨테이너 등록, 복원, 저장
- 상태 핸들러 교체 시 불필요한 컨테이너 재등록 방지

## 예제

- 바닐라 예제: [examples/vanilla/src/main.ts](examples/vanilla/src/main.ts)
- 리액트 예제: [examples/vite-react/src/App.tsx](examples/vite-react/src/App.tsx)
