import { useMemo, useState } from 'react'
import {
  ArrowDown,
  Check,
  ChevronDown,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import type {
  CartItem,
  PolicyConfig,
  ProductItem,
  SubscriptionTerm,
} from '../types/domain'
import {
  calculateBenefitSimulation,
  recommendZeroCostLifeCare,
} from '../utils/calculator'
import { type MarketingAttribution, trackViewContent } from '../utils/marketingTracker'
import { InlineQuickConsultForm } from './InlineQuickConsultForm'
import { ProductThumbnail } from './ProductThumbnail'

interface MetaAdShowroomHeroProps {
  products: ProductItem[]
  policy: PolicyConfig
  selectedCart: CartItem[]
  attribution?: MarketingAttribution
  onToggleSelectProduct: (productId: string, term: SubscriptionTerm) => void
  onConsultProduct: (productId: string, term: SubscriptionTerm) => void
  onRemoveSelectedItem: (productId: string, term: SubscriptionTerm) => void
  onClearSelectedItems: () => void
  onOpenProductDetail: (product: ProductItem) => void
  onScrollToForm: () => void
}

const SHOWROOM_FILTERS = [
  { id: 'all', label: '인기 베스트' },
  { id: '청소', label: '로봇·무선청소기' },
  { id: '냉장', label: '냉장·김치냉장고' },
  { id: '세탁', label: '세탁·건조·스타일러' },
  { id: '에어컨', label: '에어컨·TV' },
  { id: '주방', label: '정수기·주방가전' },
  { id: '생활IT', label: '욕실·안마·IT' },
] as const

const CURATED_REPRESENTATIVE_IDS = [
  'prod-off-s10maxvultra-wh', // 1. 로보락 S10 MaxV Ultra 로봇청소기
  'prod-rm70f63r2xj', // 2. 삼성 비스포크 AI 키친핏 4도어 냉장고
  'prod-wd80h25bhy', // 3. 삼성 비스포크 AI 콤보 세탁건조기
  'prod-oled65b6xna-akrg', // 4. LG 올레드 AI 65형 TV
  'prod-fq18gc2eb2-akor', // 5. LG 휘센 오브제 2in1 에어컨
  'prod-z490meef11-akor', // 6. LG 김치톡톡 4도어 김치냉장고
] as const

const QUICK_FAQS = [
  {
    id: 'faq-price',
    question: '왜 혼자 계산하는 것보다 견적표를 받아보는 게 유리한가요?',
    answer:
      '온라인 표시가는 기본 기준이며, 실제로는 제휴카드 사용 여부와 다품목 결합, 경기광주점 당월 특별 지원금에 따라 월 체감가가 크게 달라집니다. 고객님 조건에 꼭 맞는 가장 유리한 안만 추려 비교표로 보내드립니다.',
  },
  {
    id: 'faq-call',
    question: '신청하면 원치 않는 가입 권유 전화가 계속 오나요?',
    answer:
      '아닙니다. 카톡·문자를 선택하시면 요약된 혜택 비교표를 메시지로 먼저 보내드리며, 내용을 편하게 검토하신 뒤 원하실 때만 상담이나 방문을 진행하시면 됩니다.',
  },
  {
    id: 'faq-care',
    question: '구독 기간 동안 고장 수리나 케어는 어떻게 진행되나요?',
    answer:
      '초기 구매 목돈 0원으로 새 가전을 설치받으시고, 약정 기간 내 최대 5년 무상 A/S 연장보증과 전문가 분해 세척, 소모품 정기 배송 등 공식 케어 서비스를 함께 받으실 수 있습니다.',
  },
] as const

export function MetaAdShowroomHero({
  products,
  policy,
  selectedCart,
  attribution,
  onToggleSelectProduct,
  onConsultProduct,
  onRemoveSelectedItem,
  onClearSelectedItems,
  onOpenProductDetail,
  onScrollToForm,
}: MetaAdShowroomHeroProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [showAll, setShowAll] = useState<boolean>(false)
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-price')

  const eligibleProducts = useMemo(
    () =>
      products.filter(
        (p) => p.visible && ((p.monthly60 ?? 0) > 0 || (p.monthly36 ?? 0) > 0),
      ),
    [products],
  )

  const curatedTopSix = useMemo(() => {
    const picked: ProductItem[] = []
    const usedIds = new Set<string>()
    for (const targetId of CURATED_REPRESENTATIVE_IDS) {
      const found = eligibleProducts.find((p) => p.id === targetId)
      if (found) {
        picked.push(found)
        usedIds.add(found.id)
      }
    }
    const seenCategories = new Set(picked.map((p) => p.category))
    for (const p of eligibleProducts) {
      if (picked.length >= 6) break
      if (usedIds.has(p.id)) continue
      if (!seenCategories.has(p.category)) {
        picked.push(p)
        usedIds.add(p.id)
        seenCategories.add(p.category)
      }
    }
    for (const p of eligibleProducts) {
      if (picked.length >= 6) break
      if (!usedIds.has(p.id)) {
        picked.push(p)
        usedIds.add(p.id)
      }
    }
    return picked
  }, [eligibleProducts])

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return eligibleProducts
    return eligibleProducts.filter((p) => {
      const hay = `${p.category} ${p.name}`
      if (activeFilter === '냉장') {
        return hay.includes('냉장') || hay.includes('냉동') || hay.includes('김치')
      }
      if (activeFilter === '세탁') {
        return hay.includes('세탁') || hay.includes('건조') || hay.includes('의류')
      }
      if (activeFilter === '에어컨') {
        return hay.includes('에어컨') || hay.includes('TV')
      }
      if (activeFilter === '청소') return hay.includes('청소')
      if (activeFilter === '주방') {
        return hay.includes('정수기') || hay.includes('주방') || hay.includes('밥솥')
      }
      if (activeFilter === '생활IT') {
        return (
          hay.includes('욕실') ||
          hay.includes('안마') ||
          hay.includes('생활') ||
          hay.includes('노트북') ||
          hay.includes('태블릿') ||
          hay.includes('IT')
        )
      }
      return hay.includes(activeFilter)
    })
  }, [eligibleProducts, activeFilter])

  const displayed =
    activeFilter === 'all' && !showAll ? curatedTopSix : showAll ? filtered : filtered.slice(0, 12)

  const selectedIdSet = useMemo(
    () => new Set(selectedCart.map((c) => c.productId)),
    [selectedCart],
  )

  const scrollToGrid = () => {
    const el = document.getElementById('meta-best-grid')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="space-y-7 sm:space-y-9">
      {/* SECTION 1: First-Fold Hero (3-Second Message Match + Immediate Value CTA) */}
      <section
        aria-label="롯데하이마트 경기광주점 가전 구독 핵심 혜택"
        className="rounded-2xl bg-surface border border-rule-strong p-5 sm:p-7 space-y-5"
      >
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-soft border border-accent-rule text-[11px] font-extrabold text-accent">
            <span>롯데하이마트 경기광주점 공식 가전구독</span>
          </div>

          <h2 className="text-[24px] sm:text-[32px] font-extrabold text-ink tracking-[-0.03em] leading-[1.24] break-keep">
            목돈 부담 없이 새 가전 구독, 내 조건 최대 혜택가는 월 얼마일까요?
          </h2>

          <p className="text-sm sm:text-[15px] text-ink-2 leading-relaxed break-keep">
            복잡한 카드 실적이나 결합 조건을 직접 계산하실 필요 없습니다. 관심 품목을 여러 개 담아 한 번에 비교하거나 바로 신청하시면 전담 매니저가 가장 유리한 월 부담금 비교표를 카톡·문자로 보내드립니다.
          </p>
        </div>

        {/* 3 Core Benefit Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="rounded-xl bg-field border border-rule px-3.5 py-3 flex items-start gap-2.5">
            <Sparkles size={16} aria-hidden="true" className="text-accent shrink-0 mt-0.5" />
            <div>
              <strong className="block text-xs sm:text-[13px] font-bold text-ink">
                초기 구매 목돈 0원
              </strong>
              <span className="block text-[11px] sm:text-xs text-ink-2 break-keep leading-snug mt-0.5">
                고민하던 프리미엄 새 가전을 월 구독으로 가볍게 시작
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-field border border-rule px-3.5 py-3 flex items-start gap-2.5">
            <Wrench size={16} aria-hidden="true" className="text-positive shrink-0 mt-0.5" />
            <div>
              <strong className="block text-xs sm:text-[13px] font-bold text-ink">
                최대 5년 무상 A/S·방문케어
              </strong>
              <span className="block text-[11px] sm:text-xs text-ink-2 break-keep leading-snug mt-0.5">
                정기 분해 세척과 소모품 배송까지 공식 케어 포함
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-field border border-rule px-3.5 py-3 flex items-start gap-2.5">
            <MessageSquare size={16} aria-hidden="true" className="text-ink shrink-0 mt-0.5" />
            <div>
              <strong className="block text-xs sm:text-[13px] font-bold text-ink">
                카톡·문자 비교견적 발송
              </strong>
              <span className="block text-[11px] sm:text-xs text-ink-2 break-keep leading-snug mt-0.5">
                부담스러운 권유 전화 없이 내 휴대폰으로 편하게 확인
              </span>
            </div>
          </div>
        </div>

        {/* Above-the-Fold Primary & Quiet Secondary Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onScrollToForm}
            className="h-12 sm:h-13 px-6 rounded-xl bg-accent hover:bg-accent-hover text-accent-ink text-sm sm:text-[15px] font-extrabold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>30초 만에 내 맞춤 견적표 받기</span>
            <ArrowDown size={16} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={scrollToGrid}
            className="h-11 sm:h-13 px-4 rounded-xl bg-surface hover:bg-field border border-rule-strong text-xs sm:text-sm font-bold text-ink-2 hover:text-ink inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>인기 가전 여러 개 골라담기</span>
          </button>
        </div>
      </section>

      {/* SECTION 2: Compact 2-Column Popular Appliances Grid (Multi-Add + Direct Consult) */}
      <section
        id="meta-best-grid"
        aria-labelledby="meta-best-heading"
        className="scroll-mt-18 space-y-3.5"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold text-accent">
              담기로 여러 개 골라 한 번에 비교하거나 바로 상담 신청하세요
            </span>
            <h3
              id="meta-best-heading"
              className="text-lg sm:text-xl font-bold text-ink tracking-tight"
            >
              매장 인기 가전 최대 혜택 예시가
            </h3>
          </div>
          {selectedCart.length > 0 && (
            <button
              type="button"
              onClick={onScrollToForm}
              className="h-8 px-3 rounded-full bg-ink text-on-ink text-xs font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap tabular-nums"
            >
              <span>담은 {selectedCart.length}대 상담 신청</span>
              <ArrowDown size={12} aria-hidden="true" />
            </button>
          )}
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

        {/* 2-Column Mobile / 3-Column Desktop Compact Appliance Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {displayed.map((product, idx) => {
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
            const isSelected = selectedIdSet.has(product.id)

            return (
              <article
                key={product.id}
                className={`flex flex-col rounded-xl bg-surface border transition-colors overflow-hidden ${
                  isSelected
                    ? 'border-2 border-ink'
                    : 'border-rule hover:border-rule-strong'
                }`}
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
                    priority={idx < 4}
                    className="aspect-[4/3] w-full border-b border-rule"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-surface/95 border border-rule text-[10px] sm:text-[11px] font-bold text-ink">
                    {product.brand}
                  </span>
                  {isSelected && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-ink text-on-ink text-[10px] font-bold">
                      담김
                    </span>
                  )}
                </div>

                <div className="p-3 sm:p-4 flex flex-col flex-1 gap-2">
                  <div className="space-y-1">
                    <h4
                      onClick={() => onOpenProductDetail(product)}
                      className="text-[13px] sm:text-[15px] font-bold text-ink leading-snug line-clamp-2 break-keep cursor-pointer hover:underline"
                    >
                      {product.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => onOpenProductDetail(product)}
                      className="text-[11px] font-semibold text-muted hover:text-ink underline underline-offset-2 cursor-pointer whitespace-nowrap"
                    >
                      케어 혜택 상세
                    </button>
                  </div>

                  {/* Clean 2-Line Price Comparison */}
                  <div className="mt-auto pt-2 border-t border-rule space-y-0.5 tabular-nums">
                    <div className="flex items-center justify-between gap-1 text-[10.5px] sm:text-[11px] text-muted">
                      <span className="whitespace-nowrap">일반 구독료</span>
                      <span className="line-through whitespace-nowrap">
                        월 {sim.phaseA.grossSubscription.toLocaleString('ko-KR')}원
                      </span>
                    </div>
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <span className="text-[11px] font-bold text-accent whitespace-nowrap">
                        최대 혜택가
                      </span>
                      <strong className="text-[15px] sm:text-lg font-black text-ink whitespace-nowrap">
                        월 {sim.phaseA.effectiveMonthlyPay.toLocaleString('ko-KR')}원
                      </strong>
                    </div>
                  </div>

                  {/* Split Action Row: [담기 / 담김] (stays in place) + [바로 상담] (scrolls to form) */}
                  <div className="mt-1 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        if (!isSelected) {
                          trackViewContent({
                            productId: product.id,
                            productName: `${product.brand} ${product.name}`,
                            category: product.category,
                            monthlyValue:
                              term === 60
                                ? (product.monthly60 ?? 0)
                                : (product.monthly36 ?? 0),
                          })
                        }
                        onToggleSelectProduct(product.id, term)
                      }}
                      className={`h-9 sm:h-10 px-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap border ${
                        isSelected
                          ? 'bg-ink border-ink text-on-ink'
                          : 'bg-field hover:bg-field-hover border-rule-strong text-ink'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check size={13} strokeWidth={2.6} aria-hidden="true" />
                          <span>담김</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} strokeWidth={2.4} aria-hidden="true" />
                          <span>담기</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        trackViewContent({
                          productId: product.id,
                          productName: `${product.brand} ${product.name}`,
                          category: product.category,
                          monthlyValue:
                            term === 60
                              ? (product.monthly60 ?? 0)
                              : (product.monthly36 ?? 0),
                        })
                        onConsultProduct(product.id, term)
                      }}
                      className="h-9 sm:h-10 px-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-ink text-xs font-bold inline-flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <span>바로 상담</span>
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        {!showAll && filtered.length > displayed.length && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full h-11 rounded-xl bg-surface hover:bg-field border border-rule-strong text-xs sm:text-sm font-bold text-ink flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>전체 모델 더 펼쳐보기 ({filtered.length}개)</span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
        )}
      </section>

      {/* SECTION 3: 3-Step Process Strip + Embedded Frictionless Form */}
      <div className="space-y-4">
        <div
          aria-label="간편 견적 진행 절차"
          className="grid grid-cols-3 gap-2 rounded-xl bg-field border border-rule p-3 sm:p-4 text-center"
        >
          <div className="space-y-0.5">
            <span className="block text-[11px] font-bold text-accent">1단계</span>
            <strong className="block text-xs sm:text-[13px] font-bold text-ink">
              30초 견적 신청
            </strong>
            <span className="hidden sm:block text-[11px] text-muted">
              담은 품목 확인 후 연락처 입력
            </span>
          </div>
          <div className="space-y-0.5 border-x border-rule px-1">
            <span className="block text-[11px] font-bold text-accent">2단계</span>
            <strong className="block text-xs sm:text-[13px] font-bold text-ink">
              비교표 발송
            </strong>
            <span className="hidden sm:block text-[11px] text-muted">
              카톡·문자로 맞춤 혜택가 전달
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="block text-[11px] font-bold text-positive">3단계</span>
            <strong className="block text-xs sm:text-[13px] font-bold text-ink">
              검토 후 결정
            </strong>
            <span className="hidden sm:block text-[11px] text-muted">
              마음에 드실 때만 상담 진행
            </span>
          </div>
        </div>

        <InlineQuickConsultForm
          selectedCart={selectedCart}
          products={eligibleProducts}
          policy={policy}
          attribution={attribution}
          onRemoveSelectedItem={onRemoveSelectedItem}
          onClearSelectedItems={onClearSelectedItems}
          onScrollToProducts={scrollToGrid}
        />
      </div>

      {/* SECTION 4: Short Reassurance FAQ */}
      <section
        aria-label="자주 묻는 질문"
        className="rounded-xl bg-surface border border-rule p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={15} aria-hidden="true" className="text-positive" />
          <h3 className="text-sm font-bold text-ink">신청 전 자주 묻는 질문</h3>
        </div>

        <div className="divide-y divide-rule border-t border-rule">
          {QUICK_FAQS.map((faq) => {
            const isOpen = openFaqId === faq.id
            return (
              <div key={faq.id} className="py-3 last:pb-0">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between gap-2 text-left text-xs sm:text-[13px] font-bold text-ink cursor-pointer"
                >
                  <span className="break-keep">{faq.question}</span>
                  <ChevronDown
                    size={15}
                    aria-hidden="true"
                    className={`shrink-0 text-muted transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-2 text-xs text-ink-2 leading-relaxed break-keep">
                    {faq.answer}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
