import { createContext, useContext } from 'react'

type SearchParamsLike = Pick<URLSearchParams, 'toString'> | null | undefined

export const buildRouteKey = (
  pathname: string | null | undefined,
  searchParams?: SearchParamsLike,
): string => {
  const resolvedPathname = pathname ?? ''
  const query = searchParams?.toString()

  if (!query) {
    return resolvedPathname
  }

  return `${resolvedPathname}?${query}`
}

export const RouteKeyContext = createContext<string | undefined>(undefined)

export const useRouteKey = (): string | undefined => {
  return useContext(RouteKeyContext)
}
