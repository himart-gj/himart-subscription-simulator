import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_CATALOG_SNAPSHOT } from '../data/initialSeedData'
import { calculateBenefitSimulation } from '../utils/calculator'
import {
  AdminLockedOutError,
  AdminUnauthorizedError,
  authenticateAdminViaServer,
  bulkSyncCatalogRemote,
  clearAdminSession,
  deleteProductRemote,
  deleteSetRemote,
  enterLocalSandboxAdminSession,
  fetchAdminCatalog,
  fetchCatalogSnapshot,
  getGasApiUrl,
  getStoredAdminSession,
  isLocalSandboxAllowed,
  logoutAdminSession,
  savePolicyRemote,
  saveProductRemote,
  saveSetRemote,
  submitConsultationWriteOnly,
} from './apiAdapter'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear() {
    this.store.clear()
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value))
  }
}

const TEST_GAS_URL =
  'https://script.google.com/macros/s/AKfycbxgCv2hTeEj9LCs7LlRGKKHzLrwUhP-ScYUB81m25bmiMP-rKaBasjYNMw3FXYenmaY6Q/exec'

const LIVE_GAS_SAMPLE_RESPONSE = {
  ok: true,
  data: {
    products: [
      {
        id: 'prod_02',
        category: '로봇청소기/청소기',
        brand: 'LG',
        name: '코드제로 오브제컬렉션 A9S',
        modelName: 'AU9882WD',
        imageUrl: '',
        price36: 24900,
        price60: 17900,
        careTags: ['배터리·필터 케어', '무상보증 연장'],
        isVisible: true,
      },
      {
        id: 'prod_03',
        category: '밥솥/주방소형',
        brand: '쿠쿠',
        name: '마스터셰프 사일런스 트윈프레셔 6인용',
        modelName: 'CRP-NHTR0610FD',
        imageUrl: '',
        price36: 18900,
        price60: 13900,
        careTags: ['패킹 정기교체'],
        isVisible: true,
      },
      {
        id: 'prod_04',
        category: '냉장고/김치냉장고',
        brand: '삼성',
        name: '비스포크 AI 하이브리드 4도어 875L',
        modelName: 'RF85DB9581AP',
        imageUrl: '',
        price36: 64900,
        price60: 44900,
        careTags: ['전문 분해세척 케어'],
        isVisible: true,
      },
    ],
    sets: [
      {
        id: 'set_01',
        setCategory: '소형',
        name: '주방·청소 살림효자 세트',
        description: '실속 패키지',
        badge: '살림효자',
        defaultTerm: 60,
        items: [
          { productId: 'prod_03', term: 36, qty: 1 },
          { productId: 'prod_02', term: 60, qty: 2 },
        ],
        sortOrder: 1,
        isVisible: true,
      },
    ],
    policy: {
      freed_40k_cashback_36: 20000,
      freed_50k_cashback_36: 25000,
      freed_60k_cashback_36: 30000,
      freed_40k_cashback_60: 12000,
      freed_50k_cashback_60: 15000,
      freed_60k_cashback_60: 18000,
      freed_max_accounts: 12,
      freed_pay_months: 90,
      freed_defer_months: 30,
      freed_maturity_months: 120,
      card_min_spend: 300000,
      card_monthly_cashback: 18000,
    },
  },
}

describe('GAS API Adapter Schema, CORS & Production Security Hardening', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubEnv('VITE_GAS_API_URL', TEST_GAS_URL)
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('sessionStorage', new MemoryStorage())
    vi.stubGlobal('localStorage', new MemoryStorage())
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  const mockJsonResponse = (body: unknown) => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => body,
    })
  }

  it('Validates HTTPS Google Apps Script Web App URL strictly and rejects insecure/forged URLs', () => {
    expect(getGasApiUrl()).toBe(TEST_GAS_URL)

    vi.stubEnv('VITE_GAS_API_URL', 'http://script.google.com/macros/s/abc/exec')
    expect(getGasApiUrl()).toBe('')

    vi.stubEnv('VITE_GAS_API_URL', 'javascript:alert(1)')
    expect(getGasApiUrl()).toBe('')
  })

  it('Blocks local-sandbox admin bypass completely in production mode even if VITE_GAS_API_URL is empty', () => {
    vi.stubEnv('VITE_GAS_API_URL', '')
    vi.stubEnv('PROD', true)
    vi.stubEnv('DEV', false)

    expect(isLocalSandboxAllowed()).toBe(false)
    expect(() => enterLocalSandboxAdminSession()).toThrow()

    // Forged sessionStorage injection via DevTools must be wiped & rejected
    sessionStorage.setItem('himart_gj_admin_session_token', 'local-sandbox-forged')
    sessionStorage.setItem('himart_gj_admin_session_mode', 'local-sandbox')
    expect(getStoredAdminSession()).toBeNull()
    expect(sessionStorage.getItem('himart_gj_admin_session_token')).toBeNull()
  })

  it('Parses live GAS schema (price36/price60, modelName, isVisible, sets[].items[].qty, freed_* policy) cleanly', async () => {
    mockJsonResponse(LIVE_GAS_SAMPLE_RESPONSE)
    const res = await fetchCatalogSnapshot()

    expect(res.source).toBe('gas')
    expect(res.snapshot.products).toHaveLength(3)
    expect(res.snapshot.products[0].monthly36).toBe(24900)
    expect(res.snapshot.products[0].monthly60).toBe(17900)
    expect(res.snapshot.products[0].modelCode).toBe('AU9882WD')
    expect(res.snapshot.products[0].visible).toBe(true)

    const sim = calculateBenefitSimulation({
      cart: res.snapshot.bundles[0].items,
      products: res.snapshot.products,
      lifeCare: { q40: 0, q50: 0, q60: 0 },
      cardEnabled: false,
      coverShortfallWithLivingSpend: false,
      policy: res.snapshot.policy,
    })
    expect(sim.mode).toBe('mixed')
    expect(sim.phaseA.grossSubscription).toBe(54700)
    expect(sim.phaseB?.grossSubscription).toBe(35800)
  })

  it('All 10 GAS POST actions serialize exact live GAS schemas (including Code.gs submitLead columns & clientInstanceId)', async () => {
    const assertLastPostContract = (expectedAction: string, expectedToken: string) => {
      const [calledUrl, init] = fetchMock.mock.calls.at(-1)!
      expect(calledUrl).toBe(TEST_GAS_URL)
      expect(init.method).toBe('POST')
      expect(init.redirect).toBe('follow')
      expect(init.headers).toEqual({ 'Content-Type': 'text/plain;charset=utf-8' })
      const parsed = JSON.parse(init.body)
      expect(parsed).toHaveProperty('action', expectedAction)
      expect(parsed).toHaveProperty('token', expectedToken)
      expect(parsed).toHaveProperty('payload')
      return parsed
    }

    // 1. adminLogin (includes clientInstanceId & optional unlockCode)
    mockJsonResponse({ ok: true, token: 'tok-live-12345678901234567890' })
    const session = await authenticateAdminViaServer('my-secret-pass', '991122')
    const loginPost = assertLastPostContract('adminLogin', '')
    expect(loginPost.payload.clientInstanceId).toBeTruthy()
    expect(loginPost.payload.unlockCode).toBe('991122')
    expect(getStoredAdminSession()?.token).toBe('tok-live-12345678901234567890')

    // 2. adminGetCatalog
    mockJsonResponse(LIVE_GAS_SAMPLE_RESPONSE)
    await fetchAdminCatalog(session)
    assertLastPostContract('adminGetCatalog', 'tok-live-12345678901234567890')

    // 3. saveProduct
    mockJsonResponse({ ok: true })
    await saveProductRemote(
      INITIAL_CATALOG_SNAPSHOT.products[0],
      session,
      INITIAL_CATALOG_SNAPSHOT.products,
      INITIAL_CATALOG_SNAPSHOT,
    )
    const prodPost = assertLastPostContract('saveProduct', 'tok-live-12345678901234567890')
    expect(prodPost.payload.price36).toBe(INITIAL_CATALOG_SNAPSHOT.products[0].monthly36 ?? 0)
    expect(prodPost.payload.price60).toBe(INITIAL_CATALOG_SNAPSHOT.products[0].monthly60 ?? 0)

    // 4. deleteProduct
    mockJsonResponse({ ok: true })
    await deleteProductRemote(
      'prod_01',
      session,
      INITIAL_CATALOG_SNAPSHOT.products,
      INITIAL_CATALOG_SNAPSHOT,
    )
    assertLastPostContract('deleteProduct', 'tok-live-12345678901234567890')

    // 5. saveSet
    mockJsonResponse({ ok: true })
    await saveSetRemote(
      INITIAL_CATALOG_SNAPSHOT.bundles[1],
      session,
      INITIAL_CATALOG_SNAPSHOT.bundles,
      INITIAL_CATALOG_SNAPSHOT,
    )
    assertLastPostContract('saveSet', 'tok-live-12345678901234567890')

    // 6. deleteSet
    mockJsonResponse({ ok: true })
    await deleteSetRemote(
      'set_01',
      session,
      INITIAL_CATALOG_SNAPSHOT.bundles,
      INITIAL_CATALOG_SNAPSHOT,
    )
    assertLastPostContract('deleteSet', 'tok-live-12345678901234567890')

    // 7. savePolicy
    mockJsonResponse({ ok: true })
    await savePolicyRemote(INITIAL_CATALOG_SNAPSHOT.policy, session, INITIAL_CATALOG_SNAPSHOT)
    assertLastPostContract('savePolicy', 'tok-live-12345678901234567890')

    // 8. bulkSyncCatalog
    mockJsonResponse({ ok: true })
    await bulkSyncCatalogRemote(INITIAL_CATALOG_SNAPSHOT, session)
    assertLastPostContract('bulkSyncCatalog', 'tok-live-12345678901234567890')

    // 9. submitLead -> verifies exact live Code.gs column keys + duplicate cooldown
    mockJsonResponse({ ok: true })
    await submitConsultationWriteOnly({
      customerName: '=EVIL()',
      customerPhone: '01012345678',
      consultChannel: '카톡·문자',
      memo: '+test',
      agreedLegalAndPrivacy: true,
      honeypot: '',
      summary: {
        mode: 'single_36',
        itemsText: '테스트',
        lifeCareText: '구독플러스 90 6구좌',
        cardStatusText: '자동충족',
        phaseASummary: '월 체감 0원',
        phaseBSummary: null,
        maturityRefundTotal: 27000000,
        submittedAt: '2026-11-21T00:00:00Z',
      },
    })
    const leadBody = assertLastPostContract('submitLead', '')
    expect(leadBody.payload.name).toBe("'=EVIL()")
    expect(leadBody.payload.phone).toBe('010-1234-5678')
    expect(leadBody.payload.contactMethod).toBe('카톡·문자')
    expect(leadBody.payload.modeSummary).toBe('36개월 단일')
    expect(leadBody.payload.cardStatusSummary).toBe('자동충족')
    expect(leadBody.payload.period1Summary).toBe('월 체감 0원')
    expect(leadBody.payload.maturityRefundSummary).toBe('27,000,000원')
    expect(leadBody.payload.agreedToTerms).toBe(true)

    // Immediate duplicate submission from same phone is blocked by client cooldown too
    await expect(
      submitConsultationWriteOnly({
        customerName: '홍길동',
        customerPhone: '010-1234-5678',
        consultChannel: '전화 상담',
        memo: '',
        agreedLegalAndPrivacy: true,
        summary: {
          mode: 'single_36',
          itemsText: '테스트',
          lifeCareText: '구독플러스 90 6구좌',
          cardStatusText: '자동충족',
          phaseASummary: '월 체감 0원',
          phaseBSummary: null,
          maturityRefundTotal: 27000000,
          submittedAt: '2026-11-21T00:00:00Z',
        },
      }),
    ).rejects.toThrow(/잠시 후/)

    // 10. adminLogout
    mockJsonResponse({ ok: true })
    await logoutAdminSession(session)
    assertLastPostContract('adminLogout', 'tok-live-12345678901234567890')
    expect(getStoredAdminSession()).toBeNull()
  })

  it('Surfaces AdminLockedOutError when server triggers Lockout DoS defense so AdminPage reveals recovery PIN field', async () => {
    mockJsonResponse({
      ok: false,
      code: 'LOCKED_OUT',
      error: '비정상적인 로그인 시도가 감지되었습니다. 비상 잠금해제 코드를 함께 입력해 주세요.',
    })

    await expect(authenticateAdminViaServer('pass')).rejects.toBeInstanceOf(
      AdminLockedOutError,
    )
  })

  it('Immediately clears sessionStorage and throws AdminUnauthorizedError on code === "UNAUTHORIZED"', async () => {
    mockJsonResponse({ ok: true, token: 'tok-expiring-123456789012345' })
    const session = await authenticateAdminViaServer('pass')

    mockJsonResponse({
      ok: false,
      code: 'UNAUTHORIZED',
      message: '세션이 만료되었습니다.',
    })

    await expect(
      savePolicyRemote(INITIAL_CATALOG_SNAPSHOT.policy, session, INITIAL_CATALOG_SNAPSHOT),
    ).rejects.toBeInstanceOf(AdminUnauthorizedError)

    expect(getStoredAdminSession()).toBeNull()
    clearAdminSession()
  })
})
