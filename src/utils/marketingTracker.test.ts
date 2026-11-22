import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatAttributionTag,
  resolveMarketingAttribution,
  trackLeadConversion,
} from './marketingTracker'

class SimpleStorage implements Storage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  clear() {
    this.map.clear()
  }
  getItem(k: string) {
    return this.map.get(k) ?? null
  }
  key(i: number) {
    return Array.from(this.map.keys())[i] ?? null
  }
  removeItem(k: string) {
    this.map.delete(k)
  }
  setItem(k: string, v: string) {
    this.map.set(k, v)
  }
}

describe('Meta Ad Showroom Detection, UTM Attribution & Lead Pixel', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detects Meta ad showroom mode from utm_source=meta, fbclid, or #/?ad=meta', () => {
    const fromMetaUtm = resolveMarketingAttribution(
      '?utm_source=meta&utm_medium=01_old_01&utm_campaign=meta%20banner&fbclid=PAb21jcA',
      '#/',
    )
    expect(fromMetaUtm.adMode).toBe(true)
    expect(fromMetaUtm.utmSource).toBe('meta')
    expect(fromMetaUtm.utmMedium).toBe('01_old_01')
    expect(formatAttributionTag(fromMetaUtm)).toBe('meta/01_old_01/meta banner')

    const fromHashAd = resolveMarketingAttribution('', '#/?ad=meta')
    expect(fromHashAd.adMode).toBe(true)
  })

  it('defaults adMode to false on organic direct visits even after prior Meta visit in same session', () => {
    vi.stubGlobal('sessionStorage', new SimpleStorage())

    const metaFirst = resolveMarketingAttribution('?utm_source=meta&utm_campaign=nov', '#/')
    expect(metaFirst.adMode).toBe(true)

    const subsequentMainVisit = resolveMarketingAttribution('', '#/')
    expect(subsequentMainVisit.adMode).toBe(false)
    expect(subsequentMainVisit.utmSource).toBe('meta')
    expect(formatAttributionTag(subsequentMainVisit)).toBe('meta/nov')
  })

  it('dispatches fbq Lead and dataLayer events safely when present', () => {
    const fbqMock = vi.fn()
    const dataLayerMock: Array<Record<string, unknown>> = []
    vi.stubGlobal('window', {
      fbq: fbqMock,
      dataLayer: dataLayerMock,
    })

    const attr = resolveMarketingAttribution('?utm_source=instagram&utm_campaign=spring', '#/')
    trackLeadConversion({
      referenceCode: 'GJ-ABC123',
      productIds: ['prod-off-s10maxvultra-wh'],
      consultChannel: '카톡·문자',
      undecidedModel: false,
      attribution: attr,
    })

    expect(fbqMock).toHaveBeenCalledOnce()
    expect(dataLayerMock).toHaveLength(1)
    expect(dataLayerMock[0].event).toBe('lead_submit')
  })
})
