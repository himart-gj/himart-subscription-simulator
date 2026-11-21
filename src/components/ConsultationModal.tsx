import { useState } from 'react'
import { CheckCircle2, Info, Lock, MessageSquare, Phone, ShieldCheck, Store, X } from 'lucide-react'
import { LEGAL_DISCLOSURES } from '../data/legalNotices'
import { STORE_INFO } from '../data/storeInfo'
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
  { value: '카카오톡 상담', label: '카톡으로 받기', icon: MessageSquare },
  { value: '전화 상담', label: '전화 안내', icon: Phone },
  { value: '매장 방문', label: '매장 방문예약', icon: Store },
]

export function ConsultationModal({ open, result, onClose }: ConsultationModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [channel, setChannel] = useState<ConsultChannel>('카카오톡 상담')
  const [memo, setMemo] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showLegalDetail, setShowLegalDetail] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [completed, setCompleted] = useState<{
    referenceCode: string
    deliveryMode: 'gas' | 'local-preview'
  } | null>(null)

  if (!open) return null

  const itemsText =
    result.lines.length > 0
      ? result.lines
          .map(
            (l) =>
              `${l.product.brand} ${l.product.name} (${l.term}개월 분할결제 × ${l.quantity} / 총 ${formatKRW(l.contractTotal)})`,
          )
          .join(', ')
      : '상담 시 맞춤 품목 추천 희망'

  const lifeCareParts = result.lifeCarePerTier
    .filter((t) => t.quantity > 0)
    .map((t) => `${t.label} ${t.quantity}구좌`)
  const lifeCareText =
    lifeCareParts.length > 0
      ? `${lifeCareParts.join(' + ')} (총 ${result.totalLifeCareUnits}구좌 / 제휴카드 월 납입 ${formatKRW(result.lifeCareMonthlyDues)} / 매월 현금캐시백 ${formatKRW(result.lifeCareMonthlyCashback)})`
      : '미선택 (0구좌)'

  const cardStatusText = result.cardAutoMetByLifeCare
    ? `필수 제휴카드 발급, 상조회비로 실적 30만원 자동 충족 (월 -${formatKRW(result.cardMonthlyCashback)} / ${result.cardDurationMonths}개월)`
    : result.cardBenefitActive
      ? `필수 제휴카드 발급, 생활비 ${formatKRW(result.cardShortfall)} 추가 충족 시 월 -${formatKRW(result.cardMonthlyCashback)} (${result.cardDurationMonths}개월)`
      : `필수 제휴카드 발급, 추가실적 미충족 기준 (상조 1차 체감가 ${formatKRW(result.phaseA.afterLifeCareEffective)})`

  const formatPhaseSummary = (p: CalculationResult['phaseA']) =>
    p.monthlySurplusCash > 0
      ? `${p.label}: 상조1차 ${formatKRW(p.afterLifeCareEffective)} → 카드포함 월 체감 0원 + 매월 ${p.monthlySurplusCash.toLocaleString('ko-KR')}원 현금캐시백`
      : `${p.label}: 상조1차 ${formatKRW(p.afterLifeCareEffective)} → 최종 월 체감가 ${formatKRW(p.effectiveMonthlyPay)}`

  const phaseASummary = formatPhaseSummary(result.phaseA)
  const phaseBSummary = result.phaseB ? formatPhaseSummary(result.phaseB) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setErrorMsg(null)

    const cleanName = name.trim()
    const digits = phone.replace(/\D/g, '')
    if (cleanName.length < 2) {
      setErrorMsg('성함을 2자 이상 입력해 주세요.')
      return
    }
    if (digits.length < 10) {
      setErrorMsg('올바른 휴대폰 번호를 입력해 주세요.')
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
      honeypot,
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
      setHoneypot('')
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/55 p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl bg-surface border border-rule-strong">
        <div className="sticky top-0 z-10 bg-surface px-5 py-4 border-b border-rule flex items-center justify-between gap-2">
          <div>
            <h2 id="consult-modal-title" className="text-base font-bold text-ink">
              맞춤 상세 견적 및 120회 환급 일정표 받기
            </h2>
            <p className="text-xs text-muted">
              롯데하이마트 경기광주점 전담 매니저가 당일 행사 혜택가 기준으로 안내드립니다
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="닫기"
            className="w-9 h-9 rounded-lg hover:bg-field flex items-center justify-center text-ink-2 cursor-pointer"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="p-5">
          {completed ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-positive-soft border border-positive-rule text-positive flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">
                  상세 견적 신청이 안전하게 접수되었습니다
                </h3>
                <p className="mt-1 text-sm text-ink-2">
                  접수번호{' '}
                  <strong className="font-mono font-bold text-ink">
                    {completed.referenceCode}
                  </strong>
                </p>
              </div>
              <div className="rounded-lg bg-field border border-rule p-3.5 text-left text-xs text-ink-2 space-y-1.5">
                <div className="font-bold text-ink">
                  {STORE_INFO.name} 전담 상담팀 접수 완료
                </div>
                <p>
                  선택하신 상담 방식으로 제휴카드 분할결제, 현금 캐시백, 120회 만기 환급 상세 일정표를 보내드립니다.
                </p>
                <p className="pt-1.5 border-t border-rule text-[11px] font-medium text-ink-2 tabular-nums">
                  매장 안내: {STORE_INFO.address} / 대표전화 {STORE_INFO.phone} ({STORE_INFO.hours})
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-full h-11 rounded-lg bg-ink hover:bg-ink-hover text-on-ink text-sm font-bold cursor-pointer"
              >
                화면으로 돌아가기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div
                aria-hidden="true"
                className="absolute -left-[9999px] top-auto w-px h-px overflow-hidden opacity-0 pointer-events-none"
              >
                <label htmlFor="consult-company-website">웹사이트</label>
                <input
                  id="consult-company-website"
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <div className="rounded-lg bg-positive-soft border border-positive-rule px-3.5 py-2.5 flex items-center gap-2 text-xs font-semibold text-positive">
                <ShieldCheck size={15} aria-hidden="true" className="shrink-0" />
                <span>단순 견적·환급표 발송 신청이며, 즉시 가입이나 결제가 진행되지 않습니다.</span>
              </div>

              <div className="rounded-lg bg-field border border-rule p-3.5 space-y-2 text-xs">
                <div className="font-bold text-ink">
                  자동 첨부되는 내 맞춤 시뮬레이션 내역
                </div>
                <div className="space-y-1 text-ink-2">
                  <div>
                    <span className="font-semibold text-ink">선택 가전:</span> {itemsText}
                  </div>
                  <div>
                    <span className="font-semibold text-ink">구독프리드:</span> {lifeCareText}
                  </div>
                  <div>
                    <span className="font-semibold text-ink">제휴카드:</span> {cardStatusText}
                  </div>
                  <div className="font-bold text-ink tabular-nums pt-1.5 border-t border-rule">
                    <div>{phaseASummary}</div>
                    {phaseBSummary && <div className="text-positive">{phaseBSummary}</div>}
                    {result.lifeCareMaturityRefundTotal > 0 && (
                      <div className="text-ink-2 font-medium mt-0.5">
                        120회 만기 예상 환급 원금: {formatKRW(result.lifeCareMaturityRefundTotal)}
                      </div>
                    )}
                  </div>
                </div>
                <p className="pt-1.5 border-t border-rule text-[11px] text-muted flex items-center gap-1">
                  <Info size={12} aria-hidden="true" className="shrink-0" />
                  <span>행사 일정에 따른 변동 가능 금액은 상담 시 당일 최적 혜택가로 확정 안내드립니다.</span>
                </p>
              </div>

              <div>
                <span className="block text-xs font-bold text-ink mb-1.5">
                  상세내역표 받으실 방법
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
                        className={`h-11 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          active
                            ? 'bg-ink border-ink text-on-ink'
                            : 'bg-surface border-rule text-ink-2 hover:border-rule-strong'
                        }`}
                      >
                        <Icon size={14} aria-hidden="true" />
                        <span>{ch.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="consult-name"
                    className="block text-xs font-bold text-ink mb-1.5"
                  >
                    성함 <span className="text-accent">*</span>
                  </label>
                  <input
                    id="consult-name"
                    type="text"
                    required
                    maxLength={40}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full h-11 px-3.5 rounded-lg bg-surface border border-rule-strong text-base text-ink"
                  />
                </div>

                <div>
                  <label
                    htmlFor="consult-phone"
                    className="block text-xs font-bold text-ink mb-1.5"
                  >
                    휴대폰 번호 <span className="text-accent">*</span>
                  </label>
                  <input
                    id="consult-phone"
                    type="tel"
                    inputMode="numeric"
                    required
                    maxLength={13}
                    value={phone}
                    onChange={(e) => setPhone(sanitizePhoneNumber(e.target.value))}
                    placeholder="010-0000-0000"
                    className="w-full h-11 px-3.5 rounded-lg bg-surface border border-rule-strong text-base text-ink tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="consult-memo"
                  className="block text-xs font-bold text-ink mb-1.5"
                >
                  변경 희망 모델 및 문의사항 (선택)
                </label>
                <textarea
                  id="consult-memo"
                  rows={2}
                  maxLength={400}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="다른 모델 변경 희망, 입주 예정일, 편하신 연락 시간 등을 자유롭게 적어주세요."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-surface border border-rule-strong text-base text-ink resize-none"
                />
              </div>

              <div
                className={`rounded-lg border p-3.5 space-y-2 transition-colors ${
                  agreed
                    ? 'bg-field border-ink'
                    : 'bg-surface border-rule-strong'
                }`}
              >
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    id="consult-agree-checkbox"
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => {
                      setAgreed(e.target.checked)
                      if (e.target.checked && errorMsg) setErrorMsg(null)
                    }}
                    className="mt-0.5 h-4.5 w-4.5 rounded border-rule-strong accent-ink shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-ink-2 leading-relaxed">
                    <strong className="font-bold text-ink">[필수 동의]</strong> 제휴카드 약정개월 분할결제와 선불식
                    할부거래(상조) 별개 계약, 120회 만기 환급 및 중도 해지 위약금(30%·20%·10%),
                    제휴카드 실적 기준을 확인하였으며 상담 목적의 개인정보 수집·이용에 동의합니다.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowLegalDetail((v) => !v)}
                  className="text-[11px] font-semibold text-ink-2 underline underline-offset-2 cursor-pointer"
                >
                  {showLegalDetail ? '필수 고지사항 접기' : '필수 법적 고지사항 전문 보기'}
                </button>

                {showLegalDetail && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-md bg-field border border-rule p-3 space-y-2.5 text-[11px] text-ink-2 leading-relaxed">
                    {LEGAL_DISCLOSURES.map((item) => (
                      <div key={item.id}>
                        <div className="font-bold text-ink">
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
                <div className="rounded-lg bg-accent-soft border border-accent-rule px-3.5 py-2.5 text-xs font-bold text-accent">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                aria-busy={submitting}
                className={`w-full h-12 rounded-lg text-accent-ink text-[15px] font-bold transition-colors cursor-pointer ${
                  submitting ? 'bg-accent/60' : 'bg-accent hover:bg-accent-hover'
                }`}
              >
                {submitting ? '안전하게 전송 중…' : '내 맞춤 혜택 상세내역표 신청하기'}
              </button>

              <p className="text-[11px] text-muted flex items-center justify-center gap-1">
                <Lock size={12} aria-hidden="true" />
                <span>고객 연락처는 단방향 전송되며 웹페이지에 저장·노출되지 않습니다.</span>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
