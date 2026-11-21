import { describe, expect, it } from 'vitest'
import {
  DEFAULT_POLICY_CONFIG,
  calculateBenefitSimulation,
  clampLifeCareUnits,
  recommendZeroCostLifeCare,
} from './calculator'
import { sanitizeForSheet, sanitizePhoneNumber } from './sanitize'
import type { ProductItem } from '../types/domain'

const TEST_PRODUCTS: ProductItem[] = [
  {
    id: 'single-36-item',
    name: '테스트 36개월 단품 가전',
    modelCode: 'TEST-36',
    brand: 'LG',
    category: '로봇청소기/청소기',
    isLargeAppliance: false,
    imageUrl: '',
    monthly36: 29800,
    monthly60: null,
    careTags: ['무상케어'],
    visible: true,
    sortOrder: 1,
  },
  {
    id: 'rice-cooker',
    name: 'IH 압력밥솥',
    modelCode: 'CRP-TEST',
    brand: '쿠쿠',
    category: '밥솥/주방소형',
    isLargeAppliance: false,
    imageUrl: '',
    monthly36: 18000,
    monthly60: 12900,
    careTags: ['패킹교체'],
    visible: true,
    sortOrder: 2,
  },
  {
    id: 'cordless-vac',
    name: '무선청소기',
    modelCode: 'V15-TEST',
    brand: '다이슨',
    category: '로봇청소기/청소기',
    isLargeAppliance: false,
    imageUrl: '',
    monthly36: 24000,
    monthly60: 17500,
    careTags: ['배터리케어'],
    visible: true,
    sortOrder: 3,
  },
  {
    id: 'robot-vac',
    name: '올인원 로봇청소기',
    modelCode: 'S9-TEST',
    brand: '로보락',
    category: '로봇청소기/청소기',
    isLargeAppliance: false,
    imageUrl: '',
    monthly36: 59000,
    monthly60: 41000,
    careTags: ['소모품정기배송'],
    visible: true,
    sortOrder: 4,
  },
]

describe('Phase 1: Business Math Engine Verification (0% Error)', () => {
  it('Verification Case A: 36m 29,800원 single item + 5만원 x 6구좌 (Surplus Cashflow + Auto Card Met)', () => {
    const res = calculateBenefitSimulation({
      cart: [{ productId: 'single-36-item', term: 36, quantity: 1 }],
      products: TEST_PRODUCTS,
      lifeCare: { q40: 0, q50: 6, q60: 0 },
      cardEnabled: true,
      coverShortfallWithLivingSpend: false, // Must auto-activate because 300k dues >= 300k threshold
      policy: DEFAULT_POLICY_CONFIG,
    })

    expect(res.mode).toBe('single_36')
    expect(res.durationMonths).toBe(36)
    expect(res.lifeCareBasisTerm).toBe(36)
    expect(res.cardDurationMonths).toBe(36)

    // 1st Comparison: LifeCare
    expect(res.lifeCareMonthlyDues).toBe(300000)
    expect(res.lifeCareMonthlyCashback).toBe(150000)
    expect(res.lifeCareTotalCashbackOverTerm).toBe(5400000)

    // 2nd Comparison: Class Card auto-satisfied by LifeCare dues
    expect(res.cardAutoMetByLifeCare).toBe(true)
    expect(res.cardShortfall).toBe(0)
    expect(res.cardBenefitActive).toBe(true)
    expect(res.cardMonthlyCashback).toBe(18000)
    expect(res.cardTotalCashbackOverTerm).toBe(648000)

    // Phase A (1~36m)
    expect(res.phaseB).toBeNull()
    expect(res.phaseA.grossSubscription).toBe(29800)
    expect(res.phaseA.totalMonthlyBenefit).toBe(168000)
    expect(res.phaseA.netSigned).toBe(-138200)
    expect(res.phaseA.effectiveMonthlyPay).toBe(0)
    expect(res.phaseA.monthlySurplusCash).toBe(138200)
    expect(res.phaseA.phaseTotalSurplus).toBe(4975200) // 138,200 * 36

    // Separate Maturity Refund (90 pay -> 30 defer -> 120 maturity 100% refund)
    expect(res.lifeCarePayMonths).toBe(90)
    expect(res.lifeCareDeferMonths).toBe(30)
    expect(res.lifeCareMaturityMonths).toBe(120)
    expect(res.lifeCareMaturityRefundTotal).toBe(27000000)
  })

  it('Verification Case B: Mixed 36m + 60m package splits billing phases with ZERO averaging', () => {
    const res = calculateBenefitSimulation({
      cart: [
        { productId: 'rice-cooker', term: 36, quantity: 1 }, // 18,000 (36m)
        { productId: 'cordless-vac', term: 36, quantity: 1 }, // 24,000 (36m)
        { productId: 'robot-vac', term: 60, quantity: 1 }, // 41,000 (60m)
      ],
      products: TEST_PRODUCTS,
      lifeCare: { q40: 0, q50: 4, q60: 0 },
      cardEnabled: true,
      coverShortfallWithLivingSpend: true,
      policy: DEFAULT_POLICY_CONFIG,
    })

    // Mixed Mode unifies LifeCare & Card on 60m schedule
    expect(res.mode).toBe('mixed')
    expect(res.durationMonths).toBe(60)
    expect(res.lifeCareBasisTerm).toBe(60)
    expect(res.cardDurationMonths).toBe(60)

    // LifeCare 60m rate: 15,000 * 4 = 60,000
    expect(res.lifeCareMonthlyDues).toBe(200000)
    expect(res.lifeCareMonthlyCashback).toBe(60000)
    expect(res.lifeCareMaturityRefundTotal).toBe(18000000)

    // Card threshold: 200,000 recognized -> 100,000 shortfall, single 18,000 applied for 60m
    expect(res.cardAutoMetByLifeCare).toBe(false)
    expect(res.cardShortfall).toBe(100000)
    expect(res.cardBenefitActive).toBe(true)
    expect(res.cardMonthlyCashback).toBe(18000)
    expect(res.cardTotalCashbackOverTerm).toBe(1080000)

    // Phase A (1~36m): 18,000 + 24,000 + 41,000 = 83,000 -> -60,000 -18,000 = 5,000원
    expect(res.phaseA.startMonth).toBe(1)
    expect(res.phaseA.endMonth).toBe(36)
    expect(res.phaseA.months).toBe(36)
    expect(res.phaseA.grossSubscription).toBe(83000)
    expect(res.phaseA.totalMonthlyBenefit).toBe(78000)
    expect(res.phaseA.effectiveMonthlyPay).toBe(5000)
    expect(res.phaseA.monthlySurplusCash).toBe(0)

    // Phase B (37~60m): 41,000 only -> -60,000 -18,000 = 0원 + 37,000원 surplus
    expect(res.phaseB).not.toBeNull()
    expect(res.phaseB?.startMonth).toBe(37)
    expect(res.phaseB?.endMonth).toBe(60)
    expect(res.phaseB?.months).toBe(24)
    expect(res.phaseB?.grossSubscription).toBe(41000)
    expect(res.phaseB?.totalMonthlyBenefit).toBe(78000)
    expect(res.phaseB?.effectiveMonthlyPay).toBe(0)
    expect(res.phaseB?.monthlySurplusCash).toBe(37000)
    expect(res.phaseB?.phaseTotalSurplus).toBe(888000)
  })

  it('Enforces max 12 combined LifeCare units across 4만/5만/6만 tiers', () => {
    const clamped = clampLifeCareUnits({ q40: 5, q50: 5, q60: 5 }, 12)
    expect(clamped.q40 + clamped.q50 + clamped.q60).toBe(12)
  })

  it('Disables card benefit cleanly when shortfall exists and living spend toggle is OFF', () => {
    const res = calculateBenefitSimulation({
      cart: [{ productId: 'robot-vac', term: 60, quantity: 1 }],
      products: TEST_PRODUCTS,
      lifeCare: { q40: 2, q50: 0, q60: 0 }, // 80,000 dues (< 300,000)
      cardEnabled: true,
      coverShortfallWithLivingSpend: false,
      policy: DEFAULT_POLICY_CONFIG,
    })
    expect(res.cardShortfall).toBe(220000)
    expect(res.cardBenefitActive).toBe(false)
    expect(res.cardMonthlyCashback).toBe(0)
  })

  it('Zero-cost recommendation finds minimal LifeCare units to reach 0원 purely from 구독프리드 cashback alone (without Card)', () => {
    const rec = recommendZeroCostLifeCare({
      cart: [{ productId: 'robot-vac', term: 60, quantity: 1 }], // 41,000원 -> needs >= 41,000원 from 프리드 alone (42,000원)
      products: TEST_PRODUCTS,
      policy: DEFAULT_POLICY_CONFIG,
    })
    const simWithoutCard = calculateBenefitSimulation({
      cart: [{ productId: 'robot-vac', term: 60, quantity: 1 }],
      products: TEST_PRODUCTS,
      lifeCare: rec,
      cardEnabled: false,
      coverShortfallWithLivingSpend: false,
      policy: DEFAULT_POLICY_CONFIG,
    })
    // Must achieve 0원 purely with LifeCare cashback (1차 체감 금액 = 0원)
    expect(simWithoutCard.lifeCareMonthlyCashback).toBeGreaterThanOrEqual(41000)
    expect(simWithoutCard.lifeCareMonthlyCashback).toBe(42000)
    expect(simWithoutCard.phaseA.afterLifeCareEffective).toBe(0)
    expect(simWithoutCard.phaseA.effectiveMonthlyPay).toBe(0)
    expect(rec.q40 + rec.q50 + rec.q60).toBeLessThanOrEqual(12)
  })

  it('Sanitizes Google Sheets Formula Injection and XSS strings', () => {
    expect(sanitizeForSheet('=HYPERLINK("http://evil.com")')).toBe('\'=HYPERLINK("http://evil.com")')
    expect(sanitizeForSheet('+cmd|\' /C calc\'!A0')).toBe('\'+cmd|\' /C calc\'!A0')
    expect(sanitizeForSheet('<script>alert(1)</script>홍길동')).toBe('scriptalert(1)/script홍길동')
    expect(sanitizePhoneNumber('01012345678')).toBe('010-1234-5678')
  })
})
