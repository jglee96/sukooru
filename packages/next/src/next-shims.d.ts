declare module 'next/navigation' {
  export function usePathname(): string | null
  export function useSearchParams():
    | Pick<URLSearchParams, 'toString'>
    | null
}

declare module 'next/router' {
  export interface NextRouter {
    asPath: string
  }

  export function useRouter(): NextRouter
}
