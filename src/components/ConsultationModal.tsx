import { useState } from 'react'
import { CheckCircle2, Lock, MessageSquare, Phone, Store, X } from 'lucide-react'
import { LEGAL_DISCLOSURES } from '../data/legalNotices'
import { submitConsultationWriteOnly } from '../services/apiAdapter'
import type { CalculationResult, ConsultChannel, ConsultationPayload } from '../types/domain'
import { formatKRW } from '../utils/calculator'
import { sanitizePhoneNumber } from '../utils/sanitize'

interface ConsultationModalProps {
  open: boolean
  result: CalculationResult
  onClose: () => void
}

const CHANNELS: Array<{ value: ConsultChannel; label: string; icon: typeof Store }> = [
  { value: '매장 방문', label: '매장 방문', icon: Store },
  { value: '전화 상담', label: '전화 상담', icon: Phone },
  { value: '카카오톡 상담', label: '카카오톡', icon: MessageSquare },
]

export function ConsultationModal({ open, result, onClose }: ConsultationModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [channel, setChannel] = useState<ConsultChannel>('매장 방문')
  const [memo, setMemo] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showLegalDetail, setShowLegalDetail] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [completed, setCompleted] = useState<{
    referenceCode: string
    deliveryMode: 'gas' | 'local-preview'
  } | null>(null)

  if (!open) return null

  const itemsText = result.lines
    .map((l) => `${l.product.brand} ${l.product.name} (${l.term}개월 × ${l.quantity})`)
    .join(', ')

  const lifeCareParts = result.lifeCarePerTier
    .filter((t) => t.quantity > 0)
    .map((t) => `${t.label} ${t.quantity}구좌`)
  const lifeCareText =
    lifeCareParts.length > 0
      ? `${lifeCareParts.join(' + ')} (총 ${result.totalLifeCareUnits}구좌 / 월 회비 ${formatKRW(result.lifeCareMonthlyDues)} / 월 캐시백 ${formatKRW(result.lifeCareMonthlyCashback)})`
      : '미선택 (0구좌)'

  const cardStatusText = !result.cardEnabled
    ? '제휴카드 미발급'
    : result.cardAutoMetByLifeCare
      ? `실적 30만원 자동 충족 (월 ${formatKRW(result.cardMonthlyCashback)} / ${result.cardDurationMonths}개월)`
      : result.cardBenefitActive
        ? `생활비 ${formatKRW(result.cardShortfall)} 추가 충족 시 월 ${formatKRW(result.cardMonthlyCashback)} (${result.cardDurationMonths}개월)`
        : `실적 ${formatKRW(result.cardShortfall)} 미달 (미반영)`

  const formatPhaseSummary = (p: CalculationResult['phaseA']) =>
    p.monthlySurplusCash > 0
      ? `${p.label}: 구독료 0원 + 매월 +${p.monthlySurplusCash.toLocaleString('ko-KR')}원 현금 잉여`
      : `${p.label}: 월 실질 체감 ${formatKRW(p.effectiveMonthlyPay)} (청구 ${formatKRW(p.grossSubscription)} - 혜택 ${formatKRW(p.totalMonthlyBenefit)})`

  const phaseASummary = formatPhaseSummary(result.phaseA)
  const phaseBSummary = result.phaseB ? formatPhaseSummary(result.phaseB) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const cleanName = name.trim()
    const digits = phone.replace(/\D/g, '')
    if (cleanName.length < 2) {
      setErrorMsg('성함을 2자 이상 입력해 주세요.')
      return
    }
    if (digits.length < 10) {
      setErrorMsg('올바른 연락처를 입력해 주세요.')
      return
    }
    if (!agreed) {
      setErrorMsg('필수 법적 고지사항 및 개인정보 수집·이용에 동의해 주세요.')
      return
    }

    const payload: ConsultationPayload = {
      customerName: cleanName,
      customerPhone: phone,
      consultChannel: channel,
      memo,
      agreedLegalAndPrivacy: true,
      summary: {
        mode: result.mode,
        itemsText,
        lifeCareText,
        cardStatusText,
        phaseASummary,
        phaseBSummary,
        maturityRefundTotal: result.lifeCareMaturityRefundTotal,
        submittedAt: new Date().toISOString(),
      },
    }

    try {
      setSubmitting(true)
      const res = await submitConsultationWriteOnly(payload)
      setCompleted({
        referenceCode: res.referenceCode,
        deliveryMode: res.deliveryMode,
      })
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : '전송 중 오류가 발생했습니다. 다시 시도해 주세요.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (completed) {
      setCompleted(null)
      setName('')
      setPhone('')
      setMemo('')
      setAgreed(false)
    }
    setErrorMsg(null)
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consult-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0F172A]/50 p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white border border-[#E2E8F0] shadow-xl">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-white px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
          <div>
            <h2 id="consult-modal-title" className="text-base font-extrabold text-[#0F172A]">
              맞춤 견적 저장 · 1:1 상담 예약
            </h2>
            <p className="text-xs text-[#64748B]">
              롯데하이마트 경기광주점 전담 매니저가 설계 내역 그대로 안내드립니다
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="닫기"
            className="w-9 h-9 rounded-xl hover:bg-[#F1F5F9] flex items-center justify-center text-[#475569] cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {completed ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#0F172A]">
                  상담 예약이 안전하게 접수되었습니다
                </h3>
                <p className="mt-1 text-sm text-[#475569]">
                  접수번호{' '}
                  <strong className="font-mono font-bold text-[#0F172A]">
                    {completed.referenceCode}
                  </strong>
                </p>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 text-left text-xs text-[#475569] space-y-1">
                <div className="font-bold text-[#0F172A]">보안 단방향 전송 완료</div>
                <p>
                  {completed.deliveryMode === 'local-preview'
                    ? '현재 [로컬 프리뷰 모드]로 동작 중이며 개인정보는 브라우저에 저장되지 않습니다. 실서버 URL(VITE_GAS_API_URL) 연결 시 지점 비공개 구글 시트로 즉시 단방향 전송됩니다.'
                    : '입력하신 연락처와 견적 내역은 지점 비공개 구글 시트로 단방향 전송되었으며 웹 브라우저에는 남지 않습니다.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-full h-11 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-bold cursor-pointer"
              >
                시뮬레이터로 돌아가기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Auto-attached Simulation Summary */}
              <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 space-y-2 text-xs">
                <div className="font-extrabold text-[#0F172A]">
                  자동 첨부되는 내 시뮬레이션 내역
                </div>
                <div className="space-y-1 text-[#475569]">
                  <div>
                    <span className="font-semibold text-[#334155]">선택 가전:</span> {itemsText}
                  </div>
                  <div>
                    <span className="font-semibold text-[#334155]">구독프리드:</span> {lifeCareText}
                  </div>
                  <div>
                    <span className="font-semibold text-[#334155]">제휴카드:</span> {cardStatusText}
                  </div>
                  <div className="font-bold text-[#0F172A] tabular-nums pt-1 border-t border-[#E2E8F0]">
                    <div>{phaseASummary}</div>
                    {phaseBSummary && <div className="text-[#059669]">{phaseBSummary}</div>}
                    {result.lifeCareMaturityRefundTotal > 0 && (
                      <div className="text-[#475569] font-semibold mt-0.5">
                        120회 만기 예상 환급 원금: {formatKRW(result.lifeCareMaturityRefundTotal)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Inputs (min 16px to prevent iOS auto-zoom) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="consult-name"
                    className="block text-xs font-bold text-[#334155] mb-1.5"
                  >
                    성함 <span className="text-[#E11D48]">*</span>
                  </label>
                  <input
                    id="consult-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#CBD5E1] focus:border-[#0F172A] focus:outline-none text-base text-[#0F172A]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="consult-phone"
                    className="block text-xs font-bold text-[#334155] mb-1.5"
                  >
                    연락처 <span className="text-[#E11D48]">*</span>
                  </label>
                  <input
                    id="consult-phone"
                    type="tel"
                    inputMode="numeric"
                    required
                    value={phone}
                    onChange={(e) => setPhone(sanitizePhoneNumber(e.target.value))}
                    placeholder="010-0000-0000"
                    className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#CBD5E1] focus:border-[#0F172A] focus:outline-none text-base text-[#0F172A] tabular-nums"
                  />
                </div>
              </div>

              {/* Channel Selector */}
              <div>
                <span className="block text-xs font-bold text-[#334155] mb-1.5">
                  희망 상담 방식
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {CHANNELS.map((ch) => {
                    const Icon = ch.icon
                    const active = channel === ch.value
                    return (
                      <button
                        key={ch.value}
                        type="button"
                        onClick={() => setChannel(ch.value)}
                        className={`h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#0F172A] border-[#0F172A] text-white'
                            : 'bg-white border-[#E2E8F0] text-[#475569] hover:border-[#CBD5E1]'
                        }`}
                      >
                        <Icon size={14} />
                        <span>{ch.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Optional Memo */}
              <div>
                <label
                  htmlFor="consult-memo"
                  className="block text-xs font-bold text-[#334155] mb-1.5"
                >
                  추가 문의사항 (선택)
                </label>
                <textarea
                  id="consult-memo"
                  rows={2}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="입주 예정일, 희망 방문 시간, 설치 환경 등을 자유롭게 남겨주세요."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] focus:border-[#0F172A] focus:outline-none text-base text-[#0F172A] resize-none"
                />
              </div>

              {/* Required Legal & Privacy Agreement */}
              <div className="rounded-xl border border-[#E2E8F0] p-3 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] accent-[#E11D48] shrink-0"
                  />
                  <span className="text-xs text-[#334155] leading-relaxed">
                    <strong className="font-bold text-[#0F172A]">[필수]</strong> 가전 구독·선불식
                    할부거래(상조) 별개 계약, 120회 만기 환급 및 중도 해지 위약금(30%·20%·10%),
                    제휴카드 실적 기준을 확인하였으며 상담 목적의 개인정보 수집·이용에 동의합니다.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowLegalDetail((v) => !v)}
                  className="text-[11px] font-bold text-[#475569] underline underline-offset-2 cursor-pointer"
                >
                  {showLegalDetail ? '필수 고지사항 접기' : '필수 법적 고지사항 전문 보기'}
                </button>

                {showLegalDetail && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3 space-y-2.5 text-[11px] text-[#475569] leading-relaxed">
                    {LEGAL_DISCLOSURES.map((item) => (
                      <div key={item.id}>
                        <div className="font-bold text-[#0F172A]">
                          {item.number}. {item.title}
                        </div>
                        {item.paragraphs.map((p, idx) => (
                          <p key={idx} className="mt-0.5">
                            {p}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-[#FFF1F2] border border-[#FECDD3] px-3.5 py-2.5 text-xs font-bold text-[#BE123C]">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] disabled:bg-[#FDA4AF] text-white text-[15px] font-extrabold transition-all active:scale-[0.98] cursor-pointer"
              >
                {submitting ? '안전하게 전송 중...' : '맞춤 견적 상담 신청하기'}
              </button>

              <p className="text-[11px] text-[#64748B] flex items-center justify-center gap-1">
                <Lock size={12} />
                <span>고객 연락처는 단방향 전송되며 웹페이지에 저장·노출되지 않습니다.</span>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
