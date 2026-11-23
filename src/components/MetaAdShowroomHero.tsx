import { useMemo, useState } from 'react'
import { ArrowRight, Check, ChevronDown, HelpCircle, ShieldCheck } from 'lucide-react'
import { getProductEmpathyDetail } from '../data/productEmpathyDetails'
import type { PolicyConfig, ProductItem, SubscriptionTerm } from '../types/domain'
import {
  calculateBenefitSimulation,
  recommendZeroCostLifeCare,
} from '../utils/calculator'
import { trackViewContent } from '../utils/marketingTracker'
import { ProductThumbnail } from './ProductThumbnail'

interface MetaAdShowroomHeroProps {
  products: ProductItem[]
  policy: PolicyConfig
  selectedColorByProduct: Record<string, string>
  onSelectColor: (productId: string, colorName: string) => void
  onOpenProductDetail: (product: ProductItem) => void
  onConfirmShowroomProduct: (productId: string, term: SubscriptionTerm, colorName?: string) => void
  onOpenUndecidedConsult: () => void
  onExitAdMode: () => void
}

const SHOWROOM_FILTERS = [
  { id: 'all', label: '전체 인기' },
  { id: '냉장', label: '냉장·김치냉장고' },
  { id: '세탁', label: '세탁·건조·스타일러' },
  { id: '에어컨', label: '에어컨·TV' },
  { id: '청소', label: '로봇·무선청소기' },
  { id: '주방', label: '정수기·주방가전' },
  { id: '생활IT', label: '욕실·안마·노트북' },
] as const

export function MetaAdShowroomHero({
  products,
  policy,
  selectedColorByProduct,
  onSelectColor,
  onOpenProductDetail,
  onConfirmShowroomProduct,
  onOpenUndecidedConsult,
  onExitAdMode,
}: MetaAdShowroomHeroProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [showAll, setShowAll] = useState<boolean>(false)
  const [confirmTarget, setConfirmTarget] = useState<{
    product: ProductItem
    term: SubscriptionTerm
  } | null>(null)

  const eligibleProducts = useMemo(
    () =>
      products.filter(
        (p) => p.visible && ((p.monthly60 ?? 0) > 0 || (p.monthly36 ?? 0) > 0),
      ),
    [products],
  )

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return eligibleProducts
    return eligibleProducts.filter((p) => {
      const hay = `${p.category} ${p.name}`
      if (activeFilter === '냉장') return hay.includes('냉장') || hay.includes('냉동') || hay.includes('김치')
      if (activeFilter === '세탁') return hay.includes('세탁') || hay.includes('건조') || hay.includes('의류')
      if (activeFilter === '에어컨') return hay.includes('에어컨') || hay.includes('TV')
      if (activeFilter === '청소') return hay.includes('청소')
      if (activeFilter === '주방') return hay.includes('정수기') || hay.includes('주방')
      if (activeFilter === '생활IT') return hay.includes('욕실') || hay.includes('안마') || hay.includes('노트북') || hay.includes('태블릿')
      return hay.includes(activeFilter)
    })
  }, [eligibleProducts, activeFilter])

  const displayed = activeFilter === 'all' && !showAll ? filtered.slice(0, 6) : filtered

  return (
    <section
      aria-label="필요한 새 가전 바로 고르기 쇼윈도"
      className="space-y-5"
    >
      {/* Zero-Resistance Appliance Showroom Header */}
      <div className="rounded-xl bg-surface border border-rule p-5 sm:p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-accent">롯데하이마트 경기광주점 공식 쇼윈도</span>
            <span className="text-rule-strong" aria-hidden="true">|</span>
            <span className="font-semibold text-positive">실납입 90회 마감 · 120회 만기 100% 환급</span>
          </div>
          <h2 className="text-[22px] sm:text-[27px] font-bold text-ink tracking-[-0.03em] leading-snug">
            어떤 새 가전이 필요하신가요?
          </h2>
          <p className="text-xs sm:text-sm text-ink-2">
            관심 있는 가전을 누르시면 월 천원대 추천 혜택가와 100% 원금 환급표를 바로 보여드립니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenUndecidedConsult}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-lg bg-field hover:bg-field-hover border border-rule-strong text-xs font-bold text-ink cursor-pointer"
          >
            <HelpCircle size={14} aria-hidden="true" className="text-accent" />
            <span>아직 모델 고민 중이에요</span>
          </button>
          <button
            type="button"
            onClick={onExitAdMode}
            className="inline-flex items-center gap-1 h-10 px-3.5 rounded-lg bg-surface hover:bg-field border border-rule text-xs font-semibold text-ink-2 cursor-pointer"
          >
            <span>세트·전체 비교표 보기</span>
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div
        role="group"
        aria-label="가전 종류 필터"
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
      >
        {SHOWROOM_FILTERS.map((f) => {
          const active = activeFilter === f.id
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveFilter(f.id)}
              className={`h-9 px-3.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                active
                  ? 'bg-ink border-ink text-on-ink'
                  : 'bg-surface border-rule text-ink-2 hover:border-rule-strong'
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Showroom Appliance Grid (2-col on mobile/tablet, 3-col on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayed.map((product) => {
          const term: SubscriptionTerm =
            product.monthly60 !== null && product.monthly60 > 0 ? 60 : 36
          const singleCart = [{ productId: product.id, term, quantity: 1 }]
          const recUnits = recommendZeroCostLifeCare({
            cart: singleCart,
            products: [product],
            policy,
          })
          const sim = calculateBenefitSimulation({
            cart: singleCart,
            products: [product],
            lifeCare: recUnits,
            cardEnabled: true,
            coverShortfallWithLivingSpend: true,
            policy,
          })
          const empathy = getProductEmpathyDetail(product)
          const activeColor =
            selectedColorByProduct[product.id] || empathy.colors[0]?.name || ''

          return (
            <article
              key={product.id}
              className="flex flex-col rounded-xl bg-surface border border-rule hover:border-rule-strong transition-colors overflow-hidden"
            >
              <div
                onClick={() => onOpenProductDetail(product)}
                className="relative cursor-pointer"
              >
                <ProductThumbnail
                  src={product.imageUrl}
                  alt={product.name}
                  category={product.category}
                  brand={product.brand}
                  className="aspect-[4/3] w-full border-b border-rule bg-field"
                />
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-surface border border-rule text-[11px] font-bold text-ink">
                  {product.brand}
                </span>
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-positive-soft border border-positive-rule text-[10px] font-bold text-positive">
                  만기 100% 환급형
                </span>
              </div>

              <div className="p-4 flex flex-col flex-1 gap-2">
                <div>
                  <h3
                    onClick={() => onOpenProductDetail(product)}
                    className="text-[15px] font-bold text-ink leading-snug line-clamp-2 break-keep cursor-pointer hover:underline"
                  >
                    {product.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted line-clamp-2 leading-relaxed">
                    {empathy.headline}
                  </p>
                </div>

                {empathy.colors.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {empathy.colors.slice(0, 3).map((cl) => {
                      const isSel = activeColor === cl.name
                      return (
                        <button
                          key={cl.name}
                          type="button"
                          onClick={() => onSelectColor(product.id, cl.name)}
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
                )}

                <button
                  type="button"
                  onClick={() => onOpenProductDetail(product)}
                  className="self-start text-xs font-semibold text-ink-2 underline underline-offset-2 hover:text-ink cursor-pointer"
                >
                  이런 분께 추천 · 상세 보기
                </button>

                <div className="mt-auto pt-2.5 border-t border-rule space-y-1 tabular-nums">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-bold text-ink-2">
                      추천 혜택가 ({term}개월)
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[11px] text-subtle line-through">
                        월 {sim.phaseA.grossSubscription.toLocaleString('ko-KR')}원
                      </span>
                      <span className="text-lg font-black text-ink">
                        월 {sim.phaseA.afterLifeCareEffective.toLocaleString('ko-KR')}원
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted">카드 사용 시</span>
                    <span className="font-bold text-positive">
                      월 {sim.phaseA.effectiveMonthlyPay.toLocaleString('ko-KR')}원
                      {sim.phaseA.monthlySurplusCash > 0 &&
                        ` (+${sim.phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원 입금)`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmTarget({ product, term })}
                  className="mt-1 w-full h-10 rounded-lg bg-ink hover:bg-ink-hover text-on-ink text-xs font-bold transition-colors cursor-pointer"
                >
                  이 제품 혜택 확인하기
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {activeFilter === 'all' && !showAll && filtered.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full h-12 rounded-xl bg-surface hover:bg-field border border-rule-strong text-sm font-bold text-ink flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>전체 가전 모두 보기 ({filtered.length}개)</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      )}

      {confirmTarget && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="micro-commit-title"
          onClick={() => setConfirmTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-surface border border-rule-strong p-6 text-center space-y-4"
          >
            <div className="w-24 h-24 mx-auto rounded-xl bg-field border border-rule overflow-hidden">
              <ProductThumbnail
                src={confirmTarget.product.imageUrl}
                alt={confirmTarget.product.name}
                category={confirmTarget.product.category}
                brand={confirmTarget.product.brand}
                className="w-full h-full"
                iconSize={28}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-accent">
                {confirmTarget.product.brand}
                {selectedColorByProduct[confirmTarget.product.id]
                  ? ` / ${selectedColorByProduct[confirmTarget.product.id]}`
                  : ''}
              </div>
              <div className="text-sm font-bold text-ink break-keep">
                {confirmTarget.product.name}
              </div>
              <h3
                id="micro-commit-title"
                className="pt-1 text-lg font-extrabold text-ink tracking-tight"
              >
                이 가전으로 맞춤 혜택표를 확인해 볼까요?
              </h3>
              <p className="text-xs text-muted">
                선택 즉시 월 체감가와 100% 원금 환급 일정표가 맞춰집니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="h-11 rounded-lg bg-surface hover:bg-field border border-rule-strong text-sm font-bold text-ink-2 cursor-pointer"
              >
                다른 가전 보기
              </button>
              <button
                type="button"
                onClick={() => {
                  const chosenColor = selectedColorByProduct[confirmTarget.product.id]
                  trackViewContent({
                    productId: confirmTarget.product.id,
                    productName: `${confirmTarget.product.brand} ${confirmTarget.product.name}`,
                    category: confirmTarget.product.category,
                    monthlyValue:
                      confirmTarget.term === 60
                        ? (confirmTarget.product.monthly60 ?? 0)
                        : (confirmTarget.product.monthly36 ?? 0),
                  })
                  onConfirmShowroomProduct(
                    confirmTarget.product.id,
                    confirmTarget.term,
                    chosenColor,
                  )
                  setConfirmTarget(null)
                }}
                className="h-11 rounded-lg bg-accent hover:bg-accent-hover text-accent-ink text-sm font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <Check size={15} strokeWidth={2.6} aria-hidden="true" />
                <span>네, 확인하기</span>
              </button>
            </div>

            <div className="pt-2 border-t border-rule flex items-center justify-center gap-1 text-[11px] text-muted">
              <ShieldCheck size={12} aria-hidden="true" className="text-positive" />
              <span>확인만으로 가입이나 결제가 진행되지 않습니다</span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
