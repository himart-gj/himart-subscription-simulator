import { INITIAL_CATALOG_SNAPSHOT } from '../data/initialSeedData'
import type {
  BundleLineItem,
  CartTermMode,
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

const LOCAL_CATALOG_KEY = 'himart_gj_simulator_catalog_v3'
const ADMIN_TOKEN_SESSION_KEY = 'himart_gj_admin_session_token'
const ADMIN_SESSION_MODE_KEY = 'himart_gj_admin_session_mode'
const CLIENT_INSTANCE_ID_KEY = 'himart_gj_client_instance_id'
const LEAD_COOLDOWN_PREFIX = 'himart_gj_lead_cd_'
const CLIENT_LEAD_COOLDOWN_MS = 60_000

const LARGE_APPLIANCE_CATEGORIES = [
  '대형가전',
  'TV/영상',
  '냉장고/김치냉장고',
  '냉장고/냉동고',
  '김치냉장고',
  '세탁/건조',
  '세탁/건조/의류케어',
  '에어컨',
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
  | 'saveHeroPreset'
  | 'deleteHeroPreset'
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
  heroPresets?: unknown[]
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

export class AdminLockedOutError extends Error {
  readonly code = 'LOCKED_OUT' as const

  constructor(
    message = '비밀번호 연속 오입력으로 잠금 보호가 작동 중입니다. 비상 잠금해제 코드를 함께 입력하거나 잠시 후 시도해 주세요.',
  ) {
    super(message)
    this.name = 'AdminLockedOutError'
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

export function isAdminLockedOutError(err: unknown): err is AdminLockedOutError {
  return (
    err instanceof AdminLockedOutError ||
    (typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: unknown }).code === 'LOCKED_OUT')
  )
}

/**
 * Returns the validated HTTPS Google Apps Script Web App URL if present.
 * Rejects cleartext HTTP, javascript:, or malformed endpoints.
 */
export function getGasApiUrl(): string {
  const raw = import.meta.env.VITE_GAS_API_URL
  if (typeof raw !== 'string') return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:') return ''
    const allowedHost =
      parsed.hostname === 'script.google.com' ||
      parsed.hostname === 'script.googleusercontent.com'
    if (!allowedHost) return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

export function isGasConnected(): boolean {
  return getGasApiUrl().length > 0
}

/**
 * Local UI sandbox admin mode is strictly permitted ONLY in local Vite dev mode
 * when no production GAS URL is connected. Production builds ALWAYS return false.
 */
export function isLocalSandboxAllowed(): boolean {
  const isDev = Boolean(import.meta.env.DEV) && !import.meta.env.PROD
  return isDev && !isGasConnected()
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

    if (mode !== 'gas') {
      if (!isLocalSandboxAllowed()) {
        clearAdminSession()
        return null
      }
      return { token, mode: 'local-sandbox' }
    }

    if (token.length < 20 || !isGasConnected()) {
      clearAdminSession()
      return null
    }

    return {
      token,
      mode: 'gas',
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

function getOrCreateClientInstanceId(): string {
  try {
    const existing = sessionStorage.getItem(CLIENT_INSTANCE_ID_KEY)
    if (existing && existing.length >= 16) return existing
    const randomPart =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
    const generated = `cid_${randomPart}`
    sessionStorage.setItem(CLIENT_INSTANCE_ID_KEY, generated)
    return generated
  } catch {
    return `cid_ephemeral_${Date.now().toString(36)}`
  }
}

function formatModeLabel(mode: CartTermMode): string {
  if (mode === 'mixed') return '36+60개월 혼합'
  if (mode === 'single_36') return '36개월 단일'
  if (mode === 'single_60') return '60개월 단일'
  return '미선택'
}

/**
 * Mandatory GAS CORS-safe POST helper.
 * Uses Content-Type: text/plain;charset=utf-8 and redirect: 'follow'.
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
    throw new Error('서버 응답을 처리하는 중 일시적인 오류가 발생했습니다.')
  }

  if (data.code === 'UNAUTHORIZED' || data.error === 'UNAUTHORIZED') {
    clearAdminSession()
    throw new AdminUnauthorizedError(
      data.message || data.error || '관리자 세션이 만료되었습니다. 다시 로그인해 주세요.',
    )
  }

  const errMsg = data.message || data.error || ''
  if (data.code === 'LOCKED_OUT' || errMsg.includes('잠겼습니다')) {
    throw new AdminLockedOutError(
      errMsg ||
        '비밀번호 오류 횟수 초과로 보호 잠금이 작동 중입니다. 비상 잠금해제 코드를 함께 입력해 주세요.',
    )
  }

  const explicitlyFailed =
    data.ok === false ||
    data.success === false ||
    (typeof data.error === 'string' && data.error.length > 0)

  if (explicitlyFailed) {
    throw new Error(errMsg || '요청 처리 중 오류가 발생했습니다.')
  }

  return data
}

/* ==================== GAS SCHEMA MAPPERS (READ & WRITE) ==================== */

function inferIsLargeAppliance(category: string, name = ''): boolean {
  const hay = `${category} ${name}`
  return (
    LARGE_APPLIANCE_CATEGORIES.includes(category) ||
    hay.includes('에어컨') ||
    hay.includes('냉장') ||
    hay.includes('냉동') ||
    hay.includes('김치') ||
    hay.includes('세탁') ||
    hay.includes('건조') ||
    hay.includes('의류') ||
    hay.includes('안마의자') ||
    hay.includes('TV')
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

export function sanitizeBundle(
  b: RecommendedBundle,
  sortOrderFallback = 1,
  defaultSlotType: 'bundle' | 'hero' = 'bundle',
): RecommendedBundle {
  const slotType = b.slotType ?? defaultSlotType
  const fallbackPrefix = slotType === 'hero' ? 'hero' : 'set'
  return {
    ...b,
    id: sanitizeForSheet(b.id, 80) || `${fallbackPrefix}_${Date.now().toString(36)}`,
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
    slotType,
  }
}

export function sanitizeCatalogSnapshot(snapshot: CatalogSnapshot): CatalogSnapshot {
  const heroList = snapshot.heroPresets ?? INITIAL_CATALOG_SNAPSHOT.heroPresets ?? []
  return {
    products: snapshot.products.map((p, idx) => sanitizeProduct(p, idx + 1)),
    bundles: snapshot.bundles.map((b, idx) => sanitizeBundle(b, idx + 1, 'bundle')),
    heroPresets: heroList.map((h, idx) => sanitizeBundle(h, idx + 1, 'hero')),
    policy: normalizePolicy(snapshot.policy),
    updatedAt: new Date().toISOString(),
  }
}

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

export function toGasSetPayload(b: RecommendedBundle, products: ProductItem[]) {
  const productMap = new Map(products.map((p) => [p.id, p]))
  const hasLarge = b.items.some((item) => {
    const prod = productMap.get(item.productId)
    return prod ? prod.isLargeAppliance || inferIsLargeAppliance(prod.category) : false
  })
  const isHero = b.slotType === 'hero' || b.id.startsWith('hero-') || b.id.startsWith('hero_')
  return {
    id: b.id,
    setCategory: isHero ? '메인원클릭' : hasLarge ? '대형' : '소형',
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
      u40: num(
        dues.u40 ?? obj.freed_40k_dues ?? obj.dues40,
        DEFAULT_POLICY_CONFIG.lifeCareUnitMonthlyDues.u40,
      ),
      u50: num(
        dues.u50 ?? obj.freed_50k_dues ?? obj.dues50,
        DEFAULT_POLICY_CONFIG.lifeCareUnitMonthlyDues.u50,
      ),
      u60: num(
        dues.u60 ?? obj.freed_60k_dues ?? obj.dues60,
        DEFAULT_POLICY_CONFIG.lifeCareUnitMonthlyDues.u60,
      ),
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
  const id = sanitizeForSheet(String(r.id || r.productId || ''), 80)
  const name = sanitizeForSheet(String(r.name || ''), 120)
  if (!id || !name) return null

  let careTags: string[] = []
  if (Array.isArray(r.careTags)) {
    careTags = r.careTags.map((t) => sanitizeForSheet(String(t), 40)).filter(Boolean)
  } else if (typeof r.careTags === 'string') {
    careTags = r.careTags
      .split(',')
      .map((t) => sanitizeForSheet(t, 40))
      .filter(Boolean)
  }

  const category = sanitizeForSheet(String(r.category || ''), 40) || '대형가전'

  return {
    id,
    name,
    modelCode: sanitizeForSheet(String(r.modelName ?? r.modelCode ?? r.model ?? ''), 80),
    brand: sanitizeForSheet(String(r.brand || ''), 40) || '기타',
    category,
    isLargeAppliance:
      r.isLargeAppliance !== undefined
        ? toBool(r.isLargeAppliance, inferIsLargeAppliance(category, name))
        : inferIsLargeAppliance(category, name),
    imageUrl: sanitizeImageUrl(String(r.imageUrl || '')),
    monthly36: toPositiveNumOrNull(r.price36 ?? r.monthly36),
    monthly60: toPositiveNumOrNull(r.price60 ?? r.monthly60),
    careTags,
    visible: toBool(r.isVisible ?? r.visible ?? r.isActive, true),
    sortOrder: Number(r.sortOrder) || idx + 1,
  }
}

function normalizeRemoteBundle(
  raw: unknown,
  idx: number,
  forcedSlotType?: 'bundle' | 'hero',
): RecommendedBundle | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = sanitizeForSheet(String(r.id || r.setId || ''), 80)
  const name = sanitizeForSheet(String(r.name || r.title || ''), 100)
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
          const productId = sanitizeForSheet(String(row.productId || row.id || ''), 80)
          if (!productId) return null
          const term: SubscriptionTerm = Number(row.term) === 36 ? 36 : 60
          const quantity = Math.max(1, Math.round(Number(row.qty ?? row.quantity) || 1))
          return { productId, term, quantity }
        })
        .filter((x): x is BundleLineItem => x !== null)
    : []

  const setCat = String(r.setCategory || r.slotType || '').trim()
  const isHero =
    forcedSlotType === 'hero' ||
    setCat === '메인원클릭' ||
    setCat === 'hero' ||
    id.startsWith('hero-') ||
    id.startsWith('hero_')

  return {
    id,
    name,
    description: sanitizeForSheet(String(r.description || r.subtitle || ''), 220),
    badge: sanitizeForSheet(String(r.badge || '추천'), 30),
    defaultTerm: Number(r.defaultTerm) === 36 ? 36 : 60,
    items,
    visible: toBool(r.isVisible ?? r.visible ?? r.isActive, true),
    sortOrder: Number(r.sortOrder ?? r.slotOrder) || idx + 1,
    slotType: forcedSlotType ?? (isHero ? 'hero' : 'bundle'),
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
  const rawHeroPresets = container.heroPresets
  const rawPolicy = container.policy

  if (
    !Array.isArray(rawProducts) &&
    !Array.isArray(rawBundles) &&
    !Array.isArray(rawHeroPresets) &&
    !rawPolicy
  ) {
    return null
  }

  const products = Array.isArray(rawProducts)
    ? rawProducts
        .map((item, idx) => normalizeRemoteProduct(item, idx))
        .filter((p): p is ProductItem => p !== null)
    : INITIAL_CATALOG_SNAPSHOT.products

  const parsedSets = Array.isArray(rawBundles)
    ? rawBundles
        .map((item, idx) => normalizeRemoteBundle(item, idx))
        .filter((b): b is RecommendedBundle => b !== null)
    : INITIAL_CATALOG_SNAPSHOT.bundles

  const explicitHeroPresets = Array.isArray(rawHeroPresets)
    ? rawHeroPresets
        .map((item, idx) => normalizeRemoteBundle(item, idx, 'hero'))
        .filter((b): b is RecommendedBundle => b !== null)
    : []

  const heroFromSets = parsedSets.filter((b) => b.slotType === 'hero')
  const regularBundles = parsedSets.filter((b) => b.slotType !== 'hero')

  // Merge explicit HeroPresets sheet rows with any Sets-bridge rows (deduped by id)
  const heroMap = new Map<string, RecommendedBundle>()
  for (const h of [...explicitHeroPresets, ...heroFromSets]) {
    heroMap.set(h.id, { ...h, slotType: 'hero' })
  }
  const mergedHeroPresets = Array.from(heroMap.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )

  return {
    products,
    bundles: regularBundles,
    heroPresets:
      mergedHeroPresets.length > 0
        ? mergedHeroPresets
        : (INITIAL_CATALOG_SNAPSHOT.heroPresets ?? []),
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
      heroPresets: Array.isArray(parsed.heroPresets)
        ? parsed.heroPresets
        : (INITIAL_CATALOG_SNAPSHOT.heroPresets ?? []),
      policy: normalizePolicy(parsed.policy),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    }
  } catch {
    return INITIAL_CATALOG_SNAPSHOT
  }
}

/* ==================== PUBLIC CATALOG & WRITE-ONLY LEADS ==================== */

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
      return {
        snapshot: {
          ...extracted,
          bundles:
            extracted.bundles.length > 0
              ? extracted.bundles
              : INITIAL_CATALOG_SNAPSHOT.bundles,
          heroPresets:
            extracted.heroPresets && extracted.heroPresets.length > 0
              ? extracted.heroPresets
              : (INITIAL_CATALOG_SNAPSHOT.heroPresets ?? []),
        },
        source: 'gas',
      }
    }
    return {
      snapshot: extracted
        ? {
            ...INITIAL_CATALOG_SNAPSHOT,
            heroPresets:
              extracted.heroPresets && extracted.heroPresets.length > 0
                ? extracted.heroPresets
                : (INITIAL_CATALOG_SNAPSHOT.heroPresets ?? []),
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
 */
export async function submitConsultationWriteOnly(
  rawPayload: ConsultationPayload,
): Promise<{ ok: boolean; deliveryMode: 'gas' | 'local-preview'; referenceCode: string }> {
  const digitsOnly = rawPayload.customerPhone.replace(/\D/g, '').slice(0, 11)
  const cooldownKey = `${LEAD_COOLDOWN_PREFIX}${digitsOnly.slice(-8)}`

  try {
    const lastTs = Number(sessionStorage.getItem(cooldownKey) || '0')
    if (lastTs > 0 && Date.now() - lastTs < CLIENT_LEAD_COOLDOWN_MS) {
      throw new Error('이미 상담 신청이 접수되었습니다. 잠시 후 다시 시도해 주세요.')
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('잠시 후')) {
      throw err
    }
  }

  const sanitizedPayload: ConsultationPayload = {
    customerName: sanitizeForSheet(rawPayload.customerName, 50),
    customerPhone: sanitizePhoneNumber(rawPayload.customerPhone),
    consultChannel: rawPayload.consultChannel,
    memo: sanitizeMemoForSheet(rawPayload.memo, 400),
    agreedLegalAndPrivacy: rawPayload.agreedLegalAndPrivacy,
    honeypot: rawPayload.honeypot ? String(rawPayload.honeypot).slice(0, 80) : '',
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

  const okConsent = Boolean(sanitizedPayload.agreedLegalAndPrivacy)
  const modeSummaryText = formatModeLabel(sanitizedPayload.summary.mode)
  const maturityRefundSummaryText =
    sanitizedPayload.summary.maturityRefundTotal > 0
      ? `${sanitizedPayload.summary.maturityRefundTotal.toLocaleString('ko-KR')}원`
      : '미선택 (0원)'

  const combinedQuoteText = sanitizeMemoForSheet(
    [
      `[선택품목] ${sanitizedPayload.summary.itemsText}`,
      `[구독프리드(회비카드납부·현금캐시백)] ${sanitizedPayload.summary.lifeCareText}`,
      `[제휴카드] ${sanitizedPayload.summary.cardStatusText}`,
      `[구간체감] ${sanitizedPayload.summary.phaseASummary}${
        sanitizedPayload.summary.phaseBSummary
          ? ` / ${sanitizedPayload.summary.phaseBSummary}`
          : ''
      }`,
      sanitizedPayload.summary.maturityRefundTotal > 0
        ? `[120회만기환급] ${maturityRefundSummaryText}`
        : '',
    ]
      .filter(Boolean)
      .join(' | '),
    1000,
  )

  await postGasAction('submitLead', undefined, {
    referenceCode,
    honeypot: sanitizedPayload.honeypot ?? '',
    clientInstanceId: getOrCreateClientInstanceId(),
    name: sanitizedPayload.customerName,
    phone: sanitizedPayload.customerPhone,
    contactMethod: sanitizedPayload.consultChannel,
    modeSummary: modeSummaryText,
    itemsSummary: sanitizedPayload.summary.itemsText,
    freedSummary: sanitizedPayload.summary.lifeCareText,
    cardStatusSummary: sanitizedPayload.summary.cardStatusText,
    period1Summary: sanitizedPayload.summary.phaseASummary,
    period2Summary: sanitizedPayload.summary.phaseBSummary || '해당 없음',
    maturityRefundSummary: maturityRefundSummaryText,
    agreedToTerms: okConsent,
    memo: sanitizedPayload.memo,
    channel: sanitizedPayload.consultChannel,
    consultMethod: sanitizedPayload.consultChannel,
    preferredChannel: sanitizedPayload.consultChannel,
    customerName: sanitizedPayload.customerName,
    customerPhone: sanitizedPayload.customerPhone,
    consultChannel: sanitizedPayload.consultChannel,
    note: sanitizedPayload.memo,
    agreed: okConsent,
    agree: okConsent,
    isAgreed: okConsent,
    consent: okConsent,
    privacyAgreed: okConsent,
    legalAgreed: okConsent,
    noticeAgreed: okConsent,
    agreeAll: okConsent,
    agreedLegalAndPrivacy: okConsent,
    mode: sanitizedPayload.summary.mode,
    cartSummary: sanitizedPayload.summary.itemsText,
    lifeCareSummary: sanitizedPayload.summary.lifeCareText,
    cardSummary: sanitizedPayload.summary.cardStatusText,
    phaseASummary: sanitizedPayload.summary.phaseASummary,
    phaseBSummary: sanitizedPayload.summary.phaseBSummary || '',
    maturityRefundTotal: sanitizedPayload.summary.maturityRefundTotal,
    quoteSummary: combinedQuoteText,
    simulationSummary: combinedQuoteText,
    summary: sanitizedPayload.summary,
  })

  try {
    sessionStorage.setItem(cooldownKey, String(Date.now()))
  } catch {
    // Ignore restricted storage
  }

  return {
    ok: true,
    deliveryMode: 'gas',
    referenceCode,
  }
}

/* ==================== ADMIN AUTHENTICATION (ZERO-SECRET) ==================== */

export async function authenticateAdminViaServer(
  password: string,
  unlockCode?: string,
): Promise<AdminSession> {
  const trimmed = password.trim()
  if (!trimmed) {
    throw new Error('관리자 비밀번호를 입력해 주세요.')
  }

  const cleanUnlock = typeof unlockCode === 'string' ? unlockCode.trim() : ''
  const data = await postGasAction<{ token?: string }>('adminLogin', undefined, {
    password: trimmed,
    clientInstanceId: getOrCreateClientInstanceId(),
    ...(cleanUnlock ? { unlockCode: cleanUnlock } : {}),
  })

  const token =
    (typeof data.token === 'string' && data.token) ||
    (data.data && typeof data.data.token === 'string' ? data.data.token : '')

  if (!token || token.length < 20) {
    throw new Error('서버에서 유효한 인증 토큰을 반환하지 않았습니다.')
  }

  const session: AdminSession = { token, mode: 'gas' }
  storeAdminSession(session)
  return session
}

export async function logoutAdminSession(session: AdminSession | null): Promise<void> {
  try {
    if (session && session.mode === 'gas' && isGasConnected()) {
      await postGasAction('adminLogout', session.token, {})
    }
  } catch {
    // Always clear local session
  } finally {
    clearAdminSession()
  }
}

export function enterLocalSandboxAdminSession(): AdminSession {
  if (!isLocalSandboxAllowed()) {
    throw new Error('운영 환경에서는 로컬 샌드박스 관리자 진입이 영구 차단됩니다.')
  }
  const session: AdminSession = {
    token: `local-sandbox-${Date.now()}`,
    mode: 'local-sandbox',
  }
  storeAdminSession(session)
  return session
}

/* ==================== ADMIN CMS ACTIONS ==================== */

function assertValidAdminMode(session: AdminSession): 'gas' | 'local-sandbox' {
  if (session.mode === 'local-sandbox') {
    if (!isLocalSandboxAllowed()) {
      clearAdminSession()
      throw new AdminUnauthorizedError('허용되지 않은 로컬 샌드박스 세션이 차단되었습니다.')
    }
    return 'local-sandbox'
  }
  if (!isGasConnected() || !session.token) {
    clearAdminSession()
    throw new AdminUnauthorizedError('유효한 실서버 관리자 세션이 필요합니다.')
  }
  return 'gas'
}

export async function fetchAdminCatalog(
  session: AdminSession,
): Promise<{ snapshot: CatalogSnapshot; remoteEmpty: boolean }> {
  const mode = assertValidAdminMode(session)
  if (mode === 'local-sandbox') {
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

export async function saveProductRemote(
  product: ProductItem,
  session: AdminSession,
  allProductsAfterChange: ProductItem[],
  currentSnapshot: CatalogSnapshot,
): Promise<ProductItem> {
  const mode = assertValidAdminMode(session)
  const clean = sanitizeProduct(product, product.sortOrder)
  if (mode === 'local-sandbox') {
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

export async function deleteProductRemote(
  productId: string,
  session: AdminSession,
  allProductsAfterChange: ProductItem[],
  currentSnapshot: CatalogSnapshot,
): Promise<void> {
  const mode = assertValidAdminMode(session)
  if (mode === 'local-sandbox') {
    const nextSnap = sanitizeCatalogSnapshot({
      ...currentSnapshot,
      products: allProductsAfterChange,
    })
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(nextSnap))
    return
  }

  await postGasAction('deleteProduct', session.token, { id: productId })
}

export async function saveSetRemote(
  bundle: RecommendedBundle,
  session: AdminSession,
  allBundlesAfterChange: RecommendedBundle[],
  currentSnapshot: CatalogSnapshot,
): Promise<RecommendedBundle> {
  const mode = assertValidAdminMode(session)
  const clean = sanitizeBundle(bundle, bundle.sortOrder, 'bundle')
  if (mode === 'local-sandbox') {
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

export async function deleteSetRemote(
  bundleId: string,
  session: AdminSession,
  allBundlesAfterChange: RecommendedBundle[],
  currentSnapshot: CatalogSnapshot,
): Promise<void> {
  const mode = assertValidAdminMode(session)
  if (mode === 'local-sandbox') {
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
 * Saves a Main Screen One-Click Hero Preset (`slotType: 'hero'`).
 * Uses `saveSet` with `setCategory: '메인원클릭'` so BOTH the existing deployed Code.gs
 * AND the upgraded v2.0 Code.gs (which routes `메인원클릭` into `HeroPresets` sheet) work seamlessly.
 */
export async function saveHeroPresetRemote(
  preset: RecommendedBundle,
  session: AdminSession,
  allHeroPresetsAfterChange: RecommendedBundle[],
  currentSnapshot: CatalogSnapshot,
): Promise<RecommendedBundle> {
  const mode = assertValidAdminMode(session)
  const ensuredId = preset.id.startsWith('hero-') || preset.id.startsWith('hero_')
    ? preset.id
    : `hero-${preset.id}`
  const clean = sanitizeBundle({ ...preset, id: ensuredId, slotType: 'hero' }, preset.sortOrder, 'hero')

  if (mode === 'local-sandbox') {
    const nextSnap = sanitizeCatalogSnapshot({
      ...currentSnapshot,
      heroPresets: allHeroPresetsAfterChange,
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

export async function deleteHeroPresetRemote(
  presetId: string,
  session: AdminSession,
  allHeroPresetsAfterChange: RecommendedBundle[],
  currentSnapshot: CatalogSnapshot,
): Promise<void> {
  const mode = assertValidAdminMode(session)
  if (mode === 'local-sandbox') {
    const nextSnap = sanitizeCatalogSnapshot({
      ...currentSnapshot,
      heroPresets: allHeroPresetsAfterChange,
    })
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(nextSnap))
    return
  }

  await postGasAction('deleteSet', session.token, { id: presetId })
}

export async function savePolicyRemote(
  policy: PolicyConfig,
  session: AdminSession,
  currentSnapshot: CatalogSnapshot,
): Promise<PolicyConfig> {
  const mode = assertValidAdminMode(session)
  const cleanPolicy = normalizePolicy(policy)
  if (mode === 'local-sandbox') {
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

export async function bulkSyncCatalogRemote(
  snapshot: CatalogSnapshot,
  session: AdminSession,
): Promise<{ snapshot: CatalogSnapshot; mode: 'gas' | 'local-sandbox' }> {
  const mode = assertValidAdminMode(session)
  const cleanSnapshot = sanitizeCatalogSnapshot(snapshot)

  if (mode === 'local-sandbox') {
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(cleanSnapshot))
    return { snapshot: cleanSnapshot, mode: 'local-sandbox' }
  }

  const heroPayloads = (cleanSnapshot.heroPresets ?? []).map((h) =>
    toGasSetPayload({ ...h, slotType: 'hero' }, cleanSnapshot.products),
  )
  const bundlePayloads = cleanSnapshot.bundles.map((b) =>
    toGasSetPayload({ ...b, slotType: 'bundle' }, cleanSnapshot.products),
  )

  await postGasAction('bulkSyncCatalog', session.token, {
    products: cleanSnapshot.products.map(toGasProductPayload),
    sets: [...heroPayloads, ...bundlePayloads],
    heroPresets: heroPayloads,
    policy: toGasPolicyPayload(cleanSnapshot.policy),
  })

  localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(cleanSnapshot))
  return { snapshot: cleanSnapshot, mode: 'gas' }
}

export function resetLocalSandboxCatalog(): CatalogSnapshot {
  if (!isLocalSandboxAllowed()) {
    return INITIAL_CATALOG_SNAPSHOT
  }
  localStorage.removeItem(LOCAL_CATALOG_KEY)
  return INITIAL_CATALOG_SNAPSHOT
}
