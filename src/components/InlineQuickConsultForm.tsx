import { useMemo, useRef, useState } from 'react'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Lock,
  MessageSquare,
  Phone,
  Plus,
  ShieldCheck,
  Store,
  X,
} from 'lucide-react'
import { LEGAL_DISCLOSURES } from '../data/legalNotices'
import { STORE_INFO } from '../data/storeInfo'
import { submitConsultationWriteOnly } from '../services/apiAdapter'
import type {
  CartItem,
  ConsultChannel,
  ConsultationPayload,
  PolicyConfig,
  ProductItem,
  SubscriptionTerm,
} from '../types/domain'
import {
  calculateBenefitSimulation,
  formatKRW,
  recommendZeroCostLifeCare,
} from '../utils/calculator'
import {
  type MarketingAttribution,
  formatAttributionTag,
  trackInitiateConsult,
  trackLeadConversion,
} from '../utils/marketingTracker'
import { sanitizePhoneNumber } from '../utils/sanitize'

interface InlineQuickConsultFormProps {
  selectedCart: CartItem[]
  products: ProductItem[]
  policy: PolicyConfig
  attribution?: MarketingAttribution
  onRemoveSelectedItem: (productId: string, term: SubscriptionTerm) => void
  onClearSelectedItems: () => void
  onScrollToProducts: () => void
}

type PreferredTimeSlot = '상관없음' | '오전' | '오후' | '저녁'

const TIME_SLOTS: PreferredTimeSlot[] = ['상관없음', '오전', '오후', '저녁']

const QUICK_INTEREST_CHIPS = [
  '로봇·무선청소기',
  '냉장·김치냉장고',
  '세탁·건조기',
  '에어컨·TV',
  '정수기·주방가전',
  '입주·신혼 패키지',
  '맞춤 추천 희망',
] as const

const CHANNELS: Array<{
  value: ConsultChannel
  label: string
  badge?: string
  ctaLabel: string
  icon: typeof Store
}> = [
  {
    value: '카톡·문자',
    label: '카톡·문자',
    badge: '선호 1위',
    ctaLabel: '카톡·문자로 내 맞춤 견적표 무료 받기',
    icon: MessageSquare,
  },
  {
    value: '전화 상담',
    label: '전화 상담',
    ctaLabel: '전화로 내 맞춤 혜택 안내 받기',
    icon: Phone,
  },
  {
    value: '매장 방문',
    label: '방문 예약',
    ctaLabel: '경기광주점 방문 상담 예약하기',
    icon: Store,
  },
]

export function InlineQuickConsultForm({
  selectedCart,
  products,
  policy,
  attribution,
  onRemoveSelectedItem,
  onClearSelectedItems,
  onScrollToProducts,
}: InlineQuickConsultFormProps) {
  const [interestTags, setInterestTags] = useState<string[]>(['맞춤 추천 희망'])
  const [channel, setChannel] = useState<ConsultChannel>('카톡·문자')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [showOptional, setShowOptional] = useState(false)
  const [preferredTime, setPreferredTime] = useState<PreferredTimeSlot>('상관없음')
  const [memo, setMemo] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showLegalDetail, setShowLegalDetail] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    phone?: string
    agree?: string
    form?: string
  }>({})
  const [completed, setCompleted] = useState<{
    referenceCode: string
    isDuplicateNotice?: boolean
  } | null>(null)

  const trackedEngageRef = useRef(false)

  const simResult = useMemo(() => {
    const recUnits = recommendZeroCostLifeCare({
      cart: selectedCart,
      products,
      policy,
    })
    return calculateBenefitSimulation({
      cart: selectedCart,
      products,
      lifeCare: recUnits,
      cardEnabled: true,
      coverShortfallWithLivingSpend: true,
      policy,
    })
  }, [selectedCart, products, policy])

  const hasSelectedModels = simResult.lines.length > 0

  const fireInitiateOnce = () => {
    if (trackedEngageRef.current) return
    trackedEngageRef.current = true
    trackInitiateConsult({
      source: '메타광고 인라인 견적폼',
      productIds: simResult.lines.map((l) => l.product.id),
      undecidedModel: !hasSelectedModels,
    })
  }

  const handleToggleInterest = (tag: string) => {
    fireInitiateOnce()
    setInterestTags((prev) => {
      if (tag === '맞춤 추천 희망') {
        return ['맞춤 추천 희망']
      }
      const withoutDefault = prev.filter((t) => t !== '맞춤 추천 희망')
      if (withoutDefault.includes(tag)) {
        const next = withoutDefault.filter((t) => t !== tag)
        return next.length > 0 ? next : ['맞춤 추천 희망']
      }
      return [...withoutDefault, tag]
    })
  }

  const activeChannelObj = CHANNELS.find((c) => c.value === channel) ?? CHANNELS[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    fireInitiateOnce()

    const cleanName = name.trim()
    const digits = phone.replace(/\D/g, '')
    const nextErrors: {
      name?: string
      phone?: string
      agree?: string
    } = {}

    if (cleanName.length < 2) {
      nextErrors.name = '성함을 2자 이상 입력해 주세요.'
    }
    if (digits.length < 10) {
      nextErrors.phone = '휴대폰 번호 10~11자리를 정확히 입력해 주세요.'
    }
    if (!agreed) {
      nextErrors.agree = '필수 안내 확인 및 개인정보 수집·이용에 동의해 주세요.'
    }

    if (nextErrors.name || nextErrors.phone || nextErrors.agree) {
      setFieldErrors(nextErrors)
      return
    }

    setFieldErrors({})

    const itemsText = hasSelectedModels
      ? simResult.lines
          .map((l) => `${l.product.brand} ${l.product.name} (${l.term}개월 × ${l.quantity})`)
          .join(', ')
      : `관심 품목: ${interestTags.join(', ')} (전담 매니저 맞춤 모델 추천 희망)`

    const lifeCareParts = simResult.lifeCarePerTier
      .filter((t) => t.quantity > 0)
      .map((t) => `${t.label} ${t.quantity}구좌`)

    const lifeCareText = hasSelectedModels
      ? lifeCareParts.length > 0
        ? `${lifeCareParts.join(' + ')} (총 ${simResult.totalLifeCareUnits}구좌 / 카드납부 월 ${formatKRW(simResult.lifeCareMonthlyDues)} / 매월 현금지원 ${formatKRW(simResult.lifeCareMonthlyCashback)})`
        : '미선택 (0구좌)'
      : '상담 후 고객 조건별 최적 혜택 비교 안내 희망'

    const cardStatusText = hasSelectedModels
      ? simResult.cardAutoMetByLifeCare
        ? `제휴카드 실적 30만원 자동 충족 (월 -${formatKRW(simResult.cardMonthlyCashback)} / ${simResult.cardDurationMonths}개월)`
        : `제휴카드 월 -${formatKRW(simResult.cardMonthlyCashback)} 적용 기준 (${simResult.cardDurationMonths}개월)`
      : '제휴카드 유무별 비교 견적 요청'

    const phaseASummary = hasSelectedModels
      ? simResult.phaseA.monthlySurplusCash > 0
        ? `${simResult.phaseA.label}: 기본혜택가 ${formatKRW(simResult.phaseA.afterLifeCareEffective)} / 최대혜택시 월 0원 + 매월 ${simResult.phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원 캐시백`
        : `${simResult.phaseA.label}: 기본혜택가 ${formatKRW(simResult.phaseA.afterLifeCareEffective)} / 최대혜택시 월 ${formatKRW(simResult.phaseA.effectiveMonthlyPay)}`
      : '상담 후 맞춤 산출 희망'

    const phaseBSummary =
      hasSelectedModels && simResult.phaseB
        ? `${simResult.phaseB.label}: 기본혜택가 ${formatKRW(simResult.phaseB.afterLifeCareEffective)} / 최대혜택시 월 ${formatKRW(simResult.phaseB.effectiveMonthlyPay)}`
        : null

    const attrTag = attribution ? formatAttributionTag(attribution) : ''
    const metaTags = [
      '[화면: 메타광고 빠른견적폼]',
      `[편한시간: ${preferredTime}]`,
      !hasSelectedModels ? `[관심분류: ${interestTags.join(', ')}]` : '',
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
        mode: simResult.mode,
        itemsText,
        lifeCareText,
        cardStatusText,
        phaseASummary,
        phaseBSummary,
        maturityRefundTotal: hasSelectedModels ? simResult.lifeCareMaturityRefundTotal : 0,
        submittedAt: new Date().toISOString(),
      },
    }

    try {
      setSubmitting(true)
      const res = await submitConsultationWriteOnly(payload)
      if (attribution) {
        trackLeadConversion({
          referenceCode: res.referenceCode,
          productIds: simResult.lines.map((l) => l.product.id),
          consultChannel: channel,
          undecidedModel: !hasSelectedModels,
          attribution,
        })
      }
      setCompleted({
        referenceCode: res.referenceCode,
        isDuplicateNotice: false,
      })
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : '전송 중 오류가 발생했습니다. 다시 시도해 주세요.'
      if (msg.includes('이미 상담 신청이 접수')) {
        setCompleted({
          referenceCode: '접수완료',
          isDuplicateNotice: true,
        })
        return
      }
      setFieldErrors({ form: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetAfterComplete = () => {
    setCompleted(null)
    setName('')
    setPhone('')
    setMemo('')
    setAgreed(false)
    setFieldErrors({})
  }

  return (
    <section
      id="quick-reserve-form"
      aria-labelledby="quick-reserve-heading"
      onFocusCapture={fireInitiateOnce}
      className="scroll-mt-18 rounded-2xl bg-surface border-2 border-ink overflow-hidden"
    >
      {/* Top Value & Reassurance Header */}
      <div className="px-4 sm:px-6 py-4 bg-ink text-on-ink flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold text-accent-soft">
            30초 무료 견적 예약
          </span>
          <h3
            id="quick-reserve-heading"
            className="text-base sm:text-lg font-bold tracking-tight text-on-ink"
          >
            내 조건 최대 혜택 비교표 무료로 받아보기
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-on-ink/12 text-[11px] font-semibold text-on-ink whitespace-nowrap">
          <ShieldCheck size={13} aria-hidden="true" />
          <span>가입 강요 없음</span>
        </span>
      </div>

      <div className="p-4 sm:p-6">
        {completed ? (
          <div className="py-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-positive-soft border border-positive-rule text-positive flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-ink">
                {completed.isDuplicateNotice
                  ? '이미 맞춤 견적 신청이 접수되어 있습니다'
                  : '맞춤 혜택 견적 신청이 완료되었습니다'}
              </h4>
              <p className="text-sm text-ink-2">
                {completed.isDuplicateNotice ? (
                  '전담 매니저가 선택하신 방법으로 곧 안내해 드릴게요.'
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

            <div className="max-w-md mx-auto rounded-xl bg-field border border-rule p-4 text-left text-xs text-ink-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <strong className="font-bold text-ink">
                  {STORE_INFO.name} ({channel})
                </strong>
                <span className="text-[11px] font-semibold text-positive whitespace-nowrap">
                  희망 시간: {preferredTime}
                </span>
              </div>
              <p className="leading-relaxed">
                선택하신 {channel} 방법으로 당월 지점 특별가와 제휴카드 유무별 월 부담금 비교표를 정리해 보내드립니다.
              </p>
              <p className="pt-1.5 border-t border-rule text-[11px] text-muted tabular-nums">
                {STORE_INFO.address} ({STORE_INFO.phone})
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetAfterComplete}
              className="inline-flex items-center justify-center h-11 px-5 rounded-lg bg-field hover:bg-field-hover border border-rule-strong text-xs font-bold text-ink cursor-pointer whitespace-nowrap"
            >
              다른 품목 추가 문의하기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Offscreen Honeypot */}
            <div
              aria-hidden="true"
              className="absolute -left-[9999px] top-auto w-px h-px overflow-hidden opacity-0 pointer-events-none"
            >
              <label htmlFor="inline-company-website">웹사이트</label>
              <input
                id="inline-company-website"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {/* STEP 1: Selected Appliance Summary OR 1-Tap Category Chips */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-[13px] font-bold text-ink">
                  1. 어떤 가전 견적이 궁금하신가요?
                </span>
                {hasSelectedModels && (
                  <button
                    type="button"
                    onClick={onClearSelectedItems}
                    className="text-[11px] font-semibold text-muted hover:text-ink underline underline-offset-2 cursor-pointer whitespace-nowrap"
                  >
                    선택 비우기
                  </button>
                )}
              </div>

              {hasSelectedModels ? (
                <div className="rounded-xl bg-field border border-rule-strong p-3.5 space-y-3 tabular-nums">
                  <div className="flex flex-wrap gap-1.5">
                    {simResult.lines.map((line) => (
                      <span
                        key={`${line.product.id}-${line.term}`}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-surface border border-rule text-xs font-bold text-ink"
                      >
                        <span className="truncate max-w-[210px] sm:max-w-[280px]">
                          {line.product.brand} {line.product.name}
                          {line.quantity > 1 ? ` ×${line.quantity}` : ''}
                        </span>
                        <button
                          type="button"
                          aria-label={`${line.product.name} 선택 해제`}
                          onClick={() => onRemoveSelectedItem(line.product.id, line.term)}
                          className="w-5 h-5 rounded hover:bg-field flex items-center justify-center text-muted hover:text-accent cursor-pointer shrink-0"
                        >
                          <X size={13} aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={onScrollToProducts}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface hover:bg-field-hover border border-dashed border-rule-strong text-xs font-semibold text-ink-2 cursor-pointer whitespace-nowrap"
                    >
                      <Plus size={12} aria-hidden="true" />
                      <span>가전 더 담기</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-rule">
                    <div className="rounded-lg bg-surface px-3 py-2 border border-rule">
                      <span className="block text-[11px] text-muted">일반 구독료 합계</span>
                      <strong className="text-sm font-bold text-ink-2 line-through">
                        월 {simResult.phaseA.grossSubscription.toLocaleString('ko-KR')}원
                      </strong>
                    </div>
                    <div className="rounded-lg bg-accent-soft px-3 py-2 border border-accent-rule">
                      <span className="block text-[11px] font-semibold text-accent">
                        최대 혜택 적용 시
                      </span>
                      <strong className="text-base font-black text-accent">
                        월 {simResult.phaseA.effectiveMonthlyPay.toLocaleString('ko-KR')}원
                      </strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-ink-2 leading-snug break-keep">
                    카드 미사용 기본가(월 {simResult.phaseA.afterLifeCareEffective.toLocaleString('ko-KR')}원)부터 당월 지점 특별가까지 한눈에 비교되도록 표로 보내드립니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div
                    role="group"
                    aria-label="관심 가전 종류 선택"
                    className="flex flex-wrap gap-1.5"
                  >
                    {QUICK_INTEREST_CHIPS.map((tag) => {
                      const selected = interestTags.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => handleToggleInterest(tag)}
                          className={`h-9 px-3 rounded-lg border text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                            selected
                              ? 'bg-ink border-ink text-on-ink'
                              : 'bg-field hover:bg-field-hover border-rule text-ink-2'
                          }`}
                        >
                          {selected && <Check size={12} strokeWidth={2.6} aria-hidden="true" />}
                          <span>{tag}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-muted break-keep">
                    정확한 모델명을 모르셔도 괜찮습니다. 예산과 설치 공간에 맞는 인기 모델을 추려 보내드립니다.
                  </p>
                </div>
              )}
            </div>

            {/* STEP 2: 1-Tap Preferred Channel */}
            <div className="space-y-2">
              <span className="block text-xs sm:text-[13px] font-bold text-ink">
                2. 견적표를 어떤 방법으로 받아보실까요?
              </span>
              <div className="grid grid-cols-3 gap-2">
                {CHANNELS.map((ch) => {
                  const Icon = ch.icon
                  const active = channel === ch.value
                  return (
                    <button
                      key={ch.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        fireInitiateOnce()
                        setChannel(ch.value)
                      }}
                      className={`relative h-12 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-ink border-ink text-on-ink'
                          : 'bg-surface hover:bg-field border-rule-strong text-ink-2'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Icon size={13} aria-hidden="true" />
                        <span>{ch.label}</span>
                      </span>
                      {ch.badge && (
                        <span
                          className={`text-[10px] font-semibold leading-none ${
                            active ? 'text-accent-soft' : 'text-accent'
                          }`}
                        >
                          {ch.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* STEP 3: Minimal 2-Input Contact Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="inline-consult-name"
                  className="block text-xs font-bold text-ink mb-1.5"
                >
                  성함 <span className="text-accent">*</span>
                </label>
                <input
                  id="inline-consult-name"
                  name="customerName"
                  type="text"
                  autoComplete="name"
                  maxLength={40}
                  value={name}
                  aria-invalid={Boolean(fieldErrors.name)}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({ ...prev, name: undefined }))
                    }
                  }}
                  placeholder="홍길동"
                  className={`w-full h-12 px-3.5 rounded-xl bg-surface border text-base text-ink ${
                    fieldErrors.name ? 'border-accent' : 'border-rule-strong'
                  }`}
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-[11px] font-semibold text-accent">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="inline-consult-phone"
                  className="block text-xs font-bold text-ink mb-1.5"
                >
                  휴대폰 번호 <span className="text-accent">*</span>
                </label>
                <input
                  id="inline-consult-phone"
                  name="customerPhone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={13}
                  value={phone}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  onChange={(e) => {
                    setPhone(sanitizePhoneNumber(e.target.value))
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => ({ ...prev, phone: undefined }))
                    }
                  }}
                  placeholder="010-0000-0000"
                  className={`w-full h-12 px-3.5 rounded-xl bg-surface border text-base text-ink tabular-nums ${
                    fieldErrors.phone ? 'border-accent' : 'border-rule-strong'
                  }`}
                />
                {fieldErrors.phone && (
                  <p className="mt-1 text-[11px] font-semibold text-accent">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Optional Collapsed Time / Memo Section */}
            <div className="rounded-xl bg-field/70 border border-rule">
              <button
                type="button"
                aria-expanded={showOptional}
                onClick={() => setShowOptional((v) => !v)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-semibold text-ink-2 hover:text-ink cursor-pointer"
              >
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Clock size={13} aria-hidden="true" className="text-muted" />
                  <span>연락 편한 시간대나 요청사항 남기기 (선택)</span>
                </span>
                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className={`text-muted transition-transform ${showOptional ? 'rotate-180' : ''}`}
                />
              </button>

              {showOptional && (
                <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-rule">
                  <div>
                    <span className="block text-[11px] font-bold text-ink-2 mb-1.5">
                      연락 편한 시간대
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {TIME_SLOTS.map((slot) => {
                        const isSel = preferredTime === slot
                        return (
                          <button
                            key={slot}
                            type="button"
                            aria-pressed={isSel}
                            onClick={() => setPreferredTime(slot)}
                            className={`h-10 rounded-lg border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                              isSel
                                ? 'bg-ink border-ink text-on-ink'
                                : 'bg-surface border-rule text-ink-2'
                            }`}
                          >
                            {slot}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="inline-consult-memo"
                      className="block text-[11px] font-bold text-ink-2 mb-1.5"
                    >
                      추가 요청사항
                    </label>
                    <textarea
                      id="inline-consult-memo"
                      name="memo"
                      rows={2}
                      maxLength={320}
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="이사 예정일이나 비교 중인 모델명이 있다면 편하게 남겨주세요"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-surface border border-rule-strong text-base text-ink resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Compact 2-Line Consent with Expandable Full Disclosure */}
            <div
              className={`rounded-xl border p-3.5 space-y-2 transition-colors ${
                agreed
                  ? 'bg-field border-ink'
                  : fieldErrors.agree
                    ? 'bg-accent-soft/50 border-accent'
                    : 'bg-surface border-rule-strong'
              }`}
            >
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  id="inline-consult-agree"
                  name="agreedLegalAndPrivacy"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked)
                    if (e.target.checked && fieldErrors.agree) {
                      setFieldErrors((prev) => ({ ...prev, agree: undefined }))
                    }
                  }}
                  className="mt-0.5 h-4.5 w-4.5 rounded border-rule-strong accent-ink shrink-0 cursor-pointer"
                />
                <span className="text-xs text-ink-2 leading-relaxed">
                  <strong className="font-bold text-ink">[필수]</strong> 맞춤 견적 발송을 위한 개인정보 수집과 결합 혜택·제휴카드 실적 조건 안내 확인에 동의합니다.
                </span>
              </label>

              <div className="pl-7 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowLegalDetail((v) => !v)}
                  className="text-[11px] font-semibold text-muted hover:text-ink underline underline-offset-2 cursor-pointer whitespace-nowrap"
                >
                  {showLegalDetail ? '고지사항 접기' : '필수 고지사항 전문 보기'}
                </button>
              </div>

              {fieldErrors.agree && (
                <p className="pl-7 text-[11px] font-semibold text-accent">
                  {fieldErrors.agree}
                </p>
              )}

              {showLegalDetail && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-field border border-rule p-3 space-y-2 text-[11px] text-ink-2 leading-relaxed">
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

            {fieldErrors.form && (
              <div className="rounded-xl bg-accent-soft border border-accent-rule px-3.5 py-2.5 text-xs font-bold text-accent">
                {fieldErrors.form}
              </div>
            )}

            {/* Primary Conversion Submit Button */}
            <div className="space-y-2">
              <button
                type="submit"
                aria-busy={submitting}
                className={`w-full h-13 px-4 rounded-xl text-accent-ink text-[15px] sm:text-base font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
                  submitting ? 'bg-accent/70' : 'bg-accent hover:bg-accent-hover'
                }`}
              >
                {submitting ? '안전하게 접수 중입니다' : activeChannelObj.ctaLabel}
              </button>

              <p className="text-[11px] text-muted flex items-center justify-center gap-1 text-center break-keep">
                <Lock size={12} aria-hidden="true" className="shrink-0" />
                <span>제3자 제공 없이 롯데하이마트 경기광주점 전담 상담용으로만 사용됩니다.</span>
              </p>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
