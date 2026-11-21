import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  Package,
  RefreshCw,
  Save,
  ShieldAlert,
  Sliders,
} from 'lucide-react'
import { BundleManagerTab } from '../components/admin/BundleManagerTab'
import { CatalogManagerTab } from '../components/admin/CatalogManagerTab'
import { PolicySyncTab } from '../components/admin/PolicySyncTab'
import { INITIAL_CATALOG_SNAPSHOT } from '../data/initialSeedData'
import {
  type AdminSession,
  authenticateAdminViaServer,
  bulkSyncCatalogRemote,
  clearAdminSession,
  deleteProductRemote,
  deleteSetRemote,
  enterLocalSandboxAdminSession,
  fetchAdminCatalog,
  getStoredAdminSession,
  isAdminUnauthorizedError,
  isGasConnected,
  logoutAdminSession,
  resetLocalSandboxCatalog,
  savePolicyRemote,
  saveProductRemote,
  saveSetRemote,
} from '../services/apiAdapter'
import type {
  CatalogSnapshot,
  PolicyConfig,
  ProductItem,
  RecommendedBundle,
} from '../types/domain'

interface AdminPageProps {
  catalog: CatalogSnapshot
  onCatalogSaved: (next: CatalogSnapshot) => void
  onNavigateCustomer: () => void
}

type AdminTab = 'catalog' | 'bundles' | 'policy'

export function AdminPage({
  catalog,
  onCatalogSaved,
  onNavigateCustomer,
}: AdminPageProps) {
  const gasConnected = isGasConnected()
  const [session, setSession] = useState<AdminSession | null>(() =>
    getStoredAdminSession(),
  )
  const [hasEnteredDashboard, setHasEnteredDashboard] = useState<boolean>(
    () => getStoredAdminSession() !== null,
  )

  // Initial login gate state
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Re-login modal state (triggered immediately on code === "UNAUTHORIZED")
  const [reauthModalOpen, setReauthModalOpen] = useState(false)
  const [reauthReason, setReauthReason] = useState<string>('')
  const [reauthPassword, setReauthPassword] = useState('')
  const [reauthLoading, setReauthLoading] = useState(false)
  const [reauthError, setReauthError] = useState<string | null>(null)

  // Dashboard state
  const [activeTab, setActiveTab] = useState<AdminTab>('catalog')
  const [draft, setDraft] = useState<CatalogSnapshot>(catalog)
  const [dirty, setDirty] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [loadingRemote, setLoadingRemote] = useState(false)
  const [remoteEmptyHint, setRemoteEmptyHint] = useState(false)
  const [saveToast, setSaveToast] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!dirty) {
      setDraft(catalog)
    }
  }, [catalog, dirty])

  const showToast = useCallback((msg: string) => {
    setSaveToast(msg)
    window.setTimeout(() => {
      setSaveToast((cur) => (cur === msg ? null : cur))
    }, 3200)
  }, [])

  /**
   * Central error handler: whenever code === "UNAUTHORIZED" arrives,
   * immediately clears sessionStorage & active session and opens the Re-login Modal.
   */
  const handleAdminError = useCallback((err: unknown, fallbackMessage: string) => {
    if (isAdminUnauthorizedError(err)) {
      clearAdminSession()
      setSession(null)
      setReauthReason(
        err.message || '관리자 세션이 만료되었습니다(UNAUTHORIZED). 다시 로그인해 주세요.',
      )
      setReauthPassword('')
      setReauthError(null)
      setReauthModalOpen(true)
      return
    }
    setSaveError(err instanceof Error ? err.message : fallbackMessage)
  }, [])

  /**
   * Fetches authoritative admin catalog (including hidden items) via `adminGetCatalog`.
   */
  const syncFromAdminServer = useCallback(
    async (activeSession: AdminSession) => {
      if (activeSession.mode !== 'gas') return
      setLoadingRemote(true)
      setSaveError(null)
      try {
        const res = await fetchAdminCatalog(activeSession)
        setRemoteEmptyHint(res.remoteEmpty)
        if (!res.remoteEmpty) {
          setDraft(res.snapshot)
          onCatalogSaved(res.snapshot)
          setDirty(false)
        }
      } catch (err) {
        handleAdminError(err, '관리자 카탈로그를 불러오지 못했습니다.')
      } finally {
        setLoadingRemote(false)
      }
    },
    [handleAdminError, onCatalogSaved],
  )

  useEffect(() => {
    if (session && session.mode === 'gas') {
      void syncFromAdminServer(session)
    }
  }, [session, syncFromAdminServer])

  const handleServerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    try {
      setAuthLoading(true)
      const nextSession = await authenticateAdminViaServer(password)
      setSession(nextSession)
      setHasEnteredDashboard(true)
      setPassword('')
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : '관리자 인증에 실패했습니다.',
      )
    } finally {
      setAuthLoading(false)
    }
  }

  const handleReauthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setReauthError(null)
    try {
      setReauthLoading(true)
      const freshSession = await authenticateAdminViaServer(reauthPassword)
      setSession(freshSession)
      setReauthPassword('')
      setReauthModalOpen(false)
      showToast('관리자 재인증이 완료되었습니다. 작업을 계속 진행하실 수 있습니다.')
    } catch (err) {
      setReauthError(
        err instanceof Error ? err.message : '비밀번호가 일치하지 않습니다.',
      )
    } finally {
      setReauthLoading(false)
    }
  }

  const handleEnterSandbox = () => {
    setAuthError(null)
    try {
      const nextSession = enterLocalSandboxAdminSession()
      setSession(nextSession)
      setHasEnteredDashboard(true)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '샌드박스 진입 불가')
    }
  }

  const handleLogout = async () => {
    await logoutAdminSession(session)
    setSession(null)
    setHasEnteredDashboard(false)
    setReauthModalOpen(false)
    setDirty(false)
    setDraft(catalog)
  }

  const requireActiveSession = (): AdminSession | null => {
    if (!session) {
      setReauthReason('관리자 세션이 필요합니다. 비밀번호를 입력해 다시 로그인해 주세요.')
      setReauthModalOpen(true)
      return null
    }
    return session
  }

  /* ==================== GRANULAR GAS CMS ACTIONS ==================== */

  const handleSaveProduct = async (product: ProductItem, isNew: boolean) => {
    const active = requireActiveSession()
    if (!active) return

    const nextProducts = isNew
      ? [product, ...draft.products]
      : draft.products.map((p) => (p.id === product.id ? product : p))

    setSyncing(true)
    setSaveError(null)
    try {
      const saved = await saveProductRemote(product, active, nextProducts, draft)
      const reconciled = isNew
        ? [saved, ...draft.products]
        : draft.products.map((p) => (p.id === saved.id ? saved : p))
      const nextSnap: CatalogSnapshot = {
        ...draft,
        products: reconciled,
        updatedAt: new Date().toISOString(),
      }
      setDraft(nextSnap)
      onCatalogSaved(nextSnap)
      setRemoteEmptyHint(false)
      showToast(
        active.mode === 'gas'
          ? `품목 ‘${saved.name}’이(가) 구글 시트(saveProduct)에 저장되었습니다.`
          : `품목 ‘${saved.name}’이(가) 로컬 프리뷰에 저장되었습니다.`,
      )
    } catch (err) {
      handleAdminError(err, '품목 저장 중 오류가 발생했습니다.')
    } finally {
      setSyncing(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    const active = requireActiveSession()
    if (!active) return

    const nextProducts = draft.products.filter((p) => p.id !== productId)
    setSyncing(true)
    setSaveError(null)
    try {
      await deleteProductRemote(productId, active, nextProducts, draft)
      const nextSnap: CatalogSnapshot = {
        ...draft,
        products: nextProducts,
        updatedAt: new Date().toISOString(),
      }
      setDraft(nextSnap)
      onCatalogSaved(nextSnap)
      showToast(
        active.mode === 'gas'
          ? '품목이 구글 시트(deleteProduct)에서 삭제되었습니다.'
          : '품목이 삭제되었습니다.',
      )
    } catch (err) {
      handleAdminError(err, '품목 삭제 중 오류가 발생했습니다.')
    } finally {
      setSyncing(false)
    }
  }

  const handleSaveSet = async (bundle: RecommendedBundle, isNew: boolean) => {
    const active = requireActiveSession()
    if (!active) return

    const nextBundles = isNew
      ? [...draft.bundles, bundle]
      : draft.bundles.map((b) => (b.id === bundle.id ? bundle : b))

    setSyncing(true)
    setSaveError(null)
    try {
      const saved = await saveSetRemote(bundle, active, nextBundles, draft)
      const reconciled = isNew
        ? [...draft.bundles, saved]
        : draft.bundles.map((b) => (b.id === saved.id ? saved : b))
      const nextSnap: CatalogSnapshot = {
        ...draft,
        bundles: reconciled,
        updatedAt: new Date().toISOString(),
      }
      setDraft(nextSnap)
      onCatalogSaved(nextSnap)
      setRemoteEmptyHint(false)
      showToast(
        active.mode === 'gas'
          ? `추천 세트 ‘${saved.name}’이(가) 구글 시트(saveSet)에 저장되었습니다.`
          : `추천 세트 ‘${saved.name}’이(가) 저장되었습니다.`,
      )
    } catch (err) {
      handleAdminError(err, '추천 세트 저장 중 오류가 발생했습니다.')
    } finally {
      setSyncing(false)
    }
  }

  const handleDeleteSet = async (bundleId: string) => {
    const active = requireActiveSession()
    if (!active) return

    const nextBundles = draft.bundles.filter((b) => b.id !== bundleId)
    setSyncing(true)
    setSaveError(null)
    try {
      await deleteSetRemote(bundleId, active, nextBundles, draft)
      const nextSnap: CatalogSnapshot = {
        ...draft,
        bundles: nextBundles,
        updatedAt: new Date().toISOString(),
      }
      setDraft(nextSnap)
      onCatalogSaved(nextSnap)
      showToast(
        active.mode === 'gas'
          ? '추천 세트가 구글 시트(deleteSet)에서 삭제되었습니다.'
          : '추천 세트가 삭제되었습니다.',
      )
    } catch (err) {
      handleAdminError(err, '추천 세트 삭제 중 오류가 발생했습니다.')
    } finally {
      setSyncing(false)
    }
  }

  const handleReorderSets = async (nextBundles: RecommendedBundle[]) => {
    const active = requireActiveSession()
    if (!active) return

    const nextSnap: CatalogSnapshot = {
      ...draft,
      bundles: nextBundles,
      updatedAt: new Date().toISOString(),
    }
    setDraft(nextSnap)
    setSyncing(true)
    setSaveError(null)
    try {
      const res = await bulkSyncCatalogRemote(nextSnap, active)
      setDraft(res.snapshot)
      onCatalogSaved(res.snapshot)
      setDirty(false)
      showToast('추천 세트 노출 순서가 시트에 반영되었습니다.')
    } catch (err) {
      handleAdminError(err, '순서 변경 저장에 실패했습니다.')
    } finally {
      setSyncing(false)
    }
  }

  const handleSavePolicy = async (policy: PolicyConfig) => {
    const active = requireActiveSession()
    if (!active) return

    setSyncing(true)
    setSaveError(null)
    try {
      const savedPolicy = await savePolicyRemote(policy, active, draft)
      const nextSnap: CatalogSnapshot = {
        ...draft,
        policy: savedPolicy,
        updatedAt: new Date().toISOString(),
      }
      setDraft(nextSnap)
      onCatalogSaved(nextSnap)
      setDirty(false)
      showToast(
        active.mode === 'gas'
          ? '혜택 정책 수치가 구글 시트(savePolicy)에 저장되었습니다.'
          : '혜택 정책 수치가 로컬 프리뷰에 저장되었습니다.',
      )
    } catch (err) {
      handleAdminError(err, '정책 저장 중 오류가 발생했습니다.')
    } finally {
      setSyncing(false)
    }
  }

  const handleBulkSync = async (targetSnapshot: CatalogSnapshot = draft, label?: string) => {
    const active = requireActiveSession()
    if (!active) return

    setSyncing(true)
    setSaveError(null)
    try {
      const res = await bulkSyncCatalogRemote(targetSnapshot, active)
      onCatalogSaved(res.snapshot)
      setDraft(res.snapshot)
      setDirty(false)
      setRemoteEmptyHint(false)
      showToast(
        label ||
          (res.mode === 'gas'
            ? '전체 카탈로그·세트·정책이 구글 시트(bulkSyncCatalog)에 일괄 동기화되었습니다.'
            : '[로컬 프리뷰 모드] 브라우저 샌드박스에 일괄 저장되었습니다.'),
      )
    } catch (err) {
      handleAdminError(err, '일괄 동기화 중 오류가 발생했습니다.')
    } finally {
      setSyncing(false)
    }
  }

  const handleResetLocalSeed = () => {
    const initial = resetLocalSandboxCatalog()
    onCatalogSaved(initial)
    setDraft(initial)
    setDirty(false)
    showToast('로컬 프리뷰 데이터가 초기 시드 상태로 복원되었습니다.')
  }

  /* ==================== ZERO-SECRET LOGIN GATE ==================== */
  if (!hasEnteredDashboard && !session) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-5">
          <button
            type="button"
            onClick={onNavigateCustomer}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#475569] hover:text-[#0F172A] cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>고객용 시뮬레이터로 돌아가기</span>
          </button>

          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-7 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
                <Lock size={18} />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-[#0F172A] tracking-tight">
                  보안 관리자 CMS 로그인
                </h1>
                <p className="text-xs text-[#64748B]">
                  롯데하이마트 경기광주점 카탈로그 · 정책 관리
                </p>
              </div>
            </div>

            <form onSubmit={handleServerLogin} className="space-y-3.5">
              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-bold text-[#334155] mb-1.5"
                >
                  관리자 비밀번호 (서버 SHA-256 검증)
                </label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Google Apps Script에 등록된 비밀번호 입력"
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#CBD5E1] focus:border-[#0F172A] focus:outline-none text-base"
                />
              </div>

              {authError && (
                <div className="rounded-xl bg-[#FFF1F2] border border-[#FECDD3] px-3.5 py-2.5 text-xs font-bold text-[#BE123C]">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading || !gasConnected}
                className={`w-full h-11 rounded-xl text-sm font-extrabold transition-colors ${
                  gasConnected
                    ? 'bg-[#0F172A] hover:bg-[#1E293B] text-white cursor-pointer'
                    : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                }`}
              >
                {authLoading
                  ? '서버 인증 확인 중...'
                  : gasConnected
                    ? '관리자 세션 발급 및 로그인'
                    : '실서버 URL 연결 후 서버 로그인 활성화'}
              </button>
            </form>

            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 text-[11px] text-[#475569] leading-relaxed space-y-1">
              <div className="font-bold text-[#0F172A]">Zero-Secret 보안 아키텍처</div>
              <p>
                프론트엔드 코드·HTML·환경변수 어디에도 비밀번호 평문이나 해시가 존재하지 않습니다.
                인증 토큰은 <code className="font-mono">sessionStorage</code>에만 보관되며 브라우저
                탭을 닫거나 만료 시 즉시 파기됩니다.
              </p>
            </div>

            {/* Sandbox Entry: rendered ONLY when VITE_GAS_API_URL is NOT configured */}
            {!gasConnected && (
              <div className="pt-4 border-t border-[#E2E8F0] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#D97706]">[로컬 프리뷰 모드]</span>
                  <span className="text-[11px] text-[#64748B]">
                    VITE_GAS_API_URL 미설정 상태
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleEnterSandbox}
                  className="w-full h-11 rounded-xl bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FlaskConical size={15} />
                  <span>로컬 UI 샌드박스 미리보기 진입</span>
                </button>
                <p className="text-[11px] text-[#64748B] text-center">
                  실서버 URL을 연결하면 이 버튼은 화면에서 완전히 제거됩니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ==================== AUTHENTICATED CMS DASHBOARD ==================== */
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-16">
      {/* Top CMS Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onNavigateCustomer}
              className="inline-flex items-center gap-1 h-9 px-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-bold text-[#475569] cursor-pointer shrink-0"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">고객 화면</span>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-[#0F172A] truncate">
                  경기광주점 보안 CMS
                </h1>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded shrink-0 ${
                    session?.mode === 'gas'
                      ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                      : !session
                        ? 'bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3]'
                        : 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                  }`}
                >
                  {session?.mode === 'gas'
                    ? '구글 시트 실서버'
                    : !session
                      ? '세션 만료 · 재인증 필요'
                      : '[로컬 프리뷰 모드]'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {session?.mode === 'gas' && (
              <button
                type="button"
                disabled={loadingRemote || syncing}
                onClick={() => void syncFromAdminServer(session)}
                title="구글 시트에서 최신 목록 다시 불러오기"
                className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-bold text-[#475569] cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={loadingRemote ? 'animate-spin' : ''} />
                <span className="hidden md:inline">새로고침</span>
              </button>
            )}

            <button
              type="button"
              disabled={syncing}
              onClick={() => void handleBulkSync()}
              className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50 ${
                dirty
                  ? 'bg-[#E11D48] hover:bg-[#BE123C] text-white'
                  : 'bg-[#0F172A] hover:bg-[#1E293B] text-white'
              }`}
            >
              <Save size={14} />
              <span>{syncing ? '동기화 중...' : dirty ? '변경사항 일괄 동기화' : '전체 일괄 동기화'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-bold text-[#475569] cursor-pointer"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
        {/* Mandatory Write-Only Lead Architecture Security Notice Banner */}
        <div className="rounded-2xl bg-white border border-[#E2E8F0] p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] flex items-center justify-center shrink-0">
            <ShieldAlert size={18} />
          </div>
          <div className="text-xs text-[#475569] leading-relaxed">
            <div className="font-extrabold text-[#0F172A] mb-0.5">
              개인정보 유출 0% · Write-Only 보안 정책 적용 중
            </div>
            <p>
              고객 상담 신청 명단(성함·연락처)은 유출 원천 차단을 위해 이 관리자 화면에서 일체
              불러오거나 조회할 수 없습니다. 고객 상담 신청 건은 비공개 구글 시트로 단방향
              전송(POST)되며, <strong className="text-[#0F172A]">관리자 본인의 Google Drive 스프레드시트 앱</strong>
              에서만 열람할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Empty Sheet First-Time Seed Helper */}
        {remoteEmptyHint && session?.mode === 'gas' && (
          <div className="rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-[#92400E]">
              <strong className="font-extrabold block mb-0.5">
                연결된 구글 시트에 아직 등록된 상품이 없습니다
              </strong>
              현재 화면의 초기 시드 데이터(가전 10종 + 추천 세트 3종 + 기본 정책)를 구글 시트에
              한 번에 업로드하시겠습니까?
            </div>
            <button
              type="button"
              disabled={syncing}
              onClick={() =>
                void handleBulkSync(
                  INITIAL_CATALOG_SNAPSHOT,
                  '초기 시드 데이터(10종 + 3세트 + 정책)가 구글 시트에 일괄 등록되었습니다.',
                )
              }
              className="h-10 px-4 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-extrabold shrink-0 cursor-pointer"
            >
              초기 데이터 시트에 일괄 업로드
            </button>
          </div>
        )}

        {/* Save Feedback */}
        {saveToast && (
          <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-4 py-3 text-xs font-bold text-[#047857] flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{saveToast}</span>
          </div>
        )}
        {saveError && (
          <div className="rounded-xl bg-[#FFF1F2] border border-[#FECDD3] px-4 py-3 text-xs font-bold text-[#BE123C]">
            {saveError}
          </div>
        )}

        {/* 3 CMS Feature Tabs (Zero Lead-Viewing Tab!) */}
        <div
          role="tablist"
          aria-label="관리자 기능 탭"
          className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-1.5 rounded-2xl border border-[#E2E8F0]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'catalog'}
            onClick={() => setActiveTab('catalog')}
            className={`h-11 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-[#0F172A] text-white'
                : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
            }`}
          >
            <Package size={16} />
            <span>단품 카탈로그 관리 ({draft.products.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bundles'}
            onClick={() => setActiveTab('bundles')}
            className={`h-11 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'bundles'
                ? 'bg-[#0F172A] text-white'
                : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
            }`}
          >
            <Layers size={16} />
            <span>추천 세트 묶음 관리 ({draft.bundles.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'policy'}
            onClick={() => setActiveTab('policy')}
            className={`h-11 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'policy'
                ? 'bg-[#0F172A] text-white'
                : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
            }`}
          >
            <Sliders size={16} />
            <span>혜택·정책 설정 &amp; 시트 연동</span>
          </button>
        </div>

        {/* Active Tab View */}
        {activeTab === 'catalog' && (
          <CatalogManagerTab
            products={draft.products}
            busy={syncing}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {activeTab === 'bundles' && (
          <BundleManagerTab
            bundles={draft.bundles}
            products={draft.products}
            policy={draft.policy}
            busy={syncing}
            onSaveSet={handleSaveSet}
            onDeleteSet={handleDeleteSet}
            onReorderSets={handleReorderSets}
          />
        )}

        {activeTab === 'policy' && (
          <PolicySyncTab
            snapshot={draft}
            busy={syncing}
            onChangePolicy={(nextPolicy) => {
              setDraft((prev) => ({ ...prev, policy: nextPolicy }))
              setDirty(true)
            }}
            onSavePolicy={handleSavePolicy}
            onImportSnapshot={async (nextSnapshot) => {
              await handleBulkSync(
                nextSnapshot,
                '가져온 JSON 데이터가 시트에 일괄 동기화되었습니다.',
              )
            }}
            onSeedToRemote={async () => {
              await handleBulkSync(
                INITIAL_CATALOG_SNAPSHOT,
                '초기 시드 10종 + 추천 세트 3종 + 기본 정책이 시트에 일괄 동기화되었습니다.',
              )
            }}
            onResetLocalSeed={handleResetLocalSeed}
          />
        )}
      </main>

      {/* ==================== UNAUTHORIZED RE-LOGIN MODAL ==================== */}
      {reauthModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reauth-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E2E8F0] p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] flex items-center justify-center shrink-0">
                <KeyRound size={19} />
              </div>
              <div>
                <h2
                  id="reauth-modal-title"
                  className="text-base font-extrabold text-[#0F172A]"
                >
                  세션 만료 · 관리자 재로그인
                </h2>
                <p className="mt-1 text-xs text-[#475569] leading-relaxed">
                  {reauthReason ||
                    '보안 세션이 만료(UNAUTHORIZED)되어 기존 토큰이 즉시 파기되었습니다. 비밀번호를 다시 입력해 새 토큰을 발급받으세요.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleReauthSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="reauth-password"
                  className="block text-xs font-bold text-[#334155] mb-1.5"
                >
                  관리자 비밀번호
                </label>
                <input
                  id="reauth-password"
                  type="password"
                  autoFocus
                  required
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  placeholder="비밀번호 재입력"
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#CBD5E1] focus:border-[#0F172A] focus:outline-none text-base"
                />
              </div>

              {reauthError && (
                <div className="rounded-xl bg-[#FFF1F2] border border-[#FECDD3] px-3 py-2 text-xs font-bold text-[#BE123C]">
                  {reauthError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="h-11 px-4 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#475569] hover:text-[#0F172A] cursor-pointer"
                >
                  로그인 화면으로
                </button>
                <button
                  type="submit"
                  disabled={reauthLoading}
                  className="flex-1 h-11 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] disabled:bg-[#FDA4AF] text-white text-sm font-extrabold cursor-pointer"
                >
                  {reauthLoading ? '재인증 중...' : '재로그인하여 계속하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
