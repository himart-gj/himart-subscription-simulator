import { useState } from 'react'
import {
  AirVent,
  CookingPot,
  Package,
  Refrigerator,
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
}

function getCategoryIcon(category: string | undefined, size: number) {
  const props = { size, strokeWidth: 1.5, className: 'text-[#64748B]', 'aria-hidden': true as const }
  if (!category) return <Package {...props} />
  if (category.includes('TV') || category.includes('영상')) return <Tv {...props} />
  if (category.includes('냉장고') || category.includes('김치')) return <Refrigerator {...props} />
  if (category.includes('세탁') || category.includes('건조')) return <WashingMachine {...props} />
  if (category.includes('밥솥') || category.includes('주방')) return <CookingPot {...props} />
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
  iconSize = 32,
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

  return (
    <div
      className={`relative overflow-hidden bg-[#F1F5F9] flex items-center justify-center ${className}`}
    >
      {!activeSrc ? (
        <div className="flex flex-col items-center justify-center gap-1.5 text-[#94A3B8] select-none p-3">
          {getCategoryIcon(category, iconSize)}
          <span className="text-[11px] font-medium text-[#64748B] tracking-tight">
            {category || '가전 제품'}
          </span>
        </div>
      ) : (
        <img
          src={activeSrc}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => {
            if (activeSrc === primarySrc) {
              setFailedPrimary(primarySrc)
            } else {
              setFailedFallback(fallbackStudioSrc)
            }
          }}
          className="h-full w-full object-cover object-center transition-transform duration-200 group-hover:scale-[1.02]"
        />
      )}
    </div>
  )
}
