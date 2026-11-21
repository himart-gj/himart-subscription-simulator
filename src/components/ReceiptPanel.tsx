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
  stepLabel,
}: {
  phase: PhaseCalculation
  isMixed: boolean
  stepLabel?: string
}) {
  const hasExtraCashback = phase.monthlySurplusCash > 0
  const isExactZero = phase.effectiveMonthlyPay === 0 && !hasExtraCashback

  if (hasExtraCashback || isExactZero) {
    return (
      <div className="rounded-xl bg-field border border-rule-strong p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
              <CheckCircle2 size={14} aria-hidden="true" className="text-positive shrink-0" />
              <span>{stepLabel || `${phase.label} 최종 혜택 결과`}</span>
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-surface text-ink-2 border border-rule tabular-nums shrink-0">
              {phase.months}개월 분할결제
            </span>
          </div>

          <div className="text-xs text-ink-2 tabular-nums space-y-0.5 mb-3">
            <div className="flex justify-between gap-2">
              <span>원 구독료 월 결제액</span>
              <span className="font-semibold text-ink">{formatKRW(phase.grossSubscription)}</span>
            </div>
            <div className="flex justify-between gap-2 text-accent font-semibold">
              <span>상조 현금캐시백 + 제휴카드 혜택</span>
              <span>-{formatKRW(phase.totalMonthlyBenefit)}</span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-rule">
          <div className="text-[11px] font-bold text-ink-2 mb-0.5">
            할인 및 캐시백 반영 후 최종 월 체감가
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1 text-ink">
              <span className="text-xs font-bold">월 체감</span>
              <SpringNumber
                value={0}
                suffix="원"
                className={`${isMixed ? 'text-xl' : 'text-[26px]'} font-black tracking-tight`}
              />
            </div>
            {hasExtraCashback && (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-positive-soft border border-positive-rule text-positive text-xs font-bold tabular-nums">
                매월 +{phase.monthlySurplusCash.toLocaleString('ko-KR')}원 입금
              </span>
            )}
          </div>
          <div className="mt-2 rounded bg-surface border border-rule px-2.5 py-1.5 text-[11px] font-semibold text-ink-2 tabular-nums">
            {hasExtraCashback
              ? `${phase.months}개월간 체감 0원 및 총 ${phase.phaseTotalSurplus.toLocaleString('ko-KR')}원 현금 입금`
              : `${phase.months}개월 최종 고객 총 체감가 0원 (구독료 전액 상쇄)`}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-surface border border-ink p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold text-ink">
            {stepLabel || `${phase.label} 최종 체감가 내역`}
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-field text-ink-2 tabular-nums shrink-0">
            {phase.months}개월 분할결제
          </span>
        </div>

        <div className="text-xs text-muted tabular-nums space-y-0.5 mb-3">
          <div className="flex justify-between gap-2">
            <span>원 구독료 월 결제액</span>
            <span className="font-semibold text-ink">{formatKRW(phase.grossSubscription)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>상조 현금캐시백 + 제휴카드 혜택</span>
            <span className="font-semibold text-accent">
              {phase.totalMonthlyBenefit > 0
                ? `-${formatKRW(phase.totalMonthlyBenefit)}`
                : '0원'}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-rule">
        <div className="text-[11px] font-semibold text-muted mb-0.5">
          혜택 반영 후 최종 월 체감가
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-semibold text-ink-2">월</span>
          <SpringNumber
            value={phase.effectiveMonthlyPay}
            suffix="원"
            className={`${isMixed ? 'text-xl' : 'text-[26px]'} font-black tracking-tight text-ink`}
          />
        </div>
        <div className="mt-2 rounded bg-field border border-rule px-2.5 py-1.5 tabular-nums space-y-0.5">
          <div className="text-[11px] font-bold text-ink">
            {phase.months}개월 최종 고객 총 체감가{' '}
            <span className="text-accent">
              {phase.phaseTotalEffectivePay.toLocaleString('ko-KR')}원
            </span>
          </div>
          <div className="text-[10px] text-muted">
            {phase.totalMonthlyBenefit > 0
              ? `총 구독액 ${phase.phaseTotalGross.toLocaleString('ko-KR')}원에서 캐시백 차감 반영`
              : '결합 혜택 선택 시 월 체감가가 즉시 내려갑니다'}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReceiptPanel({
  result,
  policy,
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
      {/* Receipt Header */}
      <div className="px-5 py-3.5 bg-ink text-on-ink flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <ShoppingBag size={16} aria-hidden="true" className="shrink-0" />
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold tracking-tight truncate">
              실시간 맞춤 혜택 명세서
            </h2>
            <p className="text-[11px] text-on-ink/75 truncate">
              제휴카드 분할결제 및 상조·카드 캐시백 상세 조정
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

      <div className="p-5 space-y-6">
        {isDraggingProduct && (
          <div className="rounded-lg border border-dashed border-accent bg-accent-soft px-4 py-3 text-center text-xs font-bold text-accent">
            여기에 상품을 놓으면 명세서에 바로 추가됩니다
          </div>
        )}

        {/* STEP 1: CART SUMMARY */}
        <section aria-label="담은 구독 가전 요약">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold tracking-tight text-ink flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-field text-ink text-[11px] font-mono font-bold">
                1
              </span>
              담은 가전 (제휴카드 약정개월 분할결제)
              <span className="text-accent tabular-nums">({result.totalQuantity})</span>
            </span>
            {!isEmpty && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-field text-ink-2 tabular-nums">
                {isMixed
                  ? '36+60개월 혼합'
                  : `${result.durationMonths}개월 분할결제`}
              </span>
            )}
          </div>

          {isEmpty ? (
            <div className="rounded-lg border border-dashed border-rule-strong bg-field/60 p-6 text-center">
              <p className="text-sm font-bold text-ink">
                구독할 가전을 선택해 혜택을 확인해 보세요
              </p>
              <p className="mt-1 text-xs text-muted">
                단품 ‘이 제품만 선택’ 또는 ‘함께 담기’로 자유롭게 구성할 수 있습니다.
              </p>
              {onQuickTrySample && (
                <button
                  type="button"
                  onClick={onQuickTrySample}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface border border-rule-strong hover:bg-field text-xs font-bold text-ink transition-colors cursor-pointer"
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
                    className="rounded-lg bg-field border border-rule p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-muted">
                          {line.product.brand} / 총 구독료 {formatKRW(line.contractTotal)}
                        </div>
                        <div className="text-[13px] font-bold text-ink leading-snug break-keep">
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

                    <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                      <div className="inline-flex rounded-md bg-surface border border-rule p-0.5">
                        <button
                          type="button"
                          disabled={!can36}
                          onClick={() =>
                            line.term !== 36 &&
                            can36 &&
                            onSwitchCartItemTerm(line.product.id, line.term, 36)
                          }
                          className={`px-2 py-1 rounded text-[11px] font-bold tabular-nums transition-colors ${
                            !can36
                              ? 'text-subtle cursor-not-allowed'
                              : line.term === 36
                                ? 'bg-ink text-on-ink'
                                : 'text-muted hover:text-ink cursor-pointer'
                          }`}
                        >
                          36개월
                        </button>
                        <button
                          type="button"
                          disabled={!can60}
                          onClick={() =>
                            line.term !== 60 &&
                            can60 &&
                            onSwitchCartItemTerm(line.product.id, line.term, 60)
                          }
                          className={`px-2 py-1 rounded text-[11px] font-bold tabular-nums transition-colors ${
                            !can60
                              ? 'text-subtle cursor-not-allowed'
                              : line.term === 60
                                ? 'bg-ink text-on-ink'
                                : 'text-muted hover:text-ink cursor-pointer'
                          }`}
                        >
                          60개월
                        </button>
                      </div>

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

                        <div className="text-[13px] font-bold text-ink tabular-nums min-w-[78px] text-right">
                          월 {formatKRW(line.lineTotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {isMixed && (
                <div className="rounded-lg bg-caution-soft border border-caution-rule p-3 flex items-start gap-2">
                  <Info size={15} aria-hidden="true" className="text-caution shrink-0 mt-0.5" />
                  <p className="text-[12px] text-caution leading-relaxed font-medium">
                    <strong className="font-bold">
                      60개월 상품 포함으로 상조·카드 혜택이 60개월 기준으로 통일 적용됩니다.
                    </strong>{' '}
                    구독 결제액은 평균내지 않고 1~36개월차 / 37~60개월차로 분리 계산됩니다.
                  </p>
                </div>
              )}

              <div className="rounded-lg bg-surface border border-rule px-3.5 py-3 space-y-1.5 tabular-nums">
                <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
                  <span>전체 구독 총액 (제휴카드 약정개월 분할결제)</span>
                  <span className="font-bold text-ink-2">
                    총 {result.overallTotalGross.toLocaleString('ko-KR')}원
                  </span>
                </div>
                {isMixed && result.phaseB ? (
                  <>
                    <div className="flex items-center justify-between gap-3 text-xs pt-1.5 border-t border-rule">
                      <span className="font-semibold text-ink-2">
                        1~36개월차 원 구독료 합계
                      </span>
                      <span className="text-sm font-bold text-ink whitespace-nowrap shrink-0">
                        {formatKRW(result.phaseA.grossSubscription)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs pt-1.5 border-t border-rule">
                      <span className="font-semibold text-positive">
                        37~60개월차 원 구독료 합계
                      </span>
                      <span className="text-sm font-bold text-positive whitespace-nowrap shrink-0">
                        {formatKRW(result.phaseB.grossSubscription)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-rule">
                    <span className="text-xs font-semibold text-ink-2">
                      원 구독료 월 결제액 ({result.durationMonths}개월)
                    </span>
                    <span className="text-[15px] font-bold text-ink whitespace-nowrap shrink-0">
                      월 {result.phaseA.grossSubscription.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* STEP 2: LIFECARE */}
        <section
          aria-label="구독프리드 결합 혜택 선택기"
          className="pt-5 border-t border-rule"
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold tracking-tight text-ink flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-accent-soft text-accent text-[11px] font-mono font-bold">
                2
              </span>
              구독프리드 상조 현금 캐시백
            </span>
            <span className="text-xs font-bold text-ink tabular-nums">
              선택 구좌:{' '}
              <span className={result.totalLifeCareUnits > 0 ? 'text-accent' : ''}>
                {result.totalLifeCareUnits}
              </span>{' '}
              / 최대 {policy.maxLifeCareUnits}구좌
            </span>
          </div>

          <p className="text-[11px] text-muted mb-2.5 leading-snug">
            상조 월 회비는 <strong className="text-ink">제휴카드로 납부(실적 100% 인정)</strong>하며, 결합 지원금은 매월 <strong className="text-positive">계좌 현금 입금</strong>으로 지급됩니다.
          </p>

          {onToggleAutoOptimizeFreed && (
            <div className="mb-3 rounded-lg bg-field border border-rule px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-ink-2">
                천원단위 상조 체감가 자동 맞춤
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
                {autoOptimizeFreed ? '자동 맞춤 ON' : '수동 조절 중'}
              </button>
            </div>
          )}

          {/* 12-unit segmented gauge bar */}
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

          {/* Quick Presets */}
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
              천원단위 맞춤 추천
            </button>
            <button
              type="button"
              onClick={() => onSetLifeCareUnits({ q40: 0, q50: 6, q60: 0 })}
              className="px-2.5 py-1.5 rounded-md bg-positive-soft border border-positive-rule text-[11px] font-bold text-positive transition-colors cursor-pointer"
            >
              카드실적 30만원 자동충족 (플러스90×6)
            </button>
            <button
              type="button"
              onClick={() =>
                onSetLifeCareUnits({ q40: 0, q50: 0, q60: policy.maxLifeCareUnits })
              }
              className="px-2.5 py-1.5 rounded-md bg-surface hover:bg-field border border-rule-strong text-[11px] font-bold text-ink transition-colors cursor-pointer"
            >
              최대 혜택 ({policy.maxLifeCareUnits}구좌)
            </button>
          </div>

          {/* 3 Official Tier Steppers */}
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
                        총 {totalSupportManwon}만원 캐시백
                      </span>
                      <span className="text-[11px] text-muted tabular-nums">
                        (카드납부 월 {tier.unitDues.toLocaleString('ko-KR')}원)
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-ink-2 tabular-nums mt-0.5">
                      {result.lifeCareBasisTerm}개월 기준 구좌당 월 {tier.unitCashback.toLocaleString('ko-KR')}원 계좌 현금 입금
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

          {/* Step 2 Subtotal Row */}
          {!isEmpty && (
            <div className="mt-3 rounded-lg bg-field border border-rule px-3.5 py-2.5 text-xs space-y-1 tabular-nums">
              <div className="flex justify-between gap-2 text-ink-2">
                <span>원 구독료 월 결제액 ({result.phaseA.label})</span>
                <span className="font-semibold text-ink whitespace-nowrap shrink-0">
                  {formatKRW(result.phaseA.grossSubscription)}
                </span>
              </div>
              <div className="flex justify-between gap-2 text-accent font-semibold">
                <span>
                  상조 현금 캐시백 입금 ({result.lifeCareBasisTerm}개월 기준)
                </span>
                <span className="whitespace-nowrap shrink-0">
                  -{formatKRW(result.lifeCareMonthlyCashback)}
                </span>
              </div>
              <div className="pt-1.5 border-t border-rule flex justify-between gap-2 font-bold text-ink">
                <span>상조 결합 1차 월 체감가 (제휴카드 제외)</span>
                {result.phaseA.afterLifeCareSurplus > 0 ? (
                  <span className="text-positive whitespace-nowrap shrink-0">
                    0원 (매월 +{result.phaseA.afterLifeCareSurplus.toLocaleString('ko-KR')}원 입금)
                  </span>
                ) : (
                  <span className="text-ink whitespace-nowrap shrink-0">
                    월 {formatKRW(result.phaseA.afterLifeCareEffective)}
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* STEP 3: HI-CLASS AFFILIATE CARD */}
        <section
          aria-label="제휴카드 Hi-Class 롯데카드 필수 결제 및 캐시백 혜택"
          className="pt-5 border-t border-rule"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold tracking-tight text-ink flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-field text-ink text-[11px] font-mono font-bold">
                3
              </span>
              <CreditCard size={14} aria-hidden="true" className="text-ink-2" />
              Hi-Class 제휴카드 캐시백 (조건 충족 시)
            </span>
            <span className="px-2 py-0.5 rounded bg-ink text-on-ink text-[10px] font-bold shrink-0">
              필수 발급
            </span>
          </div>

          <div className="rounded-lg border border-rule bg-surface p-3.5 space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5 tabular-nums">
                <span className="font-medium text-ink-2">
                  상조 월 회비 제휴카드 자동납부 실적
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
              <div className="rounded-md bg-positive-soft border border-positive-rule px-3 py-2.5 flex items-start gap-2">
                <CheckCircle2 size={15} aria-hidden="true" className="text-positive shrink-0 mt-0.5" />
                <div className="text-[12px] text-positive leading-snug">
                  <span className="font-bold">
                    상조 회비 카드 납부만으로 전월 실적 30만 원 자동 충족
                  </span>
                  <div className="mt-0.5 font-medium tabular-nums">
                    추가 카드 지출 0원, 매월 {formatKRW(policy.cardMonthlyCashback)} 캐시백 확정
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="rounded-md bg-caution-soft border border-caution-rule px-3 py-2.5 flex items-start gap-2">
                  <AlertCircle size={15} aria-hidden="true" className="text-caution shrink-0 mt-0.5" />
                  <div className="text-[12px] text-caution leading-snug tabular-nums">
                    추가로 채울 전월 실적:{' '}
                    <strong className="font-bold">
                      월 {result.cardShortfall.toLocaleString('ko-KR')}원
                    </strong>
                    <span className="block text-[11px] mt-0.5">
                      상조 회비 외 생활비로 월 {result.cardShortfall.toLocaleString('ko-KR')}원 추가 사용 시 매월{' '}
                      {policy.cardMonthlyCashback.toLocaleString('ko-KR')}원 캐시백이 반영되어 0원 이하로 내려갑니다.
                    </span>
                  </div>
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
                  <span className="text-[12px] font-semibold">
                    생활비 월 {result.cardShortfall.toLocaleString('ko-KR')}원 추가 사용 반영
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded tabular-nums shrink-0 ${
                      result.cardCoverShortfall
                        ? 'bg-ink text-on-ink'
                        : 'bg-field text-ink-2'
                    }`}
                  >
                    {result.cardCoverShortfall
                      ? `ON (-${policy.cardMonthlyCashback.toLocaleString('ko-KR')}원)`
                      : '상조회비만 사용'}
                  </span>
                </button>
              </div>
            )}

            <div className="text-[11px] text-muted flex items-center justify-between gap-2 pt-1 border-t border-rule tabular-nums">
              <span>다품목·혼합 기간도 카드 혜택 중복 없이 1회 적용</span>
              <span className="font-bold text-ink-2">
                {result.cardBenefitActive
                  ? `${result.cardDurationMonths}개월간 월 ${formatKRW(result.cardMonthlyCashback)}`
                  : '미적용 (0원)'}
              </span>
            </div>
          </div>
        </section>

        {/* STEP 4: FINAL EFFECTIVE COST */}
        {!isEmpty && (
          <section
            aria-label="최종 고객 체감가 및 추가 캐시백 결과"
            className="pt-5 border-t border-rule"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold tracking-tight text-ink">
                최종 혜택 적용 결과
              </span>
              {isMixed && (
                <span className="text-[11px] font-semibold text-positive">
                  평균값 없이 구간별 실제 체감가 분리
                </span>
              )}
            </div>

            {isMixed && result.phaseB ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <PhaseResultCard
                    phase={result.phaseA}
                    isMixed
                    stepLabel="1~36개월차 구간"
                  />
                  <div className="flex sm:hidden justify-center -my-1 text-subtle">
                    <ArrowDown size={16} aria-hidden="true" />
                  </div>
                  <PhaseResultCard
                    phase={result.phaseB}
                    isMixed
                    stepLabel="37~60개월차 구간"
                  />
                </div>
              </div>
            ) : (
              <PhaseResultCard phase={result.phaseA} isMixed={false} />
            )}
          </section>
        )}

        {/* STEP 5: SEPARATE 120-MONTH LIFECARE MATURITY TIMELINE */}
        <section
          aria-label="상조 납입 거치 만기 환급 분리 안내"
          className="rounded-xl bg-field border border-rule p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={15} aria-hidden="true" className="text-ink shrink-0" />
              <h3 className="text-xs font-bold text-ink tracking-tight">
                구독프리드 120회 만기 원금 환급 일정
              </h3>
            </div>
            <span className="text-[11px] font-bold text-ink-2 tabular-nums shrink-0">
              {result.totalLifeCareUnits}구좌 기준
            </span>
          </div>

          {result.totalLifeCareUnits === 0 ? (
            <p className="text-xs text-muted leading-relaxed">
              구독프리드 상품(<strong className="text-ink">구독플러스 72, 90, 108</strong>)을 선택하시면{' '}
              <strong className="text-ink">90회 제휴카드 납입 후 30회 거치(0원), 120회 만기 원금 100% 환급</strong>{' '}
              일정이 자동 계산됩니다.
            </p>
          ) : (
            <>
              <div>
                <div className="flex h-2 w-full rounded-full overflow-hidden bg-rule">
                  <div
                    className="bg-ink"
                    style={{
                      width: `${Math.round(
                        (result.lifeCarePayMonths / result.lifeCareMaturityMonths) * 100,
                      )}%`,
                    }}
                  />
                  <div
                    className="bg-subtle"
                    style={{
                      width: `${Math.round(
                        (result.lifeCareDeferMonths / result.lifeCareMaturityMonths) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] font-semibold text-muted tabular-nums">
                  <span>1회차 카드납부</span>
                  <span>{result.lifeCarePayMonths}회 납입 완료</span>
                  <span className="text-positive font-bold">
                    {result.lifeCareMaturityMonths}회 만기 100% 환급
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-surface border border-rule p-2.5">
                  <div className="text-[10px] font-semibold text-muted tabular-nums">
                    1~{result.lifeCarePayMonths}회 납부
                  </div>
                  <div className="mt-1 text-[13px] font-bold text-ink tabular-nums">
                    월 {result.lifeCareMonthlyDues.toLocaleString('ko-KR')}원
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted tabular-nums">
                    총 {result.lifeCareMaturityRefundTotal.toLocaleString('ko-KR')}원
                  </div>
                </div>

                <div className="rounded-lg bg-surface border border-rule p-2.5">
                  <div className="text-[10px] font-semibold text-muted tabular-nums">
                    {result.lifeCarePayMonths + 1}~{result.lifeCareMaturityMonths}회 거치
                  </div>
                  <div className="mt-1 text-[13px] font-bold text-ink-2 tabular-nums">
                    월 0원
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted tabular-nums">
                    {result.lifeCareDeferMonths}회 납입 없음
                  </div>
                </div>

                <div className="rounded-lg bg-positive-soft border border-positive-rule p-2.5">
                  <div className="text-[10px] font-bold text-positive tabular-nums">
                    {result.lifeCareMaturityMonths}회 만기 환급
                  </div>
                  <div className="mt-1 text-[13px] font-extrabold text-positive tabular-nums">
                    <SpringNumber
                      value={result.lifeCareMaturityRefundTotal}
                      suffix="원"
                    />
                  </div>
                  <div className="mt-0.5 text-[10px] font-semibold text-positive">
                    원금 100% 환급
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted leading-relaxed">
                * 상조 서비스 미이용 후 {result.lifeCareMaturityMonths}회 만기 완료 익월 해지 신청 시,{' '}
                {result.lifeCarePayMonths}회 납입 원금{' '}
                <strong className="text-ink tabular-nums">
                  {formatKRW(result.lifeCareMaturityRefundTotal)}
                </strong>
                이 100% 환급됩니다. 표시된 제품 구독료는 월별 행사 일정에 따라 일부 변동될 수 있습니다.
              </p>
            </>
          )}
        </section>

        {/* Primary Consultation CTA */}
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
          <span>이 구성 상세 견적 및 환급표 받기</span>
          <Send size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
