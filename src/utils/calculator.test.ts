import { describe, expect, it } from 'vitest'
import {
  DEFAULT_POLICY_CONFIG,
  calculateBenefitSimulation,
  clampLifeCareUnits,
  recommendZeroCostLifeCare,
} from './calculator'
import {
  sanitizeForSheet,
  sanitizeImageUrl,
  sanitizeMemoForSheet,
  sanitizePhoneNumber,
} from './sanitize'
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
    monthly60: 11900,
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
    monthly36: 46000,
    monthly60: 46000,
    careTags: ['소모품정기배송'],
    visible: true,
    sortOrder: 4,
  },
]

describe('Phase 1: Business Math Engine & Near-Zero Thousand-Won Rule Verification', () => {
  it('Uses official 구독플러스 72 / 90 / 108 product names with exact total benefit math', () => {
    const res = calculateBenefitSimulation({
      cart: [{ productId: 'single-36-item', term: 36, quantity: 1 }],
      products: TEST_PRODUCTS,
      lifeCare: { q40: 1, q50: 1, q60: 1 },
      cardEnabled: false,
      coverShortfallWithLivingSpend: false,
      policy: DEFAULT_POLICY_CONFIG,
    })

    expect(res.lifeCarePerTier.map((t) => t.label)).toEqual([
      '구독플러스 72',
      '구독플러스 90',
      '구독플러스 108',
    ])
    expect(res.lifeCarePerTier[0].unitCashback * 36).toBe(720000)
    expect(res.lifeCarePerTier[1].unitCashback * 36).toBe(900000)
    expect(res.lifeCarePerTier[2].unitCashback * 36).toBe(1080000)
    expect(res.lines[0].contractTotal).toBe(29800 * 36)
  })

  it('Verification Case A: 36m 29,800원 single item + 구독플러스 90 x 6구좌 (Extra Cashback + Auto Card Met)', () => {
    const res = calculateBenefitSimulation({
      cart: [{ productId: 'single-36-item', term: 36, quantity: 1 }],
      products: TEST_PRODUCTS,
      lifeCare: { q40: 0, q50: 6, q60: 0 },
      cardEnabled: true,
      coverShortfallWithLivingSpend: false,
      policy: DEFAULT_POLICY_CONFIG,
    })

    expect(res.mode).toBe('single_36')
    expect(res.lifeCareMonthlyDues).toBe(300000)
    expect(res.lifeCareMonthlyCashback).toBe(150000)
    expect(res.cardAutoMetByLifeCare).toBe(true)
    expect(res.cardBenefitActive).toBe(true)
    expect(res.phaseA.effectiveMonthlyPay).toBe(0)
    expect(res.phaseA.monthlySurplusCash).toBe(138200)
    expect(res.lifeCareMaturityRefundTotal).toBe(27000000)
  })

  it('Verification Case B: Mixed 36m + 60m package splits billing phases with ZERO averaging', () => {
    const res = calculateBenefitSimulation({
      cart: [
        { productId: 'rice-cooker', term: 36, quantity: 1 },
        { productId: 'cordless-vac', term: 36, quantity: 1 },
        { productId: 'robot-vac', term: 60, quantity: 1 },
      ],
      products: TEST_PRODUCTS,
      lifeCare: { q40: 0, q50: 4, q60: 0 },
      cardEnabled: true,
      coverShortfallWithLivingSpend: true,
      policy: DEFAULT_POLICY_CONFIG,
    })

    expect(res.mode).toBe('mixed')
    expect(res.durationMonths).toBe(60)
    expect(res.lifeCareBasisTerm).toBe(60)
    expect(res.phaseA.grossSubscription).toBe(88000)
    expect(res.phaseB?.grossSubscription).toBe(46000)
  })

  it('Enforces max 12 combined LifeCare units across 구독플러스 72/90/108 tiers', () => {
    const clamped = clampLifeCareUnits({ q40: 5, q50: 5, q60: 5 }, 12)
    expect(clamped.q40 + clamped.q50 + clamped.q60).toBe(12)
  })

  it('Near-Zero Rule: leaves positive 천원단위 remainder (e.g. 46,000 -> 1,000원) before card, then <= 0원 with card', () => {
    const rec36 = recommendZeroCostLifeCare({
      cart: [{ productId: 'robot-vac', term: 36, quantity: 1 }],
      products: TEST_PRODUCTS,
      policy: DEFAULT_POLICY_CONFIG,
    })
    expect(rec36).toEqual({ q40: 1, q50: 1, q60: 0 })

    const sim36 = calculateBenefitSimulation({
      cart: [{ productId: 'robot-vac', term: 36, quantity: 1 }],
      products: TEST_PRODUCTS,
      lifeCare: rec36,
      cardEnabled: true,
      coverShortfallWithLivingSpend: true,
      policy: DEFAULT_POLICY_CONFIG,
    })
    expect(sim36.phaseA.afterLifeCareEffective).toBe(1000)
    expect(sim36.phaseA.effectiveMonthlyPay).toBe(0)
    expect(sim36.phaseA.monthlySurplusCash).toBe(17000)

    const rec60 = recommendZeroCostLifeCare({
      cart: [{ productId: 'robot-vac', term: 60, quantity: 1 }],
      products: TEST_PRODUCTS,
      policy: DEFAULT_POLICY_CONFIG,
    })
    const sim60 = calculateBenefitSimulation({
      cart: [{ productId: 'robot-vac', term: 60, quantity: 1 }],
      products: TEST_PRODUCTS,
      lifeCare: rec60,
      cardEnabled: true,
      coverShortfallWithLivingSpend: true,
      policy: DEFAULT_POLICY_CONFIG,
    })
    expect(sim60.phaseA.afterLifeCareEffective).toBe(1000)
    expect(sim60.phaseA.effectiveMonthlyPay).toBe(0)
    expect(sim60.phaseA.monthlySurplusCash).toBe(17000)
  })

  it('Small-Fee Floor Exception: <= 12,000원 (60m) or <= 20,000원 (36m) uses minimum 1 unit (구독플러스 72) for 0원', () => {
    const recSmall36 = recommendZeroCostLifeCare({
      cart: [{ productId: 'rice-cooker', term: 36, quantity: 1 }],
      products: TEST_PRODUCTS,
      policy: DEFAULT_POLICY_CONFIG,
    })
    expect(recSmall36).toEqual({ q40: 1, q50: 0, q60: 0 })

    const recSmall60 = recommendZeroCostLifeCare({
      cart: [{ productId: 'rice-cooker', term: 60, quantity: 1 }],
      products: TEST_PRODUCTS,
      policy: DEFAULT_POLICY_CONFIG,
    })
    expect(recSmall60).toEqual({ q40: 1, q50: 0, q60: 0 })
  })

  it('Hardens Formula Injection and blocks XSS / protocol-relative URLs', () => {
    expect(sanitizeForSheet('=HYPERLINK("http://evil.com")')).toBe(
      '\'=HYPERLINK("http://evil.com")',
    )
    expect(sanitizeForSheet('＝SUM(A1:A5)')).toBe("'＝SUM(A1:A5)")
    expect(sanitizeMemoForSheet('첫줄\n=IMPORTXML("https://evil.com","//a")')).toContain(
      "'=IMPORTXML",
    )
    expect(sanitizePhoneNumber('01012345678')).toBe('010-1234-5678')
    expect(sanitizeImageUrl('javascript:alert(1)')).toBe('')
    expect(sanitizeImageUrl('./products/fridge.jpg')).toBe('./products/fridge.jpg')
  })
})
