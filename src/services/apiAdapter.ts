import { INITIAL_CATALOG_SNAPSHOT } from '../data/initialSeedData'
import type {
  BundleLineItem,
  CatalogSnapshot,
  ConsultationPayload,
  PolicyConfig,
  ProductItem,
  RecommendedBundle,
  SubscriptionTerm,
} from '../types/domain'
import { DEFAULT_POLICY_CONFIG } from '../utils/calculator'
import {
  sanitizeForSheet,
  sanitizeImageUrl,
  sanitizeMemoForSheet,
  sanitizePhoneNumber,
} from '../utils/sanitize'

const LOCAL_CATALOG_KEY = 'himart_gj_simulator_catalog_v1'
const ADMIN_TOKEN_SESSION_KEY = 'himart_gj_admin_session_token'
const ADMIN_SESSION_MODE_KEY = 'himart_gj_admin_session_mode'

const LARGE_APPLIANCE_CATEGORIES = [
  '대형가전',
  'TV/영상',
  '냉장고/김치냉장고',
  '세탁/건조',
]

export type GasPostAction =
  | 'submitLead'
  | 'adminLogin'
  | 'adminLogout'
  | 'adminGetCatalog'
  | 'saveProduct'
  | 'deleteProduct'
  | 'saveSet'
  | 'deleteSet'
  | 'savePolicy'
  | 'bulkSyncCatalog'

export interface GasApiResponse<T = unknown> {
  ok?: boolean
  success?: boolean
  code?: string
  error?: string
  message?: string
  token?: string
  expiresAt?: string
  data?: T
  snapshot?: unknown
  products?: unknown[]
  bundles?: unknown[]
  sets?: unknown[]
  policy?: Record<string, unknown>
  updatedAt?: string
}

export class AdminUnauthorizedError extends Error {
  readonly code = 'UNAUTHORIZED' as const

  constructor(
    message = '관리자 인증이 만료되었거나 권한이 없습니다. 다시 로그인해 주세요.',
  ) {
    super(message)
    this.name = 'AdminUnauthorizedError'
  }
}

export function isAdminUnauthorizedError(err: unknown): err is AdminUnauthorizedError {
  return (
    err instanceof AdminUnauthorizedError ||
    (typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: unknown }).code === 'UNAUTHORIZED')
  )
}

/**
 * Returns the configured Google Apps Script Web App URL if present.
 * Zero secrets are ever stored in the client bundle.
 */
export function getGasApiUrl(): string {
  const raw = import.meta.env.VITE_GAS_API_URL
  return typeof raw === 'string' ? raw.trim() : ''
}

export function isGasConnected(): boolean {
  return getGasApiUrl().length > 0
}

export interface AdminSession {
  token: string
  mode: 'gas' | 'local-sandbox'
}

export function getStoredAdminSession(): AdminSession | null {
  try {
    const token = sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY)
    const mode = sessionStorage.getItem(ADMIN_SESSION_MODE_KEY)
    if (!token) return null
    if (mode === 'local-sandbox' && isGasConnected()) {
      clearAdminSession()
      return null
    }
    return {
      token,
      mode: mode === 'gas' ? 'gas' : 'local-sandbox',
    }
  } catch {
    return null
  }
}

export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_SESSION_KEY)
    sessionStorage.removeItem(ADMIN_SESSION_MODE_KEY)
  } catch {
    // Ignore restricted storage access
  }
}

function storeAdminSession(session: AdminSession): void {
  sessionStorage.setItem(ADMIN_TOKEN_SESSION_KEY, session.token)
  sessionStorage.setItem(ADMIN_SESSION_MODE_KEY, session.mode)
}

/**
 * Mandatory GAS CORS-safe POST helper.
 * Strictly uses Content-Type: text/plain;charset=utf-8 and redirect: 'follow'
 * with JSON body { action, token, payload } to prevent browser OPTIONS preflight failures.
 */
async function postGasAction<T = unknown>(
  action: GasPostAction,
  token: string | undefined,
  payload: unknown,
): Promise<GasApiResponse<T>> {
  const url = getGasApiUrl()
  if (!url) {
    throw new Error('실서버 연동 URL(VITE_GAS_API_URL)이 설정되지 않았습니다.')
  }

  const response = await fetch(url, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action,
      token: token ?? '',
      payload: payload ?? {},
    }),
  })

  if (!response.ok) {
    throw new Error(`서버 응답 오류 (HTTP ${response.status})`)
  }

  let data: GasApiResponse<T>
  try {
    data = (await response.json()) as GasApiResponse<T>
  } catch {
    throw new Error('구글 앱스 스크립트 응답(JSON)을 해석할 수 없습니다.')
  }

  if (data.code === 'UNAUTHORIZED' || data.error === 'UNAUTHORIZED') {
    clearAdminSession()
    throw new AdminUnauthorizedError(
      data.message || '관리자 세션이 만료되었습니다. 다시 로그인해 주세요.',
    )
  }

  const explicitlyFailed =
    data.ok === false ||
    data.success === false ||
    (typeof data.error === 'string' && data.error.length > 0)

  if (explicitlyFailed) {
    throw new Error(data.message || data.error || '요청 처리 중 오류가 발생했습니다.')
  }

  return data
}

/* ==================== GAS SCHEMA MAPPERS (READ & WRITE) ==================== */

function inferIsLargeAppliance(category: string): boolean {
  return (
    LARGE_APPLIANCE_CATEGORIES.includes(category) ||
    category.includes('에어컨') ||
    category.includes('냉장') ||
    category.includes('세탁') ||
    category.includes('TV')
  )
}

export function sanitizeProduct(p: ProductItem, sortOrderFallback = 1): ProductItem {
  const category = sanitizeForSheet(p.category, 40)
  return {
    ...p,
    id: sanitizeForSheet(p.id, 80) || `prod_${Date.now().toString(36)}`,
    name: sanitizeForSheet(p.name, 120),
    modelCode: sanitizeForSheet(p.modelCode, 80),
    brand: sanitizeForSheet(p.brand, 40),
    category,
    imageUrl: sanitizeImageUrl(p.imageUrl),
    careTags: (Array.isArray(p.careTags) ? p.careTags : [])
      .map((t) => sanitizeForSheet(String(t), 40))
      .filter(Boolean),
    monthly36:
      p.monthly36 !== null && Number(p.monthly36) > 0 ? Math.round(Number(p.monthly36)) : null,
    monthly60:
      p.monthly60 !== null && Number(p.monthly60) > 0 ? Math.round(Number(p.monthly60)) : null,
    isLargeAppliance: Boolean(p.isLargeAppliance),
    visible: Boolean(p.visible),
    sortOrder:
      Number.isFinite(p.sortOrder) && p.sortOrder > 0
        ? Math.round(p.sortOrder)
        : sortOrderFallback,
  }
}

export function sanitizeBundle(b: RecommendedBundle, sortOrderFallback = 1): RecommendedBundle {
  return {
    ...b,
    id: sanitizeForSheet(b.id, 80) || `set_${Date.now().toString(36)}`,
    name: sanitizeForSheet(b.name, 100),
    description: sanitizeForSheet(b.description, 220),
    badge: sanitizeForSheet(b.badge, 30) || '추천',
    defaultTerm: b.defaultTerm === 36 ? 36 : 60,
    items: (Array.isArray(b.items) ? b.items : []).map((item) => ({
      productId: sanitizeForSheet(item.productId, 80),
      term: item.term === 36 ? 36 : 60,
      quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
    })),
    visible: Boolean(b.visible),
    sortOrder:
      Number.isFinite(b.sortOrder) && b.sortOrder > 0
        ? Math.round(b.sortOrder)
        : sortOrderFallback,
  }
}

export function sanitizeCatalogSnapshot(snapshot: CatalogSnapshot): CatalogSnapshot {
  return {
    products: snapshot.products.map((p, idx) => sanitizeProduct(p, idx + 1)),
    bundles: snapshot.bundles.map((b, idx) => sanitizeBundle(b, idx + 1)),
    policy: normalizePolicy(snapshot.policy),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Serializes internal ProductItem to the exact Google Apps Script sheet schema:
 * { id, category, brand, name, modelName, imageUrl, price36, price60, careTags, isVisible }
 */
export function toGasProductPayload(p: ProductItem) {
  return {
    id: p.id,
    category: p.category,
    brand: p.brand,
    name: p.name,
    modelName: p.modelCode,
    imageUrl: p.imageUrl,
    price36: p.monthly36 ?? 0,
    price60: p.monthly60 ?? 0,
    careTags: p.careTags,
    isVisible: p.visible,
    sortOrder: p.sortOrder,
  }
}

/**
 * Serializes internal RecommendedBundle to the exact Google Apps Script sheet schema:
 * { id, setCategory, name, description, badge, defaultTerm, items: [{ productId, term, qty }], sortOrder, isVisible }
 */
export function toGasSetPayload(b: RecommendedBundle, products: ProductItem[]) {
  const productMap = new Map(products.map((p) => [p.id, p]))
  const hasLarge = b.items.some((item) => {
    const prod = productMap.get(item.productId)
    return prod ? prod.isLargeAppliance || inferIsLargeAppliance(prod.category) : false
  })
  return {
    id: b.id,
    setCategory: hasLarge ? '대형' : '소형',
    name: b.name,
    description: b.description,
    badge: b.badge,
    defaultTerm: b.defaultTerm,
    items: b.items.map((item) => ({
      productId: item.productId,
      term: item.term,
      qty: item.quantity,
    })),
    sortOrder: b.sortOrder,
    isVisible: b.visible,
  }
}

/**
 * Serializes internal PolicyConfig to the exact Google Apps Script snake_case policy schema.
 */
export function toGasPolicyPayload(policy: PolicyConfig) {
  return {
    freed_40k_cashback_36: policy.lifeCareCashback36.u40,
    freed_50k_cashback_36: policy.lifeCareCashback36.u50,
    freed_60k_cashback_36: policy.lifeCareCashback36.u60,
    freed_40k_cashback_60: policy.lifeCareCashback60.u40,
    freed_50k_cashback_60: policy.lifeCareCashback60.u50,
    freed_60k_cashback_60: policy.lifeCareCashback60.u60,
    freed_max_accounts: policy.maxLifeCareUnits,
    freed_pay_months: policy.lifeCarePayMonths,
    freed_defer_months: policy.lifeCareDeferMonths,
    freed_maturity_months: policy.lifeCareMaturityMonths,
    card_min_spend: policy.cardMinSpend,
    card_monthly_cashback: policy.cardMonthlyCashback,
  }
}

function toBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const lower = v.trim().toLowerCase()
    if (lower === 'true' || lower === '1' || lower === 'y' || lower === 'yes') return true
    if (lower === 'false' || lower === '0' || lower === 'n' || lower === 'no') return false
  }
  if (typeof v === 'number') return v !== 0
  return fallback
}

function toPositiveNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

function normalizePolicy(raw: unknown): PolicyConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_POLICY_CONFIG
  const obj = raw as Record<string, unknown>
  const dues = (obj.lifeCareUnitMonthlyDues as Record<string, unknown>) || {}
  const cb36 = (obj.lifeCareCashback36 as Record<string, unknown>) || {}
  const cb60 = (obj.lifeCareCashback60 as Record<string, unknown>) || {}

  const num = (val: unknown, fb: number) => {
    if (val === null || val === undefined || val === '') return fb
    const n = Number(val)
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : fb
  }

  return {
    lifeCareUnitMonthlyDues: {
      u40: num(dues.u40 ?? obj.freed_40k_dues ?? obj.dues40, DEFAULT_POLICY_CONFIG.lifeCareUnitMonthlyDues.u40),
      u50: num(dues.u50 ?? obj.freed_50k_dues ?? obj.dues50, DEFAULT_POLICY_CONFIG.lifeCareUnitMonthlyDues.u50),
      u60: num(dues.u60 ?? obj.freed_60k_dues ?? obj.dues60, DEFAULT_POLICY_CONFIG.lifeCareUnitMonthlyDues.u60),
    },
    lifeCareCashback36: {
      u40: num(
        obj.freed_40k_cashback_36 ?? cb36.u40 ?? obj.cashback36_40,
        DEFAULT_POLICY_CONFIG.lifeCareCashback36.u40,
      ),
      u50: num(
        obj.freed_50k_cashback_36 ?? cb36.u50 ?? obj.cashback36_50,
        DEFAULT_POLICY_CONFIG.lifeCareCashback36.u50,
      ),
      u60: num(
        obj.freed_60k_cashback_36 ?? cb36.u60 ?? obj.cashback36_60,
        DEFAULT_POLICY_CONFIG.lifeCareCashback36.u60,
      ),
    },
    lifeCareCashback60: {
      u40: num(
        obj.freed_40k_cashback_60 ?? cb60.u40 ?? obj.cashback60_40,
        DEFAULT_POLICY_CONFIG.lifeCareCashback60.u40,
      ),
      u50: num(
        obj.freed_50k_cashback_60 ?? cb60.u50 ?? obj.cashback60_50,
        DEFAULT_POLICY_CONFIG.lifeCareCashback60.u50,
      ),
      u60: num(
        obj.freed_60k_cashback_60 ?? cb60.u60 ?? obj.cashback60_60,
        DEFAULT_POLICY_CONFIG.lifeCareCashback60.u60,
      ),
    },
    maxLifeCareUnits: num(
      obj.freed_max_accounts ?? obj.maxLifeCareUnits,
      DEFAULT_POLICY_CONFIG.maxLifeCareUnits,
    ),
    lifeCarePayMonths: num(
      obj.freed_pay_months ?? obj.lifeCarePayMonths,
      DEFAULT_POLICY_CONFIG.lifeCarePayMonths,
    ),
    lifeCareDeferMonths: num(
      obj.freed_defer_months ?? obj.lifeCareDeferMonths,
      DEFAULT_POLICY_CONFIG.lifeCareDeferMonths,
    ),
    lifeCareMaturityMonths: num(
      obj.freed_maturity_months ?? obj.lifeCareMaturityMonths,
      DEFAULT_POLICY_CONFIG.lifeCareMaturityMonths,
    ),
    cardMinSpend: num(
      obj.card_min_spend ?? obj.cardMinSpend,
      DEFAULT_POLICY_CONFIG.cardMinSpend,
    ),
    cardMonthlyCashback: num(
      obj.card_monthly_cashback ?? obj.cardMonthlyCashback,
      DEFAULT_POLICY_CONFIG.cardMonthlyCashback,
    ),
  }
}

function normalizeRemoteProduct(raw: unknown, idx: number): ProductItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = String(r.id || r.productId || '').trim()
  const name = String(r.name || '').trim()
  if (!id || !name) return null

  let careTags: string[] = []
  if (Array.isArray(r.careTags)) {
    careTags = r.careTags.map((t) => String(t).trim()).filter(Boolean)
  } else if (typeof r.careTags === 'string') {
    careTags = r.careTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
  }

  const category = String(r.category || '').trim() || '대형가전'

  return {
    id,
    name,
    modelCode: String(r.modelName ?? r.modelCode ?? r.model ?? '').trim(),
    brand: String(r.brand || '').trim() || '기타',
    category,
    isLargeAppliance:
      r.isLargeAppliance !== undefined
        ? toBool(r.isLargeAppliance, inferIsLargeAppliance(category))
        : inferIsLargeAppliance(category),
    imageUrl: sanitizeImageUrl(String(r.imageUrl || '')),
    monthly36: toPositiveNumOrNull(r.price36 ?? r.monthly36),
    monthly60: toPositiveNumOrNull(r.price60 ?? r.monthly60),
    careTags,
    visible: toBool(r.isVisible ?? r.visible ?? r.isActive, true),
    sortOrder: Number(r.sortOrder) || idx + 1,
  }
}

function normalizeRemoteBundle(raw: unknown, idx: number): RecommendedBundle | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = String(r.id || r.setId || '').trim()
  const name = String(r.name || '').trim()
  if (!id || !name) return null

  let rawItems: unknown = r.items
  if (typeof rawItems === 'string') {
    try {
      rawItems = JSON.parse(rawItems)
    } catch {
      rawItems = []
    }
  }

  const items: BundleLineItem[] = Array.isArray(rawItems)
    ? rawItems
        .map((it) => {
          if (!it || typeof it !== 'object') return null
          const row = it as Record<string, unknown>
          const productId = String(row.productId || row.id || '').trim()
          if (!productId) return null
          const term: SubscriptionTerm = Number(row.term) === 36 ? 36 : 60
          const quantity = Math.max(1, Math.round(Number(row.qty ?? row.quantity) || 1))
          return { productId, term, quantity }
        })
        .filter((x): x is BundleLineItem => x !== null)
    : []

  return {
    id,
    name,
    description: String(r.description || '').trim(),
    badge: String(r.badge || '추천').trim(),
    defaultTerm: Number(r.defaultTerm) === 36 ? 36 : 60,
    items,
    visible: toBool(r.isVisible ?? r.visible ?? r.isActive, true),
    sortOrder: Number(r.sortOrder) || idx + 1,
  }
}

function extractCatalogSnapshot(rawResponse: GasApiResponse): CatalogSnapshot | null {
  const container =
    (rawResponse.snapshot as Record<string, unknown> | undefined) ||
    (rawResponse.data as Record<string, unknown> | undefined) ||
    (rawResponse as unknown as Record<string, unknown>)

  if (!container || typeof container !== 'object') return null

  const rawProducts = container.products
  const rawBundles = container.bundles ?? container.sets
  const rawPolicy = container.policy

  if (!Array.isArray(rawProducts) && !Array.isArray(rawBundles) && !rawPolicy) {
    return null
  }

  const products = Array.isArray(rawProducts)
    ? rawProducts
        .map((item, idx) => normalizeRemoteProduct(item, idx))
        .filter((p): p is ProductItem => p !== null)
    : INITIAL_CATALOG_SNAPSHOT.products

  const bundles = Array.isArray(rawBundles)
    ? rawBundles
        .map((item, idx) => normalizeRemoteBundle(item, idx))
        .filter((b): b is RecommendedBundle => b !== null)
    : INITIAL_CATALOG_SNAPSHOT.bundles

  return {
    products,
    bundles,
    policy: normalizePolicy(rawPolicy),
    updatedAt:
      typeof container.updatedAt === 'string' && container.updatedAt
        ? container.updatedAt
        : new Date().toISOString(),
  }
}

function readLocalCatalog(): CatalogSnapshot {
  try {
    const raw = localStorage.getItem(LOCAL_CATALOG_KEY)
    if (!raw) return INITIAL_CATALOG_SNAPSHOT
    const parsed = JSON.parse(raw) as Partial<CatalogSnapshot>
    if (!Array.isArray(parsed.products) || !Array.isArray(parsed.bundles) || !parsed.policy) {
      return INITIAL_CATALOG_SNAPSHOT
    }
    return {
      products: parsed.products,
      bundles: parsed.bundles,
      policy: normalizePolicy(parsed.policy),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    }
  } catch {
    return INITIAL_CATALOG_SNAPSHOT
  }
}

/* ==================== PUBLIC CATALOG & WRITE-ONLY LEADS ==================== */

/**
 * Public Catalog Read: GET ${GAS_URL}?action=getCatalog with redirect: "follow"
 */
export async function fetchCatalogSnapshot(): Promise<{
  snapshot: CatalogSnapshot
  source: 'gas' | 'local-preview'
}> {
  const url = getGasApiUrl()
  if (!url) {
    return {
      snapshot: readLocalCatalog(),
      source: 'local-preview',
    }
  }

  try {
    const separator = url.includes('?') ? '&' : '?'
    const response = await fetch(`${url}${separator}action=getCatalog`, {
      method: 'GET',
      redirect: 'follow',
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const data = (await response.json()) as GasApiResponse
    const extracted = extractCatalogSnapshot(data)
    if (extracted && extracted.products.length > 0) {
      return { snapshot: extracted, source: 'gas' }
    }
    return {
      snapshot: extracted
        ? {
            ...INITIAL_CATALOG_SNAPSHOT,
            policy: extracted.policy,
            updatedAt: extracted.updatedAt,
          }
        : readLocalCatalog(),
      source: 'gas',
    }
  } catch {
    return { snapshot: readLocalCatalog(), source: 'local-preview' }
  }
}

/**
 * Write-Only Lead Submission (`submitLead`).
 * Customer personal information is sanitized and transmitted one-way only.
 * There is intentionally NO read/list API for leads anywhere in this application.
 */
export async function submitConsultationWriteOnly(
  rawPayload: ConsultationPayload,
): Promise<{ ok: boolean; deliveryMode: 'gas' | 'local-preview'; referenceCode: string }> {
  const sanitizedPayload: ConsultationPayload = {
    customerName: sanitizeForSheet(rawPayload.customerName, 50),
    customerPhone: sanitizePhoneNumber(rawPayload.customerPhone),
    consultChannel: rawPayload.consultChannel,
    memo: sanitizeMemoForSheet(rawPayload.memo, 400),
    agreedLegalAndPrivacy: rawPayload.agreedLegalAndPrivacy,
    summary: {
      ...rawPayload.summary,
      itemsText: sanitizeForSheet(rawPayload.summary.itemsText, 500),
      lifeCareText: sanitizeForSheet(rawPayload.summary.lifeCareText, 200),
      cardStatusText: sanitizeForSheet(rawPayload.summary.cardStatusText, 200),
      phaseASummary: sanitizeForSheet(rawPayload.summary.phaseASummary, 200),
      phaseBSummary: rawPayload.summary.phaseBSummary
        ? sanitizeForSheet(rawPayload.summary.phaseBSummary, 200)
        : null,
    },
  }

  const referenceCode = `GJ-${Date.now().toString(36).toUpperCase().slice(-6)}`
  const url = getGasApiUrl()

  if (!url) {
    await new Promise((resolve) => setTimeout(resolve, 350))
    return {
      ok: true,
      deliveryMode: 'local-preview',
      referenceCode,
    }
  }

  await postGasAction('submitLead', undefined, {
    referenceCode,
    name: sanitizedPayload.customerName,
    phone: sanitizedPayload.customerPhone,
    channel: sanitizedPayload.consultChannel,
    customerName: sanitizedPayload.customerName,
    customerPhone: sanitizedPayload.customerPhone,
    consultChannel: sanitizedPayload.consultChannel,
    memo: sanitizedPayload.memo,
    agreed: sanitizedPayload.agreedLegalAndPrivacy,
    agreedLegalAndPrivacy: sanitizedPayload.agreedLegalAndPrivacy,
    itemsSummary: sanitizedPayload.summary.itemsText,
    lifeCareSummary: sanitizedPayload.summary.lifeCareText,
    cardSummary: sanitizedPayload.summary.cardStatusText,
    phaseASummary: sanitizedPayload.summary.phaseASummary,
    phaseBSummary: sanitizedPayload.summary.phaseBSummary || '',
    maturityRefundTotal: sanitizedPayload.summary.maturityRefundTotal,
    summary: sanitizedPayload.summary,
  })

  return {
    ok: true,
    deliveryMode: 'gas',
    referenceCode,
  }
}

/* ==================== ADMIN AUTHENTICATION (ZERO-SECRET) ==================== */

/**
 * Authenticates admin password strictly via backend Google Apps Script (`adminLogin`).
 * Token is stored ONLY in sessionStorage and wiped on tab close or UNAUTHORIZED.
 */
export async function authenticateAdminViaServer(password: string): Promise<AdminSession> {
  const trimmed = password.trim()
  if (!trimmed) {
    throw new Error('관리자 비밀번호를 입력해 주세요.')
  }

  const data = await postGasAction<{ token?: string }>('adminLogin', undefined, {
    password: trimmed,
  })

  const token =
    (typeof data.token === 'string' && data.token) ||
    (data.data && typeof data.data.token === 'string' ? data.data.token : '')

  if (!token) {
    throw new Error('서버에서 유효한 인증 토큰을 반환하지 않았습니다.')
  }

  const session: AdminSession = { token, mode: 'gas' }
  storeAdminSession(session)
  return session
}

/**
 * Invalidates admin token on server (`adminLogout`) and immediately clears sessionStorage.
 */
export async function logoutAdminSession(session: AdminSession | null): Promise<void> {
  try {
    if (session && session.mode === 'gas' && isGasConnected()) {
      await postGasAction('adminLogout', session.token, {})
    }
  } catch {
    // Always clear local session even if server logout call fails or token already expired
  } finally {
    clearAdminSession()
  }
}

/**
 * Available ONLY when VITE_GAS_API_URL is empty so the operator can preview CMS UI locally.
 */
export function enterLocalSandboxAdminSession(): AdminSession {
  if (isGasConnected()) {
    throw new Error('실서버 연동 상태에서는 로컬 샌드박스 진입이 차단됩니다.')
  }
  const session: AdminSession = {
    token: `local-sandbox-${Date.now()}`,
    mode: 'local-sandbox',
  }
  storeAdminSession(session)
  return session
}

/* ==================== ADMIN CMS ACTIONS ==================== */

/**
 * Loads authoritative admin catalog (including hidden items) via `adminGetCatalog`.
 */
export async function fetchAdminCatalog(
  session: AdminSession,
): Promise<{ snapshot: CatalogSnapshot; remoteEmpty: boolean }> {
  if (!isGasConnected() || session.mode === 'local-sandbox') {
    return { snapshot: readLocalCatalog(), remoteEmpty: false }
  }

  const data = await postGasAction('adminGetCatalog', session.token, {})
  const extracted = extractCatalogSnapshot(data)
  if (!extracted) {
    return { snapshot: readLocalCatalog(), remoteEmpty: true }
  }
  return {
    snapshot: extracted,
    remoteEmpty: extracted.products.length === 0 && extracted.bundles.length === 0,
  }
}

/**
 * Upserts a single product via `saveProduct` using the exact GAS product schema.
 */
export async function saveProductRemote(
  product: ProductItem,
  session: AdminSession,
  allProductsAfterChange: ProductItem[],
  currentSnapshot: CatalogSnapshot,
): Promise<ProductItem> {
  const clean = sanitizeProduct(product, product.sortOrder)
  if (!isGasConnected() || session.mode === 'local-sandbox') {
    const nextSnap = sanitizeCatalogSnapshot({
      ...currentSnapshot,
      products: allProductsAfterChange,
    })
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(nextSnap))
    return clean
  }

  await postGasAction('saveProduct', session.token, toGasProductPayload(clean))
  return clean
}

/**
 * Deletes a single product via `deleteProduct`.
 */
export async function deleteProductRemote(
  productId: string,
  session: AdminSession,
  allProductsAfterChange: ProductItem[],
  currentSnapshot: CatalogSnapshot,
): Promise<void> {
  if (!isGasConnected() || session.mode === 'local-sandbox') {
    const nextSnap = sanitizeCatalogSnapshot({
      ...currentSnapshot,
      products: allProductsAfterChange,
    })
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(nextSnap))
    return
  }

  await postGasAction('deleteProduct', session.token, { id: productId })
}

/**
 * Upserts a single recommended bundle via `saveSet` using the exact GAS set schema.
 */
export async function saveSetRemote(
  bundle: RecommendedBundle,
  session: AdminSession,
  allBundlesAfterChange: RecommendedBundle[],
  currentSnapshot: CatalogSnapshot,
): Promise<RecommendedBundle> {
  const clean = sanitizeBundle(bundle, bundle.sortOrder)
  if (!isGasConnected() || session.mode === 'local-sandbox') {
    const nextSnap = sanitizeCatalogSnapshot({
      ...currentSnapshot,
      bundles: allBundlesAfterChange,
    })
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(nextSnap))
    return clean
  }

  await postGasAction(
    'saveSet',
    session.token,
    toGasSetPayload(clean, currentSnapshot.products),
  )
  return clean
}

/**
 * Deletes a single recommended bundle via `deleteSet`.
 */
export async function deleteSetRemote(
  bundleId: string,
  session: AdminSession,
  allBundlesAfterChange: RecommendedBundle[],
  currentSnapshot: CatalogSnapshot,
): Promise<void> {
  if (!isGasConnected() || session.mode === 'local-sandbox') {
    const nextSnap = sanitizeCatalogSnapshot({
      ...currentSnapshot,
      bundles: allBundlesAfterChange,
    })
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(nextSnap))
    return
  }

  await postGasAction('deleteSet', session.token, { id: bundleId })
}

/**
 * Saves PolicyConfig via `savePolicy` using the exact GAS snake_case policy keys.
 */
export async function savePolicyRemote(
  policy: PolicyConfig,
  session: AdminSession,
  currentSnapshot: CatalogSnapshot,
): Promise<PolicyConfig> {
  const cleanPolicy = normalizePolicy(policy)
  if (!isGasConnected() || session.mode === 'local-sandbox') {
    const nextSnap = sanitizeCatalogSnapshot({
      ...currentSnapshot,
      policy: cleanPolicy,
    })
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(nextSnap))
    return cleanPolicy
  }

  await postGasAction('savePolicy', session.token, toGasPolicyPayload(cleanPolicy))
  return cleanPolicy
}

/**
 * Bulk syncs full catalog snapshot via `bulkSyncCatalog` using the exact GAS schemas.
 */
export async function bulkSyncCatalogRemote(
  snapshot: CatalogSnapshot,
  session: AdminSession,
): Promise<{ snapshot: CatalogSnapshot; mode: 'gas' | 'local-sandbox' }> {
  const cleanSnapshot = sanitizeCatalogSnapshot(snapshot)

  if (!isGasConnected() || session.mode === 'local-sandbox') {
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(cleanSnapshot))
    return { snapshot: cleanSnapshot, mode: 'local-sandbox' }
  }

  await postGasAction('bulkSyncCatalog', session.token, {
    products: cleanSnapshot.products.map(toGasProductPayload),
    sets: cleanSnapshot.bundles.map((b) =>
      toGasSetPayload(b, cleanSnapshot.products),
    ),
    policy: toGasPolicyPayload(cleanSnapshot.policy),
  })

  localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(cleanSnapshot))
  return { snapshot: cleanSnapshot, mode: 'gas' }
}

export function resetLocalSandboxCatalog(): CatalogSnapshot {
  localStorage.removeItem(LOCAL_CATALOG_KEY)
  return INITIAL_CATALOG_SNAPSHOT
}
