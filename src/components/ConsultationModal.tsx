import { useState } from 'react'
import {
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  Lock,
  MessageSquare,
  Phone,
  ShieldCheck,
  Store,
  X,
} from 'lucide-react'
import { LEGAL_DISCLOSURES } from '../data/legalNotices'
import { STORE_INFO } from '../data/storeInfo'
import { submitConsultationWriteOnly } from '../services/apiAdapter'
import type { CalculationResult, ConsultChannel, ConsultationPayload } from '../types/domain'
import { formatKRW } from '../utils/calculator'
import {
  type MarketingAttribution,
  formatAttributionTag,
  trackLeadConversion,
} from '../utils/marketingTracker'
import { sanitizePhoneNumber } from '../utils/sanitize'

interface ConsultationModalProps {
  open: boolean
  result: CalculationResult
  initialUndecided?: boolean
  selectedColorByProduct?: Record<string, string>
  attribution?: MarketingAttribution
  onClose: () => void
}

type PreferredTimeSlot = '상관없음' | '오전' | '오후' | '저녁'

const TIME_SLOTS: PreferredTimeSlot[] = ['상관없음', '오전', '오후', '저녁']

const CHANNELS: Array<{
  value: ConsultChannel
  label: string
  ctaLabel: string
  icon: typeof Store
}> = [
  {
    value: '카카오톡 상담',
    label: '카톡으로 받기',
    ctaLabel: '카톡으로 내 맞춤 견적·환급표 받기',
    icon: MessageSquare,
  },
  {
    value: '전화 상담',
    label: '전화 안내',
    ctaLabel: '전화로 맞춤 혜택 안내 받기',
    icon: Phone,
  },
  {
    value: '매장 방문',
    label: '매장 방문예약',
    ctaLabel: '경기광주점 방문 상담 예약하기',
    icon: Store,
  },
]

export function ConsultationModal({
  open,
  result,
  initialUndecided = false,
  selectedColorByProduct = {},
  attribution,
  onClose,
}: ConsultationModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [channel, setChannel] = useState<ConsultChannel>('카카오톡 상담')
  const [preferredTime, setPreferredTime] = useState<PreferredTimeSlot>('상관없음')
  const [undecidedOverride, setUndecidedOverride] = useState<boolean | null>(null)
  const undecidedModel = undecidedOverride ?? (initialUndecided || result.lines.length === 0)
  const setUndecidedModel = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === 'function' ? next(undecidedModel) : next
    setUndecidedOverride(resolved)
  }
  const [memo, setMemo] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showLegalDetail, setShowLegalDetail] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [completed, setCompleted] = useState<{
    referenceCode: string
    deliveryMode: 'gas' | 'local-preview'
    isDuplicateNotice?: boolean
  } | null>(null)

  if (!open) return null

  const hasCartItems = result.lines.length > 0
  const selectedItemsLabel = hasCartItems
    ? result.lines
        .map((l) => {
          const pickedColor = selectedColorByProduct[l.product.id]
          const colorSuffix = pickedColor ? ` [${pickedColor}]` : ''
          return `${l.product.brand} ${l.product.name}${colorSuffix} (${l.term}개월 × ${l.quantity})`
        })
        .join(', ')
    : '아직 정하지 않았어요 (상담 후 맞춤 추천 희망)'

  const itemsText = undecidedModel
    ? '아직 정하지 않았어요 (예산·평형 맞춤 모델 추천 희망)'
    : selectedItemsLabel

  const lifeCareParts = result.lifeCarePerTier
    .filter((t) => t.quantity > 0)
    .map((t) => `${t.label} ${t.quantity}구좌`)
  const lifeCareText = undecidedModel
    ? '모델 추천 후 최적 구좌 맞춤 안내 희망'
    : lifeCareParts.length > 0
      ? `${lifeCareParts.join(' + ')} (총 ${result.totalLifeCareUnits}구좌 / 카드납부 월 ${formatKRW(result.lifeCareMonthlyDues)} / 매월 현금지원 ${formatKRW(result.lifeCareMonthlyCashback)})`
      : '미선택 (0구좌)'

  const cardStatusText = result.cardAutoMetByLifeCare
    ? `제휴카드 실적 30만원 자동 충족 (월 -${formatKRW(result.cardMonthlyCashback)} / ${result.cardDurationMonths}개월)`
    : result.cardBenefitActive
      ? `제휴카드 생활비 ${formatKRW(result.cardShortfall)} 사용 기준 월 -${formatKRW(result.cardMonthlyCashback)} (${result.cardDurationMonths}개월)`
      : `제휴카드 추가실적 미사용 기준 (추천 혜택가 ${formatKRW(result.phaseA.afterLifeCareEffective)})`

  const formatPhaseSummary = (p: CalculationResult['phaseA']) =>
    p.monthlySurplusCash > 0
      ? `${p.label}: 추천혜택가 ${formatKRW(p.afterLifeCareEffective)} / 카드사용시 월 0원 + 매월 ${p.monthlySurplusCash.toLocaleString('ko-KR')}원 입금`
      : `${p.label}: 추천혜택가 ${formatKRW(p.afterLifeCareEffective)} / 카드사용시 월 ${formatKRW(p.effectiveMonthlyPay)}`

  const phaseASummary = undecidedModel
    ? '상담 후 맞춤 산출 희망'
    : formatPhaseSummary(result.phaseA)
  const phaseBSummary =
    !undecidedModel && result.phaseB ? formatPhaseSummary(result.phaseB) : null
  const activeChannelObj = CHANNELS.find((c) => c.value === channel) ?? CHANNELS[0]

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
      setErrorMsg('필수 안내 확인 및 개인정보 수집·이용에 동의해 주세요.')
      return
    }

    const attrTag = attribution ? formatAttributionTag(attribution) : ''
    const metaTags = [
      `[편한시간: ${preferredTime}]`,
      undecidedModel ? '[모델미결정·추천희망]' : '',
      attrTag ? `[유입: ${attrTag}]` : '',
    ]
      .filter(Boolean)
      .join(' ')

    const enrichedMemo = [metaTags, memo.trim()].filter(Boolean).join(' ')

    const payload: ConsultationPayload = {
      customerName: cleanName,
      customerPhone: phone,
      consultChannel: channel,
      memo: enrichedMemo,
      agreedLegalAndPrivacy: true,
      honeypot,
      summary: {
        mode: result.mode,
        itemsText,
        lifeCareText,
        cardStatusText,
        phaseASummary,
        phaseBSummary,
        maturityRefundTotal: undecidedModel ? 0 : result.lifeCareMaturityRefundTotal,
        submittedAt: new Date().toISOString(),
      },
    }

    try {
      setSubmitting(true)
      const res = await submitConsultationWriteOnly(payload)
      if (attribution) {
        trackLeadConversion({
          referenceCode: res.referenceCode,
          productIds: result.lines.map((l) => l.product.id),
          consultChannel: channel,
          undecidedModel,
          attribution,
        })
      }
      setCompleted({
        referenceCode: res.referenceCode,
        deliveryMode: res.deliveryMode,
        isDuplicateNotice: false,
      })
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : '전송 중 오류가 발생했습니다. 다시 시도해 주세요.'
      if (msg.includes('이미 상담 신청이 접수')) {
        setCompleted({
          referenceCode: '접수완료',
          deliveryMode: 'gas',
          isDuplicateNotice: true,
        })
        return
      }
      setErrorMsg(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (completed) {
      setCompleted(null)
      setName('')
      setPhone('')
      setPreferredTime('상관없음')
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
              내 맞춤 견적 · 100% 환급 일정표 받기
            </h2>
            <p className="text-xs text-muted">
              경기광주점 전담 매니저가 당월 지점 추가 혜택까지 확인해 보내드립니다
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
                  {completed.isDuplicateNotice
                    ? '상담 신청이 이미 완료되어 있습니다'
                    : '맞춤 견적표 신청이 접수되었습니다'}
                </h3>
                <p className="mt-1 text-sm text-ink-2">
                  {completed.isDuplicateNotice ? (
                    '곧 전담 매니저가 남겨주신 연락처로 안내해 드릴게요.'
                  ) : (
                    <>
                      접수번호{' '}
                      <strong className="font-mono font-bold text-ink">
                        {completed.referenceCode}
                      </strong>
                    </>
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-field border border-rule p-3.5 text-left text-xs text-ink-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink">{STORE_INFO.name} 전담 상담팀</span>
                  <span className="text-[11px] font-semibold text-positive">
                    연락 희망: {preferredTime}
                  </span>
                </div>
                <p>
                  선택하신 방식으로 월별 체감가 비교표와 120회(10년) 만기 100% 환급 일정을 보내드립니다.
                </p>
                <p className="pt-1.5 border-t border-rule text-[11px] font-medium text-ink-2 tabular-nums">
                  {STORE_INFO.address} / 직통 {STORE_INFO.phone} ({STORE_INFO.hours})
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
                <span>견적표만 먼저 받아보셔도 되며, 신청만으로 가입·결제되지 않습니다.</span>
              </div>

              {/* 1-Tap Undecided Model Option + Selected Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink">관심 가전 확인</span>
                  {hasCartItems && (
                    <button
                      type="button"
                      aria-pressed={undecidedModel}
                      onClick={() => setUndecidedModel((v) => !v)}
                      className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                        undecidedModel
                          ? 'bg-ink border-ink text-on-ink'
                          : 'bg-surface border-rule-strong text-ink-2 hover:text-ink'
                      }`}
                    >
                      {undecidedModel ? (
                        <Check size={12} strokeWidth={2.6} aria-hidden="true" />
                      ) : (
                        <HelpCircle size={12} aria-hidden="true" />
                      )}
                      <span>아직 정하지 않았어요 (추천 희망)</span>
                    </button>
                  )}
                </div>

                {undecidedModel ? (
                  <div className="rounded-lg bg-field border border-ink p-3.5 text-xs space-y-1">
                    <div className="font-bold text-ink">
                      아직 모델을 정하지 않았어요 · 상담 후 맞춤 추천 희망
                    </div>
                    <p className="text-ink-2 leading-relaxed">
                      원하시는 가전 종류(예: 냉장고, 워시타워, 로봇청소기)나 입주 시기에 맞춰 가장 혜택이 큰 모델로 추천표를 보내드립니다.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-field border border-rule p-3.5 space-y-2 text-xs tabular-nums">
                    <div className="font-bold text-ink">{selectedItemsLabel}</div>
                    <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-rule">
                      <div>
                        <span className="block text-[11px] text-muted">추천 혜택 체감가</span>
                        <strong className="text-sm font-black text-ink">
                          월 {formatKRW(result.phaseA.afterLifeCareEffective)}
                        </strong>
                      </div>
                      <div>
                        <span className="block text-[11px] text-muted">제휴카드 사용 시</span>
                        <strong className="text-sm font-black text-accent">
                          월 {formatKRW(result.phaseA.effectiveMonthlyPay)}
                          {result.phaseA.monthlySurplusCash > 0 &&
                            ` (+${result.phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원)`}
                        </strong>
                      </div>
                    </div>
                    {result.lifeCareMaturityRefundTotal > 0 && (
                      <div className="pt-1.5 border-t border-rule flex items-center justify-between text-[11px]">
                        <span className="text-ink-2 font-medium">
                          120회(10년) 만기 원금 100% 환급액
                        </span>
                        <strong className="font-bold text-positive">
                          {formatKRW(result.lifeCareMaturityRefundTotal)}
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <span className="block text-xs font-bold text-ink mb-1.5">
                  받으실 방법 선택
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

              {/* 4-Chip 1-Tap Preferred Contact Time (Absorbed from dbcom.kr) */}
              <fieldset className="space-y-1.5">
                <legend className="flex items-center gap-1 text-xs font-bold text-ink">
                  <Clock size={13} aria-hidden="true" className="text-muted" />
                  <span>연락 편한 시간</span>
                  <span className="font-normal text-muted">(선택)</span>
                </legend>
                <div className="grid grid-cols-4 gap-1.5">
                  {TIME_SLOTS.map((slot) => {
                    const isSel = preferredTime === slot
                    return (
                      <button
                        key={slot}
                        type="button"
                        aria-pressed={isSel}
                        onClick={() => setPreferredTime(slot)}
                        className={`h-11 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                          isSel
                            ? 'bg-ink border-ink text-on-ink'
                            : 'bg-field border-rule text-ink-2 hover:border-rule-strong'
                        }`}
                      >
                        {slot}
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <div>
                <label
                  htmlFor="consult-memo"
                  className="block text-xs font-bold text-ink mb-1.5"
                >
                  추가 문의사항 (선택)
                </label>
                <textarea
                  id="consult-memo"
                  rows={2}
                  maxLength={320}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="비교하고 싶은 품목이나 입주 예정일이 있다면 편하게 적어주세요"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-surface border border-rule-strong text-base text-ink resize-none"
                />
              </div>

              <div
                className={`rounded-lg border p-3.5 space-y-2 transition-colors ${
                  agreed ? 'bg-field border-ink' : 'bg-surface border-rule-strong'
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
                    <strong className="font-bold text-ink">[필수 동의]</strong> 가전 구독과 선불식 할부거래(상조) 별개 계약, 120회 만기 환급 조건·중도 해지 기준, 제휴카드 실적 조건 안내 및 상담을 위한 개인정보 수집·이용에 동의합니다.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowLegalDetail((v) => !v)}
                  className="text-[11px] font-semibold text-ink-2 underline underline-offset-2 cursor-pointer"
                >
                  {showLegalDetail ? '약관 요약 접기' : '필수 고지사항 자세히 보기'}
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

              <div className="space-y-2">
                <button
                  type="submit"
                  aria-busy={submitting}
                  className={`w-full h-12 rounded-lg text-accent-ink text-[15px] font-bold transition-colors cursor-pointer ${
                    submitting ? 'bg-accent/60' : 'bg-accent hover:bg-accent-hover'
                  }`}
                >
                  {submitting ? '안전하게 접수 중…' : activeChannelObj.ctaLabel}
                </button>

                {/* Bottom Visual Anchor Strip (Absorbed from dbcom.kr perk-strip) */}
                <div className="rounded-lg bg-ink text-on-ink px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold">
                    새 가전은 먼저 설치받고, 납입금은 10년(120회) 만기 시 100% 환급
                  </span>
                  <span className="text-[11px] text-on-ink/80 shrink-0 hidden sm:inline">
                    미이용 해지 기준
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted flex items-center justify-center gap-1">
                <Lock size={12} aria-hidden="true" />
                <span>제3자 판매 없이 경기광주점 직접 상담용으로만 안전하게 전송됩니다.</span>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
