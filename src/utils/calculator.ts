import type {
  CalculationInput,
  CalculationResult,
  CartItem,
  CartLineItem,
  CartTermMode,
  LifeCareTierBreakdown,
  LifeCareUnits,
  PhaseCalculation,
  PolicyConfig,
  ProductItem,
  SubscriptionTerm,
} from '../types/domain'

export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  lifeCareUnitMonthlyDues: {
    u40: 40000,
    u50: 50000,
    u60: 60000,
  },
  lifeCareCashback36: {
    u40: 20000,
    u50: 25000,
    u60: 30000,
  },
  lifeCareCashback60: {
    u40: 12000,
    u50: 15000,
    u60: 18000,
  },
  maxLifeCareUnits: 12,
  lifeCarePayMonths: 90,
  lifeCareDeferMonths: 30,
  lifeCareMaturityMonths: 120,
  cardMinSpend: 300000,
  cardMonthlyCashback: 18000,
}

export function clampLifeCareUnits(
  units: LifeCareUnits,
  maxTotal: number = DEFAULT_POLICY_CONFIG.maxLifeCareUnits,
): LifeCareUnits {
  const safeMax = Math.max(0, Math.floor(maxTotal))
  const q60 = Math.min(safeMax, Math.max(0, Math.floor(units.q60 || 0)))
  const remAfter60 = safeMax - q60
  const q50 = Math.min(remAfter60, Math.max(0, Math.floor(units.q50 || 0)))
  const remAfter50 = remAfter60 - q50
  const q40 = Math.min(remAfter50, Math.max(0, Math.floor(units.q40 || 0)))
  return { q40, q50, q60 }
}

export function resolveProductTermPrice(
  product: ProductItem,
  requestedTerm: SubscriptionTerm,
): { term: SubscriptionTerm; price: number } | null {
  if (requestedTerm === 36 && product.monthly36 !== null && product.monthly36 > 0) {
    return { term: 36, price: product.monthly36 }
  }
  if (requestedTerm === 60 && product.monthly60 !== null && product.monthly60 > 0) {
    return { term: 60, price: product.monthly60 }
  }
  if (product.monthly60 !== null && product.monthly60 > 0) {
    return { term: 60, price: product.monthly60 }
  }
  if (product.monthly36 !== null && product.monthly36 > 0) {
    return { term: 36, price: product.monthly36 }
  }
  return null
}

function buildPhaseCalculation(params: {
  label: string
  startMonth: number
  endMonth: number
  grossSubscription: number
  lifeCareCashback: number
  cardCashback: number
}): PhaseCalculation {
  const months = params.endMonth - params.startMonth + 1
  const afterLifeCareSigned = params.grossSubscription - params.lifeCareCashback
  const afterLifeCareEffective = Math.max(0, afterLifeCareSigned)
  const afterLifeCareSurplus = Math.max(0, -afterLifeCareSigned)

  const totalMonthlyBenefit = params.lifeCareCashback + params.cardCashback
  const netSigned = params.grossSubscription - totalMonthlyBenefit
  const effectiveMonthlyPay = Math.max(0, netSigned)
  const monthlySurplusCash = Math.max(0, -netSigned)

  return {
    label: params.label,
    startMonth: params.startMonth,
    endMonth: params.endMonth,
    months,
    grossSubscription: params.grossSubscription,
    lifeCareCashback: params.lifeCareCashback,
    afterLifeCareSigned,
    afterLifeCareEffective,
    afterLifeCareSurplus,
    cardCashback: params.cardCashback,
    totalMonthlyBenefit,
    netSigned,
    effectiveMonthlyPay,
    monthlySurplusCash,
    phaseTotalGross: params.grossSubscription * months,
    phaseTotalBenefit: totalMonthlyBenefit * months,
    phaseTotalEffectivePay: effectiveMonthlyPay * months,
    phaseTotalSurplus: monthlySurplusCash * months,
  }
}

export function calculateBenefitSimulation(input: CalculationInput): CalculationResult {
  const { cart, products, cardEnabled, coverShortfallWithLivingSpend, policy } = input
  const productMap = new Map(products.map((p) => [p.id, p]))

  const lines: CartLineItem[] = []
  let monthly36ItemsTotal = 0
  let monthly60ItemsTotal = 0
  let has36 = false
  let has60 = false
  let totalQuantity = 0

  for (const item of cart) {
    if (item.quantity <= 0) continue
    const product = productMap.get(item.productId)
    if (!product) continue
    const resolved = resolveProductTermPrice(product, item.term)
    if (!resolved) continue

    const qty = Math.floor(item.quantity)
    const lineTotal = resolved.price * qty
    const contractTotal = lineTotal * resolved.term
    lines.push({
      product,
      term: resolved.term,
      quantity: qty,
      unitPrice: resolved.price,
      lineTotal,
      contractTotal,
    })

    totalQuantity += qty
    if (resolved.term === 36) {
      has36 = true
      monthly36ItemsTotal += lineTotal
    } else {
      has60 = true
      monthly60ItemsTotal += lineTotal
    }
  }

  let mode: CartTermMode = 'empty'
  let durationMonths: 0 | 36 | 60 = 0
  let lifeCareBasisTerm: SubscriptionTerm = 60
  let cardDurationMonths: 0 | 36 | 60 = 0

  if (has36 && has60) {
    mode = 'mixed'
    durationMonths = 60
    lifeCareBasisTerm = 60
    cardDurationMonths = 60
  } else if (has36) {
    mode = 'single_36'
    durationMonths = 36
    lifeCareBasisTerm = 36
    cardDurationMonths = 36
  } else if (has60) {
    mode = 'single_60'
    durationMonths = 60
    lifeCareBasisTerm = 60
    cardDurationMonths = 60
  }

  const safeUnits = clampLifeCareUnits(input.lifeCare, policy.maxLifeCareUnits)
  const totalLifeCareUnits = safeUnits.q40 + safeUnits.q50 + safeUnits.q60

  const cashbackTable =
    lifeCareBasisTerm === 36 ? policy.lifeCareCashback36 : policy.lifeCareCashback60

  const lifeCarePerTier: LifeCareTierBreakdown[] = [
    {
      key: 'q40',
      label: '구독플러스 72',
      unitDues: policy.lifeCareUnitMonthlyDues.u40,
      unitCashback: cashbackTable.u40,
      quantity: safeUnits.q40,
      monthlyDues: policy.lifeCareUnitMonthlyDues.u40 * safeUnits.q40,
      monthlyCashback: cashbackTable.u40 * safeUnits.q40,
      maturityRefund:
        policy.lifeCareUnitMonthlyDues.u40 * safeUnits.q40 * policy.lifeCarePayMonths,
    },
    {
      key: 'q50',
      label: '구독플러스 90',
      unitDues: policy.lifeCareUnitMonthlyDues.u50,
      unitCashback: cashbackTable.u50,
      quantity: safeUnits.q50,
      monthlyDues: policy.lifeCareUnitMonthlyDues.u50 * safeUnits.q50,
      monthlyCashback: cashbackTable.u50 * safeUnits.q50,
      maturityRefund:
        policy.lifeCareUnitMonthlyDues.u50 * safeUnits.q50 * policy.lifeCarePayMonths,
    },
    {
      key: 'q60',
      label: '구독플러스 108',
      unitDues: policy.lifeCareUnitMonthlyDues.u60,
      unitCashback: cashbackTable.u60,
      quantity: safeUnits.q60,
      monthlyDues: policy.lifeCareUnitMonthlyDues.u60 * safeUnits.q60,
      monthlyCashback: cashbackTable.u60 * safeUnits.q60,
      maturityRefund:
        policy.lifeCareUnitMonthlyDues.u60 * safeUnits.q60 * policy.lifeCarePayMonths,
    },
  ]

  const lifeCareMonthlyDues = lifeCarePerTier.reduce((acc, t) => acc + t.monthlyDues, 0)
  const lifeCareMonthlyCashback = lifeCarePerTier.reduce((acc, t) => acc + t.monthlyCashback, 0)
  const lifeCareMaturityRefundTotal = lifeCarePerTier.reduce(
    (acc, t) => acc + t.maturityRefund,
    0,
  )
  const lifeCareTotalCashbackOverTerm =
    mode === 'empty' ? 0 : lifeCareMonthlyCashback * durationMonths

  const cardRecognizedSpend = lifeCareMonthlyDues
  const cardShortfall = Math.max(0, policy.cardMinSpend - cardRecognizedSpend)
  const cardAutoMetByLifeCare = cardRecognizedSpend >= policy.cardMinSpend
  const cardBenefitActive =
    mode !== 'empty' &&
    cardEnabled &&
    (cardAutoMetByLifeCare || coverShortfallWithLivingSpend)

  const cardMonthlyCashback = cardBenefitActive ? policy.cardMonthlyCashback : 0
  const cardTotalCashbackOverTerm = cardMonthlyCashback * cardDurationMonths

  let phaseA: PhaseCalculation
  let phaseB: PhaseCalculation | null = null

  if (mode === 'mixed') {
    phaseA = buildPhaseCalculation({
      label: '1~36개월차',
      startMonth: 1,
      endMonth: 36,
      grossSubscription: monthly36ItemsTotal + monthly60ItemsTotal,
      lifeCareCashback: lifeCareMonthlyCashback,
      cardCashback: cardMonthlyCashback,
    })
    phaseB = buildPhaseCalculation({
      label: '37~60개월차',
      startMonth: 37,
      endMonth: 60,
      grossSubscription: monthly60ItemsTotal,
      lifeCareCashback: lifeCareMonthlyCashback,
      cardCashback: cardMonthlyCashback,
    })
  } else if (mode === 'single_36') {
    phaseA = buildPhaseCalculation({
      label: '1~36개월차',
      startMonth: 1,
      endMonth: 36,
      grossSubscription: monthly36ItemsTotal,
      lifeCareCashback: lifeCareMonthlyCashback,
      cardCashback: cardMonthlyCashback,
    })
  } else if (mode === 'single_60') {
    phaseA = buildPhaseCalculation({
      label: '1~60개월차',
      startMonth: 1,
      endMonth: 60,
      grossSubscription: monthly60ItemsTotal,
      lifeCareCashback: lifeCareMonthlyCashback,
      cardCashback: cardMonthlyCashback,
    })
  } else {
    phaseA = buildPhaseCalculation({
      label: '상품 선택 전',
      startMonth: 1,
      endMonth: 36,
      grossSubscription: 0,
      lifeCareCashback: lifeCareMonthlyCashback,
      cardCashback: 0,
    })
  }

  const overallTotalGross =
    mode === 'empty'
      ? 0
      : phaseA.phaseTotalGross + (phaseB ? phaseB.phaseTotalGross : 0)
  const overallTotalBenefit =
    mode === 'empty'
      ? 0
      : phaseA.phaseTotalBenefit + (phaseB ? phaseB.phaseTotalBenefit : 0)
  const overallTotalEffectivePay =
    mode === 'empty'
      ? 0
      : phaseA.phaseTotalEffectivePay + (phaseB ? phaseB.phaseTotalEffectivePay : 0)
  const overallTotalSurplus =
    mode === 'empty'
      ? 0
      : phaseA.phaseTotalSurplus + (phaseB ? phaseB.phaseTotalSurplus : 0)

  return {
    mode,
    durationMonths,
    lifeCareBasisTerm,
    cardDurationMonths,
    lines,
    totalQuantity,
    monthly36ItemsTotal,
    monthly60ItemsTotal,
    lifeCareUnits: safeUnits,
    totalLifeCareUnits,
    lifeCarePerTier,
    lifeCareMonthlyDues,
    lifeCareMonthlyCashback,
    lifeCareTotalCashbackOverTerm,
    lifeCarePayMonths: policy.lifeCarePayMonths,
    lifeCareDeferMonths: policy.lifeCareDeferMonths,
    lifeCareMaturityMonths: policy.lifeCareMaturityMonths,
    lifeCareMaturityRefundTotal,
    cardEnabled,
    cardMinSpend: policy.cardMinSpend,
    cardRecognizedSpend,
    cardShortfall,
    cardAutoMetByLifeCare,
    cardCoverShortfall: coverShortfallWithLivingSpend,
    cardBenefitActive,
    cardMonthlyCashback,
    cardTotalCashbackOverTerm,
    phaseA,
    phaseB,
    overallTotalGross,
    overallTotalBenefit,
    overallTotalEffectivePay,
    overallTotalSurplus,
  }
}

export function recommendZeroCostLifeCare(params: {
  cart: CartItem[]
  products: ProductItem[]
  policy: PolicyConfig
}): LifeCareUnits {
  const baseline = calculateBenefitSimulation({
    cart: params.cart,
    products: params.products,
    lifeCare: { q40: 0, q50: 0, q60: 0 },
    cardEnabled: false,
    coverShortfallWithLivingSpend: false,
    policy: params.policy,
  })
  if (baseline.mode === 'empty' || baseline.phaseA.grossSubscription <= 0) {
    return { q40: 0, q50: 0, q60: 0 }
  }

  const targetGross = baseline.phaseA.grossSubscription
  const cb =
    baseline.lifeCareBasisTerm === 36
      ? params.policy.lifeCareCashback36
      : params.policy.lifeCareCashback60
  const dues = params.policy.lifeCareUnitMonthlyDues
  const maxUnits = Math.max(1, params.policy.maxLifeCareUnits)

  const cardHeadroom = Math.max(1000, params.policy.cardMonthlyCashback || 18000)
  const minUnitCashback = Math.min(cb.u40, cb.u50, cb.u60)
  const minMainRemainderFloor = 5000

  if (targetGross < minUnitCashback + minMainRemainderFloor) {
    return { q40: 0, q50: 0, q60: 0 }
  }

  interface Candidate {
    units: LifeCareUnits
    priority: number
    scoreDistance: number
    monthlyDues: number
    totalUnits: number
  }

  let best: Candidate | null = null

  for (let q60 = 0; q60 <= maxUnits; q60++) {
    for (let q50 = 0; q50 <= maxUnits - q60; q50++) {
      for (let q40 = 0; q40 <= maxUnits - q60 - q50; q40++) {
        const totalUnits = q40 + q50 + q60
        if (totalUnits === 0) continue

        const monthlyDues = q40 * dues.u40 + q50 * dues.u50 + q60 * dues.u60
        const lifeCareCb = q40 * cb.u40 + q50 * cb.u50 + q60 * cb.u60
        const remainder = targetGross - lifeCareCb

        if (remainder <= 0) continue

        let priority: number
        let scoreDistance: number

        if (remainder >= cardHeadroom) {
          priority = 1
          scoreDistance = remainder - cardHeadroom
        } else if (remainder >= minMainRemainderFloor) {
          priority = 2
          scoreDistance = cardHeadroom - remainder
        } else {
          priority = 3
          scoreDistance = minMainRemainderFloor - remainder
        }

        const cand: Candidate = {
          units: { q40, q50, q60 },
          priority,
          scoreDistance,
          monthlyDues,
          totalUnits,
        }

        if (
          !best ||
          cand.priority < best.priority ||
          (cand.priority === best.priority && cand.scoreDistance < best.scoreDistance) ||
          (cand.priority === best.priority &&
            cand.scoreDistance === best.scoreDistance &&
            cand.monthlyDues < best.monthlyDues) ||
          (cand.priority === best.priority &&
            cand.scoreDistance === best.scoreDistance &&
            cand.monthlyDues === best.monthlyDues &&
            cand.totalUnits < best.totalUnits)
        ) {
          best = cand
        }
      }
    }
  }

  if (best) {
    return best.units
  }

  return { q40: 0, q50: 0, q60: maxUnits }
}

export function formatKRW(amount: number): string {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`
}
