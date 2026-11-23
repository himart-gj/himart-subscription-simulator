import { useState } from 'react'
import {
  AlertCircle,
  ArrowDown,
  CalendarCheck2,
  CheckCircle2,
  CreditCard,
  Info,
  Minus,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import type {
  CalculationResult,
  LifeCareUnits,
  PhaseCalculation,
  PolicyConfig,
  SubscriptionTerm,
} from '../types/domain'
import { formatKRW } from '../utils/calculator'
import { SpringNumber } from './SpringNumber'

interface ReceiptPanelProps {
  result: CalculationResult
  policy: PolicyConfig
  variant?: 'full' | 'controller'
  isDraggingProduct: boolean
  autoOptimizeFreed?: boolean
  onToggleAutoOptimizeFreed?: (enabled: boolean) => void
  onDropProduct: (productId: string, term: SubscriptionTerm) => void
  onUpdateCartQuantity: (productId: string, term: SubscriptionTerm, delta: number) => void
  onSwitchCartItemTerm: (
    productId: string,
    fromTerm: SubscriptionTerm,
    toTerm: SubscriptionTerm,
  ) => void
  onRemoveCartItem: (productId: string, term: SubscriptionTerm) => void
  onClearCart: () => void
  onUpdateLifeCareUnit: (tier: keyof LifeCareUnits, delta: number) => void
  onSetLifeCareUnits: (units: LifeCareUnits) => void
  onApplyZeroCostPreset: () => void
  onToggleCoverShortfall: (cover: boolean) => void
  onOpenConsultModal: () => void
  onQuickTrySample?: () => void
}

function PhaseResultCard({
  phase,
  isMixed,
  cardActive,
  stepLabel,
}: {
  phase: PhaseCalculation
  isMixed: boolean
  cardActive: boolean
  stepLabel?: string
}) {
  const hasExtraCashback = phase.monthlySurplusCash > 0

  return (
    <div className="rounded-xl bg-field border border-ink p-4 flex flex-col justify-between space-y-3 tabular-nums">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-bold text-ink">
            {stepLabel || `${phase.label} 혜택 요약`}
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface text-ink-2 border border-rule shrink-0">
            {phase.months}개월 분할결제
          </span>
        </div>

        <div className="text-xs text-ink-2 space-y-1">
          <div className="flex justify-between gap-2">
            <span>가전 원 구독료</span>
            <span className="font-semibold text-ink">{formatKRW(phase.grossSubscription)}</span>
          </div>
          {phase.lifeCareCashback > 0 && (
            <div className="flex justify-between gap-2 text-accent font-semibold">
              <span>구독플러스 월 현금지원</span>
              <span>-{formatKRW(phase.lifeCareCashback)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-2.5 border-t border-rule">
        <div className="text-[11px] font-bold text-ink-2 mb-0.5">
          카드 조건 없이도 기본 월 체감가
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1 text-ink">
            <span className="text-xs font-bold">월</span>
            <SpringNumber
              value={phase.afterLifeCareEffective}
              suffix="원"
              className={`${isMixed ? 'text-xl' : 'text-[26px]'} font-black tracking-tight`}
            />
          </div>
          {phase.afterLifeCareSurplus > 0 && (
            <span className="text-[11px] font-bold text-positive">
              +{phase.afterLifeCareSurplus.toLocaleString('ko-KR')}원/월 입금
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-surface border border-rule px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-ink-2">
          {cardActive ? '제휴카드 사용 시' : '제휴카드 미사용 기준'}
        </span>
        {cardActive ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-black text-accent">
              월 {phase.effectiveMonthlyPay.toLocaleString('ko-KR')}원
            </span>
            {hasExtraCashback && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-positive-soft border border-positive-rule text-positive text-[11px] font-bold">
                +{phase.monthlySurplusCash.toLocaleString('ko-KR')}원 입금
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs font-bold text-muted">
            위 체감가 동일
          </span>
        )}
      </div>
    </div>
  )
}

export function ReceiptPanel({
  result,
  policy,
  variant = 'full',
  isDraggingProduct,
  autoOptimizeFreed = false,
  onToggleAutoOptimizeFreed,
  onDropProduct,
  onUpdateCartQuantity,
  onSwitchCartItemTerm,
  onRemoveCartItem,
  onClearCart,
  onUpdateLifeCareUnit,
  onSetLifeCareUnits,
  onApplyZeroCostPreset,
  onToggleCoverShortfall,
  onOpenConsultModal,
  onQuickTrySample,
}: ReceiptPanelProps) {
  const [dragOver, setDragOver] = useState(false)
  const isController = variant === 'controller'

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!dragOver) setDragOver(true)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    try {
      const raw = e.dataTransfer.getData('application/json')
      if (!raw) return
      const parsed = JSON.parse(raw) as { productId?: string; term?: SubscriptionTerm }
      if (parsed.productId && (parsed.term === 36 || parsed.term === 60)) {
        onDropProduct(parsed.productId, parsed.term)
      }
    } catch {
      // Ignore malformed external drops
    }
  }

  const cardProgressPct = Math.min(
    100,
    policy.cardMinSpend > 0
      ? Math.round((result.cardRecognizedSpend / policy.cardMinSpend) * 100)
      : 100,
  )

  const isEmpty = result.mode === 'empty'
  const isMixed = result.mode === 'mixed'
  const payYearsText =
    result.lifeCarePayMonths % 12 === 6
      ? `${Math.floor(result.lifeCarePayMonths / 12)}년 6개월`
      : `${(result.lifeCarePayMonths / 12).toFixed(0)}년`
  const maturityYearsText = `${Math.round(result.lifeCareMaturityMonths / 12)}년`

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-xl bg-surface border transition-colors duration-150 overflow-hidden ${
        dragOver
          ? 'border-accent bg-accent-soft/40'
          : isDraggingProduct
            ? 'border-accent border-dashed'
            : 'border-rule-strong'
      }`}
    >
      <div className="px-5 py-3.5 bg-ink text-on-ink flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {isController ? (
            <SlidersHorizontal size={16} aria-hidden="true" className="shrink-0" />
          ) : (
            <ShoppingBag size={16} aria-hidden="true" className="shrink-0" />
          )}
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold tracking-tight truncate">
              {isController
                ? '구좌 · 약정 · 카드 조건 조절기'
                : '내 맞춤 혜택 설계 및 구좌 변경'}
            </h2>
            <p className="text-[11px] text-on-ink/75 truncate">
              {isController
                ? '조건 변경 시 왼쪽 설계표 금액이 실시간 연동됩니다'
                : '추천상품 자동맞춤 및 구좌 수동 조절'}
            </p>
          </div>
        </div>

        {!isEmpty && (
          <button
            type="button"
            onClick={onClearCart}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-on-ink/80 hover:text-on-ink hover:bg-on-ink/10 transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw size={12} aria-hidden="true" />
            <span>비우기</span>
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {isDraggingProduct && (
          <div className="rounded-lg border border-dashed border-accent bg-accent-soft px-4 py-3 text-center text-xs font-bold text-accent">
            여기에 상품을 놓으면 바로 추가됩니다
          </div>
        )}

        {/* STEP 1: CART SUMMARY / TERM & QTY CONTROLLER */}
        <section aria-label={isController ? '약정 기간 및 수량 조절' : '담은 구독 가전 요약'}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold tracking-tight text-ink flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-field text-ink text-[11px] font-mono font-bold">
                1
              </span>
              {isController ? '품목별 약정 · 수량 변경' : '담은 구독 가전'}
              <span className="text-accent tabular-nums">({result.totalQuantity})</span>
            </span>
            {!isEmpty && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-field text-ink-2 tabular-nums">
                {isMixed ? '36·60개월 맞춤' : `${result.durationMonths}개월 약정`}
              </span>
            )}
          </div>

          {isEmpty ? (
            <div className="rounded-lg border border-dashed border-rule-strong bg-field/60 p-6 text-center">
              <p className="text-sm font-bold text-ink">
                구독할 가전을 선택해 혜택을 확인해 보세요
              </p>
              {onQuickTrySample && (
                <button
                  type="button"
                  onClick={onQuickTrySample}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface border border-rule-strong hover:bg-field text-xs font-bold text-ink transition-colors cursor-pointer"
                >
                  <span>인기 살림효자 3종 세트 담아보기</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {result.lines.map((line) => {
                const can36 =
                  line.product.monthly36 !== null && line.product.monthly36 > 0
                const can60 =
                  line.product.monthly60 !== null && line.product.monthly60 > 0
                return (
                  <div
                    key={`${line.product.id}-${line.term}`}
                    className="rounded-lg bg-field border border-rule p-2.5 sm:p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {!isController && (
                          <div className="text-[11px] font-medium text-muted">
                            {line.product.brand} / 총 {formatKRW(line.contractTotal)}
                          </div>
                        )}
                        <div className="text-xs sm:text-[13px] font-bold text-ink leading-snug break-keep">
                          {line.product.name}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`${line.product.name} 삭제`}
                        onClick={() => onRemoveCartItem(line.product.id, line.term)}
                        className="p-1 text-subtle hover:text-accent transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                      {can36 && can60 ? (
                        <div className="inline-flex rounded-md bg-surface border border-rule p-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              line.term !== 36 &&
                              onSwitchCartItemTerm(line.product.id, line.term, 36)
                            }
                            className={`px-2 py-1 rounded text-[11px] font-bold tabular-nums transition-colors ${
                              line.term === 36
                                ? 'bg-ink text-on-ink'
                                : 'text-muted hover:text-ink cursor-pointer'
                            }`}
                          >
                            36개월
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              line.term !== 60 &&
                              onSwitchCartItemTerm(line.product.id, line.term, 60)
                            }
                            className={`px-2 py-1 rounded text-[11px] font-bold tabular-nums transition-colors ${
                              line.term === 60
                                ? 'bg-ink text-on-ink'
                                : 'text-muted hover:text-ink cursor-pointer'
                            }`}
                          >
                            60개월
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-surface border border-rule text-[11px] font-bold text-ink-2 tabular-nums">
                          {line.term}개월 공식 약정
                        </span>
                      )}

                      <div className="flex items-center gap-2.5">
                        <div className="inline-flex items-center rounded-md bg-surface border border-rule">
                          <button
                            type="button"
                            aria-label="수량 감소"
                            onClick={() =>
                              onUpdateCartQuantity(line.product.id, line.term, -1)
                            }
                            className="w-7 h-7 flex items-center justify-center text-ink-2 hover:text-ink cursor-pointer"
                          >
                            <Minus size={12} aria-hidden="true" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-ink tabular-nums">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="수량 증가"
                            onClick={() =>
                              onUpdateCartQuantity(line.product.id, line.term, 1)
                            }
                            className="w-7 h-7 flex items-center justify-center text-ink-2 hover:text-ink cursor-pointer"
                          >
                            <Plus size={12} aria-hidden="true" />
                          </button>
                        </div>

                        {!isController && (
                          <div className="text-[13px] font-bold text-ink tabular-nums min-w-[78px] text-right">
                            월 {formatKRW(line.lineTotal)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {!isController && isMixed && (
                <div className="rounded-lg bg-caution-soft border border-caution-rule p-2.5 flex items-start gap-2">
                  <Info size={14} aria-hidden="true" className="text-caution shrink-0 mt-0.5" />
                  <p className="text-[11px] text-caution leading-relaxed font-medium">
                    60개월 상품 포함으로 혜택은 60개월 기준 통일 적용되며, 1~36개월차와 37~60개월차 체감가가 구간별로 계산됩니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* STEP 2: LIFECARE */}
        <section
          aria-label="구독플러스 결합 혜택 선택기"
          className="pt-5 border-t border-rule"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold tracking-tight text-ink flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-accent-soft text-accent text-[11px] font-mono font-bold">
                2
              </span>
              구독플러스 현금 지원 (만기 100% 환급형)
            </span>
            <span className="text-xs font-bold text-ink tabular-nums">
              <span className={result.totalLifeCareUnits > 0 ? 'text-accent' : ''}>
                {result.totalLifeCareUnits}
              </span>{' '}
              / 최대 {policy.maxLifeCareUnits}구좌
            </span>
          </div>

          {onToggleAutoOptimizeFreed && (
            <div className="mb-3 rounded-lg bg-field border border-rule px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-ink-2">
                추천상품 자동맞춤
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={autoOptimizeFreed}
                onClick={() => onToggleAutoOptimizeFreed(!autoOptimizeFreed)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                  autoOptimizeFreed
                    ? 'bg-ink text-on-ink'
                    : 'bg-surface border border-rule-strong text-ink-2'
                }`}
              >
                {autoOptimizeFreed ? '자동맞춤 ON' : '직접 설정 중'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-12 gap-1 mb-3" aria-hidden="true">
            {Array.from({ length: policy.maxLifeCareUnits }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-colors duration-150 ${
                  i < result.totalLifeCareUnits ? 'bg-accent' : 'bg-field'
                }`}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => onSetLifeCareUnits({ q40: 0, q50: 0, q60: 0 })}
              className="px-2.5 py-1.5 rounded-md bg-field hover:bg-field-hover border border-rule text-[11px] font-semibold text-ink-2 transition-colors cursor-pointer"
            >
              초기화
            </button>
            <button
              type="button"
              disabled={isEmpty}
              onClick={onApplyZeroCostPreset}
              className={`px-2.5 py-1.5 rounded-md border text-[11px] font-bold transition-colors ${
                isEmpty
                  ? 'bg-field border-rule text-subtle cursor-not-allowed'
                  : 'bg-accent-soft border-accent-rule text-accent cursor-pointer'
              }`}
            >
              추천상품 자동맞춤
            </button>
            <button
              type="button"
              onClick={() => onSetLifeCareUnits({ q40: 0, q50: 6, q60: 0 })}
              className="px-2.5 py-1.5 rounded-md bg-positive-soft border border-positive-rule text-[11px] font-bold text-positive transition-colors cursor-pointer"
            >
              카드실적 30만원 자동충족
            </button>
            <button
              type="button"
              onClick={() =>
                onSetLifeCareUnits({ q40: 0, q50: 0, q60: policy.maxLifeCareUnits })
              }
              className="px-2.5 py-1.5 rounded-md bg-surface hover:bg-field border border-rule-strong text-[11px] font-bold text-ink transition-colors cursor-pointer"
            >
              최대 {policy.maxLifeCareUnits}구좌
            </button>
          </div>

          <div className="space-y-2">
            {result.lifeCarePerTier.map((tier) => {
              const atCap = result.totalLifeCareUnits >= policy.maxLifeCareUnits
              const totalSupportManwon = Math.round(
                (tier.unitCashback * result.lifeCareBasisTerm) / 10000,
              )
              return (
                <div
                  key={tier.key}
                  className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border transition-colors ${
                    tier.quantity > 0
                      ? 'bg-field border-ink'
                      : 'bg-surface border-rule'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-bold text-ink">
                        {tier.label}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-positive-soft border border-positive-rule text-[10px] font-bold text-positive tabular-nums">
                        총 {totalSupportManwon}만원 지원
                      </span>
                    </div>
                    <div className="text-[11px] text-ink-2 tabular-nums mt-0.5">
                      매월 {tier.unitCashback.toLocaleString('ko-KR')}원 계좌 입금 (카드납부 월 {tier.unitDues.toLocaleString('ko-KR')}원)
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={tier.quantity <= 0}
                      aria-label={`${tier.label} 구좌 감소`}
                      onClick={() => onUpdateLifeCareUnit(tier.key, -1)}
                      className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${
                        tier.quantity <= 0
                          ? 'bg-field border-rule text-subtle cursor-not-allowed'
                          : 'bg-surface border-rule-strong text-ink hover:bg-field cursor-pointer'
                      }`}
                    >
                      <Minus size={14} aria-hidden="true" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-ink tabular-nums">
                      {tier.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={atCap}
                      aria-label={`${tier.label} 구좌 증가`}
                      onClick={() => onUpdateLifeCareUnit(tier.key, 1)}
                      className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${
                        atCap
                          ? 'bg-field border-rule text-subtle cursor-not-allowed'
                          : 'bg-ink border-ink text-on-ink hover:bg-ink-hover cursor-pointer'
                      }`}
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* STEP 3: HI-CLASS AFFILIATE CARD */}
        <section
          aria-label="Hi-Class 제휴카드 캐시백 혜택"
          className="pt-5 border-t border-rule"
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-bold tracking-tight text-ink flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-field text-ink text-[11px] font-mono font-bold">
                3
              </span>
              <CreditCard size={14} aria-hidden="true" className="text-ink-2" />
              {isController
                ? '제휴카드 추가 혜택 시뮬레이션'
                : '제휴카드 사용 시 추가 혜택 (조건 충족 시)'}
            </span>
            <span className="px-2 py-0.5 rounded bg-field border border-rule text-[10px] font-bold text-ink-2 shrink-0">
              Hi-Class 롯데카드
            </span>
          </div>

          {isController ? (
            result.cardAutoMetByLifeCare ? (
              <div className="rounded-lg bg-positive-soft border border-positive-rule px-3 py-2.5 flex items-center justify-between gap-2 text-xs font-bold text-positive tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={14} aria-hidden="true" className="shrink-0" />
                  <span>납입금 자동납부로 실적 자동 충족 중</span>
                </span>
                <span className="shrink-0">-월 {formatKRW(policy.cardMonthlyCashback)}</span>
              </div>
            ) : (
              <button
                type="button"
                role="switch"
                aria-checked={result.cardCoverShortfall}
                onClick={() => onToggleCoverShortfall(!result.cardCoverShortfall)}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  result.cardCoverShortfall
                    ? 'bg-field border-ink text-ink'
                    : 'bg-surface border-rule text-ink-2 hover:border-rule-strong'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold">
                    제휴카드 월 {(policy.cardMinSpend / 10000).toFixed(0)}만 원 사용 시뮬레이션
                  </div>
                  <div className="text-[11px] text-muted tabular-nums mt-0.5">
                    부족 실적 월 {formatKRW(result.cardShortfall)} 생활비 사용 조건
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded tabular-nums shrink-0 ${
                    result.cardCoverShortfall
                      ? 'bg-ink text-on-ink'
                      : 'bg-field text-ink-2 border border-rule'
                  }`}
                >
                  {result.cardCoverShortfall
                    ? `ON (-${policy.cardMonthlyCashback.toLocaleString('ko-KR')}원)`
                    : '미적용'}
                </span>
              </button>
            )
          ) : (
            <div className="rounded-lg border border-rule bg-surface p-3.5 space-y-2.5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5 tabular-nums">
                  <span className="font-medium text-ink-2">
                    구독플러스 월 납입금 카드 실적 반영
                  </span>
                  <span className="font-bold text-ink">
                    {result.cardRecognizedSpend.toLocaleString('ko-KR')}원{' '}
                    <span className="text-muted font-normal">
                      / {policy.cardMinSpend.toLocaleString('ko-KR')}원
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-field overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-colors duration-300 ${
                      result.cardAutoMetByLifeCare ? 'bg-positive' : 'bg-ink'
                    }`}
                    style={{ width: `${cardProgressPct}%` }}
                  />
                </div>
              </div>

              {result.cardAutoMetByLifeCare ? (
                <div className="rounded-md bg-positive-soft border border-positive-rule px-3 py-2 flex items-center gap-2 text-xs font-bold text-positive">
                  <CheckCircle2 size={14} aria-hidden="true" className="shrink-0" />
                  <span>납입금만으로 실적 30만 원 자동 충족 · 월 {formatKRW(policy.cardMonthlyCashback)} 캐시백</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-md bg-caution-soft border border-caution-rule px-3 py-2 flex items-start gap-2 text-[11px] text-caution leading-snug tabular-nums">
                    <AlertCircle size={14} aria-hidden="true" className="shrink-0 mt-0.5" />
                    <span>
                      평소 생활비로 <strong>월 {result.cardShortfall.toLocaleString('ko-KR')}원</strong> 카드 사용 시 매월 {policy.cardMonthlyCashback.toLocaleString('ko-KR')}원 추가 캐시백 적용
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleCoverShortfall(!result.cardCoverShortfall)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-left transition-colors cursor-pointer ${
                      result.cardCoverShortfall
                        ? 'bg-field border-ink text-ink'
                        : 'bg-surface border-rule text-ink-2 hover:border-rule-strong'
                    }`}
                  >
                    <span className="text-xs font-semibold">
                      제휴카드 월 30만 원 사용 시뮬레이션
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded tabular-nums shrink-0 ${
                        result.cardCoverShortfall
                          ? 'bg-ink text-on-ink'
                          : 'bg-field text-ink-2'
                      }`}
                    >
                      {result.cardCoverShortfall
                        ? `사용 ON (-${policy.cardMonthlyCashback.toLocaleString('ko-KR')}원)`
                        : '미사용'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* STEP 4: FINAL EFFECTIVE COST (full 모드에서만 표시 · 결과 모달에서는 좌측 영수증으로 통합) */}
        {!isController && !isEmpty && (
          <section
            aria-label="최종 혜택 비교 결과"
            className="pt-5 border-t border-rule"
          >
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-bold tracking-tight text-ink">
                단계별 월 체감가 비교
              </span>
              {isMixed && (
                <span className="text-[11px] font-semibold text-positive">
                  구간별 분리 계산
                </span>
              )}
            </div>

            {isMixed && result.phaseB ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <PhaseResultCard
                  phase={result.phaseA}
                  isMixed
                  cardActive={result.cardBenefitActive}
                  stepLabel="1~36개월차 구간"
                />
                <div className="flex sm:hidden justify-center -my-1 text-subtle">
                  <ArrowDown size={16} aria-hidden="true" />
                </div>
                <PhaseResultCard
                  phase={result.phaseB}
                  isMixed
                  cardActive={result.cardBenefitActive}
                  stepLabel="37~60개월차 구간"
                />
              </div>
            ) : (
              <PhaseResultCard
                phase={result.phaseA}
                isMixed={false}
                cardActive={result.cardBenefitActive}
              />
            )}
          </section>
        )}

        {/* STEP 5: 120-MONTH 100% REFUND TIMELINE (full 모드에서만 표시) */}
        {!isController && (
          <section
            aria-label="납입금 만기 100% 환급 일정"
            className="rounded-xl bg-field border border-rule p-4 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={15} aria-hidden="true" className="text-positive shrink-0" />
                <h3 className="text-xs font-bold text-ink tracking-tight">
                  사라지는 비용이 아닌 100% 원금 환급 구조
                </h3>
              </div>
              <span className="text-[11px] font-bold text-ink-2 tabular-nums shrink-0">
                {result.totalLifeCareUnits}구좌 기준
              </span>
            </div>

            {result.totalLifeCareUnits === 0 ? (
              <p className="text-xs text-muted leading-relaxed">
                구독플러스 상품을 선택하시면 {payYearsText}({result.lifeCarePayMonths}회) 납입 후 {result.lifeCareDeferMonths}회 거치(0원)를 거쳐 {maturityYearsText}({result.lifeCareMaturityMonths}회) 만기 시 납입 원금 100% 환급 금액이 표시됩니다.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-surface border border-rule p-2.5">
                    <div className="text-[10px] font-semibold text-muted tabular-nums">
                      1~{result.lifeCarePayMonths}회 적립
                    </div>
                    <div className="mt-1 text-xs font-bold text-ink tabular-nums">
                      월 {result.lifeCareMonthlyDues.toLocaleString('ko-KR')}원
                    </div>
                  </div>

                  <div className="rounded-lg bg-surface border border-rule p-2.5">
                    <div className="text-[10px] font-semibold text-muted tabular-nums">
                      {result.lifeCarePayMonths + 1}~{result.lifeCareMaturityMonths}회 거치
                    </div>
                    <div className="mt-1 text-xs font-bold text-ink-2 tabular-nums">
                      월 0원
                    </div>
                  </div>

                  <div className="rounded-lg bg-positive-soft border border-positive-rule p-2.5">
                    <div className="text-[10px] font-bold text-positive tabular-nums">
                      {result.lifeCareMaturityMonths}회({maturityYearsText}) 만기
                    </div>
                    <div className="mt-1 text-xs font-extrabold text-positive tabular-nums">
                      <SpringNumber
                        value={result.lifeCareMaturityRefundTotal}
                        suffix="원"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-ink-2 font-medium leading-snug">
                  실납입은 {payYearsText}({result.lifeCarePayMonths}회)로 마감되며, 미이용 후 {maturityYearsText}({result.lifeCareMaturityMonths}회) 만기 익월 해지 신청 시 원금 {formatKRW(result.lifeCareMaturityRefundTotal)}이 100% 환급됩니다.
                </p>
              </>
            )}
          </section>
        )}

        {!isController && (
          <button
            type="button"
            disabled={isEmpty}
            onClick={onOpenConsultModal}
            className={`w-full h-12 rounded-lg text-[15px] font-bold flex items-center justify-center gap-2 transition-colors duration-150 ${
              isEmpty
                ? 'bg-field text-subtle border border-rule cursor-not-allowed'
                : 'bg-accent hover:bg-accent-hover text-accent-ink cursor-pointer'
            }`}
          >
            <CalendarCheck2 size={17} aria-hidden="true" />
            <span>내 맞춤 견적 · 100% 환급 일정표 카톡·문자 받기</span>
            <Send size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
