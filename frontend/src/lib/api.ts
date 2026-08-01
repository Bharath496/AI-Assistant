type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type ApiWindow = Window & {
  api?: {
    request: (method: string, endpoint: string, data?: unknown) => Promise<any>
  }
}

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '')

const resolveBrowserApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim()
  if (configured) {
    return normalizeBaseUrl(configured)
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:8000/api'
    }
  }

  return '/api'
}

export const API_BASE_URL = resolveBrowserApiBaseUrl()

export const getRuntimeLabel = () => {
  if (typeof window !== 'undefined' && (window as ApiWindow).api) {
    return 'Desktop app connected through Electron.'
  }
  return `Web app using ${API_BASE_URL}`
}

export const apiRequest = async (method: ApiMethod, endpoint: string, data?: unknown) => {
  if (typeof window !== 'undefined' && (window as ApiWindow).api) {
    return (window as ApiWindow).api!.request(method, endpoint, data)
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const response = await fetch(`${API_BASE_URL}${normalizedEndpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'detail' in payload && String((payload as any).detail)) ||
      (payload && typeof payload === 'object' && 'error' in payload && String((payload as any).error)) ||
      (typeof payload === 'string' ? payload : `Request failed with status ${response.status}`)
    throw new Error(message)
  }

  return payload
}

export const checkBackendHealth = async () => {
  return apiRequest('GET', '/health')
}
