import { useMemo, useState } from 'react'
import { Check, Eye, GripVertical, Plus } from 'lucide-react'
import { getProductEmpathyDetail } from '../data/productEmpathyDetails'
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
  selectedColor?: string
  onSelectColor?: (productId: string, colorName: string) => void
  onOpenDetail?: (product: ProductItem) => void
  onAdd: (productId: string, term: SubscriptionTerm) => void
  onSelectSingle?: (productId: string, term: SubscriptionTerm) => void
  onDragStartProduct?: (productId: string, term: SubscriptionTerm) => void
  onDragEndProduct?: () => void
}

export function ProductCard({
  product,
  policy = DEFAULT_POLICY_CONFIG,
  inCartCount,
  selectedColor,
  onSelectColor,
  onOpenDetail,
  onAdd,
  onSelectSingle,
  onDragStartProduct,
  onDragEndProduct,
}: ProductCardProps) {
  const supports36 = product.monthly36 !== null && product.monthly36 > 0
  const supports60 = product.monthly60 !== null && product.monthly60 > 0
  const supportsBothTerms = supports36 && supports60

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
  const empathy = useMemo(() => getProductEmpathyDetail(product), [product])
  const currentColor = selectedColor || empathy.colors[0]?.name || ''

  const careBadge = product.careTags.find((t) => t.includes('구독'))
  const highlightTags = product.careTags.filter((t) => t !== careBadge).slice(0, 2)

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
    window.setTimeout(() => setJustAdded(false), 750)
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
      className={`group flex flex-col h-full rounded-xl bg-surface border transition-colors duration-150 overflow-hidden ${
        inCartCount > 0
          ? 'border-ink ring-1 ring-ink'
          : 'border-rule hover:border-rule-strong'
      }`}
    >
      <div
        onClick={() => onOpenDetail?.(product)}
        className={`relative ${onOpenDetail ? 'cursor-pointer' : ''}`}
      >
        <ProductThumbnail
          src={product.imageUrl}
          alt={product.name}
          category={product.category}
          brand={product.brand}
          className="aspect-[4/3] w-full border-b border-rule"
        />
        <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface/95 border border-rule text-[11px] font-bold text-ink">
            {product.brand}
          </span>
          {careBadge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-field/95 border border-rule text-[10px] font-semibold text-ink-2">
              {careBadge}
            </span>
          )}
          {inCartCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-accent text-accent-ink text-[11px] font-bold tabular-nums">
              선택됨 {inCartCount}대
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

      <div className="flex flex-col flex-1 p-4">
        <div className="text-[11px] font-medium text-muted mb-1 flex items-center justify-between gap-2">
          <span className="truncate">{product.category}</span>
          <span className="font-mono text-[11px] text-subtle shrink-0 truncate max-w-[140px]">
            {product.modelCode}
          </span>
        </div>

        <h3
          onClick={() => onOpenDetail?.(product)}
          className={`text-[15px] font-bold text-ink leading-snug line-clamp-2 min-h-[2.625rem] break-keep ${
            onOpenDetail ? 'cursor-pointer hover:underline' : ''
          }`}
        >
          {product.name}
        </h3>

        {highlightTags.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {highlightTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded bg-field text-[11px] font-medium text-ink-2"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted line-clamp-2 leading-relaxed">
            {empathy.headline}
          </p>
        )}

        {/* Color Swatches + Empathy Detail Link */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap gap-1">
            {empathy.colors.slice(0, 2).map((cl) => {
              const isSel = currentColor === cl.name
              return (
                <button
                  key={cl.name}
                  type="button"
                  onClick={() => onSelectColor?.(product.id, cl.name)}
                  className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] border cursor-pointer ${
                    isSel
                      ? 'bg-field border-ink font-bold text-ink'
                      : 'bg-surface border-rule text-muted'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`w-2.5 h-2.5 rounded-full border border-rule-strong ${cl.swatchClass}`}
                  />
                  <span>{cl.name}</span>
                </button>
              )
            })}
          </div>

          {onOpenDetail && (
            <button
              type="button"
              onClick={() => onOpenDetail(product)}
              className="text-[11px] font-bold text-ink-2 underline underline-offset-2 hover:text-ink cursor-pointer"
            >
              케어·추천 상세
            </button>
          )}
        </div>

        <div className="mt-auto pt-3 space-y-2.5">
          {supportsBothTerms ? (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-field border border-rule">
              <button
                type="button"
                onClick={() => setSelectedTerm(36)}
                className={`py-1.5 px-2 rounded-md text-xs transition-colors duration-150 tabular-nums cursor-pointer ${
                  activeTerm === 36
                    ? 'bg-surface text-ink font-bold border border-rule'
                    : 'text-muted hover:text-ink font-medium'
                }`}
              >
                <span className="block text-[11px]">36개월 약정</span>
                <span className="block text-[11px] mt-0.5">
                  원 구독료 {formatKRW(product.monthly36!)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTerm(60)}
                className={`py-1.5 px-2 rounded-md text-xs transition-colors duration-150 tabular-nums cursor-pointer ${
                  activeTerm === 60
                    ? 'bg-surface text-ink font-bold border border-rule'
                    : 'text-muted hover:text-ink font-medium'
                }`}
              >
                <span className="block text-[11px]">60개월 약정</span>
                <span className="block text-[11px] mt-0.5">
                  원 구독료 {formatKRW(product.monthly60!)}
                </span>
              </button>
            </div>
          ) : (supports36 || supports60) ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface border border-rule text-xs tabular-nums">
              <span className="font-bold text-ink">{activeTerm}개월 공식 구독</span>
              <span className="font-semibold text-ink-2">
                원 구독료 월 {formatKRW(activePrice)}
              </span>
            </div>
          ) : null}

          {singleSim ? (
            <div className="rounded-lg bg-field border border-rule p-3 space-y-2 tabular-nums">
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                <span>구독 총액 ({activeTerm}개월 분할)</span>
                <span className="font-medium">
                  총 {totalContractAmount.toLocaleString('ko-KR')}원
                </span>
              </div>

              <div className="flex items-end justify-between gap-2">
                <div>
                  <span className="block text-xs font-bold text-ink">
                    추천 혜택 체감가
                  </span>
                  <span className="block text-[10px] font-bold text-positive">
                    만기 100% 환급형 ({singleSim.totalLifeCareUnits}구좌)
                  </span>
                </div>
                <span className="text-[20px] font-black text-ink tracking-tight whitespace-nowrap leading-none">
                  월 {singleSim.phaseA.afterLifeCareEffective.toLocaleString('ko-KR')}
                  <span className="text-xs font-bold ml-0.5">원</span>
                </span>
              </div>

              <div className="pt-2 border-t border-rule flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-ink-2">카드 사용 시</span>
                <span className="font-bold text-accent whitespace-nowrap">
                  월 {singleSim.phaseA.effectiveMonthlyPay.toLocaleString('ko-KR')}원
                  {singleSim.phaseA.monthlySurplusCash > 0 && (
                    <span className="ml-1 text-[11px] font-bold text-positive">
                      (+{singleSim.phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원)
                    </span>
                  )}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-caution-soft border border-caution-rule p-3 text-xs font-bold text-caution">
              관리자 페이지에서 구독료 입력 필요
            </div>
          )}

          <div className={`grid gap-2 ${onSelectSingle ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {onSelectSingle && (
              <button
                type="button"
                disabled={!supports36 && !supports60}
                onClick={() => onSelectSingle(product.id, activeTerm)}
                className={`inline-flex items-center justify-center gap-1 h-10 px-2.5 rounded-lg text-xs font-bold transition-colors duration-150 ${
                  !supports36 && !supports60
                    ? 'bg-field text-subtle border border-rule cursor-not-allowed'
                    : 'bg-ink hover:bg-ink-hover text-on-ink cursor-pointer'
                }`}
              >
                <Eye size={13} aria-hidden="true" />
                <span>단독 혜택 보기</span>
              </button>
            )}

            <button
              type="button"
              disabled={!supports36 && !supports60}
              onClick={handleAddClick}
              className={`inline-flex items-center justify-center gap-1 h-10 px-2.5 rounded-lg text-xs font-bold transition-colors duration-150 border ${
                !supports36 && !supports60
                  ? 'bg-field border-rule text-subtle cursor-not-allowed'
                  : justAdded
                    ? 'bg-positive border-positive text-on-ink cursor-pointer'
                    : inCartCount > 0
                      ? 'bg-accent-soft border-accent-rule text-accent cursor-pointer'
                      : 'bg-surface hover:bg-field border-rule-strong text-ink cursor-pointer'
              }`}
            >
              {justAdded ? (
                <>
                  <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                  <span>추가됨 ({inCartCount})</span>
                </>
              ) : (
                <>
                  <Plus size={13} strokeWidth={2.3} aria-hidden="true" />
                  <span>{inCartCount > 0 ? `추가하기 (${inCartCount})` : '추가하기'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
