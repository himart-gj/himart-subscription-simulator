import { useState } from 'react'
import { Check, GripVertical, MousePointerClick, Plus } from 'lucide-react'
import type { ProductItem, SubscriptionTerm } from '../types/domain'
import { formatKRW } from '../utils/calculator'
import { ProductThumbnail } from './ProductThumbnail'

interface ProductCardProps {
  product: ProductItem
  inCartCount: number
  onAdd: (productId: string, term: SubscriptionTerm) => void
  onSelectSingle?: (productId: string, term: SubscriptionTerm) => void
  onDragStartProduct?: (productId: string, term: SubscriptionTerm) => void
  onDragEndProduct?: () => void
}

export function ProductCard({
  product,
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
      className="group flex flex-col h-full rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors duration-150 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
    >
      <div className="relative">
        <ProductThumbnail
          src={product.imageUrl}
          alt={product.name}
          category={product.category}
          brand={product.brand}
          className="aspect-[4/3] w-full border-b border-[#F1F5F9]"
        />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/95 border border-[#E2E8F0] text-[11px] font-semibold text-[#0F172A] tracking-tight">
            {product.brand}
          </span>
          {inCartCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#0F172A] text-white text-[11px] font-semibold tabular-nums">
              담김 {inCartCount}
            </span>
          )}
        </div>
        <div
          title="우측 구독함으로 끌어다 놓을 수 있습니다"
          className="hidden xl:flex absolute top-2.5 right-2.5 items-center gap-0.5 px-1.5 py-1 rounded-md bg-white/90 border border-[#E2E8F0] text-[11px] font-medium text-[#64748B] opacity-75 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={13} aria-hidden="true" />
          <span>드래그</span>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-4">
        <div className="text-[11px] font-medium text-[#64748B] mb-1 flex items-center justify-between gap-2">
          <span className="truncate">{product.category}</span>
          <span className="font-mono text-[11px] text-[#94A3B8] shrink-0">
            {product.modelCode}
          </span>
        </div>

        <h3 className="text-[15px] font-bold text-[#0F172A] leading-snug line-clamp-2 min-h-[2.625rem]">
          {product.name}
        </h3>

        <div className="mt-2.5 flex flex-wrap gap-1 min-h-[1.5rem]">
          {product.careTags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] font-medium text-[#475569]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <button
              type="button"
              disabled={!supports36}
              onClick={() => supports36 && setSelectedTerm(36)}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors duration-150 tabular-nums ${
                !supports36
                  ? 'text-[#CBD5E1] cursor-not-allowed'
                  : activeTerm === 36
                    ? 'bg-white text-[#0F172A] shadow-xs ring-1 ring-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#0F172A] cursor-pointer'
              }`}
            >
              <span className="block text-[11px]">36개월 분할결제</span>
              <span className="block text-[12px] font-bold mt-0.5">
                {supports36 ? `월 ${formatKRW(product.monthly36!)}` : '미지원'}
              </span>
            </button>
            <button
              type="button"
              disabled={!supports60}
              onClick={() => supports60 && setSelectedTerm(60)}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors duration-150 tabular-nums ${
                !supports60
                  ? 'text-[#CBD5E1] cursor-not-allowed'
                  : activeTerm === 60
                    ? 'bg-white text-[#0F172A] shadow-xs ring-1 ring-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#0F172A] cursor-pointer'
              }`}
            >
              <span className="block text-[11px]">60개월 분할결제</span>
              <span className="block text-[12px] font-bold mt-0.5">
                {supports60 ? `월 ${formatKRW(product.monthly60!)}` : '미지원'}
              </span>
            </button>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-medium text-[#64748B]">
                {supports36 || supports60
                  ? `제휴카드 ${activeTerm}개월 결제 (월 환산)`
                  : '구독료 미등록'}
              </span>
              {(supports36 || supports60) && (
                <span className="text-[11px] font-semibold text-[#94A3B8] tabular-nums">
                  총 {totalContractAmount.toLocaleString('ko-KR')}원
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[18px] font-extrabold text-[#0F172A] tabular-nums tracking-tight whitespace-nowrap">
              {supports36 || supports60 ? (
                <>
                  월 {activePrice.toLocaleString('ko-KR')}
                  <span className="text-[13px] font-semibold text-[#475569] ml-0.5">원</span>
                </>
              ) : (
                <span className="text-[13px] font-bold text-[#D97706]">
                  CMS 가격 입력 필요
                </span>
              )}
            </div>
            {(supports36 || supports60) && (
              <div className="text-[11px] font-bold text-[#059669]">
                선택 시 천원단위 상조 + 카드 혜택 자동 맞춤
              </div>
            )}
          </div>

          <div className={`grid gap-2 ${onSelectSingle ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {onSelectSingle && (
              <button
                type="button"
                disabled={!supports36 && !supports60}
                onClick={() => onSelectSingle(product.id, activeTerm)}
                className={`inline-flex items-center justify-center gap-1 h-10 px-2.5 rounded-xl text-xs font-extrabold transition-colors duration-150 active:scale-[0.98] ${
                  !supports36 && !supports60
                    ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                    : 'bg-[#E11D48] hover:bg-[#BE123C] text-white cursor-pointer'
                }`}
              >
                <MousePointerClick size={14} aria-hidden="true" />
                <span>이 제품만 선택</span>
              </button>
            )}

            <button
              type="button"
              disabled={!supports36 && !supports60}
              onClick={handleAddClick}
              className={`inline-flex items-center justify-center gap-1 h-10 px-2.5 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-[0.98] ${
                !supports36 && !supports60
                  ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                  : justAdded
                    ? 'bg-[#059669] text-white cursor-pointer'
                    : 'bg-[#0F172A] hover:bg-[#1E293B] text-white cursor-pointer'
              }`}
            >
              {justAdded ? (
                <>
                  <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                  <span>담김</span>
                </>
              ) : (
                <>
                  <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
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
