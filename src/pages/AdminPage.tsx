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
import { HeroPresetManagerTab } from '../components/admin/HeroPresetManagerTab'
import { PolicySyncTab } from '../components/admin/PolicySyncTab'
import { INITIAL_CATALOG_SNAPSHOT } from '../data/initialSeedData'
import {
  type AdminSession,
  authenticateAdminViaServer,
  bulkSyncCatalogRemote,
  clearAdminSession,
  deleteHeroPresetRemote,
  deleteProductRemote,
  deleteSetRemote,
  enterLocalSandboxAdminSession,
  fetchAdminCatalog,
  getStoredAdminSession,
  isAdminLockedOutError,
  isAdminUnauthorizedError,
  isGasConnected,
  isLocalSandboxAllowed,
  logoutAdminSession,
  resetLocalSandboxCatalog,
  saveHeroPresetRemote,
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

type AdminTab = 'hero' | 'catalog' | 'bundles' | 'policy'

export function AdminPage({
  catalog,
  onCatalogSaved,
  onNavigateCustomer,
}: AdminPageProps) {
  const gasConnected = isGasConnected()
  const sandboxAllowed = isLocalSandboxAllowed()
  const [session, setSession] = useState<AdminSession | null>(() =>
    getStoredAdminSession(),
  )

  const [password, setPassword] = useState('')
  const [unlockCode, setUnlockCode] = useState('')
  const [showUnlockField, setShowUnlockField] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const [reauthReason, setReauthReason] = useState<string | null>(null)
  const [reauthPassword, setReauthPassword] = useState('')
  const [reauthUnlockCode, setReauthUnlockCode] = useState('')
  const [reauthShowUnlock, setReauthShowUnlock] = useState(false)
  const [reauthLoading, setReauthLoading] = useState(false)
  const [reauthError, setReauthError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<AdminTab>('hero')
  const [draftOverride, setDraftOverride] = useState<CatalogSnapshot | null>(null)
  const [dirty, setDirty] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [loadingRemote, setLoadingRemote] = useState(false)
  const [remoteEmptyHint, setRemoteEmptyHint] = useState(false)
  const [saveToast, setSaveToast] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const draft = draftOverride ?? catalog
  const activeHeroPresets =
    draft.heroPresets ?? INITIAL_CATALOG_SNAPSHOT.heroPresets ?? []

  const showToast = useCallback((msg: string) => {
    setSaveToast(msg)
    window.setTimeout(() => {
      setSaveToast((cur) => (cur === msg ? null : cur))
    }, 3200)
  }, [])

  const handleAdminError = useCallback((err: unknown, fallbackMessage: string) => {
    if (isAdminUnauthorizedError(err)) {
      clearAdminSession()
      setSession(null)
      setReauthReason(
        err.message || '관리자 세션이 만료되었습니다(UNAUTHORIZED). 다시 로그인해 주세요.',
      )
      setReauthPassword('')
      setReauthUnlockCode('')
      setReauthError(null)
      return
    }
    setSaveError(err instanceof Error ? err.message : fallbackMessage)
  }, [])

  const syncFromAdminServer = useCallback(
    async (activeSession: AdminSession) => {
      if (activeSession.mode !== 'gas') return
      setLoadingRemote(true)
      setSaveError(null)
      try {
        const res = await fetchAdminCatalog(activeSession)
        setRemoteEmptyHint(res.remoteEmpty)
        if (!res.remoteEmpty) {
          setDraftOverride(res.snapshot)
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
    if (!session || session.mode !== 'gas') return
    let cancelled = false
    fetchAdminCatalog(session)
      .then((res) => {
        if (cancelled) return
        setRemoteEmptyHint(res.remoteEmpty)
        if (!res.remoteEmpty) {
          setDraftOverride(res.snapshot)
          onCatalogSaved(res.snapshot)
          setDirty(false)
        }
      })
      .catch((err) => {
        if (cancelled) return
        handleAdminError(err, '관리자 카탈로그를 불러오지 못했습니다.')
      })
    return () => {
      cancelled = true
    }
  }, [session, handleAdminError, onCatalogSaved])

  const handleServerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    try {
      setAuthLoading(true)
      const nextSession = await authenticateAdminViaServer(
        password,
        showUnlockField ? unlockCode : undefined,
      )
      setSession(nextSession)
      setReauthReason(null)
      setPassword('')
      setUnlockCode('')
      setShowUnlockField(false)
    } catch (err) {
      if (isAdminLockedOutError(err)) {
        setShowUnlockField(true)
      }
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
      const freshSession = await authenticateAdminViaServer(
        reauthPassword,
        reauthShowUnlock ? reauthUnlockCode : undefined,
      )
      setSession(freshSession)
      setReauthPassword('')
      setReauthUnlockCode('')
      setReauthShowUnlock(false)
      setReauthReason(null)
      showToast('관리자 재인증이 완료되었습니다. 작업을 계속 진행하실 수 있습니다.')
    } catch (err) {
      if (isAdminLockedOutError(err)) {
        setReauthShowUnlock(true)
      }
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
      setReauthReason(null)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '샌드박스 진입 불가')
    }
  }

  const handleLogout = async () => {
    await logoutAdminSession(session)
    setSession(null)
    setReauthReason(null)
    setDirty(false)
    setDraftOverride(null)
  }

  const requireActiveSession = (): AdminSession | null => {
    if (!session) {
      setReauthReason('관리자 세션이 필요합니다. 비밀번호를 입력해 다시 로그인해 주세요.')
      return null
    }
    return session
  }

  /* ==================== GRANULAR GAS CMS ACTIONS ==================== */

  const handleSaveHeroPreset = async (preset: RecommendedBundle, isNew: boolean) => {
    const active = requireActiveSession()
    if (!active) return

    const nextHeroPresets = isNew
      ? [...activeHeroPresets, preset]
      : activeHeroPresets.map((p) => (p.id === preset.id ? preset : p))

    setSyncing(true)
    setSaveError(null)
    try {
      const saved = await saveHeroPresetRemote(preset, active, nextHeroPresets, draft)
      const reconciled = isNew
        ? [...activeHeroPresets, saved]
        : activeHeroPresets.map((p) => (p.id === saved.id ? saved : p))
      const nextSnap: CatalogSnapshot = {
        ...draft,
        heroPresets: reconciled,
        updatedAt: new Date().toISOString(),
      }
      setDraftOverride(nextSnap)
      onCatalogSaved(nextSnap)
      setRemoteEmptyHint(false)
      showToast(
        active.mode === 'gas'
          ? `메인 원클릭 슬롯 ‘${saved.name}’이(가) 구글 시트에 저장되었습니다.`
          : `메인 원클릭 슬롯 ‘${saved.name}’이(가) 저장되었습니다.`,
      )
    } catch (err) {
      handleAdminError(err, '메인 원클릭 슬롯 저장 중 오류가 발생했습니다.')
    } finally {
      setSyncing(false)
    }
  }

  const handleDeleteHeroPreset = async (presetId: string) => {
    const active = requireActiveSession()
    if (!active) return

    const nextHeroPresets = activeHeroPresets.filter((p) => p.id !== presetId)
    setSyncing(true)
    setSaveError(null)
    try {
      await deleteHeroPresetRemote(presetId, active, nextHeroPresets, draft)
      const nextSnap: CatalogSnapshot = {
        ...draft,
        heroPresets: nextHeroPresets,
        updatedAt: new Date().toISOString(),
      }
      setDraftOverride(nextSnap)
      onCatalogSaved(nextSnap)
      showToast(
        active.mode === 'gas'
          ? '메인 원클릭 슬롯이 구글 시트에서 삭제되었습니다.'
          : '메인 원클릭 슬롯이 삭제되었습니다.',
      )
    } catch (err) {
      handleAdminError(err, '메인 원클릭 슬롯 삭제 중 오류가 발생했습니다.')
    } finally {
      setSyncing(false)
    }
  }

  const handleReorderHeroPresets = async (nextPresets: RecommendedBundle[]) => {
    const active = requireActiveSession()
    if (!active) return

    const nextSnap: CatalogSnapshot = {
      ...draft,
      heroPresets: nextPresets,
      updatedAt: new Date().toISOString(),
    }
    setDraftOverride(nextSnap)
    setSyncing(true)
    setSaveError(null)
    try {
      const res = await bulkSyncCatalogRemote(nextSnap, active)
      setDraftOverride(res.snapshot)
      onCatalogSaved(res.snapshot)
      setDirty(false)
      showToast('메인 원클릭 추천 순서가 구글 시트에 반영되었습니다.')
    } catch (err) {
      handleAdminError(err, '순서 변경 저장에 실패했습니다.')
    } finally {
      setSyncing(false)
    }
  }

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
      setDraftOverride(nextSnap)
      onCatalogSaved(nextSnap)
      setRemoteEmptyHint(false)
      showToast(
        active.mode === 'gas'
          ? `품목 ‘${saved.name}’이(가) 구글 시트에 저장되었습니다.`
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
      setDraftOverride(nextSnap)
      onCatalogSaved(nextSnap)
      showToast(
        active.mode === 'gas'
          ? '품목이 구글 시트에서 삭제되었습니다.'
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
      setDraftOverride(nextSnap)
      onCatalogSaved(nextSnap)
      setRemoteEmptyHint(false)
      showToast(
        active.mode === 'gas'
          ? `추천 세트 ‘${saved.name}’이(가) 구글 시트에 저장되었습니다.`
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
      setDraftOverride(nextSnap)
      onCatalogSaved(nextSnap)
      showToast(
        active.mode === 'gas'
          ? '추천 세트가 구글 시트에서 삭제되었습니다.'
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
    setDraftOverride(nextSnap)
    setSyncing(true)
    setSaveError(null)
    try {
      const res = await bulkSyncCatalogRemote(nextSnap, active)
      setDraftOverride(res.snapshot)
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
      setDraftOverride(nextSnap)
      onCatalogSaved(nextSnap)
      setDirty(false)
      showToast(
        active.mode === 'gas'
          ? '혜택 정책 수치가 구글 시트에 저장되었습니다.'
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
      setDraftOverride(res.snapshot)
      setDirty(false)
      setRemoteEmptyHint(false)
      showToast(
        label ||
          (res.mode === 'gas'
            ? '메인 원클릭 4종·단품·세트·정책이 구글 시트에 일괄 동기화되었습니다.'
            : '[로컬 개발 모드] 브라우저 샌드박스에 일괄 저장되었습니다.'),
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
    setDraftOverride(initial)
    setDirty(false)
    showToast('로컬 프리뷰 데이터가 초기 시드 상태로 복원되었습니다.')
  }

  /* ==================== RE-AUTH GATE ==================== */
  if (!session && reauthReason) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reauth-modal-title"
          className="w-full max-w-md rounded-2xl bg-surface border border-rule p-6  space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-soft border border-accent-rule text-accent flex items-center justify-center shrink-0">
              <KeyRound size={19} aria-hidden="true" />
            </div>
            <div>
              <h2
                id="reauth-modal-title"
                className="text-base font-extrabold text-ink"
              >
                세션 만료 · 관리자 재로그인
              </h2>
              <p className="mt-1 text-xs text-ink-2 leading-relaxed">
                {reauthReason}
              </p>
            </div>
          </div>

          <form onSubmit={handleReauthSubmit} className="space-y-3">
            <div>
              <label
                htmlFor="reauth-password"
                className="block text-xs font-bold text-ink-2 mb-1.5"
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
                className="w-full h-11 px-3.5 rounded-xl bg-surface border border-rule-strong focus:border-ink focus:outline-none text-base"
              />
            </div>

            {reauthShowUnlock && (
              <div>
                <label
                  htmlFor="reauth-unlock-code"
                  className="block text-xs font-bold text-accent mb-1.5"
                >
                  관리자 비상 잠금해제 PIN (잠금 우회용)
                </label>
                <input
                  id="reauth-unlock-code"
                  type="password"
                  autoComplete="off"
                  value={reauthUnlockCode}
                  onChange={(e) => setReauthUnlockCode(e.target.value)}
                  placeholder="비상 잠금해제 PIN 입력"
                  className="w-full h-11 px-3.5 rounded-xl bg-accent-soft/60 border border-accent-rule focus:border-accent focus:outline-none text-base"
                />
              </div>
            )}

            {reauthError && (
              <div className="rounded-xl bg-accent-soft border border-accent-rule px-3 py-2 text-xs font-bold text-accent">
                {reauthError}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="h-11 px-4 rounded-xl border border-rule text-xs font-bold text-ink-2 hover:text-ink cursor-pointer"
              >
                초기 화면으로
              </button>
              <button
                type="submit"
                disabled={reauthLoading}
                className="flex-1 h-11 rounded-xl bg-accent hover:bg-accent-hover disabled:bg-accent/60 text-on-ink text-sm font-extrabold cursor-pointer"
              >
                {reauthLoading ? '재인증 중...' : '재로그인하여 계속하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  /* ==================== ZERO-SECRET LOGIN GATE ==================== */
  if (!session) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-5">
          <button
            type="button"
            onClick={onNavigateCustomer}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-2 hover:text-ink cursor-pointer"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>고객용 시뮬레이터로 돌아가기</span>
          </button>

          <div className="rounded-2xl bg-surface border border-rule p-6 sm:p-7  space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-ink text-on-ink flex items-center justify-center shrink-0">
                <Lock size={18} aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-ink tracking-tight">
                  보안 관리자 CMS 로그인
                </h1>
                <p className="text-xs text-muted">
                  롯데하이마트 경기광주점 메인 원클릭 및 카탈로그·정책 관리
                </p>
              </div>
            </div>

            <form onSubmit={handleServerLogin} className="space-y-3.5">
              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-bold text-ink-2 mb-1.5"
                >
                  관리자 비밀번호 (서버 SHA-256 + Salt 검증)
                </label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Google Apps Script에 등록된 비밀번호 입력"
                  className="w-full h-11 px-3.5 rounded-xl bg-surface border border-rule-strong focus:border-ink focus:outline-none text-base"
                />
              </div>

              {showUnlockField && (
                <div>
                  <label
                    htmlFor="admin-unlock-code"
                    className="block text-xs font-bold text-accent mb-1.5"
                  >
                    관리자 비상 잠금해제 PIN (잠금 보호 발동 시)
                  </label>
                  <input
                    id="admin-unlock-code"
                    type="password"
                    autoComplete="off"
                    value={unlockCode}
                    onChange={(e) => setUnlockCode(e.target.value)}
                    placeholder="스크립트 속성에 등록한 비상 PIN 입력"
                    className="w-full h-11 px-3.5 rounded-xl bg-accent-soft/60 border border-accent-rule focus:border-accent focus:outline-none text-base"
                  />
                </div>
              )}

              {authError && (
                <div className="rounded-xl bg-accent-soft border border-accent-rule px-3.5 py-2.5 text-xs font-bold text-accent">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading || !gasConnected}
                className={`w-full h-11 rounded-xl text-sm font-extrabold transition-colors ${
                  gasConnected
                    ? 'bg-ink hover:bg-ink-hover text-on-ink cursor-pointer'
                    : 'bg-field-hover text-subtle cursor-not-allowed'
                }`}
              >
                {authLoading
                  ? '서버 인증 확인 중...'
                  : gasConnected
                    ? '관리자 세션 발급 및 로그인'
                    : '실서버 URL 연결 필요 (관리자 로그인 비활성)'}
              </button>

              {gasConnected && !showUnlockField && (
                <button
                  type="button"
                  onClick={() => setShowUnlockField(true)}
                  className="w-full text-center text-[11px] font-semibold text-muted hover:text-ink underline underline-offset-2 cursor-pointer"
                >
                  잠금해제 PIN 입력
                </button>
              )}
            </form>

            <div className="rounded-xl bg-paper border border-rule p-3.5 text-[11px] text-ink-2 leading-relaxed space-y-1">
              <div className="font-bold text-ink">Zero-Secret 보안 아키텍처</div>
              <p>
                프론트엔드 코드·HTML·환경변수 어디에도 비밀번호 평문이나 해시가 존재하지 않습니다.
                인증 토큰은 <code className="font-mono">sessionStorage</code>에만 보관되며 브라우저
                탭을 닫거나 만료 시 즉시 파기됩니다.
              </p>
            </div>

            {sandboxAllowed && (
              <div className="pt-4 border-t border-rule space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-caution">[로컬 개발 샌드박스]</span>
                  <span className="text-[11px] text-muted">
                    DEV 전용 (운영 빌드 완전 차단)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleEnterSandbox}
                  className="w-full h-11 rounded-xl bg-caution-soft hover:bg-caution-soft border border-caution-rule text-caution text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FlaskConical size={15} aria-hidden="true" />
                  <span>로컬 개발 UI 미리보기 진입</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ==================== AUTHENTICATED CMS DASHBOARD ==================== */
  return (
    <div className="min-h-screen bg-paper text-ink pb-16">
      {/* Top CMS Bar */}
      <header className="sticky top-0 z-30 bg-surface border-b border-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onNavigateCustomer}
              className="inline-flex items-center gap-1 h-9 px-2.5 rounded-xl bg-paper hover:bg-field border border-rule text-xs font-bold text-ink-2 cursor-pointer shrink-0"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span className="hidden sm:inline">고객 화면</span>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-ink truncate">
                  경기광주점 보안 CMS
                </h1>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded shrink-0 ${
                    session.mode === 'gas'
                      ? 'bg-positive-soft text-positive border border-positive-rule'
                      : 'bg-caution-soft text-caution border border-caution-rule'
                  }`}
                >
                  {session.mode === 'gas' ? '구글 시트 실서버' : '[로컬 개발 모드]'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {session.mode === 'gas' && (
              <button
                type="button"
                disabled={loadingRemote || syncing}
                onClick={() => void syncFromAdminServer(session)}
                title="구글 시트에서 최신 목록 다시 불러오기"
                className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-rule bg-surface hover:bg-paper text-xs font-bold text-ink-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} aria-hidden="true" className={loadingRemote ? 'animate-spin' : ''} />
                <span className="hidden md:inline">새로고침</span>
              </button>
            )}

            <button
              type="button"
              disabled={syncing}
              onClick={() => void handleBulkSync()}
              className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer disabled:opacity-50 ${
                dirty
                  ? 'bg-accent hover:bg-accent-hover text-on-ink'
                  : 'bg-ink hover:bg-ink-hover text-on-ink'
              }`}
            >
              <Save size={14} aria-hidden="true" />
              <span>{syncing ? '동기화 중...' : dirty ? '변경사항 일괄 동기화' : '전체 일괄 동기화'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-rule bg-surface hover:bg-paper text-xs font-bold text-ink-2 cursor-pointer"
            >
              <LogOut size={14} aria-hidden="true" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
        {/* Mandatory Write-Only Lead Architecture Security Notice Banner */}
        <div className="rounded-2xl bg-surface border border-rule p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-positive-soft border border-positive-rule text-positive flex items-center justify-center shrink-0">
            <ShieldAlert size={18} aria-hidden="true" />
          </div>
          <div className="text-xs text-ink-2 leading-relaxed">
            <div className="font-extrabold text-ink mb-0.5">
              개인정보 유출 0% · Write-Only 보안 정책 &amp; 월별 가격 자동 계산 연동 중
            </div>
            <p>
              매월 행사 일정에 맞춰 단품 가격·세트·메인 원클릭 4종을 수정하시면 고객 화면의{' '}
              <strong className="text-ink">추천상품 자동맞춤 결합 + 제휴카드 혜택 계산식</strong>에 즉시 자동 반영됩니다. 상담 신청 시 선택한 안내 방식(‘카톡·문자’ / ‘전화 상담’ / ‘매장 방문’)과 신청 화면 경로는 시트 구조 변경 없이 비공개 `Leads` 시트에 자동 기록됩니다.
            </p>
          </div>
        </div>

        {/* Empty Sheet First-Time Seed Helper */}
        {remoteEmptyHint && session.mode === 'gas' && (
          <div className="rounded-2xl bg-caution-soft border border-caution-rule p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-caution">
              <strong className="font-extrabold block mb-0.5">
                연결된 구글 시트에 아직 등록된 상품이 없습니다
              </strong>
              현재 화면의 초기 시드 데이터(메인 원클릭 4종 + 가전 10종 + 추천 세트 3종 + 기본 정책)를 구글 시트에
              한 번에 업로드하시겠습니까?
            </div>
            <button
              type="button"
              disabled={syncing}
              onClick={() =>
                void handleBulkSync(
                  INITIAL_CATALOG_SNAPSHOT,
                  '초기 시드 데이터(원클릭 4종 + 10종 + 3세트 + 정책)가 구글 시트에 일괄 등록되었습니다.',
                )
              }
              className="h-10 px-4 rounded-xl bg-caution hover:opacity-90 text-on-ink text-xs font-extrabold shrink-0 cursor-pointer"
            >
              초기 데이터 시트에 일괄 업로드
            </button>
          </div>
        )}

        {/* Save Feedback */}
        {saveToast && (
          <div className="rounded-xl bg-positive-soft border border-positive-rule px-4 py-3 text-xs font-bold text-positive flex items-center gap-2">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{saveToast}</span>
          </div>
        )}
        {saveError && (
          <div className="rounded-xl bg-accent-soft border border-accent-rule px-4 py-3 text-xs font-bold text-accent">
            {saveError}
          </div>
        )}

        {/* 4 CMS Feature Tabs */}
        <div
          role="tablist"
          aria-label="관리자 기능 탭"
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-surface p-1.5 rounded-2xl border border-rule"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'hero'}
            onClick={() => setActiveTab('hero')}
            className={`h-11 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'hero'
                ? 'bg-accent text-on-ink'
                : 'text-ink-2 hover:text-ink hover:bg-paper'
            }`}
          >
            <span>메인 원클릭 4종 ({activeHeroPresets.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'catalog'}
            onClick={() => setActiveTab('catalog')}
            className={`h-11 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-ink text-on-ink'
                : 'text-ink-2 hover:text-ink hover:bg-paper'
            }`}
          >
            <Package size={15} aria-hidden="true" />
            <span>단품 카탈로그 ({draft.products.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bundles'}
            onClick={() => setActiveTab('bundles')}
            className={`h-11 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'bundles'
                ? 'bg-ink text-on-ink'
                : 'text-ink-2 hover:text-ink hover:bg-paper'
            }`}
          >
            <Layers size={15} aria-hidden="true" />
            <span>추천 세트 묶음 ({draft.bundles.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'policy'}
            onClick={() => setActiveTab('policy')}
            className={`h-11 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'policy'
                ? 'bg-ink text-on-ink'
                : 'text-ink-2 hover:text-ink hover:bg-paper'
            }`}
          >
            <Sliders size={15} aria-hidden="true" />
            <span>혜택·정책 &amp; 시트연동</span>
          </button>
        </div>

        {/* Active Tab View */}
        {activeTab === 'hero' && (
          <HeroPresetManagerTab
            heroPresets={activeHeroPresets}
            products={draft.products}
            policy={draft.policy}
            busy={syncing}
            onSaveHeroPreset={handleSaveHeroPreset}
            onDeleteHeroPreset={handleDeleteHeroPreset}
            onReorderHeroPresets={handleReorderHeroPresets}
          />
        )}

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
              setDraftOverride({ ...draft, policy: nextPolicy })
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
                '초기 시드(메인 원클릭 4종 + 가전 10종 + 추천 세트 3종 + 정책)가 시트에 동기화되었습니다.',
              )
            }}
            onResetLocalSeed={handleResetLocalSeed}
          />
        )}
      </main>
    </div>
  )
}
