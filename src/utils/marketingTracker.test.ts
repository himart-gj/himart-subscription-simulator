import { describe, expect, it, vi } from 'vitest'
import {
  formatAttributionTag,
  resolveMarketingAttribution,
  trackLeadConversion,
} from './marketingTracker'

describe('Meta Ad Showroom Detection, UTM Attribution & Lead Pixel', () => {
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

  it('defaults adMode to false on organic direct visits', () => {
    const direct = resolveMarketingAttribution('', '#/')
    expect(direct.adMode).toBe(false)
    expect(formatAttributionTag(direct)).toBe('')
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
      productIds: ['prod-robovac-roborock'],
      consultChannel: '카카오톡 상담',
      undecidedModel: false,
      attribution: attr,
    })

    expect(fbqMock).toHaveBeenCalledOnce()
    expect(dataLayerMock).toHaveLength(1)
    expect(dataLayerMock[0].event).toBe('lead_submit')
    vi.unstubAllGlobals()
  })
})
