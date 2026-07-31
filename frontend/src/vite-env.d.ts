/// <reference types="vite/client" />

interface Window {
  api?: {
    request: (method: string, endpoint: string, data?: unknown) => Promise<any>
  }
}
