import { describe, expect, it } from 'vitest'
import inlineFormSource from './InlineQuickConsultForm.tsx?raw'
import metaHeroSource from './MetaAdShowroomHero.tsx?raw'
import simulatorSource from '../pages/SimulatorPage.tsx?raw'
import { INITIAL_CATALOG_SNAPSHOT } from '../data/initialSeedData'
import { isExplicitClassicView, resolveMarketingAttribution } from '../utils/marketingTracker'
import { buildQuickScenarioPresets, resolveInitialPreset } from '../utils/presets'

describe('Meta Ad Reverse-Funnel UX & Split Multi-Add / Consult Actions', () => {
  it('embeds InlineQuickConsultForm (#quick-reserve-form) directly inside MetaAdShowroomHero and removes full calculator escape hatch', () => {
    expect(metaHeroSource).toContain('InlineQuickConsultForm')
    expect(metaHeroSource).not.toContain('role="alertdialog"')
    expect(metaHeroSource).not.toContain('전체 모델 직접 계산기 열기')
    expect(metaHeroSource).not.toContain('onExitAdMode')

    expect(inlineFormSource).toContain('id="quick-reserve-form"')
    expect(inlineFormSource).toContain('submitConsultationWriteOnly')
    expect(inlineFormSource).toContain('trackInitiateConsult')
    expect(inlineFormSource).toContain('trackLeadConversion')
  })

  it('displays card-free main price (카드실적 없어도) prominently and card-added price (카드 실적 추가 시) small underneath', () => {
    expect(metaHeroSource).toContain('카드실적 없어도')
    expect(metaHeroSource).toContain('sim.phaseA.afterLifeCareEffective')
    expect(metaHeroSource).toContain('카드 실적 추가 시')
    expect(metaHeroSource).toContain('sim.phaseA.effectiveMonthlyPay')

    expect(inlineFormSource).toContain('카드실적 없어도')
    expect(inlineFormSource).toContain('제휴카드 실적 추가 시')
  })

  it('splits product card actions into non-scrolling 담기 toggle and 바로 상담 scroll button', () => {
    expect(metaHeroSource).toContain('<span>담기</span>')
    expect(metaHeroSource).toContain('<span>담김</span>')
    expect(metaHeroSource).toContain('<span>바로 상담</span>')
    expect(metaHeroSource).toContain('onToggleSelectProduct(product.id, term)')
    expect(metaHeroSource).toContain('onConsultProduct(product.id, term)')
  })

  it('defaults all standard customer URLs (#/, ?ad=meta, utm_source=...) to the reverse-funnel landing page unless ?view=classic', () => {
    expect(isExplicitClassicView('', '#/')).toBe(false)
    expect(isExplicitClassicView('?ad=meta', '#/')).toBe(false)
    expect(isExplicitClassicView('?view=classic', '#/')).toBe(true)
    expect(simulatorSource).toContain('!isExplicitClassicView')

    const attr = resolveMarketingAttribution('?utm_source=meta_ads&preset=wedding', '#/')
    expect(attr.adMode).toBe(true)

    const presets = buildQuickScenarioPresets(INITIAL_CATALOG_SNAPSHOT)
    const wedding = resolveInitialPreset(presets, 'wedding')
    expect(wedding?.items.length).toBeGreaterThan(0)
  })
})
