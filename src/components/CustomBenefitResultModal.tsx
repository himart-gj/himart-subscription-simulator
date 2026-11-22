import { useEffect } from 'react'
import {
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import type {
  CalculationResult,
  LifeCareUnits,
  PolicyConfig,
  ProductItem,
  SubscriptionTerm,
} from '../types/domain'
import { formatKRW } from '../utils/calculator'
import { ProductThumbnail } from './ProductThumbnail'
import { ReceiptPanel } from './ReceiptPanel'
import { SpringNumber } from './SpringNumber'

interface CustomBenefitResultModalProps {
  open: boolean
  originLabel: string
  result: CalculationResult
  policy: PolicyConfig
  autoOptimizeFreed: boolean
  selectedColorByProduct: Record<string, string>
  onToggleAutoOptimizeFreed: (enabled: boolean) => void
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
  onOpenProductDetail: (product: ProductItem) => void
  onOpenConsultModal: () => void
  onClose: () => void
}

export function CustomBenefitResultModal({
  open,
  originLabel,
  result,
  policy,
  autoOptimizeFreed,
  selectedColorByProduct,
  onToggleAutoOptimizeFreed,
  onUpdateCartQuantity,
  onSwitchCartItemTerm,
  onRemoveCartItem,
  onClearCart,
  onUpdateLifeCareUnit,
  onSetLifeCareUnits,
  onApplyZeroCostPreset,
  onToggleCoverShortfall,
  onOpenProductDetail,
  onOpenConsultModal,
  onClose,
}: CustomBenefitResultModalProps) {
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const isEmpty = result.mode === 'empty'
  const isMixed = result.mode === 'mixed'
  const phaseA = result.phaseA
  const hasExtraCashback = phaseA.monthlySurplusCash > 0

  const payYearsText =
    result.lifeCarePayMonths % 12 === 6
      ? `${Math.floor(result.lifeCarePayMonths / 12)}년 6개월`
      : `${(result.lifeCarePayMonths / 12).toFixed(0)}년`
  const maturityYearsText = `${Math.round(result.lifeCareMaturityMonths / 12)}년`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="선택한 가전 맞춤 혜택 결과"
      className="fixed inset-0 z-40 bg-paper flex flex-col overflow-hidden"
    >
      {/* Sticky Dedicated Result Header (Back & X both return to exact previous screen) */}
      <header className="shrink-0 bg-surface border-b border-rule px-4 sm:px-6 h-14 sm:h-15 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-field hover:bg-field-hover border border-rule-strong text-xs font-bold text-ink cursor-pointer shrink-0"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          <span>{originLabel}</span>
        </button>

        <h2 className="text-sm sm:text-base font-bold text-ink whitespace-nowrap">
          맞춤 혜택 결과
          {!isEmpty && (
            <span className="ml-1 text-xs font-extrabold text-accent tabular-nums">
              ({result.totalQuantity}대)
            </span>
          )}
        </h2>

        <button
          type="button"
          aria-label="결과 화면 닫고 이전 화면으로 돌아가기"
          onClick={onClose}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-surface hover:bg-field border border-rule-strong text-ink cursor-pointer shrink-0"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      {/* Scrollable Result Content */}
      <div className="flex-1 overflow-y-auto pb-28 xl:pb-12">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-5 sm:pt-7 space-y-6">
          {isEmpty ? (
            <div className="rounded-xl bg-surface border border-rule p-10 text-center space-y-4">
              <p className="text-base font-bold text-ink">
                선택된 가전이 비어 있습니다
              </p>
              <p className="text-xs text-muted">
                이전 화면으로 돌아가 원하는 가전을 다시 골라보세요.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-lg bg-ink text-on-ink text-xs font-bold cursor-pointer"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                <span>가전 다시 고르기</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Left / Primary: Big 2-Step Benefit Summary + Selected Appliances */}
              <div className="xl:col-span-7 space-y-5">
                <section className="rounded-xl bg-surface border border-ink overflow-hidden">
                  <div className="px-5 py-3.5 bg-ink text-on-ink flex items-center justify-between gap-2">
                    <span className="text-sm font-bold tracking-tight">
                      선택 가전 맞춤 혜택 설계표
                    </span>
                    <span className="text-xs text-on-ink/80 tabular-nums">
                      {isMixed
                        ? '36+60개월 혼합 약정'
                        : `${result.durationMonths || 60}개월 약정 기준`}
                    </span>
                  </div>

                  <div className="p-5 sm:p-6 space-y-4">
                    {/* Selected Appliances Preview */}
                    <div className="rounded-xl bg-surface border border-rule p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink">
                          선택한 가전 ({result.totalQuantity}대)
                        </span>
                        <button
                          type="button"
                          onClick={onClose}
                          className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline cursor-pointer"
                        >
                          <SlidersHorizontal size={12} aria-hidden="true" />
                          <span>가전 더 담거나 변경하기</span>
                        </button>
                      </div>

                      <div className="divide-y divide-rule">
                        {result.lines.map((line) => {
                          const pickedColor = selectedColorByProduct[line.product.id]
                          return (
                            <div
                              key={`res-${line.product.id}-${line.term}`}
                              onClick={() => onOpenProductDetail(line.product)}
                              className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3 cursor-pointer"
                            >
                              <ProductThumbnail
                                src={line.product.imageUrl}
                                alt={line.product.name}
                                category={line.product.category}
                                brand={line.product.brand}
                                className="w-14 h-12 rounded-lg shrink-0 border border-rule bg-field"
                                iconSize={18}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                  <span className="font-bold text-ink-2">
                                    {line.product.brand}
                                  </span>
                                  <span className="text-muted tabular-nums">
                                    {line.term}개월
                                  </span>
                                  {pickedColor && (
                                    <span className="px-1.5 py-0.5 rounded bg-field text-[10px] font-semibold text-ink-2">
                                      {pickedColor}
                                    </span>
                                  )}
                                  {line.quantity > 1 && (
                                    <span className="font-bold text-accent tabular-nums">
                                      ×{line.quantity}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs sm:text-sm font-bold text-ink truncate hover:underline">
                                  {line.product.name}
                                </div>
                              </div>
                              <div className="text-right tabular-nums shrink-0">
                                <div className="text-xs font-bold text-ink">
                                  월 {line.lineTotal.toLocaleString('ko-KR')}원
                                </div>
                                <div className="text-[10px] text-muted">
                                  총 {(line.contractTotal / 10000).toFixed(0)}만원
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Step 1 Primary Hero Price */}
                    <div className="rounded-xl bg-field border border-ink p-4 sm:p-5 space-y-3.5 tabular-nums">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink">
                          {autoOptimizeFreed ? '추천상품 자동맞춤 혜택가' : '선택 구좌 적용 혜택가'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-positive-soft border border-positive-rule text-[11px] font-bold text-positive">
                          만기 시 납입금 100% 환급형
                        </span>
                      </div>

                      <div className="space-y-1 text-xs border-b border-rule pb-3">
                        <div className="flex items-center justify-between gap-2 text-ink-2">
                          <span>가전 원 구독료 ({phaseA.label} 약정 분할)</span>
                          <span className="font-semibold text-ink whitespace-nowrap shrink-0">
                            월 {phaseA.grossSubscription.toLocaleString('ko-KR')}원
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-accent font-semibold">
                          <span>구독플러스 현금 지원 (매월 내 계좌 입금)</span>
                          <span className="whitespace-nowrap shrink-0">-월 {phaseA.lifeCareCashback.toLocaleString('ko-KR')}원</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-xs sm:text-[13px] font-bold text-ink-2">
                          카드 실적 전 기본 월 체감가
                        </span>
                        <div className="flex items-baseline gap-1 whitespace-nowrap">
                          <span className="text-sm font-bold text-ink">월</span>
                          <SpringNumber
                            value={phaseA.afterLifeCareEffective}
                            suffix="원"
                            className="text-[30px] sm:text-[34px] font-black tracking-tight text-ink"
                          />
                        </div>
                      </div>

                      {phaseA.afterLifeCareSurplus > 0 && (
                        <div className="text-right text-xs font-bold text-positive">
                          매월 +{phaseA.afterLifeCareSurplus.toLocaleString('ko-KR')}원 계좌 입금
                        </div>
                      )}

                      {isMixed && result.phaseB && (
                        <div className="pt-2 border-t border-rule flex items-center justify-between gap-2 text-xs text-ink-2">
                          <span>37~60개월차 기본 월 체감가</span>
                          <span className="font-bold text-ink">
                            {result.phaseB.afterLifeCareSurplus > 0
                              ? `월 0원 (+${result.phaseB.afterLifeCareSurplus.toLocaleString('ko-KR')}원/월)`
                              : `월 ${result.phaseB.afterLifeCareEffective.toLocaleString('ko-KR')}원`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 100% Principal Refund Structure */}
                    {result.totalLifeCareUnits > 0 && (
                      <div className="rounded-xl bg-surface border border-rule p-3.5 sm:p-4 space-y-2.5 tabular-nums">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                            <ShieldCheck size={15} aria-hidden="true" className="text-positive shrink-0" />
                            <span>사라지는 비용이 아닌 100% 원금 환급 구조</span>
                          </span>
                          <span className="text-xs font-extrabold text-positive">
                            만기 수령 <SpringNumber value={result.lifeCareMaturityRefundTotal} suffix="원" />
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          <div className="rounded-lg bg-field px-2 py-2 border border-rule">
                            <div className="text-[10px] font-medium text-muted">
                              1~{result.lifeCarePayMonths}회 ({payYearsText})
                            </div>
                            <div className="text-xs font-bold text-ink mt-0.5">
                              월 {result.lifeCareMonthlyDues.toLocaleString('ko-KR')}원
                            </div>
                            <div className="text-[10px] text-muted mt-0.5">실납입 마감</div>
                          </div>
                          <div className="rounded-lg bg-field px-2 py-2 border border-rule">
                            <div className="text-[10px] font-medium text-muted">
                              {result.lifeCarePayMonths + 1}~{result.lifeCareMaturityMonths}회 거치
                            </div>
                            <div className="text-xs font-bold text-ink mt-0.5">월 0원</div>
                            <div className="text-[10px] text-muted mt-0.5">추가 납입 없음</div>
                          </div>
                          <div className="rounded-lg bg-positive-soft px-2 py-2 border border-positive-rule">
                            <div className="text-[10px] font-bold text-positive">
                              {result.lifeCareMaturityMonths}회 ({maturityYearsText}) 만기
                            </div>
                            <div className="text-xs font-extrabold text-positive mt-0.5">
                              100% 전액 환급
                            </div>
                            <div className="text-[10px] text-positive/85 mt-0.5">미이용 해지 기준</div>
                          </div>
                        </div>

                        <p className="text-[11px] font-semibold text-ink-2 leading-snug pt-0.5">
                          실납입은 {payYearsText}({result.lifeCarePayMonths}회)로 끝나며, 잔여 {result.lifeCareDeferMonths}회 0원 거치 후 {maturityYearsText}({result.lifeCareMaturityMonths}회) 만기 시 원금 전액을 돌려받습니다.
                        </p>
                      </div>
                    )}

                    {/* Step 2 Bonus Card Benefit */}
                    <div className="rounded-xl bg-surface border border-rule-strong p-4 space-y-2.5 tabular-nums">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink">
                          + 제휴카드 사용 시 추가 혜택
                        </span>
                        <span className="text-xs font-bold text-accent">
                          {result.cardBenefitActive
                            ? `-월 ${policy.cardMonthlyCashback.toLocaleString('ko-KR')}원 캐시백`
                            : '미적용'}
                        </span>
                      </div>

                      {result.cardAutoMetByLifeCare ? (
                        <p className="text-[11px] font-semibold text-positive">
                          월 납입금({formatKRW(result.cardRecognizedSpend)}) 카드 자동납부만으로 전월 30만 원 실적 자동 충족 (추가 지출 0원)
                        </p>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-field px-3 py-2">
                          <span className="text-[11px] text-ink-2 leading-snug">
                            납입금 외 평소 생활비{' '}
                            <strong className="font-bold text-ink">
                              월 {formatKRW(result.cardShortfall)} 카드 사용 시
                            </strong>{' '}
                            (전월 30만 원 조건 충족)
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={result.cardCoverShortfall}
                            onClick={() => onToggleCoverShortfall(!result.cardCoverShortfall)}
                            className={`self-start sm:self-auto px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                              result.cardCoverShortfall
                                ? 'bg-ink border-ink text-on-ink'
                                : 'bg-surface border-rule-strong text-ink-2'
                            }`}
                          >
                            {result.cardCoverShortfall ? '카드 사용 ON' : '카드 미사용'}
                          </button>
                        </div>
                      )}

                      <div className="pt-2.5 border-t border-rule flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-xs font-bold text-ink-2">
                          제휴카드 사용 시 체감가
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg sm:text-xl font-black text-accent">
                            월 <SpringNumber value={phaseA.effectiveMonthlyPay} suffix="원" />
                          </span>
                          {hasExtraCashback && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-positive-soft border border-positive-rule text-positive text-xs font-bold">
                              매월 +{phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원 통장 입금
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Primary Consultation CTA */}
                    <div className="space-y-2 pt-0.5">
                      <button
                        type="button"
                        onClick={onOpenConsultModal}
                        className="w-full h-12 px-4 rounded-lg bg-accent hover:bg-accent-hover text-accent-ink text-sm sm:text-[15px] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <MessageSquare size={16} aria-hidden="true" className="shrink-0" />
                        <span>내 맞춤 견적 · 100% 환급 일정표 카톡·문자 받기</span>
                      </button>
                      <p className="text-[11px] text-muted text-center leading-snug">
                        신청만으로 가입·결제되지 않으며, 당월 경기광주점 추가 행사가까지 확인해 보내드립니다.
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right / Secondary: Detailed Unit & Term Adjuster */}
              <div className="xl:col-span-5">
                <ReceiptPanel
                  result={result}
                  policy={policy}
                  isDraggingProduct={false}
                  autoOptimizeFreed={autoOptimizeFreed}
                  onToggleAutoOptimizeFreed={onToggleAutoOptimizeFreed}
                  onDropProduct={() => {}}
                  onUpdateCartQuantity={onUpdateCartQuantity}
                  onSwitchCartItemTerm={onSwitchCartItemTerm}
                  onRemoveCartItem={onRemoveCartItem}
                  onClearCart={onClearCart}
                  onUpdateLifeCareUnit={onUpdateLifeCareUnit}
                  onSetLifeCareUnits={onSetLifeCareUnits}
                  onApplyZeroCostPreset={onApplyZeroCostPreset}
                  onToggleCoverShortfall={onToggleCoverShortfall}
                  onOpenConsultModal={onOpenConsultModal}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar Inside Dedicated Result Screen */}
      {!isEmpty && (
        <div className="xl:hidden fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-rule-strong px-3.5 py-2.5">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 h-10 px-3 rounded-lg bg-field hover:bg-field-hover border border-rule-strong text-xs font-bold text-ink cursor-pointer shrink-0"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>이전 화면</span>
            </button>

            <button
              type="button"
              onClick={onOpenConsultModal}
              className="flex-1 h-10 px-4 rounded-lg bg-accent hover:bg-accent-hover text-accent-ink text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <MessageSquare size={14} aria-hidden="true" />
              <span>카톡·문자로 이 견적표 받기</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
