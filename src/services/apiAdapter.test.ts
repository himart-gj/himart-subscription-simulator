import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_CATALOG_SNAPSHOT } from '../data/initialSeedData'
import {
  AdminUnauthorizedError,
  authenticateAdminViaServer,
  bulkSyncCatalogRemote,
  clearAdminSession,
  deleteProductRemote,
  deleteSetRemote,
  fetchAdminCatalog,
  fetchCatalogSnapshot,
  getGasApiUrl,
  getStoredAdminSession,
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

describe('GAS API Adapter CORS & Security Protocol Verification', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('sessionStorage', new MemoryStorage())
    vi.stubGlobal('localStorage', new MemoryStorage())
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const mockJsonResponse = (body: unknown) => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => body,
    })
  }

  it('Loads configured GAS Web App URL from .env VITE_GAS_API_URL', () => {
    expect(getGasApiUrl()).toBe(
      'https://script.google.com/macros/s/AKfycbxgCv2hTeEj9LCs7LlRGKKHzLrwUhP-ScYUB81m25bmiMP-rKaBasjYNMw3FXYenmaY6Q/exec',
    )
  })

  it('Public GET getCatalog uses redirect: "follow"', async () => {
    mockJsonResponse({ ok: true, data: INITIAL_CATALOG_SNAPSHOT })
    const res = await fetchCatalogSnapshot()

    expect(res.source).toBe('gas')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchMock.mock.calls[0]
    expect(calledUrl).toBe(`${getGasApiUrl()}?action=getCatalog`)
    expect(init.method).toBe('GET')
    expect(init.redirect).toBe('follow')
  })

  it('All 10 GAS POST actions strictly enforce text/plain;charset=utf-8, redirect: follow, and { action, token, payload }', async () => {
    const assertLastPostContract = (expectedAction: string, expectedToken: string) => {
      const [calledUrl, init] = fetchMock.mock.calls.at(-1)!
      expect(calledUrl).toBe(getGasApiUrl())
      expect(init.method).toBe('POST')
      expect(init.redirect).toBe('follow')
      expect(init.headers).toEqual({ 'Content-Type': 'text/plain;charset=utf-8' })
      const parsed = JSON.parse(init.body)
      expect(parsed).toHaveProperty('action', expectedAction)
      expect(parsed).toHaveProperty('token', expectedToken)
      expect(parsed).toHaveProperty('payload')
      return parsed
    }

    // 1. adminLogin -> stores token ONLY in sessionStorage (NOT localStorage)
    mockJsonResponse({ ok: true, token: 'tok-live-123' })
    const session = await authenticateAdminViaServer('my-secret-pass')
    assertLastPostContract('adminLogin', '')
    expect(session.token).toBe('tok-live-123')
    expect(getStoredAdminSession()?.token).toBe('tok-live-123')
    expect(localStorage.length).toBe(0)

    // 2. adminGetCatalog
    mockJsonResponse({ ok: true, data: INITIAL_CATALOG_SNAPSHOT })
    await fetchAdminCatalog(session)
    assertLastPostContract('adminGetCatalog', 'tok-live-123')

    // 3. saveProduct
    mockJsonResponse({ ok: true })
    await saveProductRemote(
      INITIAL_CATALOG_SNAPSHOT.products[0],
      session,
      INITIAL_CATALOG_SNAPSHOT.products,
      INITIAL_CATALOG_SNAPSHOT,
    )
    assertLastPostContract('saveProduct', 'tok-live-123')

    // 4. deleteProduct
    mockJsonResponse({ ok: true })
    await deleteProductRemote(
      'prod-1',
      session,
      INITIAL_CATALOG_SNAPSHOT.products,
      INITIAL_CATALOG_SNAPSHOT,
    )
    const delProdBody = assertLastPostContract('deleteProduct', 'tok-live-123')
    expect(delProdBody.payload).toEqual({ id: 'prod-1' })

    // 5. saveSet
    mockJsonResponse({ ok: true })
    await saveSetRemote(
      INITIAL_CATALOG_SNAPSHOT.bundles[0],
      session,
      INITIAL_CATALOG_SNAPSHOT.bundles,
      INITIAL_CATALOG_SNAPSHOT,
    )
    assertLastPostContract('saveSet', 'tok-live-123')

    // 6. deleteSet
    mockJsonResponse({ ok: true })
    await deleteSetRemote(
      'bundle-1',
      session,
      INITIAL_CATALOG_SNAPSHOT.bundles,
      INITIAL_CATALOG_SNAPSHOT,
    )
    const delSetBody = assertLastPostContract('deleteSet', 'tok-live-123')
    expect(delSetBody.payload).toEqual({ id: 'bundle-1' })

    // 7. savePolicy
    mockJsonResponse({ ok: true })
    await savePolicyRemote(INITIAL_CATALOG_SNAPSHOT.policy, session, INITIAL_CATALOG_SNAPSHOT)
    assertLastPostContract('savePolicy', 'tok-live-123')

    // 8. bulkSyncCatalog
    mockJsonResponse({ ok: true })
    await bulkSyncCatalogRemote(INITIAL_CATALOG_SNAPSHOT, session)
    assertLastPostContract('bulkSyncCatalog', 'tok-live-123')

    // 9. submitLead (Write-Only, formula injection sanitized)
    mockJsonResponse({ ok: true })
    await submitConsultationWriteOnly({
      customerName: '=EVIL()',
      customerPhone: '01012345678',
      consultChannel: '매장 방문',
      memo: '+test',
      agreedLegalAndPrivacy: true,
      summary: {
        mode: 'single_36',
        itemsText: '테스트',
        lifeCareText: '5만×6',
        cardStatusText: '자동충족',
        phaseASummary: '0원',
        phaseBSummary: null,
        maturityRefundTotal: 27000000,
        submittedAt: '2026-11-21T00:00:00Z',
      },
    })
    const leadBody = assertLastPostContract('submitLead', '')
    expect(leadBody.payload.customerName).toBe("'=EVIL()")
    expect(leadBody.payload.customerPhone).toBe('010-1234-5678')

    // 10. adminLogout -> wipes sessionStorage
    mockJsonResponse({ ok: true })
    await logoutAdminSession(session)
    assertLastPostContract('adminLogout', 'tok-live-123')
    expect(getStoredAdminSession()).toBeNull()
  })

  it('Immediately clears sessionStorage and throws AdminUnauthorizedError on code === "UNAUTHORIZED"', async () => {
    mockJsonResponse({ ok: true, token: 'tok-expiring' })
    const session = await authenticateAdminViaServer('pass')
    expect(getStoredAdminSession()?.token).toBe('tok-expiring')

    mockJsonResponse({
      ok: false,
      code: 'UNAUTHORIZED',
      message: '세션이 만료되었습니다.',
    })

    await expect(
      savePolicyRemote(INITIAL_CATALOG_SNAPSHOT.policy, session, INITIAL_CATALOG_SNAPSHOT),
    ).rejects.toBeInstanceOf(AdminUnauthorizedError)

    // Session MUST be immediately cleared from sessionStorage
    expect(getStoredAdminSession()).toBeNull()
    clearAdminSession()
  })
})
