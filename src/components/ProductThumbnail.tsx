import { useState } from 'react'
import {
  AirVent,
  CookingPot,
  Droplets,
  Laptop,
  Package,
  Refrigerator,
  Sparkles,
  Tv,
  WashingMachine,
  Wind,
} from 'lucide-react'
import { resolveStudioFallbackImage } from '../utils/presets'
import { sanitizeImageUrl } from '../utils/sanitize'

interface ProductThumbnailProps {
  src?: string
  alt: string
  category?: string
  brand?: string
  className?: string
  iconSize?: number
  priority?: boolean
}

function getCategoryIcon(category: string | undefined, size: number) {
  const props = { size, strokeWidth: 1.5, className: 'text-muted', 'aria-hidden': true as const }
  if (!category) return <Package {...props} />
  if (category.includes('TV') || category.includes('영상')) return <Tv {...props} />
  if (category.includes('냉장') || category.includes('김치')) return <Refrigerator {...props} />
  if (category.includes('세탁') || category.includes('건조') || category.includes('의류')) {
    return <WashingMachine {...props} />
  }
  if (category.includes('정수기')) return <Droplets {...props} />
  if (category.includes('주방') || category.includes('밥솥')) return <CookingPot {...props} />
  if (category.includes('노트북') || category.includes('태블릿') || category.includes('IT')) {
    return <Laptop {...props} />
  }
  if (category.includes('욕실') || category.includes('안마') || category.includes('생활')) {
    return <Sparkles {...props} />
  }
  if (category.includes('청소') || category.includes('공기')) return <Wind {...props} />
  if (category.includes('에어컨') || category.includes('대형')) return <AirVent {...props} />
  return <Package {...props} />
}

export function ProductThumbnail({
  src,
  alt,
  category,
  brand,
  className = '',
  iconSize = 28,
  priority = false,
}: ProductThumbnailProps) {
  const primarySrc = sanitizeImageUrl(src || '')
  const fallbackStudioSrc = resolveStudioFallbackImage({ category, brand, alt })
  const [failedPrimary, setFailedPrimary] = useState<string | null>(null)
  const [failedFallback, setFailedFallback] = useState<string | null>(null)

  const activeSrc =
    primarySrc && failedPrimary !== primarySrc
      ? primarySrc
      : fallbackStudioSrc && failedFallback !== fallbackStudioSrc
        ? fallbackStudioSrc
        : ''

  const isExternalStudioImg = activeSrc.startsWith('https://')

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center ${
        isExternalStudioImg ? 'bg-surface' : 'bg-field'
      } ${className}`}
    >
      {!activeSrc ? (
        <div className="flex flex-col items-center justify-center gap-1 text-subtle select-none p-3">
          {getCategoryIcon(category, iconSize)}
          <span className="text-[11px] font-medium text-muted tracking-tight">
            {category || '가전 제품'}
          </span>
        </div>
      ) : (
        <img
          src={activeSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => {
            if (activeSrc === primarySrc) {
              setFailedPrimary(primarySrc)
            } else {
              setFailedFallback(fallbackStudioSrc)
            }
          }}
          className={`h-full w-full object-center ${
            isExternalStudioImg ? 'object-contain p-2.5' : 'object-cover'
          }`}
        />
      )}
    </div>
  )
}
