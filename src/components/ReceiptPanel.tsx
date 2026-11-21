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
  Sparkles,
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
  onToggleCardEnabled: (enabled: boolean) => void
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
  const isSurplus = phase.monthlySurplusCash > 0

  if (isSurplus) {
    return (
      <div className="rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#047857]">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{stepLabel || `${phase.label} 실제 청구 비교`}</span>
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white text-[#059669] border border-[#A7F3D0] tabular-nums shrink-0">
              {phase.months}개월 구간
            </span>
          </div>

          <div className="text-xs font-semibold text-[#065F46] tabular-nums space-y-0.5 mb-3">
            <div className="flex justify-between gap-2">
              <span>월 구독 청구액</span>
              <span>{formatKRW(phase.grossSubscription)}</span>
            </div>
            <div className="flex justify-between gap-2 text-[#059669]">
              <span>총 월 캐시백 지원</span>
              <span>-{formatKRW(phase.totalMonthlyBenefit)}</span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#A7F3D0]/80">
          <div className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#047857] mb-1">
            <span>체감 구독료 0원</span>
            <span className="text-[#059669]">·</span>
            <span>전액 상쇄 후 추가 현금 입금</span>
          </div>
          <div className="flex items-baseline gap-1 text-[#059669]">
            <span className="text-xs font-bold">매월</span>
            <SpringNumber
              value={phase.monthlySurplusCash}
              prefix="+"
              suffix="원"
              className={`${isMixed ? 'text-xl' : 'text-[26px]'} font-extrabold tracking-tight`}
            />
          </div>
          <div className="mt-1.5 inline-flex items-center px-2 py-1 rounded-lg bg-white/90 border border-[#A7F3D0] text-[11px] font-bold text-[#047857] tabular-nums">
            {phase.months}개월 총 +{phase.phaseTotalSurplus.toLocaleString('ko-KR')}원 현금 잉여
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-[#0F172A] text-white p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold text-[#CBD5E1]">
            {stepLabel || `${phase.label} 실제 청구 비교`}
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-[#E2E8F0] tabular-nums shrink-0">
            {phase.months}개월 구간
          </span>
        </div>

        <div className="text-xs text-[#94A3B8] tabular-nums space-y-0.5 mb-3">
          <div className="flex justify-between gap-2">
            <span>월 구독 청구액</span>
            <span className="text-[#E2E8F0]">{formatKRW(phase.grossSubscription)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>총 월 캐시백 지원</span>
            <span className="text-[#34D399]">-{formatKRW(phase.totalMonthlyBenefit)}</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-white/10">
        <div className="text-[11px] font-medium text-[#94A3B8] mb-0.5">
          혜택 반영 후 월 실질 체감가
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-semibold text-[#CBD5E1]">월</span>
          <SpringNumber
            value={phase.effectiveMonthlyPay}
            suffix="원"
            className={`${isMixed ? 'text-xl' : 'text-[26px]'} font-extrabold tracking-tight text-white`}
          />
        </div>
        {phase.totalMonthlyBenefit > 0 && (
          <div className="mt-1.5 text-[11px] font-medium text-[#34D399] tabular-nums">
            {phase.months}개월간 총 {phase.phaseTotalBenefit.toLocaleString('ko-KR')}원 지원 반영
          </div>
        )}
      </div>
    </div>
  )
}

export function ReceiptPanel({
  result,
  policy,
  isDraggingProduct,
  onDropProduct,
  onUpdateCartQuantity,
  onSwitchCartItemTerm,
  onRemoveCartItem,
  onClearCart,
  onUpdateLifeCareUnit,
  onSetLifeCareUnits,
  onApplyZeroCostPreset,
  onToggleCardEnabled,
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
      className={`rounded-2xl bg-white border transition-all duration-150 overflow-hidden shadow-[0_2px_10px_rgba(15,23,42,0.04)] ${
        dragOver
          ? 'border-[#E11D48] ring-2 ring-[#E11D48]/20 bg-[#FFF1F2]/20'
          : isDraggingProduct
            ? 'border-[#E11D48] border-dashed'
            : 'border-[#E2E8F0]'
      }`}
    >
      {/* Receipt Header */}
      <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#FFFFFF] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
            <ShoppingBag size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-extrabold text-[#0F172A] tracking-tight truncate">
              실시간 맞춤 혜택 영수증
            </h2>
            <p className="text-[11px] font-medium text-[#64748B] truncate">
              구독료 · 구독프리드 · 클래스카드 대조
            </p>
          </div>
        </div>

        {!isEmpty && (
          <button
            type="button"
            onClick={onClearCart}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw size={13} />
            <span>비우기</span>
          </button>
        )}
      </div>

      <div className="p-5 space-y-6">
        {/* Drop hint banner when dragging */}
        {isDraggingProduct && (
          <div className="rounded-xl border border-dashed border-[#E11D48] bg-[#FFF1F2] px-4 py-3 text-center text-xs font-bold text-[#BE123C]">
            여기에 상품을 놓으면 구독함에 바로 담깁니다
          </div>
        )}

        {/* ==================== STEP A: CART SUMMARY ==================== */}
        <section aria-label="내 구독 장바구니 요약">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-extrabold tracking-tight text-[#0F172A] uppercase flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#F1F5F9] text-[#0F172A] text-[11px] font-extrabold">
                A
              </span>
              내 구독 장바구니
              <span className="text-[#E11D48] tabular-nums">({result.totalQuantity})</span>
            </span>
            {!isEmpty && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] tabular-nums">
                {isMixed
                  ? '36+60개월 혼합 구성'
                  : `${result.durationMonths}개월 단일 구성`}
              </span>
            )}
          </div>

          {isEmpty ? (
            <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center">
              <p className="text-sm font-bold text-[#334155]">
                구독할 가전을 담아 혜택을 비교해 보세요
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                좌측 추천 세트를 한 번에 담거나, 단품을 클릭·드래그하여 자유롭게 구성할 수 있습니다.
              </p>
              {onQuickTrySample && (
                <button
                  type="button"
                  onClick={onQuickTrySample}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs font-bold text-[#0F172A] transition-colors cursor-pointer"
                >
                  <Sparkles size={14} className="text-[#E11D48]" />
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
                    className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-[#64748B]">
                          {line.product.brand}
                        </div>
                        <div className="text-[13px] font-bold text-[#0F172A] leading-snug">
                          {line.product.name}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`${line.product.name} 삭제`}
                        onClick={() => onRemoveCartItem(line.product.id, line.term)}
                        className="p-1 text-[#94A3B8] hover:text-[#E11D48] transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                      {/* Inline 36/60 switcher */}
                      <div className="inline-flex rounded-lg bg-white border border-[#E2E8F0] p-0.5">
                        <button
                          type="button"
                          disabled={!can36}
                          onClick={() =>
                            line.term !== 36 &&
                            can36 &&
                            onSwitchCartItemTerm(line.product.id, line.term, 36)
                          }
                          className={`px-2 py-1 rounded-md text-[11px] font-bold tabular-nums transition-colors ${
                            !can36
                              ? 'text-[#CBD5E1] cursor-not-allowed'
                              : line.term === 36
                                ? 'bg-[#0F172A] text-white'
                                : 'text-[#64748B] hover:text-[#0F172A] cursor-pointer'
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
                          className={`px-2 py-1 rounded-md text-[11px] font-bold tabular-nums transition-colors ${
                            !can60
                              ? 'text-[#CBD5E1] cursor-not-allowed'
                              : line.term === 60
                                ? 'bg-[#0F172A] text-white'
                                : 'text-[#64748B] hover:text-[#0F172A] cursor-pointer'
                          }`}
                        >
                          60개월
                        </button>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {/* Quantity stepper */}
                        <div className="inline-flex items-center rounded-lg bg-white border border-[#E2E8F0]">
                          <button
                            type="button"
                            aria-label="수량 감소"
                            onClick={() =>
                              onUpdateCartQuantity(line.product.id, line.term, -1)
                            }
                            className="w-7 h-7 flex items-center justify-center text-[#475569] hover:text-[#0F172A] cursor-pointer"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-[#0F172A] tabular-nums">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="수량 증가"
                            onClick={() =>
                              onUpdateCartQuantity(line.product.id, line.term, 1)
                            }
                            className="w-7 h-7 flex items-center justify-center text-[#475569] hover:text-[#0F172A] cursor-pointer"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <div className="text-[13px] font-extrabold text-[#0F172A] tabular-nums min-w-[72px] text-right">
                          {formatKRW(line.lineTotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Mixed-Mode Automatic Notice Banner */}
              {isMixed && (
                <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-3 flex items-start gap-2">
                  <Info size={15} className="text-[#D97706] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#92400E] leading-relaxed font-medium">
                    <strong className="font-bold">
                      60개월 상품 포함으로 상조·카드 혜택이 60개월 기준으로 통일 적용됩니다.
                    </strong>{' '}
                    월 구독 청구액은 평균내지 않고 실제 청구 구간(1~36개월차 / 37~60개월차)으로
                    정확히 분리 계산됩니다.
                  </p>
                </div>
              )}

              {/* Billing Subtotals */}
              <div className="rounded-xl bg-white border border-[#E2E8F0] px-3.5 py-3 space-y-1.5">
                {isMixed && result.phaseB ? (
                  <>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-[#475569]">
                        1~36개월차 월 구독 청구액 (36+60 합산)
                      </span>
                      <span className="text-sm font-extrabold text-[#0F172A] tabular-nums whitespace-nowrap shrink-0">
                        {formatKRW(result.phaseA.grossSubscription)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs pt-1.5 border-t border-[#F1F5F9]">
                      <span className="font-semibold text-[#059669]">
                        37~60개월차 월 구독 청구액 (60개월분만)
                      </span>
                      <span className="text-sm font-extrabold text-[#059669] tabular-nums whitespace-nowrap shrink-0">
                        {formatKRW(result.phaseB.grossSubscription)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-[#475569]">
                      기본 월 구독 청구액 ({result.durationMonths}개월)
                    </span>
                    <span className="text-[15px] font-extrabold text-[#0F172A] tabular-nums whitespace-nowrap shrink-0">
                      월 {result.phaseA.grossSubscription.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ==================== STEP B: 1ST COMPARISON — LIFECARE (구독프리드) ==================== */}
        <section
          aria-label="1순위 대조 제휴상품 구독프리드 선택기"
          className="pt-5 border-t border-[#E2E8F0]"
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-extrabold tracking-tight text-[#0F172A] flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#FFF1F2] text-[#E11D48] text-[11px] font-extrabold">
                1
              </span>
              1순위 대조 · 구독프리드 (라이프케어)
            </span>
            <span className="text-xs font-extrabold text-[#0F172A] tabular-nums">
              선택 구좌:{' '}
              <span className={result.totalLifeCareUnits > 0 ? 'text-[#E11D48]' : ''}>
                {result.totalLifeCareUnits}
              </span>{' '}
              / 최대 {policy.maxLifeCareUnits}구좌
            </span>
          </div>

          {/* 12-unit segmented gauge bar */}
          <div className="grid grid-cols-12 gap-1 mb-3" aria-hidden="true">
            {Array.from({ length: policy.maxLifeCareUnits }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-colors duration-150 ${
                  i < result.totalLifeCareUnits ? 'bg-[#E11D48]' : 'bg-[#E2E8F0]'
                }`}
              />
            ))}
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => onSetLifeCareUnits({ q40: 0, q50: 0, q60: 0 })}
              className="px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[11px] font-semibold text-[#475569] transition-colors cursor-pointer"
            >
              초기화
            </button>
            <button
              type="button"
              disabled={isEmpty}
              title="제휴카드 혜택 제외, 구독프리드 지원금만으로 월 구독료 0원이 되는 맞춤 구좌를 추천합니다"
              onClick={onApplyZeroCostPreset}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                isEmpty
                  ? 'bg-[#F8FAFC] border-[#E2E8F0] text-[#CBD5E1] cursor-not-allowed'
                  : 'bg-[#FFF1F2] hover:bg-[#FFE4E6] border-[#FECDD3] text-[#BE123C] cursor-pointer'
              }`}
            >
              구독료 0원 맞춤 추천
            </button>
            <button
              type="button"
              onClick={() => onSetLifeCareUnits({ q40: 0, q50: 6, q60: 0 })}
              className="px-2.5 py-1.5 rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#A7F3D0] text-[11px] font-bold text-[#047857] transition-colors cursor-pointer"
            >
              카드실적 30만원 자동충족(5만×6)
            </button>
            <button
              type="button"
              onClick={() =>
                onSetLifeCareUnits({ q40: 0, q50: 0, q60: policy.maxLifeCareUnits })
              }
              className="px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[11px] font-bold text-[#0F172A] transition-colors cursor-pointer"
            >
              최대 혜택({policy.maxLifeCareUnits}구좌)
            </button>
          </div>

          {/* 3 Tier Steppers */}
          <div className="space-y-2">
            {result.lifeCarePerTier.map((tier) => {
              const atCap = result.totalLifeCareUnits >= policy.maxLifeCareUnits
              return (
                <div
                  key={tier.key}
                  className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border transition-colors ${
                    tier.quantity > 0
                      ? 'bg-[#FFF1F2]/40 border-[#FECDD3]'
                      : 'bg-white border-[#E2E8F0]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-[#0F172A]">
                        {tier.label}
                      </span>
                      <span className="text-[11px] font-medium text-[#64748B] tabular-nums">
                        (월 회비 {tier.unitDues.toLocaleString('ko-KR')}원)
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-[#059669] tabular-nums mt-0.5">
                      {result.lifeCareBasisTerm}개월 기준 · 구좌당 월{' '}
                      {tier.unitCashback.toLocaleString('ko-KR')}원 현금 캐시백
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={tier.quantity <= 0}
                      aria-label={`${tier.label} 구좌 감소`}
                      onClick={() => onUpdateLifeCareUnit(tier.key, -1)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all active:scale-[0.96] ${
                        tier.quantity <= 0
                          ? 'bg-[#F8FAFC] border-[#E2E8F0] text-[#CBD5E1] cursor-not-allowed'
                          : 'bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer'
                      }`}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-extrabold text-[#0F172A] tabular-nums">
                      {tier.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={atCap}
                      aria-label={`${tier.label} 구좌 증가`}
                      onClick={() => onUpdateLifeCareUnit(tier.key, 1)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all active:scale-[0.96] ${
                        atCap
                          ? 'bg-[#F8FAFC] border-[#E2E8F0] text-[#CBD5E1] cursor-not-allowed'
                          : 'bg-[#0F172A] border-[#0F172A] text-white hover:bg-[#1E293B] cursor-pointer'
                      }`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 1st Comparison Result Row */}
          {!isEmpty && (
            <div className="mt-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2.5 text-xs space-y-1 tabular-nums">
              <div className="flex justify-between gap-2 text-[#475569]">
                <span>기본 월 구독료 ({result.phaseA.label})</span>
                <span className="font-semibold text-[#0F172A] whitespace-nowrap shrink-0">
                  {formatKRW(result.phaseA.grossSubscription)}
                </span>
              </div>
              <div className="flex justify-between gap-2 text-[#059669] font-semibold">
                <span>
                  구독프리드 월 현금 캐시백 ({result.lifeCareBasisTerm}개월 기준)
                </span>
                <span className="whitespace-nowrap shrink-0">
                  -{formatKRW(result.lifeCareMonthlyCashback)}
                </span>
              </div>
              <div className="pt-1.5 border-t border-[#E2E8F0] flex justify-between gap-2 font-bold text-[#0F172A]">
                <span>1차 대조 후 체감 금액</span>
                {result.phaseA.afterLifeCareSurplus > 0 ? (
                  <span className="text-[#059669] whitespace-nowrap shrink-0">
                    0원 (+{result.phaseA.afterLifeCareSurplus.toLocaleString('ko-KR')}원 잉여)
                  </span>
                ) : (
                  <span className="whitespace-nowrap shrink-0">
                    {formatKRW(result.phaseA.afterLifeCareEffective)}
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ==================== STEP C: 2ND COMPARISON — HI-CLASS LOTTE CARD ==================== */}
        <section
          aria-label="2순위 대조 롯데하이마트 클래스카드 실적 및 혜택"
          className="pt-5 border-t border-[#E2E8F0]"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-extrabold tracking-tight text-[#0F172A] flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#F1F5F9] text-[#0F172A] text-[11px] font-extrabold">
                2
              </span>
              <CreditCard size={14} className="text-[#475569]" />
              2순위 대조 · Hi-Class 롯데카드
            </span>

            {/* Master Card ON/OFF */}
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <span className="text-[11px] font-semibold text-[#475569]">
                {result.cardEnabled ? '혜택 반영' : '카드 미발급'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={result.cardEnabled}
                onClick={() => onToggleCardEnabled(!result.cardEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-150 cursor-pointer ${
                  result.cardEnabled ? 'bg-[#0F172A]' : 'bg-[#CBD5E1]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform duration-150 mt-0.5 ${
                    result.cardEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          </div>

          {result.cardEnabled ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 space-y-3">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5 tabular-nums">
                  <span className="font-semibold text-[#475569]">
                    구독프리드 월 회비 실적 인정액
                  </span>
                  <span className="font-extrabold text-[#0F172A]">
                    {result.cardRecognizedSpend.toLocaleString('ko-KR')}원{' '}
                    <span className="text-[#94A3B8] font-medium">
                      / {policy.cardMinSpend.toLocaleString('ko-KR')}원
                    </span>
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      result.cardAutoMetByLifeCare ? 'bg-[#059669]' : 'bg-[#D97706]'
                    }`}
                    style={{ width: `${cardProgressPct}%` }}
                  />
                </div>
              </div>

              {result.cardAutoMetByLifeCare ? (
                <div className="rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-2.5 flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-[#059669] shrink-0 mt-0.5" />
                  <div className="text-[12px] text-[#065F46] leading-snug">
                    <span className="font-extrabold">
                      구독프리드 회비만으로 실적 30만 원 충족 완료!
                    </span>
                    <div className="mt-0.5 font-semibold text-[#059669] tabular-nums">
                      추가 카드 지출 0원 · 매월 {formatKRW(policy.cardMonthlyCashback)} 입금 확정
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="rounded-lg bg-[#FFFBEB] border border-[#FDE68A] px-3 py-2.5 flex items-start gap-2">
                    <AlertCircle size={15} className="text-[#D97706] shrink-0 mt-0.5" />
                    <div className="text-[12px] text-[#92400E] leading-snug tabular-nums">
                      모자란 전월 실적:{' '}
                      <strong className="font-extrabold">
                        월 {result.cardShortfall.toLocaleString('ko-KR')}원
                      </strong>
                      <span className="block text-[11px] text-[#B45309] mt-0.5">
                        일반 생활비 등으로 월 {result.cardShortfall.toLocaleString('ko-KR')}원 추가
                        사용 시 월 {policy.cardMonthlyCashback.toLocaleString('ko-KR')}원 입금
                      </span>
                    </div>
                  </div>

                  {/* Interactive shortfall cover switch */}
                  <button
                    type="button"
                    onClick={() => onToggleCoverShortfall(!result.cardCoverShortfall)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      result.cardCoverShortfall
                        ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <span className="text-[12px] font-bold">
                      부족한 금액을 일반 생활비로 채워서 카드 혜택 받기
                    </span>
                    <span
                      className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md tabular-nums shrink-0 ${
                        result.cardCoverShortfall
                          ? 'bg-[#059669] text-white'
                          : 'bg-[#E2E8F0] text-[#475569]'
                      }`}
                    >
                      {result.cardCoverShortfall
                        ? `ON (-${policy.cardMonthlyCashback.toLocaleString('ko-KR')}원)`
                        : 'OFF'}
                    </span>
                  </button>
                </div>
              )}

              <div className="text-[11px] text-[#64748B] flex items-center justify-between gap-2 pt-1 border-t border-[#F1F5F9] tabular-nums">
                <span>복수 품목·혼합 기간도 중복 없이 1회 적용</span>
                <span className="font-bold text-[#334155]">
                  {result.cardBenefitActive
                    ? `${result.cardDurationMonths}개월간 월 ${formatKRW(result.cardMonthlyCashback)}`
                    : '미적용 (0원)'}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2.5 text-xs text-[#64748B]">
              제휴카드 미발급 기준으로 계산 중입니다. (카드 혜택 0원)
            </div>
          )}
        </section>

        {/* ==================== STEP D: FINAL EFFECTIVE COST / SURPLUS HIGHLIGHT ==================== */}
        {!isEmpty && (
          <section
            aria-label="최종 월 체감가 및 초과 캐시백 결과"
            className="pt-5 border-t border-[#E2E8F0]"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-extrabold tracking-tight text-[#0F172A]">
                최종 혜택 비교 결과
              </span>
              {isMixed && (
                <span className="text-[11px] font-bold text-[#059669]">
                  평균값 없이 구간별 실제 청구 분리
                </span>
              )}
            </div>

            {isMixed && result.phaseB ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <PhaseResultCard
                    phase={result.phaseA}
                    isMixed
                    stepLabel="구간 A · 1~36개월차"
                  />
                  <div className="flex sm:hidden justify-center -my-1 text-[#94A3B8]">
                    <ArrowDown size={16} />
                  </div>
                  <PhaseResultCard
                    phase={result.phaseB}
                    isMixed
                    stepLabel="구간 B · 37~60개월차"
                  />
                </div>
              </div>
            ) : (
              <PhaseResultCard phase={result.phaseA} isMixed={false} />
            )}
          </section>
        )}

        {/* ==================== STEP E: SEPARATE 120-MONTH LIFECARE MATURITY TIMELINE ==================== */}
        <section
          aria-label="상조 납입 거치 만기 환급 분리 안내"
          className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-[#0F172A] shrink-0" />
              <h3 className="text-xs font-extrabold text-[#0F172A] tracking-tight">
                구독프리드 납입 · 거치 · 120회 만기 환급 (별도 안내)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-[#64748B] tabular-nums shrink-0">
              {result.totalLifeCareUnits}구좌 기준
            </span>
          </div>

          {result.totalLifeCareUnits === 0 ? (
            <p className="text-xs text-[#64748B] leading-relaxed">
              위에서 구독프리드 구좌(4만·5만·6만 원권)를 선택하시면{' '}
              <strong className="text-[#334155]">90회 납입 → 30회 거치(0원) → 120회 만기 원금 100% 환급</strong>{' '}
              타임라인이 자동 계산됩니다.
            </p>
          ) : (
            <>
              {/* Visual 3-stage bar: 90 pay (75%) + 30 defer (25%) */}
              <div>
                <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-[#E2E8F0]">
                  <div
                    className="bg-[#0F172A]"
                    style={{
                      width: `${Math.round(
                        (result.lifeCarePayMonths / result.lifeCareMaturityMonths) * 100,
                      )}%`,
                    }}
                  />
                  <div
                    className="bg-[#94A3B8]/60"
                    style={{
                      width: `${Math.round(
                        (result.lifeCareDeferMonths / result.lifeCareMaturityMonths) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] font-bold text-[#64748B] tabular-nums">
                  <span>1회차 시작</span>
                  <span>{result.lifeCarePayMonths}회 납입 완료</span>
                  <span className="text-[#059669]">
                    {result.lifeCareMaturityMonths}회 만기 100% 환급
                  </span>
                </div>
              </div>

              {/* 3-stage explicit timeline cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white border border-[#E2E8F0] p-2.5">
                  <div className="text-[10px] font-bold text-[#64748B] tabular-nums">
                    1~{result.lifeCarePayMonths}회차 납입
                  </div>
                  <div className="mt-1 text-[13px] font-extrabold text-[#0F172A] tabular-nums">
                    월 {result.lifeCareMonthlyDues.toLocaleString('ko-KR')}원
                  </div>
                  <div className="mt-0.5 text-[10px] font-medium text-[#64748B] tabular-nums">
                    총 {result.lifeCareMaturityRefundTotal.toLocaleString('ko-KR')}원
                  </div>
                </div>

                <div className="rounded-xl bg-white border border-[#E2E8F0] p-2.5">
                  <div className="text-[10px] font-bold text-[#64748B] tabular-nums">
                    {result.lifeCarePayMonths + 1}~{result.lifeCareMaturityMonths}회차 거치
                  </div>
                  <div className="mt-1 text-[13px] font-extrabold text-[#475569] tabular-nums">
                    월 0원
                  </div>
                  <div className="mt-0.5 text-[10px] font-medium text-[#64748B] tabular-nums">
                    {result.lifeCareDeferMonths}회 납입 없음
                  </div>
                </div>

                <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-2.5">
                  <div className="text-[10px] font-bold text-[#047857] tabular-nums">
                    {result.lifeCareMaturityMonths}회 만기 환급
                  </div>
                  <div className="mt-1 text-[13px] font-extrabold text-[#059669] tabular-nums">
                    <SpringNumber
                      value={result.lifeCareMaturityRefundTotal}
                      suffix="원"
                    />
                  </div>
                  <div className="mt-0.5 text-[10px] font-semibold text-[#047857]">
                    원금 100% 환급
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[#64748B] leading-relaxed">
                * 상조(라이프케어) 서비스 미이용 후 {result.lifeCareMaturityMonths}회 만기 완료 익월
                해지 신청 시, {result.lifeCarePayMonths}회 납입 원금{' '}
                <strong className="text-[#0F172A] tabular-nums">
                  {formatKRW(result.lifeCareMaturityRefundTotal)}
                </strong>
                이 100% 환급됩니다. (가전 구독 계약과 별도 체결)
              </p>
            </>
          )}
        </section>

        {/* Primary Consultation CTA */}
        <button
          type="button"
          disabled={isEmpty}
          onClick={onOpenConsultModal}
          className={`w-full h-12 rounded-xl text-[15px] font-extrabold flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] ${
            isEmpty
              ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
              : 'bg-[#E11D48] hover:bg-[#BE123C] text-white shadow-[0_2px_8px_rgba(225,29,72,0.22)] cursor-pointer'
          }`}
        >
          <CalendarCheck2 size={18} />
          <span>이 구성으로 맞춤 견적 저장 · 상담 예약</span>
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
