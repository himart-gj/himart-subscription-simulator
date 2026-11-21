import { useState } from 'react'
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  MessageCircle,
  PhoneCall,
  Store,
} from 'lucide-react'
import { STORE_INFO } from '../data/storeInfo'

export function StoreInfoSection() {
  const [copied, setCopied] = useState(false)

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(STORE_INFO.address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Ignore clipboard failures in restricted webviews
    }
  }

  return (
    <section
      aria-label="롯데하이마트 경기광주점 매장 안내"
      className="mt-10 rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
    >
      <div className="px-5 sm:px-6 py-5 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] flex items-center justify-center shrink-0 mt-0.5">
            <Store size={19} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A] tracking-tight">
                {STORE_INFO.name}
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] font-bold text-[#475569]">
                {STORE_INFO.badge}
              </span>
            </div>
            <p className="mt-0.5 text-xs sm:text-[13px] text-[#64748B]">
              삼성·LG 대형 입주가전부터 로보락·다이슨·쿠쿠 구독 결합까지 전문 매니저 1:1 대면/비대면 상담을 지원합니다.
            </p>
          </div>
        </div>

        {/* Direct Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={STORE_INFO.telHref}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-extrabold transition-colors tabular-nums"
          >
            <PhoneCall size={14} />
            <span>매장 전화 {STORE_INFO.phone}</span>
          </a>
          <a
            href={STORE_INFO.naverMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold text-[#0F172A] transition-colors"
          >
            <MapPin size={14} className="text-[#059669]" />
            <span>네이버 지도 길찾기</span>
            <ExternalLink size={12} className="text-[#94A3B8]" />
          </a>
          <a
            href={STORE_INFO.kakaoChatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold text-[#0F172A] transition-colors"
          >
            <MessageCircle size={14} className="text-[#D97706]" />
            <span>카카오톡 상담</span>
          </a>
        </div>
      </div>

      {/* Store Details 3-Column Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0] bg-[#F8FAFC]/60">
        <div className="px-5 sm:px-6 py-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <MapPin size={16} className="text-[#475569] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-[#64748B]">매장 위치 · 주차 안내</div>
              <div className="mt-0.5 text-sm font-extrabold text-[#0F172A]">
                {STORE_INFO.address}
              </div>
              <div className="text-xs text-[#475569] mt-0.5">{STORE_INFO.parkingNote}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyAddress}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[11px] font-bold text-[#475569] shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={12} className="text-[#059669]" />
                <span className="text-[#059669]">복사됨</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>주소복사</span>
              </>
            )}
          </button>
        </div>

        <div className="px-5 sm:px-6 py-4 flex items-start gap-2.5">
          <Clock size={16} className="text-[#475569] shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] font-bold text-[#64748B]">영업 시간</div>
            <div className="mt-0.5 text-sm font-extrabold text-[#0F172A] tabular-nums">
              {STORE_INFO.hours}
            </div>
            <div className="text-xs text-[#475569] mt-0.5">
              주말·공휴일 정상 운영 · 방문 예약 시 대기 없이 상담
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <PhoneCall size={16} className="text-[#475569] shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-bold text-[#64748B]">대표 전화 · 공식 채널</div>
              <a
                href={STORE_INFO.telHref}
                className="mt-0.5 block text-sm font-extrabold text-[#0F172A] hover:text-[#E11D48] tabular-nums"
              >
                {STORE_INFO.phone}
              </a>
              <div className="mt-0.5 flex items-center gap-2.5 text-xs font-semibold text-[#475569]">
                <a
                  href={STORE_INFO.naverBlogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#0F172A] underline underline-offset-2"
                >
                  공식 블로그
                </a>
                <span className="text-[#CBD5E1]">·</span>
                <a
                  href={STORE_INFO.naverTalkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#0F172A] underline underline-offset-2"
                >
                  네이버 톡톡
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
