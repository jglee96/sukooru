[English](./README.en.md)

# Sukooru

[![CI](https://github.com/jglee96/sukooru/actions/workflows/ci.yml/badge.svg)](https://github.com/jglee96/sukooru/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/jglee96/sukooru/graph/badge.svg)](https://codecov.io/gh/jglee96/sukooru)

Sukooru는 브라우저 앱을 위한 history-aware scroll restoration 라이브러리입니다. 뒤로가기나 라우트 전환 뒤에도 사용자가 보던 위치를 다시 맞출 수 있게, 스크롤 상태를 URL 기준으로 저장하고 복원합니다.

## 핵심 개념

- 스크롤 위치는 URL에 귀속된 상태입니다.
- Sukooru는 `popstate`, `pushState`, `replaceState`, 컴포넌트 mount/unmount 사이에서 저장/복원 타이밍을 맡습니다.
- 전체 `window` 스크롤, 특정 scroll container, virtual/infinite list 같은 패턴을 같은 모델로 다룹니다.

## 패키지 선택

| 패키지 | 사용 시점 | 문서 |
| --- | --- | --- |
| `@sukooru/core` | 바닐라 브라우저 앱이나 커스텀 라우터에 직접 연결할 때 | [README](./packages/core/README.md) |
| `@sukooru/react` | React 앱에서 provider + hook 패턴으로 붙일 때 | [README](./packages/react/README.md) |
| `@sukooru/vue` | Vue 앱에서 plugin + composable 패턴으로 붙일 때 | [README](./packages/vue/README.md) |
| `@sukooru/next` | Next.js App Router에서 route key를 자동으로 맞추고 싶을 때 | [README](./packages/next/README.md) |
| `@sukooru/nuxt` | Nuxt에서 route-aware plugin으로 붙일 때 | [README](./packages/nuxt/README.md) |
| `@sukooru/svelte` | Svelte/SvelteKit에서 context + action 패턴으로 붙일 때 | [README](./packages/svelte/README.md) |

## 예제

- [Vite React demo](./examples/vite-react) - 전체 window 스크롤, 특정 element 스크롤, virtual list, infinite list 복원 패턴
- [Vanilla demo](./examples/vanilla) - `@sukooru/core`를 직접 연결하는 수동 라우팅 예제

## Agent Skill

에이전트가 Sukooru를 올바르게 통합하도록 레포 스킬을 함께 제공합니다.

```bash
npx skills add https://github.com/jglee96/sukooru --skill sukooru-integration
```

스킬은 [skills/sukooru-integration](./skills/sukooru-integration) 에 있으며, 프레임워크별 패키지 선택, 전체 window 복원, 특정 element 복원, pinned `scrollKey`, stateful list 복원 패턴을 안내합니다.

## 완료된 기능

- `@sukooru/core` save/restore API
- `popstate`, `pushState`, `replaceState` 기반 browser history 연동
- 전체 window와 특정 element 단위의 스크롤 복원
- `sessionStorage` 저장소와 테스트용 in-memory adapter
- TTL과 최대 엔트리 개수 관리
- virtual list와 infinite list를 위한 custom `ScrollStateHandler`
- React, Vue, Next.js, Nuxt, Svelte adapter
- 실행 가능한 React, Vanilla 예제
- 뒤로가기 복원을 검증하는 Playwright E2E coverage

## 로드맵

향후 기능과 우선순위는 [GitHub issues](https://github.com/jglee96/sukooru/issues)에서 관리합니다. 프레임워크별 사용법과 API 예제는 각 패키지 README에서 확인할 수 있습니다.
