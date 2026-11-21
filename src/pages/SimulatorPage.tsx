import { useMemo, useState } from 'react'
import {
  ChevronUp,
  Layers,
  LayoutGrid,
  Search,
  Settings,
  ShoppingBag,
  X,
} from 'lucide-react'
import { BundleShowcase } from '../components/BundleShowcase'
import { ConsultationModal } from '../components/ConsultationModal'
import { LegalDisclosureSection } from '../components/LegalDisclosureSection'
import { ProductCard } from '../components/ProductCard'
import { ReceiptPanel } from '../components/ReceiptPanel'
import { SpringNumber } from '../components/SpringNumber'
import { DEFAULT_CATEGORIES } from '../data/initialSeedData'
import type {
  CartItem,
  CatalogSnapshot,
  LifeCareUnits,
  RecommendedBundle,
  SubscriptionTerm,
} from '../types/domain'
import {
  calculateBenefitSimulation,
  clampLifeCareUnits,
  recommendZeroCostLifeCare,
} from '../utils/calculator'

interface SimulatorPageProps {
  catalog: CatalogSnapshot
  dataSource: 'gas' | 'local-preview'
  onNavigateAdmin: () => void
}

type BrowseMode = 'bundles' | 'products'

export function SimulatorPage({
  catalog,
  dataSource,
  onNavigateAdmin,
}: SimulatorPageProps) {
  const [browseMode, setBrowseMode] = useState<BrowseMode>('bundles')
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [selectedBrand, setSelectedBrand] = useState<string>('전체')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const [cart, setCart] = useState<CartItem[]>([])
  const [lifeCare, setLifeCare] = useState<LifeCareUnits>({ q40: 0, q50: 0, q60: 0 })
  const [cardEnabled, setCardEnabled] = useState<boolean>(true)
  const [coverShortfall, setCoverShortfall] = useState<boolean>(true)

  const [isDraggingProduct, setIsDraggingProduct] = useState(false)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [consultModalOpen, setConsultModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const visibleProducts = useMemo(
    () =>
      catalog.products
        .filter((p) => p.visible)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [catalog.products],
  )

  const categories = useMemo(() => {
    const base = [...DEFAULT_CATEGORIES] as string[]
    for (const p of visibleProducts) {
      if (p.category && !base.includes(p.category)) {
        base.push(p.category)
      }
    }
    return base
  }, [visibleProducts])

  const brands = useMemo(() => {
    const set = new Set<string>()
    for (const p of visibleProducts) {
      if (p.brand) set.add(p.brand)
    }
    return ['전체', ...Array.from(set)]
  }, [visibleProducts])

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return visibleProducts.filter((p) => {
      if (selectedCategory === '대형가전') {
        if (!p.isLargeAppliance && p.category !== '대형가전') return false
      } else if (selectedCategory !== '전체') {
        if (p.category !== selectedCategory) return false
      }

      if (selectedBrand !== '전체' && p.brand !== selectedBrand) {
        return false
      }

      if (q) {
        const haystack = `${p.name} ${p.brand} ${p.modelCode} ${p.category} ${p.careTags.join(' ')}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [visibleProducts, selectedCategory, selectedBrand, searchQuery])

  const result = useMemo(
    () =>
      calculateBenefitSimulation({
        cart,
        products: catalog.products,
        lifeCare,
        cardEnabled,
        coverShortfallWithLivingSpend: coverShortfall,
        policy: catalog.policy,
      }),
    [cart, catalog.products, catalog.policy, lifeCare, cardEnabled, coverShortfall],
  )

  const showToast = (msg: string) => {
    setToastMessage(msg)
    window.setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur))
    }, 2200)
  }

  const handleAddProduct = (productId: string, term: SubscriptionTerm) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === productId && i.term === term)
      if (idx >= 0) {
        return prev.map((item, i) =>
          i === idx ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [...prev, { productId, term, quantity: 1 }]
    })
    const prod = catalog.products.find((p) => p.id === productId)
    if (prod) {
      showToast(`${prod.brand} ${prod.name} (${term}개월) 담김`)
    }
  }

  const handleApplyBundle = (bundle: RecommendedBundle) => {
    setCart(
      bundle.items.map((item) => ({
        productId: item.productId,
        term: item.term,
        quantity: item.quantity,
      })),
    )
    showToast(`‘${bundle.name}’ 구성이 구독함에 반영되었습니다`)
  }

  const handleUpdateCartQuantity = (
    productId: string,
    term: SubscriptionTerm,
    delta: number,
  ) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId && item.term === term
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const handleSwitchCartItemTerm = (
    productId: string,
    fromTerm: SubscriptionTerm,
    toTerm: SubscriptionTerm,
  ) => {
    setCart((prev) => {
      const target = prev.find((i) => i.productId === productId && i.term === fromTerm)
      if (!target) return prev
      const rest = prev.filter((i) => !(i.productId === productId && i.term === fromTerm))
      const existingSame = rest.find((i) => i.productId === productId && i.term === toTerm)
      if (existingSame) {
        return rest.map((i) =>
          i.productId === productId && i.term === toTerm
            ? { ...i, quantity: i.quantity + target.quantity }
            : i,
        )
      }
      return [...rest, { productId, term: toTerm, quantity: target.quantity }]
    })
  }

  const handleRemoveCartItem = (productId: string, term: SubscriptionTerm) => {
    setCart((prev) => prev.filter((i) => !(i.productId === productId && i.term === term)))
  }

  const handleUpdateLifeCareUnit = (tier: keyof LifeCareUnits, delta: number) => {
    setLifeCare((prev) => {
      const currentTotal = prev.q40 + prev.q50 + prev.q60
      if (delta > 0 && currentTotal >= catalog.policy.maxLifeCareUnits) {
        return prev
      }
      const nextVal = Math.max(0, prev[tier] + delta)
      return clampLifeCareUnits(
        { ...prev, [tier]: nextVal },
        catalog.policy.maxLifeCareUnits,
      )
    })
  }

  const handleSetLifeCareUnits = (units: LifeCareUnits) => {
    setLifeCare(clampLifeCareUnits(units, catalog.policy.maxLifeCareUnits))
  }

  const handleApplyZeroCostPreset = () => {
    const recommended = recommendZeroCostLifeCare({
      cart,
      products: catalog.products,
      cardEnabled,
      coverShortfallWithLivingSpend: coverShortfall,
      policy: catalog.policy,
    })
    setLifeCare(recommended)
    showToast('구독료 0원 맞춤 구독프리드 구좌가 적용되었습니다')
  }

  const handleQuickTrySample = () => {
    const sample =
      catalog.bundles.find((b) => b.id === 'bundle-daily-helper-3' && b.visible) ||
      catalog.bundles.find((b) => b.visible)
    if (sample) {
      handleApplyBundle(sample)
    }
  }

  const cartCountByProduct = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of cart) {
      map.set(item.productId, (map.get(item.productId) || 0) + item.quantity)
    }
    return map
  }, [cart])

  const receiptProps = {
    result,
    policy: catalog.policy,
    isDraggingProduct,
    onDropProduct: handleAddProduct,
    onUpdateCartQuantity: handleUpdateCartQuantity,
    onSwitchCartItemTerm: handleSwitchCartItemTerm,
    onRemoveCartItem: handleRemoveCartItem,
    onClearCart: () => setCart([]),
    onUpdateLifeCareUnit: handleUpdateLifeCareUnit,
    onSetLifeCareUnits: handleSetLifeCareUnits,
    onApplyZeroCostPreset: handleApplyZeroCostPreset,
    onToggleCardEnabled: setCardEnabled,
    onToggleCoverShortfall: setCoverShortfall,
    onOpenConsultModal: () => {
      setMobileSheetOpen(false)
      setConsultModalOpen(true)
    },
    onQuickTrySample: handleQuickTrySample,
  }

  const isEmpty = result.mode === 'empty'
  const phaseASurplus = result.phaseA.monthlySurplusCash > 0

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-28 xl:pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-[#E2E8F0]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#E11D48] text-white font-black text-sm flex items-center justify-center shrink-0 tracking-tighter">
              HM
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] sm:text-base font-extrabold text-[#0F172A] tracking-tight truncate">
                  롯데하이마트 경기광주점
                </h1>
                {dataSource === 'local-preview' && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-[#F1F5F9] border border-[#E2E8F0] text-[10px] font-bold text-[#475569] shrink-0">
                    [로컬 프리뷰 모드]
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-[#64748B] truncate">
                구독 × 라이프케어(구독프리드) × 클래스카드 맞춤 혜택 계산기
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateAdmin}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold text-[#475569] hover:text-[#0F172A] transition-colors shrink-0 cursor-pointer"
          >
            <Settings size={14} />
            <span className="hidden sm:inline">관리자 CMS</span>
            <span className="sm:hidden">CMS</span>
          </button>
        </div>
      </header>

      {/* Main Container: Desktop 7:5 Split */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Intro Strip */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#E11D48] tracking-tight mb-1">
              LOTTE HIMART GYEONGGI GWANGJU
            </p>
            <h2 className="text-2xl sm:text-[28px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
              가전 구독부터 라이프케어·카드 혜택까지
              <span className="block sm:inline sm:ml-1.5 text-[#475569] font-bold">
                1원 단위 투명 시뮬레이션
              </span>
            </h2>
          </div>

          {/* Mode Switcher Tabs (2 Primary Entry Modes) */}
          <div
            role="tablist"
            aria-label="상품 선택 모드"
            className="inline-grid grid-cols-2 p-1 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs w-full md:w-auto shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={browseMode === 'bundles'}
              onClick={() => setBrowseMode('bundles')}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                browseMode === 'bundles'
                  ? 'bg-[#0F172A] text-white'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Layers size={15} />
              <span>추천 세트 한 번에 담기</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={browseMode === 'products'}
              onClick={() => setBrowseMode('products')}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                browseMode === 'products'
                  ? 'bg-[#0F172A] text-white'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <LayoutGrid size={15} />
              <span>품목 직접 골라 담기</span>
            </button>
          </div>
        </div>

        {/* 12-Col Responsive Split: Left 7 Showroom / Right 5 Sticky Receipt */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT 7 COLUMNS: SHOWROOM */}
          <div className="xl:col-span-7 space-y-5">
            {browseMode === 'bundles' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-[#0F172A]">
                      지점 추천 패키지 세트
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      세트를 담은 뒤 우측 영수증에서 품목 추가·삭제 및 36/60개월 기간 변경이
                      자유롭게 가능합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBrowseMode('products')}
                    className="text-xs font-bold text-[#E11D48] hover:underline shrink-0 cursor-pointer"
                  >
                    단품 직접 고르기 →
                  </button>
                </div>

                <BundleShowcase
                  bundles={catalog.bundles}
                  products={catalog.products}
                  policy={catalog.policy}
                  onApplyBundle={handleApplyBundle}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Filter Card */}
                <div className="rounded-2xl bg-white border border-[#E2E8F0] p-4 space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="상품명, 브랜드, 모델명 검색 (예: 로보락, 워시타워, 밥솥)"
                      className="w-full h-11 pl-10 pr-9 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] focus:bg-white focus:border-[#0F172A] focus:outline-none text-base text-[#0F172A]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        aria-label="검색어 지우기"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Category Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {categories.map((cat) => {
                      const active = selectedCategory === cat
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#0F172A] text-white'
                              : 'bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] hover:text-[#0F172A]'
                          }`}
                        >
                          {cat}
                        </button>
                      )
                    })}
                  </div>

                  {/* Brand Filter Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-[#F1F5F9]">
                    <span className="text-[11px] font-bold text-[#94A3B8] shrink-0 mr-1">
                      브랜드
                    </span>
                    {brands.map((brand) => {
                      const active = selectedBrand === brand
                      return (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => setSelectedBrand(brand)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]'
                              : 'bg-white text-[#475569] border border-[#E2E8F0] hover:border-[#CBD5E1]'
                          }`}
                        >
                          {brand}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Product Grid */}
                {filteredProducts.length === 0 ? (
                  <div className="rounded-2xl bg-white border border-[#E2E8F0] p-10 text-center space-y-2">
                    <p className="text-sm font-bold text-[#334155]">
                      조건에 맞는 구독 가전이 없습니다
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('전체')
                        setSelectedBrand('전체')
                        setSearchQuery('')
                      }}
                      className="text-xs font-bold text-[#E11D48] hover:underline cursor-pointer"
                    >
                      필터 초기화
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        inCartCount={cartCountByProduct.get(product.id) || 0}
                        onAdd={handleAddProduct}
                        onDragStartProduct={() => setIsDraggingProduct(true)}
                        onDragEndProduct={() => setIsDraggingProduct(false)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT 5 COLUMNS: DESKTOP STICKY RECEIPT */}
          <aside className="hidden xl:block xl:col-span-5 sticky top-20">
            <div className="max-h-[calc(100vh-6rem)] overflow-y-auto receipt-scroll rounded-2xl">
              <ReceiptPanel {...receiptProps} />
            </div>
          </aside>
        </div>

        {/* Verified Legal Disclosures Section */}
        <LegalDisclosureSection />

        <footer className="mt-8 pt-6 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#64748B]">
          <p>
            롯데하이마트 경기광주점 · 본 시뮬레이터의 산출 금액은 고객 이해를 돕기 위한 안내이며,
            최종 계약 조건은 가입 시점 지점 및 카드사·상조사 공식 약관을 따릅니다.
          </p>
          <span className="font-mono text-[11px] text-[#94A3B8] shrink-0">
            Himart GJ Simulator v1.0
          </span>
        </footer>
      </main>

      {/* Subtle Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-24 xl:bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-bold shadow-lg whitespace-nowrap max-w-[92vw] truncate"
        >
          {toastMessage}
        </div>
      )}

      {/* MOBILE STICKY BOTTOM SUMMARY BAR (< xl) */}
      <div className="xl:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#E2E8F0] shadow-[0_-4px_16px_rgba(15,23,42,0.08)] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMobileSheetOpen(true)}
            className="flex items-center gap-2.5 min-w-0 text-left flex-1 cursor-pointer"
          >
            <div className="relative w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
              <ShoppingBag size={18} />
              {result.totalQuantity > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-[#E11D48] text-white text-[11px] font-extrabold flex items-center justify-center tabular-nums">
                  {result.totalQuantity}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-[#64748B] truncate">
                {isEmpty
                  ? '가전을 담아 혜택을 확인하세요'
                  : result.mode === 'mixed'
                    ? '1~36개월차 체감 (37~60개월 별도)'
                    : `${result.durationMonths}개월 최종 월 체감가`}
              </div>
              {isEmpty ? (
                <div className="text-sm font-extrabold text-[#0F172A]">구독함 비어 있음</div>
              ) : phaseASurplus ? (
                <div className="text-sm font-extrabold text-[#059669] tabular-nums truncate">
                  체감 0원 · 매월 +
                  <SpringNumber value={result.phaseA.monthlySurplusCash} suffix="원" />
                </div>
              ) : (
                <div className="text-[15px] font-extrabold text-[#0F172A] tabular-nums">
                  월 <SpringNumber value={result.phaseA.effectiveMonthlyPay} suffix="원" />
                </div>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMobileSheetOpen(true)}
            className="inline-flex items-center gap-1 h-11 px-4 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-[13px] font-extrabold shrink-0 active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>혜택 영수증</span>
            <ChevronUp size={16} />
          </button>
        </div>
      </div>

      {/* MOBILE BOTTOM SHEET RECEIPT DRAWER */}
      {mobileSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="모바일 실시간 혜택 영수증"
          className="xl:hidden fixed inset-0 z-40 flex flex-col justify-end bg-[#0F172A]/50"
        >
          <button
            type="button"
            aria-label="영수증 닫기"
            onClick={() => setMobileSheetOpen(false)}
            className="flex-1 w-full cursor-default"
          />
          <div className="max-h-[90vh] flex flex-col rounded-t-3xl bg-[#F8FAFC] border-t border-[#E2E8F0] shadow-2xl overflow-hidden">
            <div className="px-5 py-3 bg-white border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-8 h-1 rounded-full bg-[#CBD5E1] hidden" />
                <span className="text-sm font-extrabold text-[#0F172A]">
                  실시간 혜택 비교 영수증
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                aria-label="닫기"
                className="w-9 h-9 rounded-xl bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-3 pb-6">
              <ReceiptPanel {...receiptProps} />
            </div>
          </div>
        </div>
      )}

      {/* WRITE-ONLY CONSULTATION MODAL */}
      <ConsultationModal
        open={consultModalOpen}
        result={result}
        onClose={() => setConsultModalOpen(false)}
      />
    </div>
  )
}
