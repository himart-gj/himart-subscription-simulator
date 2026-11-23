import { useEffect } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
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
  const phaseB = result.phaseB

  const hasLifeCareBenefit =
    result.totalLifeCareUnits > 0 && phaseA.lifeCareCashback > 0
  const hasCardBenefit = result.cardBenefitActive
  const isTwoStep = hasLifeCareBenefit && hasCardBenefit
  const hasFinalSurplus = phaseA.monthlySurplusCash > 0

  const cardProgressPct = Math.min(
    100,
    policy.cardMinSpend > 0
      ? Math.round((result.cardRecognizedSpend / policy.cardMinSpend) * 100)
      : 100,
  )

  const payYearsText =
    result.lifeCarePayMonths % 12 === 6
      ? `${Math.floor(result.lifeCarePayMonths / 12)}년 6개월`
      : `${(result.lifeCarePayMonths / 12).toFixed(0)}년`
  const maturityYearsText = `${Math.round(result.lifeCareMaturityMonths / 12)}년`
  const termPeriodText = isMixed
    ? '36·60개월 맞춤'
    : `${result.durationMonths || 60}개월`

  const activeTiers = result.lifeCarePerTier.filter((t) => t.quantity > 0)
  const lifeCarePlanSummary =
    activeTiers.length > 0
      ? activeTiers.map((t) => `${t.label} × ${t.quantity}구좌`).join(' + ')
      : `총 ${result.totalLifeCareUnits}구좌`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="선택한 가전 맞춤 혜택 결과"
      className="fixed inset-0 z-40 bg-paper flex flex-col overflow-hidden"
    >
      {/* Sticky Dedicated Result Header */}
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
      <div className="flex-1 overflow-y-auto pb-24 xl:pb-12">
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
              {/* Left / Primary: Single-Fact 4-Block Benefit Proposal */}
              <div className="xl:col-span-7 space-y-4">
                {/* [블록 1] 내 맞춤 구독 결론 영수증 카드 — 모달 내 유일 체감가 수식 */}
                <section
                  aria-label="내 맞춤 구독 결론 영수증"
                  className="rounded-xl bg-surface border border-ink overflow-hidden"
                >
                  <div className="px-5 py-3.5 bg-ink text-on-ink flex items-center justify-between gap-2">
                    <span className="text-sm font-bold tracking-tight">
                      내 맞춤 구독 결론 영수증 ({termPeriodText})
                    </span>
                    <span className="text-xs text-on-ink/80 tabular-nums shrink-0">
                      {autoOptimizeFreed ? '추천 자동맞춤 적용' : '선택 조건 적용'}
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 space-y-3.5 tabular-nums">
                    {/* 기준선: 가전 원 구독료 합계 */}
                    <div className="flex items-baseline justify-between gap-2 pb-3 border-b border-rule">
                      <div className="space-y-0.5">
                        <div className="text-xs sm:text-[13px] font-bold text-ink">
                          가전 원 구독료 합계 ({result.totalQuantity}대)
                        </div>
                        <div className="text-[11px] text-muted">
                          약정 기준 총액 {formatKRW(result.overallTotalGross)}
                          {isMixed &&
                            phaseB &&
                            ` · 1~36개월 월 ${phaseA.grossSubscription.toLocaleString('ko-KR')}원 / 37~60개월 월 ${phaseB.grossSubscription.toLocaleString('ko-KR')}원`}
                        </div>
                      </div>
                      <span className="text-sm sm:text-base font-extrabold text-ink whitespace-nowrap shrink-0">
                        월 {phaseA.grossSubscription.toLocaleString('ko-KR')}원
                      </span>
                    </div>

                    {/* 1단계: 구독플러스 현금지원 (활성 시에만 노출) */}
                    {hasLifeCareBenefit && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2 text-xs sm:text-[13px]">
                          <span className="font-bold text-accent">
                            (−) 구독플러스(Hi구독 플러스) 월 현금지원
                          </span>
                          <span className="font-extrabold text-accent whitespace-nowrap shrink-0">
                            월 -{phaseA.lifeCareCashback.toLocaleString('ko-KR')}원
                          </span>
                        </div>

                        {/* 2단 수식일 때만 중간 결론('카드 조건 없이도 기본 월 체감가') 노출 */}
                        {isTwoStep && (
                          <div className="rounded-xl bg-field border border-rule-strong p-3.5 space-y-2">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <div>
                                <div className="text-xs sm:text-[13px] font-bold text-ink">
                                  카드 조건 없이도 기본 월 체감가
                                </div>
                                <div className="text-[11px] text-muted">
                                  제휴카드 미사용 · 실적 부담 없는 기본 혜택가
                                </div>
                              </div>
                              <div className="ml-auto text-right">
                                <div className="flex items-baseline justify-end gap-1 whitespace-nowrap">
                                  <span className="text-xs font-bold text-ink">월</span>
                                  <SpringNumber
                                    value={phaseA.afterLifeCareEffective}
                                    suffix="원"
                                    className="text-xl sm:text-2xl font-black tracking-tight text-ink"
                                  />
                                </div>
                                {phaseA.afterLifeCareSurplus > 0 && (
                                  <div className="text-[11px] font-bold text-positive mt-0.5">
                                    +매월 {phaseA.afterLifeCareSurplus.toLocaleString('ko-KR')}원 계좌 입금
                                  </div>
                                )}
                              </div>
                            </div>

                            {isMixed && phaseB && (
                              <div className="pt-2 border-t border-rule grid grid-cols-2 gap-2">
                                <div className="rounded-lg bg-surface border border-rule px-2.5 py-1.5">
                                  <div className="text-[10px] font-semibold text-muted">
                                    1~36개월차 기본 체감
                                  </div>
                                  <div className="text-xs font-bold text-ink mt-0.5 whitespace-nowrap">
                                    {phaseA.afterLifeCareSurplus > 0
                                      ? `월 0원 (+${phaseA.afterLifeCareSurplus.toLocaleString('ko-KR')}원)`
                                      : `월 ${phaseA.afterLifeCareEffective.toLocaleString('ko-KR')}원`}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-surface border border-rule px-2.5 py-1.5">
                                  <div className="text-[10px] font-semibold text-muted">
                                    37~60개월차 기본 체감
                                  </div>
                                  <div className="text-xs font-bold text-ink mt-0.5 whitespace-nowrap">
                                    {phaseB.afterLifeCareSurplus > 0
                                      ? `월 0원 (+${phaseB.afterLifeCareSurplus.toLocaleString('ko-KR')}원)`
                                      : `월 ${phaseB.afterLifeCareEffective.toLocaleString('ko-KR')}원`}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2단계: 제휴카드 추가 혜택 줄 (카드 혜택 활성 시에만 노출) */}
                    {hasCardBenefit && (
                      <div className="flex items-center justify-between gap-2 text-xs sm:text-[13px] pt-0.5">
                        <span className="font-bold text-ink">
                          {isTwoStep
                            ? '(+) Hi-Class 롯데카드 추가 혜택 적용 시'
                            : '(−) Hi-Class 롯데카드 월 캐시백'}
                        </span>
                        <span className="font-extrabold text-accent whitespace-nowrap shrink-0">
                          월 -{policy.cardMonthlyCashback.toLocaleString('ko-KR')}원
                        </span>
                      </div>
                    )}

                    {/* 최종 월 체감가 결론 박스 — 모달 내 단 1회 노출 */}
                    <div className="rounded-xl bg-field border-2 border-ink p-4 space-y-2.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="text-xs sm:text-sm font-extrabold text-accent">
                            {isTwoStep
                              ? '제휴카드 추가 적용 시 최종 월 체감가'
                              : hasLifeCareBenefit
                                ? '카드 조건 없이 최종 월 체감가'
                                : hasCardBenefit
                                  ? '제휴카드 적용 최종 월 체감가'
                                  : '월 구독료 합계'}
                          </div>
                          <div className="text-[11px] text-muted">
                            {isMixed
                              ? '1~36개월차 기준 · 아래 구간별 변화 확인'
                              : `${termPeriodText} 약정 · 방문케어 포함`}
                          </div>
                        </div>

                        <div className="ml-auto flex items-baseline gap-1 whitespace-nowrap">
                          <span className="text-sm font-bold text-accent">월</span>
                          <SpringNumber
                            value={phaseA.effectiveMonthlyPay}
                            suffix="원"
                            className="text-[28px] sm:text-[34px] font-black tracking-tight text-accent leading-none"
                          />
                        </div>
                      </div>

                      {hasFinalSurplus && (
                        <div className="text-right">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-positive-soft border border-positive-rule text-positive text-xs font-extrabold">
                            +매월 {phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원 내 통장 입금
                          </span>
                        </div>
                      )}

                      {!hasCardBenefit && (
                        <p className="text-[11px] font-semibold text-ink-2">
                          ※ 제휴카드 실적 충족 시 여기서 매월{' '}
                          <strong className="font-bold text-accent">
                            -{policy.cardMonthlyCashback.toLocaleString('ko-KR')}원
                          </strong>{' '}
                          추가 캐시백이 더해집니다.
                        </p>
                      )}

                      {/* 36+60개월 혼합 약정 시 구간별 최종 월 체감가 나란히 비교 */}
                      {isMixed && phaseB && (
                        <div className="pt-2.5 border-t border-rule grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-surface border border-rule px-3 py-2">
                            <div className="text-[10.5px] font-bold text-ink-2">
                              1~36개월차 구간
                            </div>
                            <div className="text-sm font-black text-accent mt-0.5 whitespace-nowrap">
                              월 {phaseA.effectiveMonthlyPay.toLocaleString('ko-KR')}원
                            </div>
                            {phaseA.monthlySurplusCash > 0 && (
                              <div className="text-[10.5px] font-bold text-positive mt-0.5 whitespace-nowrap">
                                +월 {phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원 입금
                              </div>
                            )}
                          </div>

                          <div className="rounded-lg bg-positive-soft border border-positive-rule px-3 py-2">
                            <div className="text-[10.5px] font-bold text-positive">
                              37~60개월차 (36M 완납 후)
                            </div>
                            <div className="text-sm font-black text-positive mt-0.5 whitespace-nowrap">
                              월 {phaseB.effectiveMonthlyPay.toLocaleString('ko-KR')}원
                            </div>
                            {phaseB.monthlySurplusCash > 0 && (
                              <div className="text-[10.5px] font-extrabold text-positive mt-0.5 whitespace-nowrap">
                                +월 {phaseB.monthlySurplusCash.toLocaleString('ko-KR')}원 입금
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* [블록 2] 선택 가전 · 무상 케어 명세 — 차감 수식 반복 없는 순수 명세 */}
                <section
                  aria-label="선택 가전 및 케어 명세"
                  className="rounded-xl bg-surface border border-rule p-4 sm:p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-rule">
                    <span className="text-xs sm:text-[13px] font-bold text-ink">
                      선택 가전 · 무상 케어 명세 ({result.totalQuantity}대)
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
                      const careText =
                        line.product.careTags.length > 0
                          ? line.product.careTags.join(' · ')
                          : '전문가 방문케어 · 5년 무상 A/S 포함'
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
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="font-bold text-ink-2">
                                {line.product.brand}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-field border border-rule text-[10.5px] font-bold text-ink tabular-nums">
                                {line.term}개월 구독
                              </span>
                              {pickedColor && (
                                <span className="px-1.5 py-0.5 rounded bg-field text-[10px] font-semibold text-ink-2">
                                  {pickedColor}
                                </span>
                              )}
                              {line.quantity > 1 && (
                                <span className="font-bold text-accent tabular-nums">
                                  ×{line.quantity}대
                                </span>
                              )}
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-ink truncate hover:underline">
                              {line.product.name}
                            </div>
                            <div className="text-[11px] text-muted truncate">
                              {careText}
                            </div>
                          </div>
                          <div className="text-right tabular-nums shrink-0">
                            <div className="text-xs sm:text-[13px] font-bold text-ink whitespace-nowrap">
                              월 {line.lineTotal.toLocaleString('ko-KR')}원
                            </div>
                            <div className="text-[10.5px] text-muted whitespace-nowrap">
                              기준 {(line.contractTotal / 10000).toFixed(0)}만원
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                {/* [블록 3 - 카드 A] 만기 100% 원금 환급 3칸 타임라인 — 모달 내 유일 노출 */}
                {result.totalLifeCareUnits > 0 && (
                  <section
                    aria-label="100% 원금 환급 구조"
                    className="rounded-xl bg-surface border border-rule p-4 sm:p-5 space-y-3 tabular-nums"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-ink">
                        <ShieldCheck size={15} aria-hidden="true" className="text-positive shrink-0" />
                        <span>사라지는 비용이 아닌 100% 원금 환급 구조</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-positive-soft border border-positive-rule text-[11px] font-bold text-positive">
                        {lifeCarePlanSummary}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                      <div className="rounded-lg bg-field px-2 py-2.5 border border-rule">
                        <div className="text-[10px] font-medium text-muted">
                          1~{result.lifeCarePayMonths}회 적립
                        </div>
                        <div className="text-xs sm:text-[13px] font-bold text-ink mt-0.5 whitespace-nowrap">
                          월 {result.lifeCareMonthlyDues.toLocaleString('ko-KR')}원
                        </div>
                        <div className="text-[10px] text-muted mt-0.5">
                          {payYearsText} 별도납입
                        </div>
                      </div>
                      <div className="rounded-lg bg-field px-2 py-2.5 border border-rule">
                        <div className="text-[10px] font-medium text-muted">
                          {result.lifeCarePayMonths + 1}~{result.lifeCareMaturityMonths}회 거치
                        </div>
                        <div className="text-xs sm:text-[13px] font-bold text-ink mt-0.5 whitespace-nowrap">
                          월 0원
                        </div>
                        <div className="text-[10px] text-muted mt-0.5">추가 납입 없음</div>
                      </div>
                      <div className="rounded-lg bg-positive-soft px-2 py-2.5 border border-positive-rule">
                        <div className="text-[10px] font-bold text-positive">
                          {result.lifeCareMaturityMonths}회({maturityYearsText}) 만기
                        </div>
                        <div className="text-xs sm:text-[13px] font-extrabold text-positive mt-0.5 whitespace-nowrap">
                          <SpringNumber
                            value={result.lifeCareMaturityRefundTotal}
                            suffix="원"
                          />
                        </div>
                        <div className="text-[10px] font-bold text-positive/85 mt-0.5">
                          원금 100% 환급
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] font-semibold text-ink-2 leading-snug">
                      실납입은 {payYearsText}({result.lifeCarePayMonths}회)로 마감되며, 잔여 {result.lifeCareDeferMonths}회 0원 거치 후 {maturityYearsText}({result.lifeCareMaturityMonths}회) 만기 해지 신청 시 납입 원금 전액을 돌려받습니다 (상조·전환 서비스 미이용 시).
                    </p>
                  </section>
                )}

                {/* [블록 3 - 카드 B] 제휴카드 실적 게이지 바 — 모달 내 유일 노출 */}
                <section
                  aria-label="제휴카드 실적 충족 안내"
                  className="rounded-xl bg-surface border border-rule p-4 sm:p-5 space-y-3 tabular-nums"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-ink">
                      <CreditCard size={15} aria-hidden="true" className="text-ink-2 shrink-0" />
                      <span>Hi-Class 롯데카드 실적 · 적용 조건</span>
                    </span>
                    <span className="text-xs font-bold text-accent">
                      {hasCardBenefit
                        ? `월 -${policy.cardMonthlyCashback.toLocaleString('ko-KR')}원 캐시백 적용 중`
                        : '현재 미적용'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-ink-2">
                        구독플러스 납입금 카드 실적 인정
                      </span>
                      <span className="font-bold text-ink whitespace-nowrap">
                        {result.cardRecognizedSpend.toLocaleString('ko-KR')}원{' '}
                        <span className="text-muted font-normal">
                          / 목표 {policy.cardMinSpend.toLocaleString('ko-KR')}원
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-field overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          result.cardAutoMetByLifeCare ? 'bg-positive' : 'bg-ink'
                        }`}
                        style={{ width: `${cardProgressPct}%` }}
                      />
                    </div>
                  </div>

                  {result.cardAutoMetByLifeCare ? (
                    <div className="rounded-lg bg-positive-soft border border-positive-rule px-3 py-2 flex items-center gap-2 text-xs font-bold text-positive">
                      <CheckCircle2 size={14} aria-hidden="true" className="shrink-0" />
                      <span>
                        지원상품 자동납부만으로 전월 실적 자동 충족 (추가 카드 지출 0원)
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-field border border-rule px-3 py-2.5">
                      <span className="text-[11px] sm:text-xs text-ink-2 leading-snug">
                        납입금 외 평소 생활비{' '}
                        <strong className="font-bold text-ink">
                          월 {formatKRW(result.cardShortfall)}
                        </strong>
                        만 추가 사용 시 전월 실적 충족
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
                        {result.cardCoverShortfall ? '카드 혜택 ON' : '카드 미사용'}
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-muted leading-snug flex items-start gap-1.5">
                    <AlertCircle size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-caution" />
                    <span>
                      제휴카드 월 캐시백(-{policy.cardMonthlyCashback.toLocaleString('ko-KR')}원)은 가전 구독 약정 기간({isMixed ? 60 : result.durationMonths || 60}개월) 동안 적용됩니다.
                    </span>
                  </p>
                </section>

                {/* Primary Consultation CTA (Desktop Single Placement; Mobile uses Sticky Bottom Bar) */}
                <div className="hidden xl:block rounded-xl bg-surface border border-rule p-4 space-y-2">
                  <button
                    type="button"
                    onClick={onOpenConsultModal}
                    className="w-full h-12 px-4 rounded-lg bg-accent hover:bg-accent-hover text-accent-ink text-[15px] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <MessageSquare size={16} aria-hidden="true" className="shrink-0" />
                    <span>내 맞춤 견적 · 100% 환급 일정표 카톡·문자 받기</span>
                  </button>
                  <p className="text-[11px] text-muted text-center leading-snug">
                    신청만으로 가입·결제되지 않으며, 당월 경기광주점 추가 행사가까지 확인해 보내드립니다.
                  </p>
                </div>
              </div>

              {/* Right / Secondary: Slim Condition Controller Only (Zero Duplication) */}
              <div className="xl:col-span-5 xl:sticky xl:top-5">
                <ReceiptPanel
                  variant="controller"
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
