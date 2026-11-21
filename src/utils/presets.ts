import type {
  CartItem,
  CatalogSnapshot,
  ProductItem,
  SubscriptionTerm,
} from '../types/domain'

export interface QuickScenarioPreset {
  id: string
  aliasKeys: string[]
  badge: string
  shortTitle: string
  subtitle: string
  items: CartItem[]
}

export function resolveStudioFallbackImage(params: {
  category?: string
  brand?: string
  alt?: string
}): string {
  const haystack = `${params.alt || ''} ${params.brand || ''} ${params.category || ''}`.toLowerCase()

  if (haystack.includes('로봇') || haystack.includes('로보락') || haystack.includes('올인원')) {
    return './products/robovac.jpg'
  }
  if (haystack.includes('무선') || haystack.includes('다이슨') || haystack.includes('서브마린')) {
    return './products/cordless.jpg'
  }
  if (haystack.includes('식기세척') || haystack.includes('트루스팀')) {
    return './products/dishwasher.jpg'
  }
  if (haystack.includes('밥솥') || haystack.includes('쿠쿠') || haystack.includes('압력')) {
    return './products/ricecooker.jpg'
  }
  if (haystack.includes('김치')) {
    return './products/kimchifridge.jpg'
  }
  if (
    haystack.includes('냉장고') ||
    haystack.includes('키친핏') ||
    haystack.includes('비스포크') ||
    haystack.includes('bespoke')
  ) {
    return './products/fridge.jpg'
  }
  if (
    haystack.includes('워시타워') ||
    haystack.includes('세탁') ||
    haystack.includes('건조') ||
    haystack.includes('트롬')
  ) {
    return './products/washtower.jpg'
  }
  if (haystack.includes('에어컨') || haystack.includes('휘센') || haystack.includes('2in1')) {
    return './products/aircon.jpg'
  }
  if (haystack.includes('공기청정') || haystack.includes('퓨리케어')) {
    return './products/airpurifier.jpg'
  }
  if (
    haystack.includes('tv') ||
    haystack.includes('qled') ||
    haystack.includes('oled') ||
    haystack.includes('영상')
  ) {
    return './products/tv.jpg'
  }

  return ''
}

function pickBestTerm(product: ProductItem): SubscriptionTerm {
  if (product.monthly60 !== null && product.monthly60 > 0) return 60
  return 36
}

function buildAliasesForSlot(id: string, name: string): string[] {
  const aliases = [id.toLowerCase()]
  const lower = `${id} ${name}`.toLowerCase()
  if (lower.includes('roborock') || lower.includes('로보락') || lower.includes('로봇')) {
    aliases.push('roborock', 'single', 'robovac')
  }
  if (lower.includes('newlywed') || lower.includes('신혼') || lower.includes('입주')) {
    aliases.push('wedding', 'newlywed', 'movein')
  }
  if (lower.includes('helper') || lower.includes('살림') || lower.includes('주방')) {
    aliases.push('helper', 'kitchen', 'daily')
  }
  if (lower.includes('clean') || lower.includes('클린') || lower.includes('공기')) {
    aliases.push('clean', 'air')
  }
  if (lower.includes('washtower') || lower.includes('워시타워')) {
    aliases.push('washtower', 'laundry')
  }
  return aliases
}

export function buildQuickScenarioPresets(catalog: CatalogSnapshot): QuickScenarioPreset[] {
  const visibleProducts = catalog.products
    .filter((p) => p.visible && ((p.monthly60 ?? 0) > 0 || (p.monthly36 ?? 0) > 0))
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const productMap = new Map(visibleProducts.map((p) => [p.id, p]))

  const configuredHero = (catalog.heroPresets ?? [])
    .filter(
      (h) =>
        h.visible &&
        h.items.some((it) => it.quantity > 0 && productMap.has(it.productId)),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (configuredHero.length > 0) {
    return configuredHero.slice(0, 4).map((h) => ({
      id: h.id,
      aliasKeys: buildAliasesForSlot(h.id, h.name),
      badge: h.badge || '지점 추천',
      shortTitle: h.name,
      subtitle: h.description,
      items: h.items
        .filter((it) => it.quantity > 0 && productMap.has(it.productId))
        .map((it) => ({
          productId: it.productId,
          term: it.term,
          quantity: it.quantity,
        })),
    }))
  }

  const presets: QuickScenarioPreset[] = []
  const flagshipSingle =
    visibleProducts.find(
      (p) =>
        p.id === 'prod-robovac-roborock' ||
        p.name.includes('로봇청소기') ||
        p.brand.includes('로보락'),
    ) ?? visibleProducts[0]

  if (flagshipSingle) {
    const term = pickBestTerm(flagshipSingle)
    presets.push({
      id: 'preset-flagship-single',
      aliasKeys: ['roborock', 'single', 'robovac', flagshipSingle.id.toLowerCase()],
      badge: '단품 인기 1위',
      shortTitle: `${flagshipSingle.brand} 로봇청소기 맞춤 설계`,
      subtitle: `${flagshipSingle.name} (${term}개월 단일)`,
      items: [{ productId: flagshipSingle.id, term, quantity: 1 }],
    })
  }

  const visibleBundles = catalog.bundles
    .filter(
      (b) =>
        b.visible &&
        b.items.some((it) => it.quantity > 0 && productMap.has(it.productId)),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)

  for (const bundle of visibleBundles) {
    if (presets.length >= 4) break
    const validItems = bundle.items.filter(
      (it) => it.quantity > 0 && productMap.has(it.productId),
    )
    if (validItems.length === 0) continue

    presets.push({
      id: bundle.id,
      aliasKeys: buildAliasesForSlot(bundle.id, bundle.name),
      badge: bundle.badge || '지점 추천',
      shortTitle: bundle.name.replace(/\s*세트$/, ''),
      subtitle: bundle.description,
      items: validItems.map((it) => ({
        productId: it.productId,
        term: it.term,
        quantity: it.quantity,
      })),
    })
  }

  return presets.slice(0, 4)
}

export function readPresetKeyFromUrl(search: string, hash: string): string | null {
  try {
    if (search) {
      const sp = new URLSearchParams(search)
      const fromSearch = sp.get('preset')
      if (fromSearch && fromSearch.trim()) return fromSearch.trim().toLowerCase()
    }
    const qIndex = hash.indexOf('?')
    if (qIndex >= 0) {
      const hp = new URLSearchParams(hash.slice(qIndex + 1))
      const fromHash = hp.get('preset')
      if (fromHash && fromHash.trim()) return fromHash.trim().toLowerCase()
    }
  } catch {
    return null
  }
  return null
}

export function resolveInitialPreset(
  presets: QuickScenarioPreset[],
  presetKey: string | null,
): QuickScenarioPreset | null {
  if (presets.length === 0) return null
  if (presetKey) {
    const key = presetKey.toLowerCase()
    const matched = presets.find(
      (p) =>
        p.id.toLowerCase() === key ||
        p.aliasKeys.some((alias) => alias === key || alias.includes(key)),
    )
    if (matched) return matched
  }
  return presets[0]
}

export function isSameCartItems(a: CartItem[], b: CartItem[]): boolean {
  if (a.length !== b.length) return false
  const norm = (list: CartItem[]) =>
    [...list]
      .map((i) => `${i.productId}:${i.term}:${i.quantity}`)
      .sort()
      .join('|')
  return norm(a) === norm(b)
}
