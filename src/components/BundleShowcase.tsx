import { ArrowRight, Check, Layers } from 'lucide-react'
import { useState } from 'react'
import type { PolicyConfig, ProductItem, RecommendedBundle } from '../types/domain'
import { calculateBenefitSimulation, formatKRW } from '../utils/calculator'
import { ProductThumbnail } from './ProductThumbnail'

interface BundleShowcaseProps {
  bundles: RecommendedBundle[]
  products: ProductItem[]
  policy: PolicyConfig
  onApplyBundle: (bundle: RecommendedBundle) => void
}

export function BundleShowcase({
  bundles,
  products,
  policy,
  onApplyBundle,
}: BundleShowcaseProps) {
  const [appliedId, setAppliedId] = useState<string | null>(null)
  const productMap = new Map(products.map((p) => [p.id, p]))
  const visibleBundles = bundles
    .filter((b) => b.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const handleSelect = (bundle: RecommendedBundle) => {
    onApplyBundle(bundle)
    setAppliedId(bundle.id)
    window.setTimeout(() => setAppliedId((cur) => (cur === bundle.id ? null : cur)), 1200)
  }

  if (visibleBundles.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-10 text-center">
        <p className="text-sm font-medium text-[#64748B]">
          현재 노출 중인 추천 세트가 없습니다. ‘품목 직접 골라 담기’ 탭에서 원하는 가전을 담아보세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {visibleBundles.map((bundle) => {
        const previewCalc = calculateBenefitSimulation({
          cart: bundle.items,
          products,
          lifeCare: { q40: 0, q50: 0, q60: 0 },
          cardEnabled: false,
          coverShortfallWithLivingSpend: false,
          policy,
        })
        const isMixed = previewCalc.mode === 'mixed'
        const isApplied = appliedId === bundle.id

        return (
          <article
            key={bundle.id}
            className="rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors duration-150 p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] text-xs font-bold">
                    {bundle.badge || '추천'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] text-xs font-semibold tabular-nums">
                    <Layers size={12} />
                    {isMixed
                      ? '36+60개월 혼합 패키지'
                      : `${previewCalc.durationMonths}개월 단일 패키지`}
                  </span>
                </div>
                <h3 className="text-lg sm:text-[19px] font-extrabold text-[#0F172A] tracking-tight">
                  {bundle.name}
                </h3>
                <p className="mt-1 text-[13px] sm:text-sm text-[#475569] leading-relaxed">
                  {bundle.description}
                </p>
              </div>
            </div>

            {/* Included Products Row */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {bundle.items.map((item, idx) => {
                const prod = productMap.get(item.productId)
                if (!prod) return null
                const price =
                  item.term === 36
                    ? (prod.monthly36 ?? prod.monthly60 ?? 0)
                    : (prod.monthly60 ?? prod.monthly36 ?? 0)
                return (
                  <div
                    key={`${bundle.id}-${item.productId}-${idx}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                  >
                    <ProductThumbnail
                      src={prod.imageUrl}
                      alt={prod.name}
                      category={prod.category}
                      className="w-14 h-12 rounded-lg shrink-0 border border-[#E2E8F0]"
                      iconSize={20}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-[#64748B]">
                          {prod.brand}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.25 rounded tabular-nums ${
                            item.term === 36
                              ? 'bg-[#FFF1F2] text-[#E11D48]'
                              : 'bg-[#E2E8F0] text-[#334155]'
                          }`}
                        >
                          {item.term}개월
                        </span>
                      </div>
                      <div className="text-[13px] font-semibold text-[#0F172A] truncate">
                        {prod.name}
                      </div>
                      <div className="text-xs font-bold text-[#475569] tabular-nums">
                        월 {price.toLocaleString('ko-KR')}원
                        {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer billing summary + Apply CTA */}
            <div className="mt-5 pt-4 border-t border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {isMixed && previewCalc.phaseB ? (
                  <>
                    <div>
                      <div className="text-[11px] font-semibold text-[#64748B]">
                        1~36개월차 월 구독료
                      </div>
                      <div className="text-lg font-extrabold text-[#0F172A] tabular-nums">
                        {formatKRW(previewCalc.phaseA.grossSubscription)}
                      </div>
                    </div>
                    <div className="h-7 w-px bg-[#E2E8F0] hidden sm:block" />
                    <div>
                      <div className="text-[11px] font-semibold text-[#059669]">
                        37~60개월차 월 구독료
                      </div>
                      <div className="text-lg font-extrabold text-[#059669] tabular-nums">
                        {formatKRW(previewCalc.phaseB.grossSubscription)}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="text-[11px] font-semibold text-[#64748B]">
                      혜택 적용 전 기본 월 구독료 ({previewCalc.durationMonths}개월)
                    </div>
                    <div className="text-xl font-extrabold text-[#0F172A] tabular-nums">
                      월 {previewCalc.phaseA.grossSubscription.toLocaleString('ko-KR')}원
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSelect(bundle)}
                className={`inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-bold transition-all duration-150 active:scale-[0.98] shrink-0 cursor-pointer ${
                  isApplied
                    ? 'bg-[#059669] text-white'
                    : 'bg-[#E11D48] hover:bg-[#BE123C] text-white'
                }`}
              >
                {isApplied ? (
                  <>
                    <Check size={16} strokeWidth={2.5} />
                    <span>구독함에 담았습니다</span>
                  </>
                ) : (
                  <>
                    <span>이 세트 그대로 담기</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
