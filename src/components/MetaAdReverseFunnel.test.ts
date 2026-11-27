import { describe, expect, it } from 'vitest'
import inlineFormSource from './InlineQuickConsultForm.tsx?raw'
import metaHeroSource from './MetaAdShowroomHero.tsx?raw'
import simulatorSource from '../pages/SimulatorPage.tsx?raw'
import { INITIAL_CATALOG_SNAPSHOT } from '../data/initialSeedData'
import { resolveMarketingAttribution } from '../utils/marketingTracker'
import { buildQuickScenarioPresets, resolveInitialPreset } from '../utils/presets'

describe('Meta Ad Reverse-Funnel UX & Inline Quick Consultation Architecture', () => {
  it('embeds InlineQuickConsultForm (#quick-reserve-form) directly inside MetaAdShowroomHero with zero blocking confirm alertdialog', () => {
    expect(metaHeroSource).toContain('InlineQuickConsultForm')
    expect(metaHeroSource).not.toContain('role="alertdialog"')
    expect(metaHeroSource).not.toContain('setConfirmTarget')

    expect(inlineFormSource).toContain('id="quick-reserve-form"')
    expect(inlineFormSource).toContain('submitConsultationWriteOnly')
    expect(inlineFormSource).toContain('trackInitiateConsult')
    expect(inlineFormSource).toContain('trackLeadConversion')
    expect(inlineFormSource).toContain('name="website"')
    expect(inlineFormSource).toContain('autoComplete="name"')
    expect(inlineFormSource).toContain('autoComplete="tel"')
    expect(inlineFormSource).toContain('inputMode="numeric"')
  })

  it('curates diverse top categories in MetaAdShowroomHero instead of duplicate robot vacuums in slots 1 & 2', () => {
    const products = INITIAL_CATALOG_SNAPSHOT.products.filter(
      (p) => p.visible && ((p.monthly60 ?? 0) > 0 || (p.monthly36 ?? 0) > 0),
    )
    const curatedIds = [
      'prod-off-s10maxvultra-wh',
      'prod-rm70f63r2xj',
      'prod-wd80h25bhy',
      'prod-oled65b6xna-akrg',
      'prod-fq18gc2eb2-akor',
      'prod-z490meef11-akor',
    ]
    const matched = curatedIds
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean)

    expect(matched.length).toBe(6)
    const uniqueCategories = new Set(matched.map((p) => p?.category))
    expect(uniqueCategories.size).toBeGreaterThanOrEqual(5)
  })

  it('keeps Meta Ad mode active even when combined with ?preset= parameters', () => {
    expect(simulatorSource).toContain('Boolean(attribution.adMode)')
    expect(simulatorSource).not.toContain('Boolean(attribution.adMode && !urlPresetKey)')

    const attr = resolveMarketingAttribution('?utm_source=meta&preset=wedding', '#/')
    expect(attr.adMode).toBe(true)

    const presets = buildQuickScenarioPresets(INITIAL_CATALOG_SNAPSHOT)
    const wedding = resolveInitialPreset(presets, 'wedding')
    expect(wedding?.items.length).toBeGreaterThan(0)
  })
})
