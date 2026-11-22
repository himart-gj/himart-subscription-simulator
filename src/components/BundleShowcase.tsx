import { ArrowRight, Check, Layers, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import type { PolicyConfig, ProductItem, RecommendedBundle } from '../types/domain'
import {
  calculateBenefitSimulation,
  formatKRW,
  recommendZeroCostLifeCare,
} from '../utils/calculator'
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
      <div className="rounded-xl bg-surface border border-rule p-10 text-center">
        <p className="text-sm font-medium text-muted">
          현재 노출 중인 추천 세트가 없습니다. ‘단품 골라 담기’ 탭에서 원하는 가전을 담아보세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {visibleBundles.map((bundle) => {
        const optimalUnits = recommendZeroCostLifeCare({
          cart: bundle.items,
          products,
          policy,
        })
        const optimalCalc = calculateBenefitSimulation({
          cart: bundle.items,
          products,
          lifeCare: optimalUnits,
          cardEnabled: true,
          coverShortfallWithLivingSpend: true,
          policy,
        })
        const isMixed = optimalCalc.mode === 'mixed'
        const isApplied = appliedId === bundle.id
        const activeTierSummary = optimalCalc.lifeCarePerTier
          .filter((t) => t.quantity > 0)
          .map((t) => `${t.label}×${t.quantity}`)
          .join(' + ')

        return (
          <article
            key={bundle.id}
            className="rounded-xl bg-surface border border-rule hover:border-rule-strong transition-colors duration-150 p-5 sm:p-6"
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-accent-soft border border-accent-rule text-accent text-xs font-bold">
                  {bundle.badge || '지점 추천'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-field text-ink-2 text-xs font-semibold tabular-nums">
                  <Layers size={12} aria-hidden="true" />
                  {isMixed
                    ? '36+60개월 혼합 구성'
                    : `${optimalCalc.durationMonths}개월 구성`}
                </span>
                {activeTierSummary && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-positive-soft border border-positive-rule text-positive text-[11px] font-bold tabular-nums">
                    추천상품 자동맞춤: {activeTierSummary}
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-[19px] font-bold text-ink tracking-tight break-keep">
                {bundle.name}
              </h3>
              <p className="text-[13px] text-ink-2 leading-relaxed">
                {bundle.description}
              </p>
            </div>

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
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-field border border-rule"
                  >
                    <ProductThumbnail
                      src={prod.imageUrl}
                      alt={prod.name}
                      category={prod.category}
                      brand={prod.brand}
                      className="w-14 h-12 rounded-md shrink-0 border border-rule bg-surface"
                      iconSize={20}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-semibold text-muted">
                          {prod.brand}
                        </span>
                        <span className="font-bold text-ink-2 tabular-nums">
                          {item.term}개월
                        </span>
                      </div>
                      <div className="text-[13px] font-semibold text-ink truncate">
                        {prod.name}
                      </div>
                      <div className="text-xs text-muted tabular-nums">
                        원 구독료 월 {price.toLocaleString('ko-KR')}원
                        {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-rule flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <div>
                  <div className="text-[11px] font-bold text-ink-2">
                    추천 혜택 체감가 (만기 100% 환급형)
                  </div>
                  <div className="flex items-baseline gap-1.5 tabular-nums">
                    <span className="text-xs text-subtle line-through">
                      월 {optimalCalc.phaseA.grossSubscription.toLocaleString('ko-KR')}원
                    </span>
                    <span className="text-xl font-black text-ink">
                      월 {optimalCalc.phaseA.afterLifeCareEffective.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                </div>

                <div className="h-8 w-px bg-rule hidden sm:block" />

                <div>
                  <div className="text-[11px] font-semibold text-muted">
                    제휴카드 사용 시 (전월 30만 원 기준)
                  </div>
                  <div className="flex flex-wrap items-baseline gap-1.5 tabular-nums">
                    <span className="text-sm font-extrabold text-accent">
                      월 {optimalCalc.phaseA.effectiveMonthlyPay.toLocaleString('ko-KR')}원
                    </span>
                    {optimalCalc.phaseA.monthlySurplusCash > 0 && (
                      <span className="text-xs font-bold text-positive bg-positive-soft border border-positive-rule px-2 py-0.5 rounded">
                        매월 +{optimalCalc.phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원 입금
                      </span>
                    )}
                  </div>
                  {optimalCalc.lifeCareMaturityRefundTotal > 0 && (
                    <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-muted tabular-nums">
                      <ShieldCheck size={12} aria-hidden="true" className="text-positive" />
                      <span>
                        120회 만기 시 납입금 {formatKRW(optimalCalc.lifeCareMaturityRefundTotal)} 100% 환급
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelect(bundle)}
                className={`inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-sm font-bold transition-colors duration-150 shrink-0 cursor-pointer ${
                  isApplied
                    ? 'bg-positive text-on-ink'
                    : 'bg-ink hover:bg-ink-hover text-on-ink'
                }`}
              >
                {isApplied ? (
                  <>
                    <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                    <span>결과 화면 열기</span>
                  </>
                ) : (
                  <>
                    <span>이 세트 혜택 결과 보기</span>
                    <ArrowRight size={16} aria-hidden="true" />
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
