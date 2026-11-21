import { Clock, MapPin, Navigation, ParkingCircle, PhoneCall } from 'lucide-react'
import { STORE_INFO } from '../data/storeInfo'

export function StoreInfoSection() {
  return (
    <section
      aria-label="롯데하이마트 경기광주점 매장 및 상담 안내"
      className="mt-10 rounded-xl bg-surface border border-rule overflow-hidden"
    >
      <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-accent-soft border border-accent-rule text-accent text-xs font-bold">
              공식 오프라인 상담센터
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-field text-ink-2 text-xs font-semibold">
              <ParkingCircle size={13} aria-hidden="true" className="text-positive" />
              {STORE_INFO.parkingNote}
            </span>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-ink tracking-tight">
              {STORE_INFO.name}
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-ink-2">
              {STORE_INFO.badge}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-y-1.5 gap-x-5 pt-1 text-xs sm:text-[13px] text-ink-2">
            <div className="inline-flex items-center gap-1.5">
              <MapPin size={14} aria-hidden="true" className="text-muted shrink-0" />
              <span>{STORE_INFO.address}</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Clock size={14} aria-hidden="true" className="text-muted shrink-0" />
              <span>영업시간: {STORE_INFO.hours}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 tabular-nums">
              <PhoneCall size={14} aria-hidden="true" className="text-muted shrink-0" />
              <span>대표전화: {STORE_INFO.phone}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <a
            href={STORE_INFO.telHref}
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-ink hover:bg-ink-hover text-on-ink text-xs sm:text-sm font-bold transition-colors tabular-nums"
          >
            <PhoneCall size={15} aria-hidden="true" />
            <span>매장 전화문의 ({STORE_INFO.phone})</span>
          </a>

          <a
            href={STORE_INFO.naverMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-lg bg-surface hover:bg-field border border-rule-strong text-ink text-xs sm:text-sm font-bold transition-colors"
          >
            <Navigation size={15} aria-hidden="true" className="text-positive" />
            <span>네이버 지도 길찾기</span>
          </a>
        </div>
      </div>
    </section>
  )
}
