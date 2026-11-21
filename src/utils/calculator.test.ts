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

describe('Phase 1: Business Math Engine & Official Product Naming Verification', () => {
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
    expect(res.durationMonths).toBe(36)
    expect(res.lifeCareBasisTerm).toBe(36)
    expect(res.cardDurationMonths).toBe(36)

    expect(res.lifeCareMonthlyDues).toBe(300000)
    expect(res.lifeCareMonthlyCashback).toBe(150000)
    expect(res.lifeCareTotalCashbackOverTerm).toBe(5400000)

    expect(res.cardAutoMetByLifeCare).toBe(true)
    expect(res.cardShortfall).toBe(0)
    expect(res.cardBenefitActive).toBe(true)
    expect(res.cardMonthlyCashback).toBe(18000)
    expect(res.cardTotalCashbackOverTerm).toBe(648000)

    expect(res.phaseB).toBeNull()
    expect(res.phaseA.grossSubscription).toBe(29800)
    expect(res.phaseA.totalMonthlyBenefit).toBe(168000)
    expect(res.phaseA.netSigned).toBe(-138200)
    expect(res.phaseA.effectiveMonthlyPay).toBe(0)
    expect(res.phaseA.monthlySurplusCash).toBe(138200)
    expect(res.phaseA.phaseTotalSurplus).toBe(4975200)

    expect(res.lifeCarePayMonths).toBe(90)
    expect(res.lifeCareDeferMonths).toBe(30)
    expect(res.lifeCareMaturityMonths).toBe(120)
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
    expect(res.cardDurationMonths).toBe(60)

    expect(res.lifeCareMonthlyDues).toBe(200000)
    expect(res.lifeCareMonthlyCashback).toBe(60000)
    expect(res.lifeCareMaturityRefundTotal).toBe(18000000)

    expect(res.cardAutoMetByLifeCare).toBe(false)
    expect(res.cardShortfall).toBe(100000)
    expect(res.cardBenefitActive).toBe(true)
    expect(res.cardMonthlyCashback).toBe(18000)
    expect(res.cardTotalCashbackOverTerm).toBe(1080000)

    expect(res.phaseA.grossSubscription).toBe(83000)
    expect(res.phaseA.totalMonthlyBenefit).toBe(78000)
    expect(res.phaseA.effectiveMonthlyPay).toBe(5000)
    expect(res.phaseA.phaseTotalEffectivePay).toBe(180000)
    expect(res.phaseA.monthlySurplusCash).toBe(0)

    expect(res.phaseB).not.toBeNull()
    expect(res.phaseB?.grossSubscription).toBe(41000)
    expect(res.phaseB?.totalMonthlyBenefit).toBe(78000)
    expect(res.phaseB?.effectiveMonthlyPay).toBe(0)
    expect(res.phaseB?.monthlySurplusCash).toBe(37000)
    expect(res.phaseB?.phaseTotalSurplus).toBe(888000)
  })

  it('Enforces max 12 combined LifeCare units across 구독플러스 72/90/108 tiers', () => {
    const clamped = clampLifeCareUnits({ q40: 5, q50: 5, q60: 5 }, 12)
    expect(clamped.q40 + clamped.q50 + clamped.q60).toBe(12)
  })

  it('Disables card benefit cleanly when shortfall exists and living spend toggle is OFF', () => {
    const res = calculateBenefitSimulation({
      cart: [{ productId: 'robot-vac', term: 60, quantity: 1 }],
      products: TEST_PRODUCTS,
      lifeCare: { q40: 2, q50: 0, q60: 0 },
      cardEnabled: true,
      coverShortfallWithLivingSpend: false,
      policy: DEFAULT_POLICY_CONFIG,
    })
    expect(res.cardShortfall).toBe(220000)
    expect(res.cardBenefitActive).toBe(false)
    expect(res.cardMonthlyCashback).toBe(0)
  })

  it('Zero-cost recommendation finds minimal LifeCare units to reach 0원 purely from 구독프리드 cashback alone', () => {
    const rec = recommendZeroCostLifeCare({
      cart: [{ productId: 'robot-vac', term: 60, quantity: 1 }],
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
    expect(simWithoutCard.lifeCareMonthlyCashback).toBe(42000)
    expect(simWithoutCard.phaseA.afterLifeCareEffective).toBe(0)
    expect(simWithoutCard.phaseA.effectiveMonthlyPay).toBe(0)
    expect(rec.q40 + rec.q50 + rec.q60).toBeLessThanOrEqual(12)
  })

  it('Hardens Formula Injection (including full-width & multi-line) and blocks XSS / protocol-relative URLs', () => {
    expect(sanitizeForSheet('=HYPERLINK("http://evil.com")')).toBe(
      '\'=HYPERLINK("http://evil.com")',
    )
    expect(sanitizeForSheet('＝SUM(A1:A5)')).toBe("'＝SUM(A1:A5)")
    expect(sanitizeMemoForSheet('첫줄\n=IMPORTXML("https://evil.com","//a")')).toContain(
      "'=IMPORTXML",
    )
    expect(sanitizeForSheet('<script>alert(1)</script>홍길동')).toBe('scriptalert(1)/script홍길동')
    expect(sanitizePhoneNumber('01012345678')).toBe('010-1234-5678')

    // URL security checks
    expect(sanitizeImageUrl('javascript:alert(1)')).toBe('')
    expect(sanitizeImageUrl('data:text/html,<script>alert(1)</script>')).toBe('')
    expect(sanitizeImageUrl('//evil.example.com/beacon.png')).toBe('')
    expect(sanitizeImageUrl('http://evil.example.com/insecure.jpg')).toBe('')
    expect(sanitizeImageUrl('https://search.pstatic.net/common/?src=test.jpg')).toBe(
      'https://search.pstatic.net/common/?src=test.jpg',
    )
    expect(sanitizeImageUrl('./products/fridge.jpg')).toBe('./products/fridge.jpg')
    expect(sanitizeImageUrl('/products/tv.jpg')).toBe('/products/tv.jpg')
  })
})
