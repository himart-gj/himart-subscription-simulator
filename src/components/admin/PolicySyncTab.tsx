import { useState } from 'react'
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Copy,
  Download,
  RotateCcw,
  Save,
  Upload,
} from 'lucide-react'
import type { CatalogSnapshot, PolicyConfig } from '../../types/domain'
import { isGasConnected } from '../../services/apiAdapter'
import { DEFAULT_POLICY_CONFIG } from '../../utils/calculator'

interface PolicySyncTabProps {
  snapshot: CatalogSnapshot
  busy?: boolean
  onChangePolicy: (next: PolicyConfig) => void
  onSavePolicy: (policy: PolicyConfig) => Promise<void> | void
  onImportSnapshot: (next: CatalogSnapshot) => Promise<void> | void
  onSeedToRemote: () => Promise<void> | void
  onResetLocalSeed: () => void
}

export function PolicySyncTab({
  snapshot,
  busy = false,
  onChangePolicy,
  onSavePolicy,
  onImportSnapshot,
  onSeedToRemote,
  onResetLocalSeed,
}: PolicySyncTabProps) {
  const { policy } = snapshot
  const gasConnected = isGasConnected()

  const [importText, setImportText] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const updateNum = (field: keyof PolicyConfig, raw: string) => {
    const val = Math.max(0, Math.round(Number(raw) || 0))
    onChangePolicy({ ...policy, [field]: val })
  }

  const updateTier = (
    group: 'lifeCareCashback36' | 'lifeCareCashback60' | 'lifeCareUnitMonthlyDues',
    tier: 'u40' | 'u50' | 'u60',
    raw: string,
  ) => {
    const val = Math.max(0, Math.round(Number(raw) || 0))
    onChangePolicy({
      ...policy,
      [group]: {
        ...policy[group],
        [tier]: val,
      },
    })
  }

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
      setStatusMessage('카탈로그·정책 JSON이 클립보드에 복사되었습니다.')
      setErrorMessage(null)
    } catch {
      setErrorMessage('클립보드 복사에 실패했습니다. JSON 다운로드 버튼을 이용해 주세요.')
    }
  }

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `himart-gj-catalog-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatusMessage('구글 시트 연동용 JSON 파일을 다운로드했습니다.')
    setErrorMessage(null)
  }

  const handleImportJson = async () => {
    setErrorMessage(null)
    setStatusMessage(null)
    try {
      const parsed = JSON.parse(importText) as Partial<CatalogSnapshot>
      if (!Array.isArray(parsed.products) || !Array.isArray(parsed.bundles) || !parsed.policy) {
        throw new Error('products, bundles, policy 필드가 모두 포함된 올바른 JSON이 아닙니다.')
      }
      await onImportSnapshot({
        products: parsed.products,
        bundles: parsed.bundles,
        policy: { ...DEFAULT_POLICY_CONFIG, ...parsed.policy },
        updatedAt: new Date().toISOString(),
      })
      setImportText('')
      setStatusMessage('JSON 데이터를 가져와 일괄 동기화(bulkSyncCatalog)했습니다.')
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'JSON 파싱에 실패했습니다.',
      )
    }
  }

  return (
    <div className="space-y-5">
      {/* API Connection Status */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              gasConnected
                ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                : 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
            }`}
          >
            {gasConnected ? <Cloud size={20} /> : <CloudOff size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-[#0F172A]">
                Google Apps Script (구글 시트) 연동 상태
              </h3>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  gasConnected
                    ? 'bg-[#ECFDF5] text-[#047857]'
                    : 'bg-[#FFFBEB] text-[#B45309]'
                }`}
              >
                {gasConnected ? '실서버 연동 활성' : '[로컬 프리뷰 모드]'}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
              {gasConnected
                ? '배포된 GAS 웹앱 URL이 연결되었습니다. 모든 POST 요청은 CORS 프리플라이트 방지(text/plain;charset=utf-8) 규약으로 전송됩니다.'
                : '환경변수 VITE_GAS_API_URL을 연결하면 별도 코드 수정 없이 즉시 구글 시트 실서버 모드로 전환됩니다.'}
            </p>
          </div>
        </div>

        {gasConnected && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onSeedToRemote()}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 text-white text-xs font-extrabold shrink-0 cursor-pointer"
          >
            <Upload size={14} />
            <span>초기 시드 10종 시트에 일괄 동기화</span>
          </button>
        )}
      </div>

      {/* PolicyConfig Form */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-[#0F172A]">
              구독프리드 · 클래스카드 혜택 정책 수치
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              프로모션 단가 변경 시 코드 배포 없이 여기서 즉시 수정·저장(`savePolicy`)할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={busy}
              onClick={() => onChangePolicy(DEFAULT_POLICY_CONFIG)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-bold text-[#475569] cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>기본값 복원</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSavePolicy(policy)}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] disabled:opacity-50 text-white text-xs font-extrabold cursor-pointer"
            >
              <Save size={13} />
              <span>정책 즉시 저장</span>
            </button>
          </div>
        </div>

        {/* LifeCare 36m & 60m cashback */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-3">
            <h4 className="text-xs font-extrabold text-[#0F172A]">
              구독프리드 36개월 기준 구좌당 월 캐시백 (원)
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {(['u40', 'u50', 'u60'] as const).map((tier, idx) => (
                <div key={tier}>
                  <label className="block text-[11px] font-bold text-[#64748B] mb-1">
                    {[4, 5, 6][idx]}만 원권
                  </label>
                  <input
                    type="number"
                    step={1000}
                    value={policy.lifeCareCashback36[tier]}
                    onChange={(e) => updateTier('lifeCareCashback36', tier, e.target.value)}
                    className="w-full h-10 px-2.5 rounded-lg bg-white border border-[#CBD5E1] text-base font-bold tabular-nums"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-3">
            <h4 className="text-xs font-extrabold text-[#0F172A]">
              구독프리드 60개월 기준 구좌당 월 캐시백 (원)
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {(['u40', 'u50', 'u60'] as const).map((tier, idx) => (
                <div key={tier}>
                  <label className="block text-[11px] font-bold text-[#64748B] mb-1">
                    {[4, 5, 6][idx]}만 원권
                  </label>
                  <input
                    type="number"
                    step={1000}
                    value={policy.lifeCareCashback60[tier]}
                    onChange={(e) => updateTier('lifeCareCashback60', tier, e.target.value)}
                    className="w-full h-10 px-2.5 rounded-lg bg-white border border-[#CBD5E1] text-base font-bold tabular-nums"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Units & Maturity schedule & Card */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#475569] mb-1">
              최대 가입 구좌
            </label>
            <input
              type="number"
              min={1}
              max={24}
              value={policy.maxLifeCareUnits}
              onChange={(e) => updateNum('maxLifeCareUnits', e.target.value)}
              className="w-full h-10 px-2.5 rounded-lg border border-[#CBD5E1] text-base font-bold tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#475569] mb-1">
              실제 납입 회차
            </label>
            <input
              type="number"
              value={policy.lifeCarePayMonths}
              onChange={(e) => updateNum('lifeCarePayMonths', e.target.value)}
              className="w-full h-10 px-2.5 rounded-lg border border-[#CBD5E1] text-base font-bold tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#475569] mb-1">
              거치 회차 (0원)
            </label>
            <input
              type="number"
              value={policy.lifeCareDeferMonths}
              onChange={(e) => updateNum('lifeCareDeferMonths', e.target.value)}
              className="w-full h-10 px-2.5 rounded-lg border border-[#CBD5E1] text-base font-bold tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#475569] mb-1">
              만기 회차
            </label>
            <input
              type="number"
              value={policy.lifeCareMaturityMonths}
              onChange={(e) => updateNum('lifeCareMaturityMonths', e.target.value)}
              className="w-full h-10 px-2.5 rounded-lg border border-[#CBD5E1] text-base font-bold tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#475569] mb-1">
              카드 실적 기준 (원)
            </label>
            <input
              type="number"
              step={10000}
              value={policy.cardMinSpend}
              onChange={(e) => updateNum('cardMinSpend', e.target.value)}
              className="w-full h-10 px-2.5 rounded-lg border border-[#CBD5E1] text-base font-bold tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#475569] mb-1">
              카드 월 입금액 (원)
            </label>
            <input
              type="number"
              step={1000}
              value={policy.cardMonthlyCashback}
              onChange={(e) => updateNum('cardMonthlyCashback', e.target.value)}
              className="w-full h-10 px-2.5 rounded-lg border border-[#CBD5E1] text-base font-bold tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* JSON Export / Import for Google Sheets */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-[#0F172A]">
              구글 시트 연동용 JSON 내보내기 / 가져오기
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              백업용 JSON 파일을 내보내거나 다른 기기에서 구성한 카탈로그를 한 번에 가져옵니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-bold text-[#0F172A] cursor-pointer"
            >
              <Copy size={14} />
              <span>JSON 복사</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold cursor-pointer"
            >
              <Download size={14} />
              <span>JSON 다운로드</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <textarea
            rows={4}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='여기에 백업 JSON 전체를 붙여넣고 [JSON 가져오기]를 클릭하세요...'
            className="w-full p-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] font-mono text-base"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              disabled={!importText.trim()}
              onClick={handleImportJson}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#0F172A] disabled:bg-[#CBD5E1] text-white text-xs font-extrabold cursor-pointer disabled:cursor-not-allowed"
            >
              <Upload size={14} />
              <span>JSON 가져오기</span>
            </button>

            {!gasConnected && (
              <button
                type="button"
                onClick={onResetLocalSeed}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-[#FECDD3] bg-[#FFF1F2] text-[#BE123C] text-xs font-bold cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>로컬 시드 데이터 초기화</span>
              </button>
            )}
          </div>
        </div>

        {statusMessage && (
          <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-3.5 py-2.5 text-xs font-bold text-[#047857] flex items-center gap-1.5">
            <CheckCircle2 size={15} />
            <span>{statusMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl bg-[#FFF1F2] border border-[#FECDD3] px-3.5 py-2.5 text-xs font-bold text-[#BE123C]">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  )
}
