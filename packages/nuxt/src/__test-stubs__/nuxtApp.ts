export const defineNuxtPlugin = <T>(
  plugin: (nuxtApp: unknown) => T,
): ((nuxtApp: unknown) => T) => plugin

export const useNuxtApp = (): never => {
  throw new Error('#app useNuxtApp mock이 설정되지 않았습니다.')
}

export const useRoute = (): never => {
  throw new Error('#app useRoute mock이 설정되지 않았습니다.')
}
