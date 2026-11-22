import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronUp,
  ExternalLink,
  Layers,
  LayoutGrid,
  MapPin,
  MessageSquare,
  PhoneCall,
  RotateCcw,
  Search,
  Share2,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { BundleShowcase } from '../components/BundleShowcase'
import { ConsultationModal } from '../components/ConsultationModal'
import { CustomBenefitResultModal } from '../components/CustomBenefitResultModal'
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
  readPresetKeyFromUrl,
  resolveInitialPreset,
} from '../utils/presets'

interface SimulatorPageProps {
  catalog: CatalogSnapshot
  dataSource: 'gas' | 'local-preview'
}

type ScreenView = 'home' | 'customizer'
type BrowseMode = 'products' | 'bundles'
type ResultTargetMode = 'custom-cart' | 'single-preview'
type ConsultSource = 'home' | 'custom-result' | 'meta-showroom'

export function SimulatorPage({
  catalog,
  dataSource,
}: SimulatorPageProps) {
  const presets = useMemo(() => buildQuickScenarioPresets(catalog), [catalog])
  const [locationKey, setLocationKey] = useState<string>(() =>
    typeof window !== 'undefined' ? `${window.location.search}|${window.location.hash}` : '',
  )
  const urlPresetKey = useMemo(() => {
    void locationKey
    return typeof window !== 'undefined'
      ? readPresetKeyFromUrl(window.location.search, window.location.hash)
      : null
  }, [locationKey])
  const attribution = useMemo(() => {
    void locationKey
    return typeof window !== 'undefined'
      ? resolveMarketingAttribution(window.location.search, window.location.hash)
      : {
          utmSource: '',
          utmMedium: '',
          utmCampaign: '',
          utmContent: '',
          utmTerm: '',
          fbclid: '',
          adMode: false,
        }
  }, [locationKey])

  /* ==================== 1. MAIN HOME STATE (EXCLUSIVELY 4 ONE-CLICK PRESETS) ==================== */
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(() => {
    const matched = resolveInitialPreset(presets, urlPresetKey)
    return matched ? matched.id : null
  })
  const [heroManualLifeCare, setHeroManualLifeCare] = useState<LifeCareUnits | null>(null)
  const [heroCoverShortfall, setHeroCoverShortfall] = useState<boolean>(true)

  const activeHeroPreset = useMemo(
    () =>
      presets.find((p) => p.id === selectedPresetId) ??
      resolveInitialPreset(presets, urlPresetKey) ??
      presets[0] ??
      null,
    [presets, selectedPresetId, urlPresetKey],
  )

  const heroCart = useMemo(
    () => (activeHeroPreset ? activeHeroPreset.items : []),
    [activeHeroPreset],
  )

  const heroAutoLifeCare = useMemo(
    () =>
      recommendZeroCostLifeCare({
        cart: heroCart,
        products: catalog.products,
        policy: catalog.policy,
      }),
    [heroCart, catalog.products, catalog.policy],
  )

  const heroAutoOptimize = heroManualLifeCare === null
  const heroLifeCare = heroManualLifeCare ?? heroAutoLifeCare

  const heroResult = useMemo(
    () =>
      calculateBenefitSimulation({
        cart: heroCart,
        products: catalog.products,
        lifeCare: heroLifeCare,
        cardEnabled: true,
        coverShortfallWithLivingSpend: heroCoverShortfall,
        policy: catalog.policy,
      }),
    [heroCart, catalog.products, catalog.policy, heroLifeCare, heroCoverShortfall],
  )

  /* ==================== 2. CUSTOMIZER & META SHOWROOM STATE (INDEPENDENT FROM HOME) ==================== */
  const [screenView, setScreenView] = useState<ScreenView>('home')
  // Meta Showroom ONLY activates when entering via Meta Ad URL (?ad=meta, utm_source=meta/ig/fb, fbclid)
  const [adShowroomOpen, setAdShowroomOpen] = useState<boolean>(
    Boolean(attribution.adMode && !urlPresetKey),
  )
  useEffect(() => {
    const syncHashUrl = () => {
      const nextPreset = readPresetKeyFromUrl(window.location.search, window.location.hash)
      const nextAttr = resolveMarketingAttribution(window.location.search, window.location.hash)
      setLocationKey(`${window.location.search}|${window.location.hash}`)
      setAdShowroomOpen(Boolean(nextAttr.adMode && !nextPreset))
      if (nextPreset) {
        const matched = resolveInitialPreset(presets, nextPreset)
        if (matched) setSelectedPresetId(matched.id)
      }
    }
    window.addEventListener('hashchange', syncHashUrl)
    return () => window.removeEventListener('hashchange', syncHashUrl)
  }, [presets])
  const [browseMode, setBrowseMode] = useState<BrowseMode>('products')
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [selectedBrand, setSelectedBrand] = useState<string>('전체')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const [customCart, setCustomCart] = useState<CartItem[]>([])
  const [customManualLifeCare, setCustomManualLifeCare] = useState<LifeCareUnits | null>(null)
  const [customCoverShortfall, setCustomCoverShortfall] = useState<boolean>(true)

  // Dedicated single-product preview state so clicking '단독 혜택 보기' never wipes items already added via '+ 추가하기'
  const [singlePreviewCart, setSinglePreviewCart] = useState<CartItem[]>([])
  const [singleManualLifeCare, setSingleManualLifeCare] = useState<LifeCareUnits | null>(null)
  const [resultTargetMode, setResultTargetMode] = useState<ResultTargetMode>('custom-cart')
  const [resultModalOpen, setResultModalOpen] = useState<boolean>(false)
  const [resultOriginLabel, setResultOriginLabel] = useState<string>('가전 다시 고르기')

  const customAutoLifeCare = useMemo(
    () =>
      recommendZeroCostLifeCare({
        cart: customCart,
        products: catalog.products,
        policy: catalog.policy,
      }),
    [customCart, catalog.products, catalog.policy],
  )

  const singleAutoLifeCare = useMemo(
    () =>
      recommendZeroCostLifeCare({
        cart: singlePreviewCart,
        products: catalog.products,
        policy: catalog.policy,
      }),
    [singlePreviewCart, catalog.products, catalog.policy],
  )

  const customCartResult = useMemo(
    () =>
      calculateBenefitSimulation({
        cart: customCart,
        products: catalog.products,
        lifeCare: customManualLifeCare ?? customAutoLifeCare,
        cardEnabled: true,
        coverShortfallWithLivingSpend: customCoverShortfall,
        policy: catalog.policy,
      }),
    [
      customCart,
      catalog.products,
      catalog.policy,
      customManualLifeCare,
      customAutoLifeCare,
      customCoverShortfall,
    ],
  )

  const activeOverlayCart =
    resultTargetMode === 'single-preview' ? singlePreviewCart : customCart
  const activeOverlayAutoOptimize =
    resultTargetMode === 'single-preview'
      ? singleManualLifeCare === null
      : customManualLifeCare === null
  const activeOverlayLifeCare =
    resultTargetMode === 'single-preview'
      ? (singleManualLifeCare ?? singleAutoLifeCare)
      : (customManualLifeCare ?? customAutoLifeCare)

  const overlayResult = useMemo(
    () =>
      calculateBenefitSimulation({
        cart: activeOverlayCart,
        products: catalog.products,
        lifeCare: activeOverlayLifeCare,
        cardEnabled: true,
        coverShortfallWithLivingSpend: customCoverShortfall,
        policy: catalog.policy,
      }),
    [
      activeOverlayCart,
      catalog.products,
      catalog.policy,
      activeOverlayLifeCare,
      customCoverShortfall,
    ],
  )

  /* ==================== 3. SHARED UI & HISTORY BACK STACK ==================== */
  const [selectedColorByProduct, setSelectedColorByProduct] = useState<Record<string, string>>({})
  const [detailModalProduct, setDetailModalProduct] = useState<ProductItem | null>(null)
  const [consultUndecidedPreset, setConsultUndecidedPreset] = useState<boolean>(false)
  const [consultSource, setConsultSource] = useState<ConsultSource>('home')

  const [isDraggingProduct, setIsDraggingProduct] = useState(false)
  const [mobileHeroSheetOpen, setMobileHeroSheetOpen] = useState(false)
  const [consultModalOpen, setConsultModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Refs to read latest UI layer inside popstate without stale closures
  const suppressNextPopRef = useRef(false)
  const layerStateRef = useRef({
    resultModalOpen: false,
    detailOpen: false,
    screenView: 'home' as ScreenView,
  })
  useEffect(() => {
    layerStateRef.current = {
      resultModalOpen,
      detailOpen: Boolean(detailModalProduct),
      screenView,
    }
  }, [resultModalOpen, detailModalProduct, screenView])

  useEffect(() => {
    const handlePopState = () => {
      if (suppressNextPopRef.current) {
        suppressNextPopRef.current = false
        return
      }
      if (window.location.hash.startsWith('#/admin')) return
      const cur = layerStateRef.current
      if (cur.detailOpen) {
        setDetailModalProduct(null)
        return
      }
      if (cur.resultModalOpen) {
        setResultModalOpen(false)
        return
      }
      if (cur.screenView === 'customizer') {
        setScreenView('home')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const pushUiHistory = useCallback((uiLayer: 'customizer' | 'result') => {
    if (typeof window === 'undefined') return
    try {
      window.history.pushState({ uiLayer }, '')
    } catch {
      // Ignore history push restrictions in sandboxed iframes
    }
  }, [])

  const closeResultModal = useCallback(() => {
    setResultModalOpen(false)
    if (typeof window !== 'undefined' && window.history.state?.uiLayer === 'result') {
      suppressNextPopRef.current = true
      try {
        window.history.back()
      } catch {
        suppressNextPopRef.current = false
      }
    }
  }, [])

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    window.setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur))
    }, 2400)
  }, [])

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

  const handleSelectColor = (productId: string, colorName: string) => {
    setSelectedColorByProduct((prev) => ({ ...prev, [productId]: colorName }))
  }

  const openConsultModal = (source: ConsultSource, undecided = false) => {
    setConsultSource(source)
    setConsultUndecidedPreset(undecided)
    setMobileHeroSheetOpen(false)
    setConsultModalOpen(true)
  }

  const openCustomizerScreen = (nextMode: BrowseMode = 'products') => {
    setBrowseMode(nextMode)
    if (screenView !== 'customizer') {
      pushUiHistory('customizer')
    }
    setScreenView('customizer')
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const returnToHomeScreen = () => {
    setScreenView('home')
    if (typeof window !== 'undefined') {
      if (window.history.state?.uiLayer === 'customizer') {
        suppressNextPopRef.current = true
        try {
          window.history.back()
        } catch {
          suppressNextPopRef.current = false
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  /* ==================== MAIN HOME HANDLERS ==================== */
  const handleSelectHeroPreset = (preset: QuickScenarioPreset) => {
    setSelectedPresetId(preset.id)
    setHeroManualLifeCare(null)
    showToast(`‘${preset.shortTitle}’ 추천 혜택이 반영되었습니다`)
  }

  const handleUpdateHeroLifeCareUnit = (tier: keyof LifeCareUnits, delta: number) => {
    const base = heroManualLifeCare ?? heroAutoLifeCare
    const currentTotal = base.q40 + base.q50 + base.q60
    if (delta > 0 && currentTotal >= catalog.policy.maxLifeCareUnits) return
    const nextVal = Math.max(0, base[tier] + delta)
    setHeroManualLifeCare(
      clampLifeCareUnits({ ...base, [tier]: nextVal }, catalog.policy.maxLifeCareUnits),
    )
  }

  /* ==================== CUSTOMIZER & DEDICATED RESULT SCREEN HANDLERS ==================== */
  const openCartResultModal = () => {
    if (customCart.length === 0) {
      showToast('먼저 원하는 가전의 ‘단독 혜택 보기’ 또는 ‘+ 추가하기’를 눌러주세요')
      return
    }
    setResultTargetMode('custom-cart')
    setResultOriginLabel('가전 골라담기로')
    pushUiHistory('result')
    setResultModalOpen(true)
  }

  const handleViewSingleProductResult = (
    productId: string,
    term: SubscriptionTerm,
    colorName?: string,
    fromLabel = '이전 화면으로',
  ) => {
    if (colorName) {
      handleSelectColor(productId, colorName)
    }
    setSinglePreviewCart([{ productId, term, quantity: 1 }])
    setSingleManualLifeCare(null)
    setResultTargetMode('single-preview')
    setResultOriginLabel(fromLabel)
    setDetailModalProduct(null)
    pushUiHistory('result')
    setResultModalOpen(true)
  }

  const handleAddCustomProduct = (productId: string, term: SubscriptionTerm) => {
    setCustomManualLifeCare(null)
    setCustomCart((prev) => {
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
      showToast(`${prod.brand} ${prod.name} 담김 · 상단/하단 ‘선택 결과 보기’를 눌러보세요`)
    }
  }

  const handleApplyBundleToResult = (bundle: RecommendedBundle) => {
    const bundleItems = bundle.items.map((item) => ({
      productId: item.productId,
      term: item.term,
      quantity: item.quantity,
    }))
    setCustomCart(bundleItems)
    setCustomManualLifeCare(null)
    setResultTargetMode('custom-cart')
    setResultOriginLabel('세트 목록으로')
    pushUiHistory('result')
    setResultModalOpen(true)
  }

  // Mutators inside CustomBenefitResultModal (operates on whichever cart is active in result view)
  const mutateOverlayCart = (updater: (prev: CartItem[]) => CartItem[]) => {
    if (resultTargetMode === 'single-preview') {
      setSingleManualLifeCare(null)
      setSinglePreviewCart((prev) => updater(prev))
    } else {
      setCustomManualLifeCare(null)
      setCustomCart((prev) => updater(prev))
    }
  }

  const handleOverlayUpdateQty = (
    productId: string,
    term: SubscriptionTerm,
    delta: number,
  ) => {
    mutateOverlayCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId && item.term === term
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const handleOverlaySwitchTerm = (
    productId: string,
    fromTerm: SubscriptionTerm,
    toTerm: SubscriptionTerm,
  ) => {
    mutateOverlayCart((prev) => {
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

  const handleOverlayRemoveItem = (productId: string, term: SubscriptionTerm) => {
    mutateOverlayCart((prev) =>
      prev.filter((i) => !(i.productId === productId && i.term === term)),
    )
  }

  const handleOverlayClear = () => {
    if (resultTargetMode === 'single-preview') {
      setSinglePreviewCart([])
      setSingleManualLifeCare(null)
    } else {
      setCustomCart([])
      setCustomManualLifeCare(null)
    }
    closeResultModal()
  }

  const handleOverlayUpdateLifeCareUnit = (tier: keyof LifeCareUnits, delta: number) => {
    const base = activeOverlayLifeCare
    const currentTotal = base.q40 + base.q50 + base.q60
    if (delta > 0 && currentTotal >= catalog.policy.maxLifeCareUnits) return
    const nextVal = Math.max(0, base[tier] + delta)
    const clamped = clampLifeCareUnits(
      { ...base, [tier]: nextVal },
      catalog.policy.maxLifeCareUnits,
    )
    if (resultTargetMode === 'single-preview') {
      setSingleManualLifeCare(clamped)
    } else {
      setCustomManualLifeCare(clamped)
    }
  }

  const handleOverlaySetLifeCareUnits = (units: LifeCareUnits) => {
    const clamped = clampLifeCareUnits(units, catalog.policy.maxLifeCareUnits)
    if (resultTargetMode === 'single-preview') {
      setSingleManualLifeCare(clamped)
    } else {
      setCustomManualLifeCare(clamped)
    }
  }

  const handleOverlayResetAutoOptimize = () => {
    if (resultTargetMode === 'single-preview') {
      setSingleManualLifeCare(null)
    } else {
      setCustomManualLifeCare(null)
    }
    showToast('추천상품 자동맞춤이 적용되었습니다')
  }

  const handleOverlayToggleAutoOptimize = (enabled: boolean) => {
    if (enabled) {
      handleOverlayResetAutoOptimize()
    } else {
      handleOverlaySetLifeCareUnits(activeOverlayLifeCare)
    }
  }

  const customCartCountByProduct = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of customCart) {
      map.set(item.productId, (map.get(item.productId) || 0) + item.quantity)
    }
    return map
  }, [customCart])

  const customTotalQty = customCartResult.totalQuantity
  const isCustomEmpty = customCartResult.mode === 'empty'
  const heroIsEmpty = heroResult.mode === 'empty'

  // Determine which CalculationResult & label ConsultationModal receives
  const consultTargetResult =
    consultSource === 'custom-result' ? overlayResult : heroResult
  const consultContextLabel =
    consultSource === 'meta-showroom'
      ? '메타광고 쇼윈도'
      : consultSource === 'custom-result'
        ? '가전 골라담기 결과'
        : '첫화면 원클릭 추천'

  return (
    <div className="min-h-dvh bg-paper text-ink pb-28 xl:pb-16">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-surface border-b border-rule">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-15 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {screenView === 'customizer' ? (
              <button
                type="button"
                onClick={returnToHomeScreen}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface hover:bg-field border border-rule-strong text-ink text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                <span>첫 화면</span>
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
            {screenView === 'home' ? (
              <button
                type="button"
                onClick={() => openCustomizerScreen('products')}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-ink hover:bg-ink-hover text-on-ink text-xs font-bold transition-colors cursor-pointer"
              >
                <SlidersHorizontal size={13} aria-hidden="true" />
                <span>가전 골라담기</span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="top-view-result-btn"
                onClick={openCartResultModal}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-bold transition-colors cursor-pointer tabular-nums ${
                  customTotalQty > 0
                    ? 'bg-accent hover:bg-accent-hover text-accent-ink'
                    : 'bg-field hover:bg-field-hover border border-rule-strong text-ink-2'
                }`}
              >
                <CheckCircle2 size={13} aria-hidden="true" />
                <span>선택 결과 보기 ({customTotalQty}대)</span>
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

      {/* Sticky Sub-Bar When Scrolling Inside Customizer */}
      {screenView === 'customizer' && (
        <div className="sticky top-14 sm:top-15 z-20 bg-paper/95 backdrop-blur-sm border-b border-rule">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div
                role="tablist"
                aria-label="상품 선택 모드"
                className="inline-grid grid-cols-2 p-0.5 rounded-lg bg-field border border-rule"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={browseMode === 'products'}
                  onClick={() => setBrowseMode('products')}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    browseMode === 'products'
                      ? 'bg-ink text-on-ink'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  <LayoutGrid size={13} aria-hidden="true" />
                  <span>단품 골라 담기</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={browseMode === 'bundles'}
                  onClick={() => setBrowseMode('bundles')}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    browseMode === 'bundles'
                      ? 'bg-ink text-on-ink'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  <Layers size={13} aria-hidden="true" />
                  <span>인기 세트 묶음</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {customTotalQty > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomCart([])
                      setCustomManualLifeCare(null)
                    }}
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-surface hover:bg-field border border-rule text-[11px] font-semibold text-muted hover:text-ink cursor-pointer"
                  >
                    <RotateCcw size={11} aria-hidden="true" />
                    <span>비우기</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={openCartResultModal}
                  className={`hidden sm:inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer tabular-nums ${
                    customTotalQty > 0
                      ? 'bg-accent hover:bg-accent-hover text-accent-ink'
                      : 'bg-surface border border-rule text-muted'
                  }`}
                >
                  <span>
                    {customTotalQty > 0
                      ? `담은 ${customTotalQty}대 혜택 결과 보기`
                      : '가전 추가 후 결과 보기'}
                  </span>
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>
            </div>

            {browseMode === 'products' && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {categories.map((cat) => {
                  const active = selectedCategory === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                        active
                          ? 'bg-ink border-ink text-on-ink'
                          : 'bg-surface border-rule text-ink-2 hover:border-rule-strong'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

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
                onConfirmShowroomProduct={(productId, term, colorName) =>
                  handleViewSingleProductResult(
                    productId,
                    term,
                    colorName,
                    '쇼윈도로 돌아가기',
                  )
                }
                onOpenUndecidedConsult={() => openConsultModal('meta-showroom', true)}
                onExitAdMode={() => setAdShowroomOpen(false)}
              />
              <LegalDisclosureSection />
            </>
          ) : (
            <>
              <HeroQuickSimulator
                presets={presets}
                products={catalog.products}
                activePresetId={activeHeroPreset?.id ?? null}
                result={heroResult}
                policy={catalog.policy}
                autoOptimizeFreed={heroAutoOptimize}
                onSelectPreset={handleSelectHeroPreset}
                onToggleCoverShortfall={setHeroCoverShortfall}
                onOpenConsultModal={() => openConsultModal('home', false)}
                onOpenProductDetail={(p) => setDetailModalProduct(p)}
                onOpenCustomizer={(mode) => openCustomizerScreen(mode ?? 'products')}
              />

              <LegalDisclosureSection />
            </>
          )
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-7 space-y-4">
              {browseMode === 'bundles' ? (
                <BundleShowcase
                  bundles={catalog.bundles}
                  products={catalog.products}
                  policy={catalog.policy}
                  onApplyBundle={handleApplyBundleToResult}
                />
              ) : (
                <div className="space-y-4">
                  {/* Search & Brand Filter */}
                  <div className="rounded-xl bg-surface border border-rule p-3.5 sm:p-4 space-y-2.5">
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
                        className="w-full h-10 pl-10 pr-9 rounded-lg bg-field border border-rule text-base text-ink"
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

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
                          inCartCount={customCartCountByProduct.get(product.id) || 0}
                          selectedColor={selectedColorByProduct[product.id]}
                          onSelectColor={handleSelectColor}
                          onOpenDetail={(p) => setDetailModalProduct(p)}
                          onAdd={handleAddCustomProduct}
                          onSelectSingle={(productId, term) =>
                            handleViewSingleProductResult(
                              productId,
                              term,
                              selectedColorByProduct[productId],
                              '가전 골라담기로',
                            )
                          }
                          onDragStartProduct={() => setIsDraggingProduct(true)}
                          onDragEndProduct={() => setIsDraggingProduct(false)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desktop Live Customizer Side Panel */}
            <aside className="hidden xl:block xl:col-span-5 sticky top-32">
              <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto receipt-scroll rounded-xl space-y-3">
                {customTotalQty > 0 && (
                  <button
                    type="button"
                    onClick={openCartResultModal}
                    className="w-full h-12 rounded-xl bg-accent hover:bg-accent-hover text-accent-ink text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 size={16} aria-hidden="true" />
                    <span>선택한 가전 ({customTotalQty}대) 전체 결과 화면 열기</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                )}

                <ReceiptPanel
                  result={customCartResult}
                  policy={catalog.policy}
                  isDraggingProduct={isDraggingProduct}
                  autoOptimizeFreed={customManualLifeCare === null}
                  onToggleAutoOptimizeFreed={(enabled) => {
                    if (enabled) setCustomManualLifeCare(null)
                    else setCustomManualLifeCare(customAutoLifeCare)
                  }}
                  onDropProduct={handleAddCustomProduct}
                  onUpdateCartQuantity={(pid, term, delta) => {
                    setCustomManualLifeCare(null)
                    setCustomCart((prev) =>
                      prev
                        .map((item) =>
                          item.productId === pid && item.term === term
                            ? { ...item, quantity: item.quantity + delta }
                            : item,
                        )
                        .filter((item) => item.quantity > 0),
                    )
                  }}
                  onSwitchCartItemTerm={(pid, fromTerm, toTerm) => {
                    setCustomManualLifeCare(null)
                    setCustomCart((prev) => {
                      const target = prev.find(
                        (i) => i.productId === pid && i.term === fromTerm,
                      )
                      if (!target) return prev
                      const rest = prev.filter(
                        (i) => !(i.productId === pid && i.term === fromTerm),
                      )
                      const existingSame = rest.find(
                        (i) => i.productId === pid && i.term === toTerm,
                      )
                      if (existingSame) {
                        return rest.map((i) =>
                          i.productId === pid && i.term === toTerm
                            ? { ...i, quantity: i.quantity + target.quantity }
                            : i,
                        )
                      }
                      return [...rest, { productId: pid, term: toTerm, quantity: target.quantity }]
                    })
                  }}
                  onRemoveCartItem={(pid, term) => {
                    setCustomManualLifeCare(null)
                    setCustomCart((prev) =>
                      prev.filter((i) => !(i.productId === pid && i.term === term)),
                    )
                  }}
                  onClearCart={() => {
                    setCustomCart([])
                    setCustomManualLifeCare(null)
                  }}
                  onUpdateLifeCareUnit={(tier, delta) => {
                    const base = customManualLifeCare ?? customAutoLifeCare
                    const curTotal = base.q40 + base.q50 + base.q60
                    if (delta > 0 && curTotal >= catalog.policy.maxLifeCareUnits) return
                    setCustomManualLifeCare(
                      clampLifeCareUnits(
                        { ...base, [tier]: Math.max(0, base[tier] + delta) },
                        catalog.policy.maxLifeCareUnits,
                      ),
                    )
                  }}
                  onSetLifeCareUnits={(u) =>
                    setCustomManualLifeCare(
                      clampLifeCareUnits(u, catalog.policy.maxLifeCareUnits),
                    )
                  }
                  onApplyZeroCostPreset={() => setCustomManualLifeCare(null)}
                  onToggleCoverShortfall={setCustomCoverShortfall}
                  onOpenConsultModal={() => {
                    setResultTargetMode('custom-cart')
                    openConsultModal('custom-result', false)
                  }}
                  onQuickTrySample={() => {
                    const sample =
                      catalog.bundles.find(
                        (b) => b.id === 'bundle-daily-helper-3' && b.visible,
                      ) || catalog.bundles.find((b) => b.visible)
                    if (sample) handleApplyBundleToResult(sample)
                  }}
                />
              </div>
            </aside>
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
          className="fixed bottom-24 xl:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-ink text-on-ink text-xs font-bold whitespace-nowrap max-w-[92vw] truncate"
        >
          {toastMessage}
        </div>
      )}

      {/* MOBILE STICKY BOTTOM BAR (< xl) — Distinct Behavior for Home vs Customizer vs Meta Showroom */}
      {!resultModalOpen && (
        <div className="xl:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-rule-strong px-3 sm:px-4 py-2.5">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
            {screenView === 'customizer' ? (
              <>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="hidden sm:flex relative w-8 h-8 rounded-lg bg-ink text-on-ink items-center justify-center shrink-0">
                    <ShoppingBag size={15} aria-hidden="true" />
                    {customTotalQty > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-4 px-1 rounded-full bg-accent text-accent-ink text-[10px] font-bold flex items-center justify-center tabular-nums">
                        {customTotalQty}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    {isCustomEmpty ? (
                      <>
                        <div className="text-[11px] font-bold text-ink truncate">
                          원하는 가전을 담아보세요
                        </div>
                        <div className="text-[10px] text-muted truncate">
                          단독 혜택 보기 또는 + 추가하기 선택
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[12px] sm:text-[13px] font-extrabold text-ink tabular-nums whitespace-nowrap">
                          {customTotalQty}대 · 추천가 월{' '}
                          <SpringNumber
                            value={customCartResult.phaseA.afterLifeCareEffective}
                            suffix="원"
                          />
                        </div>
                        <div className="text-[10px] sm:text-[11px] font-bold text-positive tabular-nums whitespace-nowrap">
                          {customCartResult.phaseA.monthlySurplusCash > 0
                            ? `카드 사용 시 0원 (+${customCartResult.phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원)`
                            : `카드 사용 시 월 ${customCartResult.phaseA.effectiveMonthlyPay.toLocaleString('ko-KR')}원`}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="bottom-view-result-btn"
                  onClick={openCartResultModal}
                  className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap tabular-nums ${
                    customTotalQty > 0
                      ? 'bg-accent hover:bg-accent-hover text-accent-ink'
                      : 'bg-field border border-rule-strong text-ink-2'
                  }`}
                >
                  <span>선택 결과 보기 ({customTotalQty}대)</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </>
            ) : adShowroomOpen ? (
              <>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-ink truncate">
                    관심 있는 새 가전을 눌러보세요
                  </div>
                  <div className="text-[10px] text-positive font-semibold truncate">
                    월 천원대 추천가 · 만기 100% 원금 환급
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openConsultModal('meta-showroom', true)}
                  className="inline-flex items-center gap-1 h-10 px-3.5 rounded-lg bg-accent hover:bg-accent-hover text-accent-ink text-xs font-bold cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <MessageSquare size={13} aria-hidden="true" />
                  <span>모델 추천 받기</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMobileHeroSheetOpen(true)}
                  className="flex items-center gap-2 min-w-0 text-left flex-1 cursor-pointer"
                >
                  <div className="min-w-0">
                    {heroIsEmpty ? (
                      <>
                        <div className="text-[10px] font-medium text-muted">추천 구성을 선택해 주세요</div>
                        <div className="text-xs font-bold text-ink">구성 선택 대기</div>
                      </>
                    ) : (
                      <>
                        <div className="text-[12px] sm:text-[13px] font-extrabold text-ink tabular-nums whitespace-nowrap">
                          추천 혜택가 월{' '}
                          <SpringNumber
                            value={heroResult.phaseA.afterLifeCareEffective}
                            suffix="원"
                          />
                        </div>
                        <div className="text-[10px] sm:text-[11px] font-bold text-positive tabular-nums whitespace-nowrap">
                          {heroResult.phaseA.monthlySurplusCash > 0
                            ? `카드 사용 시 0원 (+${heroResult.phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원)`
                            : `카드 사용 시 월 ${heroResult.phaseA.effectiveMonthlyPay.toLocaleString('ko-KR')}원`}
                        </div>
                      </>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMobileHeroSheetOpen(true)}
                    className="inline-flex items-center gap-0.5 h-9 sm:h-10 px-2 sm:px-2.5 rounded-lg bg-surface hover:bg-field border border-rule-strong text-ink text-[11px] sm:text-xs font-bold transition-colors cursor-pointer"
                  >
                    <span>구좌</span>
                    <span className="hidden min-[390px]:inline">변경</span>
                    <ChevronUp size={13} aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openConsultModal('home', false)}
                    className="inline-flex items-center gap-1 h-9 sm:h-10 px-3 sm:px-3.5 rounded-lg bg-accent hover:bg-accent-hover text-accent-ink text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <MessageSquare size={13} aria-hidden="true" className="hidden sm:inline" />
                    <span>카톡·문자 견적</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MAIN HOME MOBILE UNIT DRAWER (Strictly for Hero Preset only) */}
      {mobileHeroSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="추천 구성 구좌 변경"
          className="xl:hidden fixed inset-0 z-40 flex flex-col justify-end bg-ink/55"
        >
          <button
            type="button"
            aria-label="구좌 설정 닫기"
            onClick={() => setMobileHeroSheetOpen(false)}
            className="flex-1 w-full cursor-default"
          />
          <div className="max-h-[90dvh] flex flex-col rounded-t-2xl bg-paper border-t border-rule-strong overflow-hidden">
            <div className="px-5 py-3 bg-surface border-b border-rule flex items-center justify-between shrink-0">
              <span className="text-sm font-bold text-ink">
                원클릭 추천 구성 구좌 변경
              </span>
              <button
                type="button"
                onClick={() => setMobileHeroSheetOpen(false)}
                aria-label="닫기"
                className="w-9 h-9 rounded-lg bg-field flex items-center justify-center text-ink cursor-pointer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 pb-6">
              <ReceiptPanel
                result={heroResult}
                policy={catalog.policy}
                isDraggingProduct={false}
                autoOptimizeFreed={heroAutoOptimize}
                onToggleAutoOptimizeFreed={(enabled) => {
                  if (enabled) setHeroManualLifeCare(null)
                  else setHeroManualLifeCare(heroAutoLifeCare)
                }}
                onDropProduct={() => {}}
                onUpdateCartQuantity={() => {}}
                onSwitchCartItemTerm={() => {}}
                onRemoveCartItem={() => {}}
                onClearCart={() => setHeroManualLifeCare(null)}
                onUpdateLifeCareUnit={handleUpdateHeroLifeCareUnit}
                onSetLifeCareUnits={(u) =>
                  setHeroManualLifeCare(
                    clampLifeCareUnits(u, catalog.policy.maxLifeCareUnits),
                  )
                }
                onApplyZeroCostPreset={() => setHeroManualLifeCare(null)}
                onToggleCoverShortfall={setHeroCoverShortfall}
                onOpenConsultModal={() => openConsultModal('home', false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED SEPARATE BENEFIT RESULT VIEW (Back & X return to previous screen!) */}
      <CustomBenefitResultModal
        open={resultModalOpen}
        originLabel={resultOriginLabel}
        result={overlayResult}
        policy={catalog.policy}
        autoOptimizeFreed={activeOverlayAutoOptimize}
        selectedColorByProduct={selectedColorByProduct}
        onToggleAutoOptimizeFreed={handleOverlayToggleAutoOptimize}
        onUpdateCartQuantity={handleOverlayUpdateQty}
        onSwitchCartItemTerm={handleOverlaySwitchTerm}
        onRemoveCartItem={handleOverlayRemoveItem}
        onClearCart={handleOverlayClear}
        onUpdateLifeCareUnit={handleOverlayUpdateLifeCareUnit}
        onSetLifeCareUnits={handleOverlaySetLifeCareUnits}
        onApplyZeroCostPreset={handleOverlayResetAutoOptimize}
        onToggleCoverShortfall={setCustomCoverShortfall}
        onOpenProductDetail={(p) => setDetailModalProduct(p)}
        onOpenConsultModal={() => openConsultModal('custom-result', false)}
        onClose={closeResultModal}
      />

      {/* SWIPEABLE LIFESTYLE EMPATHY DETAIL MODAL */}
      <ProductDetailModal
        product={detailModalProduct}
        allProducts={visibleProducts}
        policy={catalog.policy}
        selectedColorByProduct={selectedColorByProduct}
        onSelectColor={handleSelectColor}
        onNavigateProduct={(next) => setDetailModalProduct(next)}
        onChooseProduct={(productId, term, colorName) => {
          const backLabel = adShowroomOpen
            ? '쇼윈도로 돌아가기'
            : screenView === 'customizer'
              ? '가전 골라담기로'
              : '이전 화면으로'
          handleViewSingleProductResult(productId, term, colorName, backLabel)
        }}
        onClose={() => setDetailModalProduct(null)}
      />

      {/* WRITE-ONLY CONSULTATION MODAL */}
      <ConsultationModal
        open={consultModalOpen}
        result={consultTargetResult}
        entryContextLabel={consultContextLabel}
        initialUndecided={consultUndecidedPreset}
        selectedColorByProduct={selectedColorByProduct}
        attribution={attribution}
        onClose={() => setConsultModalOpen(false)}
      />
    </div>
  )
}
