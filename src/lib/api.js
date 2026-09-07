const BASE = '/api'
const STANDALONE = import.meta.env.VITE_STANDALONE === 'true'

let mockRequestPromise = null
function mockRequest(method, path, body) {
  if (!mockRequestPromise) mockRequestPromise = import('./mockRouter.js').then((m) => m.mockRequest)
  return mockRequestPromise.then((fn) => fn(method, path, body))
}

async function request(path, options = {}) {
  const method = options.method || 'GET'
  const body = options.body ? JSON.parse(options.body) : undefined

  if (STANDALONE) {
    try {
      return await mockRequest(method, path, body)
    } catch (err) {
      throw new Error(err.message || 'Request failed')
    }
  }

  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) })
}
