import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronUp,
  ExternalLink,
  Layers,
  LayoutGrid,
  MapPin,
  MessageSquare,
  PhoneCall,
  Search,
  Share2,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  X,
} from 'lucide-react'
import { BundleShowcase } from '../components/BundleShowcase'
import { ConsultationModal } from '../components/ConsultationModal'
import { HeroQuickSimulator } from '../components/HeroQuickSimulator'
import { LegalDisclosureSection } from '../components/LegalDisclosureSection'
import { MetaAdShowroomHero } from '../components/MetaAdShowroomHero'
import { ProductCard } from '../components/ProductCard'
import { ProductDetailModal } from '../components/ProductDetailModal'
import { ReceiptPanel } from '../components/ReceiptPanel'
import { SpringNumber } from '../components/SpringNumber'
import { DEFAULT_CATEGORIES } from '../data/initialSeedData'
import { STORE_INFO } from '../data/storeInfo'
import type {
  CartItem,
  CatalogSnapshot,
  LifeCareUnits,
  ProductItem,
  RecommendedBundle,
  SubscriptionTerm,
} from '../types/domain'
import {
  calculateBenefitSimulation,
  clampLifeCareUnits,
  recommendZeroCostLifeCare,
} from '../utils/calculator'
import { resolveMarketingAttribution } from '../utils/marketingTracker'
import {
  type QuickScenarioPreset,
  buildQuickScenarioPresets,
  isSameCartItems,
  readPresetKeyFromUrl,
  resolveInitialPreset,
} from '../utils/presets'

interface SimulatorPageProps {
  catalog: CatalogSnapshot
  dataSource: 'gas' | 'local-preview'
}

type ScreenView = 'home' | 'customizer'
type BrowseMode = 'products' | 'bundles'

export function SimulatorPage({
  catalog,
  dataSource,
}: SimulatorPageProps) {
  const presets = useMemo(() => buildQuickScenarioPresets(catalog), [catalog])
  const urlPresetKey = useMemo(
    () =>
      typeof window !== 'undefined'
        ? readPresetKeyFromUrl(window.location.search, window.location.hash)
        : null,
    [],
  )
  const attribution = useMemo(
    () =>
      typeof window !== 'undefined'
        ? resolveMarketingAttribution(window.location.search, window.location.hash)
        : {
            utmSource: '',
            utmMedium: '',
            utmCampaign: '',
            utmContent: '',
            utmTerm: '',
            fbclid: '',
            adMode: false,
          },
    [],
  )

  const initialSetup = useMemo(() => {
    const matched = resolveInitialPreset(presets, urlPresetKey)
    const startCart = matched ? matched.items : []
    const startLifeCare = recommendZeroCostLifeCare({
      cart: startCart,
      products: catalog.products,
      policy: catalog.policy,
    })
    return { cart: startCart, lifeCare: startLifeCare }
    // Compute initial setup once on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [screenView, setScreenView] = useState<ScreenView>('home')
  const [adShowroomOpen, setAdShowroomOpen] = useState<boolean>(
    Boolean(attribution.adMode && !urlPresetKey),
  )
  const [browseMode, setBrowseMode] = useState<BrowseMode>('products')
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [selectedBrand, setSelectedBrand] = useState<string>('전체')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const [cart, setCart] = useState<CartItem[]>(initialSetup.cart)
  const [lifeCare, setLifeCare] = useState<LifeCareUnits>(initialSetup.lifeCare)
  const [autoOptimizeFreed, setAutoOptimizeFreed] = useState<boolean>(true)
  const [hasUserCustomized, setHasUserCustomized] = useState<boolean>(false)
  const [coverShortfall, setCoverShortfall] = useState<boolean>(true)

  const [selectedColorByProduct, setSelectedColorByProduct] = useState<Record<string, string>>({})
  const [detailModalProduct, setDetailModalProduct] = useState<ProductItem | null>(null)
  const [consultUndecidedPreset, setConsultUndecidedPreset] = useState<boolean>(false)

  const [isDraggingProduct, setIsDraggingProduct] = useState(false)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [consultModalOpen, setConsultModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (hasUserCustomized) return
    const matched = resolveInitialPreset(presets, urlPresetKey)
    if (!matched) return
    const optimal = recommendZeroCostLifeCare({
      cart: matched.items,
      products: catalog.products,
      policy: catalog.policy,
    })
    setCart(matched.items)
    setLifeCare(optimal)
  }, [catalog, presets, urlPresetKey, hasUserCustomized])

  const activePresetId = useMemo(() => {
    const matched = presets.find((p) => isSameCartItems(p.items, cart))
    return matched ? matched.id : null
  }, [presets, cart])

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
        cardEnabled: true,
        coverShortfallWithLivingSpend: coverShortfall,
        policy: catalog.policy,
      }),
    [cart, catalog.products, catalog.policy, lifeCare, coverShortfall],
  )

  const showToast = (msg: string) => {
    setToastMessage(msg)
    window.setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur))
    }, 2400)
  }

  const handleSelectColor = (productId: string, colorName: string) => {
    setSelectedColorByProduct((prev) => ({ ...prev, [productId]: colorName }))
  }

  const openConsultModal = (undecided = false) => {
    setConsultUndecidedPreset(undecided)
    setMobileSheetOpen(false)
    setConsultModalOpen(true)
  }

  const switchScreen = (nextView: ScreenView, nextMode?: BrowseMode) => {
    if (nextMode) {
      setBrowseMode(nextMode)
    }
    setScreenView(nextView)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const updateCartWithOptionalOptimize = (
    updater: (prev: CartItem[]) => CartItem[],
    forceAutoOptimize = false,
  ) => {
    setHasUserCustomized(true)
    setCart((prev) => {
      const nextCart = updater(prev)
      if (autoOptimizeFreed || forceAutoOptimize) {
        const optimal = recommendZeroCostLifeCare({
          cart: nextCart,
          products: catalog.products,
          policy: catalog.policy,
        })
        setLifeCare(optimal)
      }
      return nextCart
    })
  }

  const handleSelectPreset = (preset: QuickScenarioPreset) => {
    setHasUserCustomized(true)
    setAutoOptimizeFreed(true)
    const nextCart = preset.items.map((i) => ({ ...i }))
    const optimal = recommendZeroCostLifeCare({
      cart: nextCart,
      products: catalog.products,
      policy: catalog.policy,
    })
    setCart(nextCart)
    setLifeCare(optimal)
    showToast(`‘${preset.shortTitle}’ 추천 혜택이 반영되었습니다`)
  }

  const handleSelectSingleProduct = (
    productId: string,
    term: SubscriptionTerm,
    colorName?: string,
  ) => {
    if (colorName) {
      handleSelectColor(productId, colorName)
    }
    setHasUserCustomized(true)
    setAutoOptimizeFreed(true)
    const singleCart: CartItem[] = [{ productId, term, quantity: 1 }]
    const optimal = recommendZeroCostLifeCare({
      cart: singleCart,
      products: catalog.products,
      policy: catalog.policy,
    })
    setCart(singleCart)
    setLifeCare(optimal)
    setAdShowroomOpen(false)
    setDetailModalProduct(null)
    setScreenView('home')
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        const el = document.getElementById('benefit-statement-card')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }, 60)
    }
    const prod = catalog.products.find((p) => p.id === productId)
    if (prod) {
      showToast(`${prod.brand} ${prod.name} 추천상품 자동맞춤이 적용되었습니다`)
    }
  }

  const handleAddProduct = (productId: string, term: SubscriptionTerm) => {
    updateCartWithOptionalOptimize((prev) => {
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
      showToast(
        autoOptimizeFreed
          ? `${prod.brand} ${prod.name} 추가 (추천상품 자동맞춤)`
          : `${prod.brand} ${prod.name} (${term}개월) 추가`,
      )
    }
  }

  const handleApplyBundle = (bundle: RecommendedBundle) => {
    setAutoOptimizeFreed(true)
    updateCartWithOptionalOptimize(
      () =>
        bundle.items.map((item) => ({
          productId: item.productId,
          term: item.term,
          quantity: item.quantity,
        })),
      true,
    )
    setAdShowroomOpen(false)
    switchScreen('home')
    showToast(`‘${bundle.name}’ 추천상품 자동맞춤이 반영되었습니다`)
  }

  const handleUpdateCartQuantity = (
    productId: string,
    term: SubscriptionTerm,
    delta: number,
  ) => {
    updateCartWithOptionalOptimize((prev) =>
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
    updateCartWithOptionalOptimize((prev) => {
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
    updateCartWithOptionalOptimize((prev) =>
      prev.filter((i) => !(i.productId === productId && i.term === term)),
    )
  }

  const handleClearCart = () => {
    setHasUserCustomized(true)
    setCart([])
    if (autoOptimizeFreed) {
      setLifeCare({ q40: 0, q50: 0, q60: 0 })
    }
  }

  const handleUpdateLifeCareUnit = (tier: keyof LifeCareUnits, delta: number) => {
    setHasUserCustomized(true)
    setAutoOptimizeFreed(false)
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
    setHasUserCustomized(true)
    setAutoOptimizeFreed(false)
    setLifeCare(clampLifeCareUnits(units, catalog.policy.maxLifeCareUnits))
  }

  const handleApplyZeroCostPreset = () => {
    setHasUserCustomized(true)
    setAutoOptimizeFreed(true)
    const recommended = recommendZeroCostLifeCare({
      cart,
      products: catalog.products,
      policy: catalog.policy,
    })
    setLifeCare(recommended)
    showToast('추천상품 자동맞춤이 적용되었습니다')
  }

  const handleToggleAutoOptimize = (enabled: boolean) => {
    setAutoOptimizeFreed(enabled)
    if (enabled && cart.length > 0) {
      const recommended = recommendZeroCostLifeCare({
        cart,
        products: catalog.products,
        policy: catalog.policy,
      })
      setLifeCare(recommended)
      showToast('품목 변경 시 추천상품 자동맞춤이 적용됩니다')
    }
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
    autoOptimizeFreed,
    onToggleAutoOptimizeFreed: handleToggleAutoOptimize,
    onDropProduct: handleAddProduct,
    onUpdateCartQuantity: handleUpdateCartQuantity,
    onSwitchCartItemTerm: handleSwitchCartItemTerm,
    onRemoveCartItem: handleRemoveCartItem,
    onClearCart: handleClearCart,
    onUpdateLifeCareUnit: handleUpdateLifeCareUnit,
    onSetLifeCareUnits: handleSetLifeCareUnits,
    onApplyZeroCostPreset: handleApplyZeroCostPreset,
    onToggleCoverShortfall: setCoverShortfall,
    onOpenConsultModal: () => openConsultModal(false),
    onQuickTrySample: handleQuickTrySample,
  }

  const isEmpty = result.mode === 'empty'
  const phaseASurplus = result.phaseA.monthlySurplusCash > 0

  return (
    <div className="min-h-dvh bg-paper text-ink pb-28 xl:pb-16">
      {/* Masthead */}
      <header className="sticky top-0 z-30 bg-surface border-b border-rule">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {screenView === 'customizer' ? (
              <button
                type="button"
                onClick={() => switchScreen('home')}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface hover:bg-field border border-rule-strong text-ink text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                <span>추천 홈</span>
              </button>
            ) : null}

            <div className={screenView === 'customizer' ? 'hidden sm:block min-w-0' : 'min-w-0'}>
              {screenView === 'home' && (
                <span className="brand-wordmark block text-[10px] font-extrabold text-accent leading-none mb-0.5">
                  LOTTE HIMART
                </span>
              )}
              <div className="flex items-center gap-2">
                <h1 className="text-[14px] sm:text-base font-bold text-ink tracking-tight whitespace-nowrap">
                  {screenView === 'home' ? (
                    <>
                      <span>{STORE_INFO.name}</span>
                      <span className="hidden md:inline"> 가전구독</span>
                    </>
                  ) : (
                    '원하는 가전 직접 골라 담기'
                  )}
                </h1>
                {dataSource === 'local-preview' && import.meta.env.DEV && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-field border border-rule text-[10px] font-bold text-ink-2 shrink-0">
                    로컬 프리뷰
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {screenView === 'home' && (
              <button
                type="button"
                onClick={() => setAdShowroomOpen((v) => !v)}
                className={`hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                  adShowroomOpen
                    ? 'bg-accent-soft border-accent-rule text-accent'
                    : 'bg-surface hover:bg-field border-rule-strong text-ink-2'
                }`}
              >
                <Store size={13} aria-hidden="true" />
                <span>{adShowroomOpen ? '설계 홈 보기' : '가전 쇼윈도'}</span>
              </button>
            )}

            {screenView === 'home' ? (
              <button
                type="button"
                onClick={() => switchScreen('customizer', 'products')}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-ink hover:bg-ink-hover text-on-ink text-xs font-bold transition-colors cursor-pointer"
              >
                <SlidersHorizontal size={13} aria-hidden="true" />
                <span>가전 골라담기</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchScreen('home')}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-accent hover:bg-accent-hover text-accent-ink text-xs font-bold transition-colors cursor-pointer tabular-nums"
              >
                <CheckCircle2 size={13} aria-hidden="true" />
                <span>선택완료 ({result.totalQuantity}대)</span>
              </button>
            )}

            <a
              href={STORE_INFO.telHref}
              aria-label={`매장 전화 ${STORE_INFO.phone}`}
              className="inline-flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3 rounded-lg bg-surface hover:bg-field border border-rule-strong text-ink text-xs font-semibold transition-colors tabular-nums shrink-0"
            >
              <PhoneCall size={14} aria-hidden="true" />
              <span className="hidden sm:inline">{STORE_INFO.phone}</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7">
        {screenView === 'home' ? (
          adShowroomOpen ? (
            <>
              <MetaAdShowroomHero
                products={visibleProducts}
                policy={catalog.policy}
                selectedColorByProduct={selectedColorByProduct}
                onSelectColor={handleSelectColor}
                onOpenProductDetail={(p) => setDetailModalProduct(p)}
                onConfirmShowroomProduct={handleSelectSingleProduct}
                onOpenUndecidedConsult={() => openConsultModal(true)}
                onExitAdMode={() => setAdShowroomOpen(false)}
              />
              <LegalDisclosureSection />
            </>
          ) : (
            <>
              <HeroQuickSimulator
                presets={presets}
                products={catalog.products}
                activePresetId={activePresetId}
                result={result}
                policy={catalog.policy}
                autoOptimizeFreed={autoOptimizeFreed}
                onSelectPreset={handleSelectPreset}
                onToggleCoverShortfall={setCoverShortfall}
                onOpenConsultModal={() => openConsultModal(false)}
                onOpenProductDetail={(p) => setDetailModalProduct(p)}
                onOpenCustomizer={(mode) => switchScreen('customizer', mode ?? 'products')}
              />

              <LegalDisclosureSection />
            </>
          )
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl bg-surface border border-rule p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => switchScreen('home')}
                    className="inline-flex items-center gap-1 font-bold text-accent hover:underline cursor-pointer"
                  >
                    <ArrowLeft size={14} aria-hidden="true" />
                    <span>메인 화면으로</span>
                  </button>
                  <span className="text-rule-strong" aria-hidden="true">|</span>
                  <span className="font-semibold text-ink-2">
                    추천 혜택 체감가와 카드 사용 시 추가 혜택이 실시간 반영됩니다
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                  원하는 가전 직접 골라 담기
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div
                  role="tablist"
                  aria-label="상품 선택 모드"
                  className="inline-grid grid-cols-2 p-1 rounded-lg bg-field border border-rule w-full sm:w-auto"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={browseMode === 'products'}
                    onClick={() => setBrowseMode('products')}
                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs sm:text-[13px] font-bold transition-colors cursor-pointer ${
                      browseMode === 'products'
                        ? 'bg-ink text-on-ink'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    <LayoutGrid size={14} aria-hidden="true" />
                    <span>단품 골라 담기</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={browseMode === 'bundles'}
                    onClick={() => setBrowseMode('bundles')}
                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs sm:text-[13px] font-bold transition-colors cursor-pointer ${
                      browseMode === 'bundles'
                        ? 'bg-ink text-on-ink'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    <Layers size={14} aria-hidden="true" />
                    <span>인기 세트 묶음</span>
                  </button>
                </div>

                {!isEmpty && (
                  <button
                    type="button"
                    onClick={() => switchScreen('home')}
                    className="w-full sm:w-auto h-10 px-4 rounded-lg bg-accent hover:bg-accent-hover text-accent-ink text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 size={14} aria-hidden="true" />
                    <span>선택 완료 및 결과 보기</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className="xl:col-span-7 space-y-5">
                {browseMode === 'bundles' ? (
                  <BundleShowcase
                    bundles={catalog.bundles}
                    products={catalog.products}
                    policy={catalog.policy}
                    onApplyBundle={handleApplyBundle}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-surface border border-rule p-4 space-y-3">
                      <div className="relative">
                        <Search
                          size={16}
                          aria-hidden="true"
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle"
                        />
                        <input
                          type="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="상품명, 브랜드, 모델명 검색"
                          className="w-full h-11 pl-10 pr-9 rounded-lg bg-field border border-rule text-base text-ink"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            aria-label="검색어 지우기"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-ink cursor-pointer"
                          >
                            <X size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                        {categories.map((cat) => {
                          const active = selectedCategory === cat
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setSelectedCategory(cat)}
                              className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                                active
                                  ? 'bg-ink text-on-ink'
                                  : 'bg-field text-ink-2 border border-rule hover:text-ink'
                              }`}
                            >
                              {cat}
                            </button>
                          )
                        })}
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-rule">
                        <span className="text-[11px] font-bold text-muted shrink-0 mr-1">
                          브랜드
                        </span>
                        {brands.map((brand) => {
                          const active = selectedBrand === brand
                          return (
                            <button
                              key={brand}
                              type="button"
                              onClick={() => setSelectedBrand(brand)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                                active
                                  ? 'bg-accent-soft text-accent border-accent-rule'
                                  : 'bg-surface text-ink-2 border-rule hover:border-rule-strong'
                              }`}
                            >
                              {brand}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {filteredProducts.length === 0 ? (
                      <div className="rounded-xl bg-surface border border-rule p-10 text-center space-y-2">
                        <p className="text-sm font-bold text-ink">
                          조건에 맞는 구독 가전이 없습니다
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory('전체')
                            setSelectedBrand('전체')
                            setSearchQuery('')
                          }}
                          className="text-xs font-bold text-accent hover:underline cursor-pointer"
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
                            policy={catalog.policy}
                            inCartCount={cartCountByProduct.get(product.id) || 0}
                            selectedColor={selectedColorByProduct[product.id]}
                            onSelectColor={handleSelectColor}
                            onOpenDetail={(p) => setDetailModalProduct(p)}
                            onAdd={handleAddProduct}
                            onSelectSingle={handleSelectSingleProduct}
                            onDragStartProduct={() => setIsDraggingProduct(true)}
                            onDragEndProduct={() => setIsDraggingProduct(false)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <aside className="hidden xl:block xl:col-span-5 sticky top-20">
                <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto receipt-scroll rounded-xl">
                  <ReceiptPanel {...receiptProps} />
                </div>
              </aside>
            </div>
          </div>
        )}

        {/* BOTTOM FOOTER: OFFICIAL STORE INFO + SOCIAL CHANNELS */}
        <footer className="mt-10 pt-8 border-t border-rule space-y-3 text-xs text-muted">
          <div className="rounded-xl bg-surface border border-rule p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-sm font-bold text-ink">
                  {STORE_INFO.name}
                </strong>
                <span className="px-2 py-0.5 rounded bg-field text-[11px] font-medium text-ink-2">
                  {STORE_INFO.badge}
                </span>
              </div>
              <div className="text-xs text-ink-2 tabular-nums leading-relaxed flex flex-wrap gap-x-4 gap-y-1">
                <span>주소: {STORE_INFO.address} ({STORE_INFO.parkingNote})</span>
                <span>영업시간: {STORE_INFO.hours}</span>
                <span>
                  직통문의:{' '}
                  <a href={STORE_INFO.telHref} className="font-bold text-ink underline">
                    {STORE_INFO.phone}
                  </a>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={STORE_INFO.naverMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface hover:bg-field border border-rule-strong text-xs font-semibold text-ink transition-colors"
              >
                <MapPin size={13} aria-hidden="true" />
                <span>오시는 길</span>
              </a>

              <a
                href={STORE_INFO.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface hover:bg-field border border-rule-strong text-xs font-semibold text-ink transition-colors"
              >
                <Share2 size={13} aria-hidden="true" />
                <span>인스타그램</span>
                <ExternalLink size={11} aria-hidden="true" className="text-muted" />
              </a>

              <a
                href={STORE_INFO.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface hover:bg-field border border-rule-strong text-xs font-semibold text-ink transition-colors"
              >
                <Share2 size={13} aria-hidden="true" />
                <span>페이스북</span>
                <ExternalLink size={11} aria-hidden="true" className="text-muted" />
              </a>

              <a
                href={STORE_INFO.naverBlogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface hover:bg-field border border-rule-strong text-xs font-semibold text-ink transition-colors"
              >
                <BookOpen size={13} aria-hidden="true" />
                <span>공식 블로그</span>
                <ExternalLink size={11} aria-hidden="true" className="text-muted" />
              </a>
            </div>
          </div>

          <p className="text-[11px] text-muted leading-relaxed">
            표시 금액은 당월 업로드 기준 이해를 돕기 위한 예시이며, 행사 일정 및 가입 시점 약관에 따라 변동될 수 있습니다.
          </p>
        </footer>
      </main>

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-24 xl:bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-lg bg-ink text-on-ink text-xs font-bold whitespace-nowrap max-w-[92vw] truncate"
        >
          {toastMessage}
        </div>
      )}

      {/* MOBILE STICKY BOTTOM SUMMARY BAR (< xl) */}
      <div className="xl:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-rule-strong px-3 sm:px-4 py-2.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMobileSheetOpen(true)}
            className="flex items-center gap-2 min-w-0 text-left flex-1 cursor-pointer"
          >
            <div className="hidden sm:flex relative w-8 h-8 rounded-lg bg-ink text-on-ink items-center justify-center shrink-0">
              <ShoppingBag size={15} aria-hidden="true" />
              {result.totalQuantity > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-4 px-1 rounded-full bg-accent text-accent-ink text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {result.totalQuantity}
                </span>
              )}
            </div>
            <div className="min-w-0">
              {isEmpty ? (
                <>
                  <div className="text-[10px] font-medium text-muted">가전을 선택해 주세요</div>
                  <div className="text-xs font-bold text-ink">품목 선택 전</div>
                </>
              ) : (
                <>
                  <div className="text-[12px] sm:text-[13px] font-extrabold text-ink tabular-nums whitespace-nowrap">
                    추천 혜택가 월 <SpringNumber value={result.phaseA.afterLifeCareEffective} suffix="원" />
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-positive tabular-nums whitespace-nowrap">
                    {phaseASurplus
                      ? `카드 사용 시 0원 (+${result.phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원)`
                      : `카드 사용 시 월 ${result.phaseA.effectiveMonthlyPay.toLocaleString('ko-KR')}원`}
                  </div>
                </>
              )}
            </div>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileSheetOpen(true)}
              className="inline-flex items-center gap-0.5 h-9 sm:h-10 px-2 sm:px-2.5 rounded-lg bg-surface hover:bg-field border border-rule-strong text-ink text-[11px] sm:text-xs font-bold transition-colors cursor-pointer"
            >
              <span>구좌</span>
              <span className="hidden min-[390px]:inline">변경</span>
              <ChevronUp size={13} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => openConsultModal(false)}
              className="inline-flex items-center gap-1 h-9 sm:h-10 px-3 sm:px-3.5 rounded-lg bg-accent hover:bg-accent-hover text-accent-ink text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              <MessageSquare size={13} aria-hidden="true" className="hidden sm:inline" />
              <span>견적 받기</span>
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM SHEET RECEIPT DRAWER */}
      {mobileSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="모바일 맞춤 혜택 설계 및 구좌 변경"
          className="xl:hidden fixed inset-0 z-40 flex flex-col justify-end bg-ink/55"
        >
          <button
            type="button"
            aria-label="명세서 닫기"
            onClick={() => setMobileSheetOpen(false)}
            className="flex-1 w-full cursor-default"
          />
          <div className="max-h-[90dvh] flex flex-col rounded-t-2xl bg-paper border-t border-rule-strong overflow-hidden">
            <div className="px-5 py-3 bg-surface border-b border-rule flex items-center justify-between shrink-0">
              <span className="text-sm font-bold text-ink">
                내 맞춤 혜택 설계 및 구좌 변경
              </span>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                aria-label="닫기"
                className="w-9 h-9 rounded-lg bg-field flex items-center justify-center text-ink cursor-pointer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 pb-6">
              <ReceiptPanel {...receiptProps} />
            </div>
          </div>
        </div>
      )}

      {/* SWIPEABLE LIFESTYLE EMPATHY DETAIL MODAL */}
      <ProductDetailModal
        product={detailModalProduct}
        allProducts={visibleProducts}
        policy={catalog.policy}
        selectedColorByProduct={selectedColorByProduct}
        onSelectColor={handleSelectColor}
        onNavigateProduct={(next) => setDetailModalProduct(next)}
        onChooseProduct={handleSelectSingleProduct}
        onClose={() => setDetailModalProduct(null)}
      />

      {/* WRITE-ONLY CONSULTATION MODAL */}
      <ConsultationModal
        open={consultModalOpen}
        result={result}
        initialUndecided={consultUndecidedPreset}
        selectedColorByProduct={selectedColorByProduct}
        attribution={attribution}
        onClose={() => setConsultModalOpen(false)}
      />
    </div>
  )
}
