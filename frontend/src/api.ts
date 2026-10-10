// Typed API client. Every screen calls the backend through these helpers.
//
// Failures always throw ApiError: HTTP errors carry the backend's
// `{error: {code, message}}` envelope; network failures and timeouts use
// codes "network_error" and "timeout".

import type {
  Card,
  CardCreate,
  CartParseResponse,
  DealFeed,
  DealsResponse,
  HealthResponse,
  LocationsResponse,
  MissedResponse,
  RecommendResponse,
  StackRequest,
  StackResponse,
  TransactionCreate,
  TransactionCreateResponse,
  WalletResponse,
} from './types'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export function activeUserId(): string {
  return localStorage.getItem('wallet-user-id') ?? 'demo'
}

const DEFAULT_TIMEOUT_MS = 15_000
const UPLOAD_TIMEOUT_MS = 45_000

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: Record<string, unknown>

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  get isNotImplemented() {
    return this.status === 501
  }
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onAbort = () => controller.abort()
  init.signal?.addEventListener('abort', onAbort)
  let res: Response
  try {
    const headers = new Headers(init.headers)
    headers.set('X-User-ID', activeUserId())
    res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, signal: controller.signal })
  } catch (err) {
    if (init.signal?.aborted) throw err
    if (controller.signal.aborted) throw new ApiError(0, 'timeout', 'The server took too long to respond.')
    throw new ApiError(0, 'network_error', 'Could not reach the server. Check that the backend is running.')
  } finally {
    clearTimeout(timer)
    init.signal?.removeEventListener('abort', onAbort)
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const e = body?.error
    throw new ApiError(res.status, e?.code ?? 'http_error', e?.message ?? `Request failed (${res.status}).`, e?.details)
  }
  return body as T
}

function json(method: string, data: unknown, signal?: AbortSignal): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal }
}

function query(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

/** UUID v4 that also works over plain http on a phone (crypto.randomUUID needs a secure context). */
export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function' && window.isSecureContext) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export const api = {
  cards: (userId: string, signal?: AbortSignal) =>
    request<WalletResponse>(`/api/users/${encodeURIComponent(userId)}/cards`, { signal }),

  card: (userId: string, cardId: string, signal?: AbortSignal) =>
    request<Card>(`/api/users/${encodeURIComponent(userId)}/cards/${encodeURIComponent(cardId)}`, { signal }),

  createCard: (userId: string, body: CardCreate) =>
    request<Card>(`/api/users/${encodeURIComponent(userId)}/cards`, json('POST', body)),

  deleteCard: (userId: string, cardId: string) =>
    request<void>(`/api/users/${encodeURIComponent(userId)}/cards/${encodeURIComponent(cardId)}`, { method: 'DELETE' }),

  health: (signal?: AbortSignal) => request<HealthResponse>('/api/health', { signal }),

  wallet: (signal?: AbortSignal) => request<WalletResponse>('/api/wallet', { signal }),

  locations: (signal?: AbortSignal) => request<LocationsResponse>('/api/locations', { signal }),

  recommend: (merchantId: string, amountCents?: number, signal?: AbortSignal) =>
    request<RecommendResponse>(`/api/recommend${query({ merchant_id: merchantId, amount_cents: amountCents })}`, { signal }),

  stack: (body: StackRequest, signal?: AbortSignal) => request<StackResponse>('/api/stack', json('POST', body, signal)),

  /** Upload a cart screenshot, or pass `{useSample: true}` for the labeled sample cart. */
  parseCart: (input: { file: File } | { useSample: true }, signal?: AbortSignal) => {
    const form = new FormData()
    if ('file' in input) form.append('file', input.file)
    else form.append('use_sample', 'true')
    return request<CartParseResponse>('/api/cart/parse', { method: 'POST', body: form, signal }, UPLOAD_TIMEOUT_MS)
  },

  deals: (category?: DealFeed, signal?: AbortSignal) => request<DealsResponse>(`/api/deals${query({ category })}`, { signal }),

  /** Reuse the same idempotency_key when retrying one purchase; the server will not double-log it. */
  createTransaction: (body: TransactionCreate, signal?: AbortSignal) =>
    request<TransactionCreateResponse>('/api/transactions', json('POST', body, signal)),

  missed: (params: { days?: number; limit?: number } = {}, signal?: AbortSignal) =>
    request<MissedResponse>(`/api/missed${query(params)}`, { signal }),
}
