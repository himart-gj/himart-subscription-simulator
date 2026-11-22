import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, ShieldCheck, X } from 'lucide-react'
import { getProductEmpathyDetail } from '../data/productEmpathyDetails'
import type { PolicyConfig, ProductItem, SubscriptionTerm } from '../types/domain'
import {
  calculateBenefitSimulation,
  formatKRW,
  recommendZeroCostLifeCare,
} from '../utils/calculator'
import { ProductThumbnail } from './ProductThumbnail'

interface ProductDetailModalProps {
  product: ProductItem | null
  allProducts: ProductItem[]
  policy: PolicyConfig
  selectedColorByProduct: Record<string, string>
  onSelectColor: (productId: string, colorName: string) => void
  onNavigateProduct: (product: ProductItem) => void
  onChooseProduct: (productId: string, term: SubscriptionTerm, colorName?: string) => void
  onClose: () => void
}

export function ProductDetailModal({
  product,
  allProducts,
  policy,
  selectedColorByProduct,
  onSelectColor,
  onNavigateProduct,
  onChooseProduct,
  onClose,
}: ProductDetailModalProps) {
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const supports36 = Boolean(product && product.monthly36 !== null && product.monthly36 > 0)
  const supports60 = Boolean(product && product.monthly60 !== null && product.monthly60 > 0)
  const defaultTerm: SubscriptionTerm = supports60 ? 60 : 36
  const [termOverrides, setTermOverrides] = useState<Record<string, SubscriptionTerm>>({})
  const term: SubscriptionTerm = product ? (termOverrides[product.id] ?? defaultTerm) : defaultTerm
  const setTerm = (next: SubscriptionTerm) => {
    if (!product) return
    setTermOverrides((prev) => ({ ...prev, [product.id]: next }))
  }

  const currentIdx = useMemo(
    () => (product ? allProducts.findIndex((p) => p.id === product.id) : -1),
    [product, allProducts],
  )
  const hasPrev = currentIdx > 0
  const hasNext = currentIdx >= 0 && currentIdx < allProducts.length - 1

  useEffect(() => {
    if (!product) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigateProduct(allProducts[currentIdx - 1])
      if (e.key === 'ArrowRight' && hasNext) onNavigateProduct(allProducts[currentIdx + 1])
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [product, hasPrev, hasNext, currentIdx, allProducts, onNavigateProduct, onClose])

  const detail = useMemo(
    () => (product ? getProductEmpathyDetail(product) : null),
    [product],
  )

  const activeTerm: SubscriptionTerm =
    term === 36 && supports36 ? 36 : term === 60 && supports60 ? 60 : defaultTerm

  const sim = useMemo(() => {
    if (!product || (!supports36 && !supports60)) return null
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

  if (!product || !detail) return null

  const activeColor =
    selectedColorByProduct[product.id] || detail.colors[0]?.name || ''

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} 상세 추천 정보`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/55 p-0 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          const t = e.touches[0]
          if (!t) return
          touchStartX.current = t.clientX
          touchStartY.current = t.clientY
        }}
        onTouchEnd={(e) => {
          const t = e.changedTouches[0]
          if (!t || touchStartX.current === null || touchStartY.current === null) return
          const dx = t.clientX - touchStartX.current
          const dy = t.clientY - touchStartY.current
          touchStartX.current = null
          touchStartY.current = null
          if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            if (dx > 0 && hasPrev) onNavigateProduct(allProducts[currentIdx - 1])
            if (dx < 0 && hasNext) onNavigateProduct(allProducts[currentIdx + 1])
          }
        }}
        className="relative w-full sm:max-w-2xl max-h-[92dvh] flex flex-col rounded-t-2xl sm:rounded-xl bg-surface border border-rule-strong overflow-hidden"
      >
        {/* Top Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-surface border-b border-rule flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-ink text-on-ink font-bold">
              {product.brand}
            </span>
            <span className="text-muted font-medium">{product.category}</span>
            {currentIdx >= 0 && (
              <span className="text-subtle font-mono tabular-nums">
                ({currentIdx + 1}/{allProducts.length})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!hasPrev}
              aria-label="이전 가전 보기"
              onClick={() => hasPrev && onNavigateProduct(allProducts[currentIdx - 1])}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                hasPrev
                  ? 'border-rule-strong text-ink hover:bg-field cursor-pointer'
                  : 'border-rule text-subtle cursor-not-allowed'
              }`}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={!hasNext}
              aria-label="다음 가전 보기"
              onClick={() => hasNext && onNavigateProduct(allProducts[currentIdx + 1])}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                hasNext
                  ? 'border-rule-strong text-ink hover:bg-field cursor-pointer'
                  : 'border-rule text-subtle cursor-not-allowed'
              }`}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="닫기"
              onClick={onClose}
              className="ml-1 w-8 h-8 rounded-lg hover:bg-field flex items-center justify-center text-ink-2 cursor-pointer"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Empathy Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            <div className="sm:col-span-5">
              <ProductThumbnail
                src={product.imageUrl}
                alt={product.name}
                category={product.category}
                brand={product.brand}
                className="aspect-[4/3] w-full rounded-xl border border-rule bg-field"
                iconSize={32}
              />
            </div>

            <div className="sm:col-span-7 space-y-2.5">
              <div className="text-[11px] font-mono text-muted">{product.modelCode}</div>
              <h2 className="text-lg sm:text-xl font-bold text-ink leading-snug break-keep">
                {product.name}
              </h2>
              <p className="text-xs sm:text-[13px] font-semibold text-accent leading-relaxed break-keep">
                {detail.headline}
              </p>

              {/* Interior Color Finish Selector */}
              {detail.colors.length > 0 && (
                <div className="pt-1 space-y-1.5">
                  <span className="block text-[11px] font-bold text-ink-2">
                    선호 색상 선택 (상담 시 재고 우선 확인)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.colors.map((c) => {
                      const isSel = activeColor === c.name
                      return (
                        <button
                          key={c.name}
                          type="button"
                          aria-pressed={isSel}
                          onClick={() => onSelectColor(product.id, c.name)}
                          className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                            isSel
                              ? 'bg-field border-ink text-ink font-bold'
                              : 'bg-surface border-rule text-ink-2 hover:border-rule-strong'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`w-3.5 h-3.5 rounded-full border border-rule-strong ${c.swatchClass}`}
                          />
                          <span>{c.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Core Features */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-ink">핵심 특징 및 하이마트 구독 케어</h3>
            <ul className="space-y-1.5">
              {detail.points.map((pt) => (
                <li key={pt} className="flex items-start gap-2 text-xs sm:text-[13px] text-ink-2">
                  <Check size={15} aria-hidden="true" className="text-accent shrink-0 mt-0.5" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Lifestyle Empathy Section ("이런 분께 추천해요") */}
          <div className="rounded-xl bg-field border border-rule p-4 space-y-2.5">
            <h3 className="text-xs sm:text-[13px] font-bold text-ink">
              이런 집 · 고객님께 특히 추천해요
            </h3>
            <ul className="space-y-1 text-xs sm:text-[13px] text-ink-2">
              {detail.recommendFor.map((rec) => (
                <li key={rec} className="flex items-start gap-2">
                  <span aria-hidden="true" className="font-bold text-accent">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
            <p className="pt-2 border-t border-rule text-xs font-medium text-ink leading-relaxed">
              <strong className="font-bold text-accent mr-1">추천 이유</strong>
              {detail.whyGood}
            </p>
          </div>

          {/* Term Switch + 2-Step Price Preview */}
          {sim && (
            <div className="rounded-xl bg-surface border border-ink p-4 space-y-3 tabular-nums">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-ink">{supports36 && supports60 ? "약정 기간별 맞춤 혜택가 미리보기" : `${activeTerm}개월 공식 약정 혜택가 미리보기`}</span>
                <div className="inline-flex rounded-md bg-field border border-rule p-0.5">
                  {supports36 && (
                    <button
                      type="button"
                      onClick={() => setTerm(36)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                        activeTerm === 36 ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink'
                      }`}
                    >
                      36개월
                    </button>
                  )}
                  {supports60 && (
                    <button
                      type="button"
                      onClick={() => setTerm(60)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                        activeTerm === 60 ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink'
                      }`}
                    >
                      60개월
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-field px-3.5 py-2.5 border border-rule">
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span>추천 혜택 체감가</span>
                    <span className="line-through">
                      원금 {formatKRW(sim.phaseA.grossSubscription)}
                    </span>
                  </div>
                  <div className="mt-1 text-xl font-black text-ink">
                    월 {formatKRW(sim.phaseA.afterLifeCareEffective)}
                  </div>
                  <div className="text-[10px] font-bold text-positive mt-0.5">
                    실납입 90회 마감 · 120회 만기 100% 환급형
                  </div>
                </div>

                <div className="rounded-lg bg-surface px-3.5 py-2.5 border border-rule-strong">
                  <div className="text-[11px] font-semibold text-ink-2">
                    제휴카드 사용 시 (전월 30만 원 기준)
                  </div>
                  <div className="mt-1 text-lg font-black text-accent">
                    월 {formatKRW(sim.phaseA.effectiveMonthlyPay)}
                    {sim.phaseA.monthlySurplusCash > 0 && (
                      <span className="ml-1.5 text-xs font-bold text-positive">
                        (+{sim.phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원 입금)
                      </span>
                    )}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[10px] text-muted mt-0.5">
                    <ShieldCheck size={11} aria-hidden="true" className="text-positive" />
                    <span>만기 원금 {formatKRW(sim.lifeCareMaturityRefundTotal)} 환급</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="px-4 sm:px-5 py-3.5 bg-surface border-t border-rule flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-4 rounded-lg bg-surface hover:bg-field border border-rule-strong text-xs sm:text-sm font-bold text-ink-2 cursor-pointer"
          >
            목록으로
          </button>
          <button
            type="button"
            disabled={!supports36 && !supports60}
            onClick={() => onChooseProduct(product.id, activeTerm, activeColor)}
            className="flex-1 h-11 px-5 rounded-lg bg-accent hover:bg-accent-hover text-accent-ink text-sm font-bold transition-colors cursor-pointer"
          >
            이 가전으로 맞춤 혜택 설계하기
          </button>
        </div>
      </div>
    </div>
  )
}
