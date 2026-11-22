const UTM_STORAGE_KEY = 'himart_gj_meta_utm_v1'

export interface MarketingAttribution {
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
  utmTerm: string
  fbclid: string
  adMode: boolean
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    dataLayer?: Array<Record<string, unknown>>
  }
}

function collectSearchParams(search: string, hash: string): URLSearchParams {
  const merged = new URLSearchParams()
  try {
    if (search) {
      const sp = new URLSearchParams(search)
      sp.forEach((v, k) => {
        if (v.trim()) merged.set(k.toLowerCase(), v.trim().slice(0, 100))
      })
    }
    const qIdx = hash.indexOf('?')
    if (qIdx >= 0) {
      const hp = new URLSearchParams(hash.slice(qIdx + 1))
      hp.forEach((v, k) => {
        if (v.trim()) merged.set(k.toLowerCase(), v.trim().slice(0, 100))
      })
    }
  } catch {
    // Ignore malformed URL query
  }
  return merged
}

/**
 * Parses UTM / Meta Ad parameters (`?ad=meta`, `utm_source=meta`, `fbclid`, etc.)
 * from standard search and HashRouter URLs, persisting campaign attribution in sessionStorage.
 */
export function resolveMarketingAttribution(
  search: string,
  hash: string,
): MarketingAttribution {
  const params = collectSearchParams(search, hash)
  const explicitView = params.get('view') || ''
  const adParam = params.get('ad') || params.get('entry') || ''
  const utmSource = params.get('utm_source') || ''
  const utmMedium = params.get('utm_medium') || ''
  const utmCampaign = params.get('utm_campaign') || ''
  const utmContent = params.get('utm_content') || ''
  const utmTerm = params.get('utm_term') || ''
  const fbclid = params.get('fbclid') || ''

  const isMetaTraffic =
    adParam === 'meta' ||
    adParam === 'showroom' ||
    Boolean(fbclid) ||
    /^(meta|fb|facebook|ig|instagram)$/i.test(utmSource)

  const current: MarketingAttribution = {
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    fbclid: fbclid ? fbclid.slice(0, 60) : '',
    adMode: explicitView === 'classic' ? false : isMetaTraffic,
  }

  const hasAnyFreshSignal =
    Boolean(utmSource || utmMedium || utmCampaign || utmContent || utmTerm || fbclid || adParam)

  try {
    if (typeof sessionStorage !== 'undefined') {
      if (hasAnyFreshSignal) {
        sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(current))
        return current
      }
      const saved = sessionStorage.getItem(UTM_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<MarketingAttribution>
        return {
          utmSource: parsed.utmSource || '',
          utmMedium: parsed.utmMedium || '',
          utmCampaign: parsed.utmCampaign || '',
          utmContent: parsed.utmContent || '',
          utmTerm: parsed.utmTerm || '',
          fbclid: parsed.fbclid || '',
          adMode: explicitView === 'classic' ? false : Boolean(parsed.adMode),
        }
      }
    }
  } catch {
    // Ignore storage restrictions
  }

  return current
}

export function formatAttributionTag(attr: MarketingAttribution): string {
  const parts = [attr.utmSource, attr.utmMedium, attr.utmCampaign].filter(Boolean)
  if (parts.length > 0) {
    return parts.join('/')
  }
  if (attr.fbclid) return 'meta_fbclid'
  if (attr.adMode) return 'meta_showroom'
  return ''
}

/**
 * Safely dispatches Meta Pixel `Lead` conversion and GTM `dataLayer` event
 * when a customer completes a consultation request.
 */
export function trackLeadConversion(params: {
  referenceCode: string
  productIds: string[]
  consultChannel: string
  undecidedModel: boolean
  attribution: MarketingAttribution
}): void {
  if (typeof window === 'undefined') return

  try {
    if (typeof window.fbq === 'function') {
      window.fbq(
        'track',
        'Lead',
        {
          content_ids: params.undecidedModel ? ['undecided_consult'] : params.productIds,
          content_type: 'product',
          content_category: params.consultChannel,
        },
        { eventID: params.referenceCode },
      )
    }
  } catch {
    // Never let third-party analytics block user flow
  }

  try {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: 'lead_submit',
      reference_code: params.referenceCode,
      consult_channel: params.consultChannel,
      undecided_model: params.undecidedModel,
      utm_source: params.attribution.utmSource,
      utm_campaign: params.attribution.utmCampaign,
    })
  } catch {
    // Ignore analytics errors
  }
}
