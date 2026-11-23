const UTM_STORAGE_KEY = 'himart_gj_meta_utm_v1'
export const META_PIXEL_ID = '1108973711692141'

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
 * from standard search and HashRouter URLs.
 * - `adMode` is strictly evaluated from the CURRENT URL so direct visits to `#/`
 *   always render the clean 4-Preset Main Home without showroom stickiness.
 * - Campaign UTM fields persist in `sessionStorage` so lead submissions retain attribution.
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

  const currentAdMode = explicitView === 'classic' ? false : isMetaTraffic

  const current: MarketingAttribution = {
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    fbclid: fbclid ? fbclid.slice(0, 60) : '',
    adMode: currentAdMode,
  }

  const hasUtmOrClickSignal = Boolean(
    utmSource || utmMedium || utmCampaign || utmContent || utmTerm || fbclid,
  )

  try {
    if (typeof sessionStorage !== 'undefined') {
      if (hasUtmOrClickSignal) {
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
          adMode: currentAdMode,
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
 * Safely dispatches Meta Pixel `ViewContent` when a customer inspects a product detail or single quote.
 */
export function trackViewContent(params: {
  productId: string
  productName: string
  category: string
  monthlyValue?: number
}): void {
  if (typeof window === 'undefined') return
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'ViewContent', {
        content_ids: [params.productId],
        content_name: params.productName,
        content_category: params.category,
        content_type: 'product',
        currency: 'KRW',
        value: params.monthlyValue ?? 0,
      })
    }
  } catch {
    // Never let third-party analytics block user flow
  }
}

/**
 * Safely dispatches Meta Pixel `InitiateCheckout` when a customer opens the consultation modal.
 */
export function trackInitiateConsult(params: {
  source: string
  productIds: string[]
  undecidedModel: boolean
}): void {
  if (typeof window === 'undefined') return
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'InitiateCheckout', {
        content_ids: params.undecidedModel ? ['undecided_consult'] : params.productIds,
        content_type: 'product',
        content_category: params.source,
      })
    }
  } catch {
    // Never let third-party analytics block user flow
  }
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
