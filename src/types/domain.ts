export type SubscriptionTerm = 36 | 60

export type BaseCategory =
  | '대형가전'
  | 'TV/영상'
  | '냉장고/김치냉장고'
  | '세탁/건조'
  | '로봇청소기/청소기'
  | '밥솥/주방소형'

export interface ProductItem {
  id: string
  name: string
  modelCode: string
  brand: string
  category: string
  isLargeAppliance: boolean
  imageUrl: string
  monthly36: number | null
  monthly60: number | null
  careTags: string[]
  visible: boolean
  sortOrder: number
}

export interface BundleLineItem {
  productId: string
  term: SubscriptionTerm
  quantity: number
}

export type BundleSlotType = 'bundle' | 'hero'

export interface RecommendedBundle {
  id: string
  name: string
  description: string
  badge: string
  defaultTerm: SubscriptionTerm
  items: BundleLineItem[]
  visible: boolean
  sortOrder: number
  slotType?: BundleSlotType
}

export interface LifeCareTierValues {
  u40: number
  u50: number
  u60: number
}

export interface PolicyConfig {
  lifeCareUnitMonthlyDues: LifeCareTierValues
  lifeCareCashback36: LifeCareTierValues
  lifeCareCashback60: LifeCareTierValues
  maxLifeCareUnits: number
  lifeCarePayMonths: number
  lifeCareDeferMonths: number
  lifeCareMaturityMonths: number
  cardMinSpend: number
  cardMonthlyCashback: number
}

export interface LifeCareUnits {
  q40: number
  q50: number
  q60: number
}

export interface CartItem {
  productId: string
  term: SubscriptionTerm
  quantity: number
}

export interface CartLineItem {
  product: ProductItem
  term: SubscriptionTerm
  quantity: number
  unitPrice: number
  lineTotal: number
  contractTotal: number
}

export type CartTermMode = 'empty' | 'single_36' | 'single_60' | 'mixed'

export interface LifeCareTierBreakdown {
  key: 'q40' | 'q50' | 'q60'
  label: string
  unitDues: number
  unitCashback: number
  quantity: number
  monthlyDues: number
  monthlyCashback: number
  maturityRefund: number
}

export interface PhaseCalculation {
  label: string
  startMonth: number
  endMonth: number
  months: number
  grossSubscription: number
  lifeCareCashback: number
  afterLifeCareSigned: number
  afterLifeCareEffective: number
  afterLifeCareSurplus: number
  cardCashback: number
  totalMonthlyBenefit: number
  netSigned: number
  effectiveMonthlyPay: number
  monthlySurplusCash: number
  phaseTotalGross: number
  phaseTotalBenefit: number
  phaseTotalEffectivePay: number
  phaseTotalSurplus: number
}

export interface CalculationInput {
  cart: CartItem[]
  products: ProductItem[]
  lifeCare: LifeCareUnits
  cardEnabled: boolean
  coverShortfallWithLivingSpend: boolean
  policy: PolicyConfig
}

export interface CalculationResult {
  mode: CartTermMode
  durationMonths: 0 | 36 | 60
  lifeCareBasisTerm: SubscriptionTerm
  cardDurationMonths: 0 | 36 | 60
  lines: CartLineItem[]
  totalQuantity: number
  monthly36ItemsTotal: number
  monthly60ItemsTotal: number
  lifeCareUnits: LifeCareUnits
  totalLifeCareUnits: number
  lifeCarePerTier: LifeCareTierBreakdown[]
  lifeCareMonthlyDues: number
  lifeCareMonthlyCashback: number
  lifeCareTotalCashbackOverTerm: number
  lifeCarePayMonths: number
  lifeCareDeferMonths: number
  lifeCareMaturityMonths: number
  lifeCareMaturityRefundTotal: number
  cardEnabled: boolean
  cardMinSpend: number
  cardRecognizedSpend: number
  cardShortfall: number
  cardAutoMetByLifeCare: boolean
  cardCoverShortfall: boolean
  cardBenefitActive: boolean
  cardMonthlyCashback: number
  cardTotalCashbackOverTerm: number
  phaseA: PhaseCalculation
  phaseB: PhaseCalculation | null
  overallTotalGross: number
  overallTotalBenefit: number
  overallTotalEffectivePay: number
  overallTotalSurplus: number
}

export type ConsultChannel = '카톡·문자' | '전화 상담' | '매장 방문' | '카카오톡 상담'

export interface ConsultationPayload {
  customerName: string
  customerPhone: string
  consultChannel: ConsultChannel
  memo: string
  agreedLegalAndPrivacy: boolean
  honeypot?: string
  summary: {
    mode: CartTermMode
    itemsText: string
    lifeCareText: string
    cardStatusText: string
    phaseASummary: string
    phaseBSummary: string | null
    maturityRefundTotal: number
    submittedAt: string
  }
}

export interface CatalogSnapshot {
  products: ProductItem[]
  bundles: RecommendedBundle[]
  heroPresets?: RecommendedBundle[]
  policy: PolicyConfig
  updatedAt: string
}
