import { afterEach, describe, expect, it, vi } from 'vitest'
import indexHtml from '../../index.html?raw'
import pixelBootstrap from '../../public/meta-pixel.js?raw'
import {
  META_PIXEL_ID,
  formatAttributionTag,
  resolveMarketingAttribution,
  trackInitiateConsult,
  trackLeadConversion,
  trackViewContent,
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

describe('Meta Ad Showroom Detection, UTM Attribution & Meta Pixel (1108973711692141)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exports official Himart Gwangju Meta Pixel ID 1108973711692141 and wires index.html + public/meta-pixel.js with strict CSP', () => {
    expect(META_PIXEL_ID).toBe('1108973711692141')

    expect(indexHtml).toContain('<script src="./meta-pixel.js"></script>')
    expect(indexHtml).toContain('https://connect.facebook.net')
    expect(indexHtml).toContain('https://www.facebook.com')
    expect(indexHtml).toContain('id=1108973711692141&amp;ev=PageView&amp;noscript=1')
    expect(indexHtml).not.toMatch(/script-src[^;]*'unsafe-inline'/)

    expect(pixelBootstrap).toContain('1108973711692141')
    expect(pixelBootstrap).toContain("window.fbq('init', PIXEL_ID)")
    expect(pixelBootstrap).toContain("window.fbq('track', 'PageView')")
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

  it('dispatches ViewContent, InitiateCheckout, and Lead events safely when fbq is present', () => {
    const fbqMock = vi.fn()
    const dataLayerMock: Array<Record<string, unknown>> = []
    vi.stubGlobal('window', {
      fbq: fbqMock,
      dataLayer: dataLayerMock,
    })

    trackViewContent({
      productId: 'prod-off-s10maxvultra-wh',
      productName: '로보락 S10 MaxV Ultra',
      category: '청소가전',
      monthlyValue: 35900,
    })
    expect(fbqMock).toHaveBeenCalledWith('track', 'ViewContent', {
      content_ids: ['prod-off-s10maxvultra-wh'],
      content_name: '로보락 S10 MaxV Ultra',
      content_category: '청소가전',
      content_type: 'product',
      currency: 'KRW',
      value: 35900,
    })

    trackInitiateConsult({
      source: 'meta-showroom',
      productIds: ['prod-off-s10maxvultra-wh'],
      undecidedModel: false,
    })
    expect(fbqMock).toHaveBeenCalledWith('track', 'InitiateCheckout', {
      content_ids: ['prod-off-s10maxvultra-wh'],
      content_type: 'product',
      content_category: 'meta-showroom',
    })

    const attr = resolveMarketingAttribution('?utm_source=instagram&utm_campaign=spring', '#/')
    trackLeadConversion({
      referenceCode: 'GJ-ABC123',
      productIds: ['prod-off-s10maxvultra-wh'],
      consultChannel: '카톡·문자',
      undecidedModel: false,
      attribution: attr,
    })

    expect(fbqMock).toHaveBeenCalledTimes(3)
    expect(dataLayerMock).toHaveLength(1)
    expect(dataLayerMock[0].event).toBe('lead_submit')
  })
})
