import { describe, expect, it } from 'vitest'
import { INITIAL_CATALOG_SNAPSHOT } from '../data/initialSeedData'
import {
  buildQuickScenarioPresets,
  isSameCartItems,
  readPresetKeyFromUrl,
  resolveInitialPreset,
  resolveStudioFallbackImage,
} from './presets'

describe('Meta Ad Quick Presets, Admin Hero Slots & Studio Fallback', () => {
  it('builds 4 curated scenario presets from Admin heroPresets', () => {
    const presets = buildQuickScenarioPresets(INITIAL_CATALOG_SNAPSHOT)
    expect(presets.length).toBe(4)
    expect(presets[0].id).toBe('hero-roborock-single')
    expect(presets[0].aliasKeys).toContain('roborock')
  })

  it('reads ?preset= parameter from both standard search and HashRouter query', () => {
    expect(readPresetKeyFromUrl('?preset=wedding', '#/')).toBe('wedding')
    expect(readPresetKeyFromUrl('', '#/?preset=helper')).toBe('helper')
    expect(readPresetKeyFromUrl('', '#/')).toBeNull()
  })

  it('resolves wedding and helper aliases accurately to Admin hero slots', () => {
    const presets = buildQuickScenarioPresets(INITIAL_CATALOG_SNAPSHOT)
    const wedding = resolveInitialPreset(presets, 'wedding')
    expect(wedding?.id).toBe('hero-newlywed-4')

    const helper = resolveInitialPreset(presets, 'helper')
    expect(helper?.id).toBe('hero-daily-helper-3')
  })

  it('compares cart item sets order-independently', () => {
    const a = [
      { productId: 'p1', term: 60 as const, quantity: 1 },
      { productId: 'p2', term: 36 as const, quantity: 2 },
    ]
    const b = [
      { productId: 'p2', term: 36 as const, quantity: 2 },
      { productId: 'p1', term: 60 as const, quantity: 1 },
    ]
    expect(isSameCartItems(a, b)).toBe(true)
  })

  it('maps custom CMS products without imageUrl to local studio photos', () => {
    expect(
      resolveStudioFallbackImage({
        brand: '로보락',
        alt: 'S9 MaxV 올인원 로봇청소기',
        category: '로봇청소기/청소기',
      }),
    ).toBe('./products/robovac.jpg')
    expect(
      resolveStudioFallbackImage({
        brand: 'LG',
        alt: '오브제 워시타워',
        category: '세탁/건조',
      }),
    ).toBe('./products/washtower.jpg')
  })
})
