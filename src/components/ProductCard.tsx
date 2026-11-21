import { useMemo, useState } from 'react'
import { Check, GripVertical, Plus } from 'lucide-react'
import type { PolicyConfig, ProductItem, SubscriptionTerm } from '../types/domain'
import {
  DEFAULT_POLICY_CONFIG,
  calculateBenefitSimulation,
  formatKRW,
  recommendZeroCostLifeCare,
} from '../utils/calculator'
import { ProductThumbnail } from './ProductThumbnail'

interface ProductCardProps {
  product: ProductItem
  policy?: PolicyConfig
  inCartCount: number
  onAdd: (productId: string, term: SubscriptionTerm) => void
  onSelectSingle?: (productId: string, term: SubscriptionTerm) => void
  onDragStartProduct?: (productId: string, term: SubscriptionTerm) => void
  onDragEndProduct?: () => void
}

export function ProductCard({
  product,
  policy = DEFAULT_POLICY_CONFIG,
  inCartCount,
  onAdd,
  onSelectSingle,
  onDragStartProduct,
  onDragEndProduct,
}: ProductCardProps) {
  const supports36 = product.monthly36 !== null && product.monthly36 > 0
  const supports60 = product.monthly60 !== null && product.monthly60 > 0

  const defaultTerm: SubscriptionTerm = supports60 ? 60 : 36
  const [selectedTerm, setSelectedTerm] = useState<SubscriptionTerm>(defaultTerm)
  const [justAdded, setJustAdded] = useState(false)

  const activeTerm: SubscriptionTerm =
    selectedTerm === 36 && supports36
      ? 36
      : selectedTerm === 60 && supports60
        ? 60
        : defaultTerm

  const activePrice =
    activeTerm === 36 ? (product.monthly36 ?? 0) : (product.monthly60 ?? 0)
  const totalContractAmount = activePrice * activeTerm

  // Real-time single-product effective monthly price simulation (천원단위 상조 + 제휴카드 혜택 반영)
  const singleSim = useMemo(() => {
    if (!supports36 && !supports60) return null
    const singleCart = [{ productId: product.id, term: activeTerm, quantity: 1 }]
    const recUnits = recommendZeroCostLifeCare({
      cart: singleCart,
      products: [product],
      policy,
    })
    return calculateBenefitSimulation({
      cart: singleCart,
      products: [product],
      lifeCare: recUnits,
      cardEnabled: true,
      coverShortfallWithLivingSpend: true,
      policy,
    })
  }, [product, activeTerm, policy, supports36, supports60])

  const handleAddClick = () => {
    onAdd(product.id, activeTerm)
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 650)
  }

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          'application/json',
          JSON.stringify({ productId: product.id, term: activeTerm }),
        )
        e.dataTransfer.effectAllowed = 'copy'
        onDragStartProduct?.(product.id, activeTerm)
      }}
      onDragEnd={() => onDragEndProduct?.()}
      className="group flex flex-col h-full rounded-xl bg-surface border border-rule hover:border-rule-strong transition-colors duration-150 overflow-hidden"
    >
      {/* Product Studio Image */}
      <div className="relative">
        <ProductThumbnail
          src={product.imageUrl}
          alt={product.name}
          category={product.category}
          brand={product.brand}
          className="aspect-[4/3] w-full border-b border-rule"
        />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface border border-rule text-[11px] font-bold text-ink">
            {product.brand}
          </span>
          {inCartCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-ink text-on-ink text-[11px] font-bold tabular-nums">
              담김 {inCartCount}
            </span>
          )}
        </div>
        <div
          title="우측 명세서로 끌어다 놓을 수 있습니다"
          className="hidden xl:flex absolute top-2.5 right-2.5 items-center gap-0.5 px-1.5 py-1 rounded bg-surface border border-rule text-[11px] font-medium text-muted opacity-80 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={13} aria-hidden="true" />
          <span>드래그</span>
        </div>
      </div>

      {/* Editorial Product Details */}
      <div className="flex flex-col flex-1 p-4">
        <div className="text-[11px] font-medium text-muted mb-1 flex items-center justify-between gap-2">
          <span className="truncate">{product.category}</span>
          <span className="font-mono text-[11px] text-subtle shrink-0">
            {product.modelCode}
          </span>
        </div>

        <h3 className="text-[15px] font-bold text-ink leading-snug line-clamp-2 min-h-[2.625rem] break-keep">
          {product.name}
        </h3>

        {/* Quiet Specification Tags */}
        <div className="mt-2 flex flex-wrap gap-1 min-h-[1.5rem]">
          {product.careTags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded bg-field text-[11px] font-medium text-ink-2"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Term Switcher + Real-Time Effective Monthly Price Breakdown */}
        <div className="mt-auto pt-3.5 space-y-2.5">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-field border border-rule">
            <button
              type="button"
              disabled={!supports36}
              onClick={() => supports36 && setSelectedTerm(36)}
              className={`py-1.5 px-2 rounded-md text-xs transition-colors duration-150 tabular-nums ${
                !supports36
                  ? 'text-subtle cursor-not-allowed'
                  : activeTerm === 36
                    ? 'bg-surface text-ink font-bold border border-rule'
                    : 'text-muted hover:text-ink font-medium cursor-pointer'
              }`}
            >
              <span className="block text-[11px]">36개월 약정</span>
              <span className="block text-[11px] mt-0.5">
                {supports36 ? `원금 월 ${formatKRW(product.monthly36!)}` : '미지원'}
              </span>
            </button>
            <button
              type="button"
              disabled={!supports60}
              onClick={() => supports60 && setSelectedTerm(60)}
              className={`py-1.5 px-2 rounded-md text-xs transition-colors duration-150 tabular-nums ${
                !supports60
                  ? 'text-subtle cursor-not-allowed'
                  : activeTerm === 60
                    ? 'bg-surface text-ink font-bold border border-rule'
                    : 'text-muted hover:text-ink font-medium cursor-pointer'
              }`}
            >
              <span className="block text-[11px]">60개월 약정</span>
              <span className="block text-[11px] mt-0.5">
                {supports60 ? `원금 월 ${formatKRW(product.monthly60!)}` : '미지원'}
              </span>
            </button>
          </div>

          {/* Real-Time Effective Price Ledger (solves raw-principal confusion) */}
          {singleSim ? (
            <div className="rounded-lg bg-field border border-rule p-3 space-y-1.5 tabular-nums">
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                <span>원 구독료 (총 {totalContractAmount.toLocaleString('ko-KR')}원)</span>
                <span className="line-through">
                  월 {activePrice.toLocaleString('ko-KR')}원
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-ink-2">
                  상조 결합 1차 체감가 ({singleSim.totalLifeCareUnits}구좌)
                </span>
                <span className="font-bold text-ink">
                  월 {singleSim.phaseA.afterLifeCareEffective.toLocaleString('ko-KR')}원
                </span>
              </div>

              <div className="pt-1.5 border-t border-rule flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-bold text-ink">
                  제휴카드 캐시백 포함
                </span>
                <div className="text-right">
                  <span className="text-[18px] font-black text-accent tracking-tight whitespace-nowrap">
                    월 체감 {singleSim.phaseA.effectiveMonthlyPay.toLocaleString('ko-KR')}
                    <span className="text-xs font-bold ml-0.5">원</span>
                  </span>
                  {singleSim.phaseA.monthlySurplusCash > 0 && (
                    <span className="block text-[11px] font-bold text-positive">
                      매월 +{singleSim.phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원 현금 입금
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-caution-soft border border-caution-rule p-3 text-xs font-bold text-caution">
              관리자 페이지에서 구독료 입력 필요
            </div>
          )}

          {/* Action Row: 1 Filled Primary + 1 Outlined Secondary (Zero AI Sparkles) */}
          <div className={`grid gap-2 ${onSelectSingle ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {onSelectSingle && (
              <button
                type="button"
                disabled={!supports36 && !supports60}
                onClick={() => onSelectSingle(product.id, activeTerm)}
                className={`inline-flex items-center justify-center h-10 px-2.5 rounded-lg text-xs font-bold transition-colors duration-150 ${
                  !supports36 && !supports60
                    ? 'bg-field text-subtle border border-rule cursor-not-allowed'
                    : 'bg-ink hover:bg-ink-hover text-on-ink cursor-pointer'
                }`}
              >
                <span>이 제품만 선택</span>
              </button>
            )}

            <button
              type="button"
              disabled={!supports36 && !supports60}
              onClick={handleAddClick}
              className={`inline-flex items-center justify-center gap-1 h-10 px-2.5 rounded-lg text-xs font-semibold transition-colors duration-150 border ${
                !supports36 && !supports60
                  ? 'bg-field border-rule text-subtle cursor-not-allowed'
                  : justAdded
                    ? 'bg-positive border-positive text-on-ink cursor-pointer'
                    : 'bg-surface hover:bg-field border-rule-strong text-ink cursor-pointer'
              }`}
            >
              {justAdded ? (
                <>
                  <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                  <span>담김</span>
                </>
              ) : (
                <>
                  <Plus size={13} strokeWidth={2.2} aria-hidden="true" />
                  <span>{onSelectSingle ? '함께 담기' : '담기'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
