import type { Api } from '~/lib/types'

declare global {
  interface Window {
    api: Api
  }
}

export const api = window.api
