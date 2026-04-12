export const usePathname = (): string | null => {
  throw new Error('next/navigation mock이 설정되지 않았습니다.')
}

export const useSearchParams = (): Pick<URLSearchParams, 'toString'> | null => {
  throw new Error('next/navigation mock이 설정되지 않았습니다.')
}
