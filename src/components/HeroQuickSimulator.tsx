import {
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Info,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { HERO_SHOWROOM_DATA_URI } from '../assets/heroShowroomImage'
import type {
  CalculationResult,
  PolicyConfig,
  ProductItem,
} from '../types/domain'
import {
  calculateBenefitSimulation,
  formatKRW,
  recommendZeroCostLifeCare,
} from '../utils/calculator'
import type { QuickScenarioPreset } from '../utils/presets'
import { ProductThumbnail } from './ProductThumbnail'
import { SpringNumber } from './SpringNumber'

interface HeroQuickSimulatorProps {
  presets: QuickScenarioPreset[]
  products: ProductItem[]
  activePresetId: string | null
  result: CalculationResult
  policy: PolicyConfig
  autoOptimizeFreed: boolean
  onSelectPreset: (preset: QuickScenarioPreset) => void
  onToggleCoverShortfall: (cover: boolean) => void
  onOpenConsultModal: () => void
  onOpenCustomizer: (mode?: 'products' | 'bundles') => void
}

export function HeroQuickSimulator({
  presets,
  products,
  activePresetId,
  result,
  policy,
  autoOptimizeFreed,
  onSelectPreset,
  onToggleCoverShortfall,
  onOpenConsultModal,
  onOpenCustomizer,
}: HeroQuickSimulatorProps) {
  const isEmpty = result.mode === 'empty'
  const isMixed = result.mode === 'mixed'
  const phaseA = result.phaseA
  const hasExtraCashback = phaseA.monthlySurplusCash > 0
  const isZeroEffective = phaseA.effectiveMonthlyPay === 0
  const productMap = new Map(products.map((p) => [p.id, p]))

  const activeTiers = result.lifeCarePerTier.filter((t) => t.quantity > 0)
  const freedSummaryLabel =
    activeTiers.length > 0
      ? activeTiers.map((t) => `${t.label} × ${t.quantity}구좌`).join(' + ')
      : '구독프리드 미선택'

  return (
    <div className="space-y-6">
      <section
        aria-label="롯데하이마트 경기광주점 메인 쇼룸 및 맞춤 혜택 시뮬레이터"
        className="rounded-3xl bg-white border border-[#E2E8F0] shadow-[0_10px_36px_rgba(15,23,42,0.06)] overflow-hidden"
      >
        <div className="relative min-h-[220px] sm:min-h-[268px] flex items-end overflow-hidden bg-[#0F172A]">
          <img
            src={HERO_SHOWROOM_DATA_URI}
            alt="롯데하이마트 경기광주점 프리미엄 빌트인 가전 쇼룸"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-78"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/92 via-[#0F172A]/72 to-[#0F172A]/28" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/90 via-transparent to-[#0F172A]/25" />

          <div className="relative z-10 w-full px-5 py-5 sm:px-8 sm:py-7 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E11D48] text-white text-[11px] font-extrabold tracking-tight">
                  <Sparkles size={12} aria-hidden="true" />
                  <span>롯데하이마트 경기광주점 공식 혜택 설계관</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 text-white text-[11px] font-bold">
                  <CheckCircle2 size={12} aria-hidden="true" className="text-[#34D399]" />
                  <span>
                    {autoOptimizeFreed
                      ? '천원단위 상조 + 제휴카드 최적 셋팅'
                      : '구좌 직접 조절 모드'}
                  </span>
                </span>
              </div>

              <h2 className="text-[22px] sm:text-[30px] font-black text-white tracking-tight leading-[1.24]">
                원하는 가전 구독료,{' '}
                <span className="text-[#FDA4AF]">상조 현금캐시백 + 제휴카드</span>로 부담 없이 시작하세요
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-[#E2E8F0] leading-relaxed">
                전체 구독료를 약정 개월수로 제휴카드 분할 결제하고, 상조 결합 현금 캐시백으로 천원 단위까지 낮춘 뒤 카드 실적 혜택으로 <strong className="font-extrabold text-[#6EE7B7]">월 체감 0원 이하</strong>까지 내려가는 내역을 투명하게 비교해 드립니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenCustomizer('products')}
                className="inline-flex items-center gap-2 h-11 px-4 sm:px-5 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs sm:text-sm font-extrabold shadow-lg transition-colors cursor-pointer"
              >
                <SlidersHorizontal size={15} aria-hidden="true" className="text-[#E11D48]" />
                <span>원하는 가전 직접 골라 담기</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {presets.length > 0 && (
          <div className="px-4 py-4 sm:px-7 sm:py-5 border-b border-[#F1F5F9] bg-[#F8FAFC]/75">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-[#0F172A]">
                  원클릭 인기 추천 구성
                </span>
                <span className="hidden sm:inline text-[11px] font-medium text-[#64748B]">
                  카드를 누르면 최적 구좌와 캐시백이 즉시 계산됩니다
                </span>
              </div>
              {!activePresetId && !isEmpty && (
                <span className="text-[11px] font-extrabold text-[#E11D48] tabular-nums">
                  내 맞춤 선택 ({result.totalQuantity}대) 적용 중
                </span>
              )}
            </div>

            <div
              role="tablist"
              aria-label="메인 원클릭 추천 구성 4종"
              className="grid grid-cols-2 lg:grid-cols-4 gap-2.5"
            >
              {presets.map((preset) => {
                const isSelected = activePresetId === preset.id
                const recUnits = recommendZeroCostLifeCare({
                  cart: preset.items,
                  products,
                  policy,
                })
                const sim = calculateBenefitSimulation({
                  cart: preset.items,
                  products,
                  lifeCare: recUnits,
                  cardEnabled: true,
                  coverShortfallWithLivingSpend: true,
                  policy,
                })
                const leadProd = productMap.get(preset.items[0]?.productId || '')

                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => onSelectPreset(preset)}
                    className={`group text-left p-2.5 sm:p-3 rounded-2xl border transition-colors cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-sm'
                        : 'bg-white hover:bg-[#FFF1F2]/30 border-[#E2E8F0] hover:border-[#FECDD3] text-[#0F172A]'
                    }`}
                  >
                    <ProductThumbnail
                      src={leadProd?.imageUrl}
                      alt={preset.shortTitle}
                      category={leadProd?.category}
                      brand={leadProd?.brand}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl shrink-0 border border-[#E2E8F0] bg-white"
                      iconSize={18}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold truncate ${
                            isSelected
                              ? 'bg-[#E11D48] text-white'
                              : 'bg-[#FFF1F2] text-[#E11D48]'
                          }`}
                        >
                          {preset.badge}
                        </span>
                      </div>
                      <div className="text-xs sm:text-[13px] font-extrabold tracking-tight truncate">
                        {preset.shortTitle}
                      </div>
                      <div
                        className={`mt-0.5 text-[11px] font-bold tabular-nums truncate ${
                          isSelected ? 'text-[#6EE7B7]' : 'text-[#059669]'
                        }`}
                      >
                        상조체감 {sim.phaseA.afterLifeCareEffective.toLocaleString('ko-KR')}원 → 카드 시 0원
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="p-4 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
          <div className="order-1 lg:order-2 lg:col-span-6 rounded-2xl bg-[#0F172A] text-white p-4 sm:p-6 flex flex-col justify-between gap-4">
            <div className="space-y-3.5">
              <div className="space-y-2 pb-3.5 border-b border-white/10 text-xs tabular-nums">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[#CBD5E1] font-bold">
                      1. 가전 구독료 (제휴카드 필수 · 약정개월 분할결제)
                    </div>
                    <div className="text-[11px] text-[#94A3B8]">
                      총 구독액 {result.overallTotalGross.toLocaleString('ko-KR')}원 ÷ 약정기간 분할 결제 ({phaseA.label})
                    </div>
                  </div>
                  <span className="font-extrabold text-white text-sm whitespace-nowrap shrink-0">
                    월 {phaseA.grossSubscription.toLocaleString('ko-KR')}원
                  </span>
                </div>

                <div className="rounded-xl bg-white/6 border border-white/10 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#6EE7B7] font-bold">
                      2. 구독프리드 상조 지원 (현금 캐시백 입금)
                    </span>
                    <span className="font-extrabold text-[#34D399] whitespace-nowrap shrink-0">
                      -월 {phaseA.lifeCareCashback.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                  <div className="text-[11px] text-[#94A3B8]">
                    상조 회비 월 {result.lifeCareMonthlyDues.toLocaleString('ko-KR')}원 <strong className="text-[#E2E8F0]">제휴카드 납부</strong> · 지원금은 매월 <strong className="text-[#E2E8F0]">계좌 현금 입금</strong>
                  </div>
                  <div className="pt-1.5 mt-1 border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#F8FAFC]">
                      제휴카드 제외 · 상조 결합 후 1차 월 체감가
                    </span>
                    <span className="text-sm font-black text-[#FDE68A] whitespace-nowrap shrink-0">
                      월 {phaseA.afterLifeCareEffective.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-white/6 border border-white/10 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[#CBD5E1] font-bold">
                      <CreditCard size={13} aria-hidden="true" className="text-[#38BDF8]" />
                      <span>3. Hi-Class 제휴카드 실적 추가 혜택</span>
                    </span>
                    <span className="font-extrabold text-[#34D399] whitespace-nowrap shrink-0">
                      {result.cardBenefitActive
                        ? `-월 ${policy.cardMonthlyCashback.toLocaleString('ko-KR')}원`
                        : '미적용 (0원)'}
                    </span>
                  </div>

                  {result.cardAutoMetByLifeCare ? (
                    <div className="text-[11px] text-[#6EE7B7] font-semibold">
                      상조 월 회비({formatKRW(result.cardRecognizedSpend)}) 제휴카드 납부만으로 전월 실적 30만 원 자동 충족! (추가 사용 0원)
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-[11px] text-[#CBD5E1] leading-snug">
                        상조회비 실적 {formatKRW(result.cardRecognizedSpend)} 외{' '}
                        <strong className="text-[#FDE68A]">
                          생활비 월 {formatKRW(result.cardShortfall)} 추가 사용 시
                        </strong>{' '}
                        월 {formatKRW(policy.cardMonthlyCashback)} 할인
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={result.cardCoverShortfall}
                        onClick={() => onToggleCoverShortfall(!result.cardCoverShortfall)}
                        className={`self-start sm:self-auto px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          result.cardCoverShortfall
                            ? 'bg-[#10B981] text-[#052E16]'
                            : 'bg-white/15 text-[#CBD5E1]'
                        }`}
                      >
                        {result.cardCoverShortfall ? '추가실적 충족 ON' : '상조회비만 사용'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-[#064E3B]/60 border border-[#10B981]/45 p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-[#A7F3D0] truncate">
                    {isMixed
                      ? '1~36개월차 최종 고객 월 체감가'
                      : `${result.durationMonths || 60}개월 최종 고객 월 체감가`}
                  </span>
                  {isZeroEffective && (
                    <span className="px-2 py-0.5 rounded-md bg-[#10B981] text-[#052E16] text-[10px] font-black whitespace-nowrap shrink-0">
                      구독료 전액 상쇄
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <div className="flex items-baseline gap-1 text-white whitespace-nowrap">
                    <span className="text-sm font-bold text-[#A7F3D0]">월 체감</span>
                    <SpringNumber
                      value={isEmpty ? 0 : phaseA.effectiveMonthlyPay}
                      suffix="원"
                      className="text-[30px] sm:text-[36px] font-black tracking-tight tabular-nums text-white"
                    />
                  </div>
                  {hasExtraCashback && !isEmpty && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#ECFDF5] text-[#047857] text-xs font-extrabold tabular-nums whitespace-nowrap">
                      매월 +{phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원 현금 입금 플러스
                    </span>
                  )}
                </div>

                {isMixed && result.phaseB && (
                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] text-[#D1FAE5] tabular-nums">
                    <span className="whitespace-nowrap">37~60개월차 최종 체감가</span>
                    <span className="font-extrabold whitespace-nowrap">
                      {result.phaseB.monthlySurplusCash > 0
                        ? `체감 0원 (+${result.phaseB.monthlySurplusCash.toLocaleString('ko-KR')}원/월 더 받음)`
                        : `월 ${result.phaseB.effectiveMonthlyPay.toLocaleString('ko-KR')}원`}
                    </span>
                  </div>
                )}
              </div>

              {result.totalLifeCareUnits > 0 && (
                <div className="rounded-xl bg-white/7 border border-white/12 px-3.5 py-2.5 space-y-1 tabular-nums">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-bold text-[#E2E8F0] truncate">
                      <ShieldCheck size={14} aria-hidden="true" className="text-[#34D399] shrink-0" />
                      <span className="truncate">{result.lifeCareMaturityMonths}회 만기 시 상조 납입 원금 100% 환급</span>
                    </span>
                    <span className="font-extrabold text-[#34D399] text-sm whitespace-nowrap shrink-0">
                      <SpringNumber value={result.lifeCareMaturityRefundTotal} suffix="원" />
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] leading-snug">
                    제휴카드 월 {result.lifeCareMonthlyDues.toLocaleString('ko-KR')}원 × {result.lifeCarePayMonths}회 납입 후 {result.lifeCareDeferMonths}회 거치(0원) · 만기 미이용 해지 시 전액 환급
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={onOpenConsultModal}
                className="w-full h-12 sm:h-13 px-4 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-sm sm:text-[15px] font-extrabold flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(225,29,72,0.35)] transition-colors active:scale-[0.99] cursor-pointer whitespace-nowrap"
              >
                <MessageSquare size={17} aria-hidden="true" className="shrink-0" />
                <span>이 구성 상세 견적 · 환급표 카톡으로 받기</span>
              </button>

              <p className="text-[11px] text-[#94A3B8] leading-snug flex items-start gap-1.5">
                <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-[#CBD5E1]" />
                <span>
                  표시 가격은 당월 기준이며 <strong className="text-[#E2E8F0]">월별 프로모션·행사 일정에 따라 구독료가 일부 변동</strong>될 수 있습니다(상담 시 당일 최적 행사 혜택 적용).
                </span>
              </p>
            </div>
          </div>

          <div className="order-2 lg:order-1 lg:col-span-6 flex flex-col gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-extrabold text-[#0F172A] whitespace-nowrap">
                    선택된 구독 가전 상세
                  </span>
                  {!isEmpty && (
                    <span className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[11px] font-bold text-[#334155] tabular-nums whitespace-nowrap">
                      총 {result.totalQuantity}대 · {isMixed ? '36+60개월 혼합' : `${result.durationMonths}개월`}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenCustomizer('products')}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-[#E11D48] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>다른 가전 골라 담기</span>
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>

              {isEmpty ? (
                <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center space-y-3">
                  <p className="text-sm font-bold text-[#334155]">
                    위 추천 구성을 누르거나 원하는 가전을 직접 골라보세요
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenCustomizer('products')}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#0F172A] text-white text-xs font-extrabold cursor-pointer"
                  >
                    <span>가전 선택 화면 열기</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
              ) : result.lines.length === 1 ? (
                (() => {
                  const line = result.lines[0]
                  return (
                    <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] overflow-hidden">
                      <div className="grid grid-cols-1 sm:grid-cols-12 items-center">
                        <div className="sm:col-span-5 bg-white p-3 sm:p-4 border-b sm:border-b-0 sm:border-r border-[#E2E8F0]">
                          <ProductThumbnail
                            src={line.product.imageUrl}
                            alt={line.product.name}
                            category={line.product.category}
                            brand={line.product.brand}
                            className="aspect-[4/3] w-full rounded-xl bg-white"
                            iconSize={32}
                          />
                        </div>
                        <div className="sm:col-span-7 p-4 space-y-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-[#0F172A] text-white text-[11px] font-bold">
                              {line.product.brand}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white border border-[#CBD5E1] text-[11px] font-bold text-[#334155] tabular-nums">
                              {line.term}개월 제휴카드 분할결제
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A] leading-snug">
                            {line.product.name}
                          </h3>
                          <div className="flex flex-wrap gap-1">
                            {line.product.careTags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[11px] font-semibold text-[#475569]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-[#E2E8F0] flex items-baseline justify-between gap-2 tabular-nums">
                            <span className="text-xs font-semibold text-[#64748B]">
                              총 구독액 {line.contractTotal.toLocaleString('ko-KR')}원
                            </span>
                            <span className="text-sm font-extrabold text-[#0F172A]">
                              월 환산 {line.lineTotal.toLocaleString('ko-KR')}원
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {result.lines.map((line) => (
                    <div
                      key={`hero-${line.product.id}-${line.term}`}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]"
                    >
                      <ProductThumbnail
                        src={line.product.imageUrl}
                        alt={line.product.name}
                        category={line.product.category}
                        brand={line.product.brand}
                        className="w-16 h-14 rounded-xl shrink-0 border border-[#E2E8F0] bg-white"
                        iconSize={22}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-[#64748B]">
                            {line.product.brand}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white border border-[#E2E8F0] text-[10px] font-bold text-[#334155] tabular-nums">
                            {line.term}개월
                          </span>
                          {line.quantity > 1 && (
                            <span className="text-[10px] font-extrabold text-[#E11D48] tabular-nums">
                              ×{line.quantity}
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] font-extrabold text-[#0F172A] truncate mt-0.5">
                          {line.product.name}
                        </div>
                        <div className="text-[11px] font-semibold text-[#64748B] tabular-nums mt-0.5">
                          월 환산 {line.lineTotal.toLocaleString('ko-KR')}원 (총 {(line.contractTotal / 10000).toFixed(0)}만원)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {!isEmpty && (
                <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#0F172A]">
                      자동 추천된 상조 결합 구좌 ({result.totalLifeCareUnits}구좌)
                    </span>
                    <span className="text-[11px] font-bold text-[#059669] tabular-nums">
                      현금 캐시백 월 {formatKRW(result.lifeCareMonthlyCashback)}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#334155]">
                    {freedSummaryLabel}
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">
                    상조 결합만으로 무리하게 0원을 맞추지 않고 <strong className="text-[#0F172A]">천원 단위 잔액({formatKRW(phaseA.afterLifeCareEffective)})</strong>만 남긴 뒤, 필수 발급 제휴카드 혜택으로 부담 없이 0원 이하가 되도록 최적화한 구성입니다.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onOpenCustomizer('products')}
                  className="h-11 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs sm:text-[13px] font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal size={14} aria-hidden="true" />
                  <span>원하는 가전 골라 담기 (화면 전환)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCustomizer('bundles')}
                  className="h-11 px-4 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-[13px] font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>지점 추천 세트 더보기 · 구좌 직접조정</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 sm:px-7 bg-[#F8FAFC] border-t border-[#E2E8F0] text-[11px] text-[#64748B] leading-relaxed">
          <strong className="font-bold text-[#334155]">필수 안내:</strong> 롯데하이마트 가전 구독(제휴카드 약정개월 결제)과 선불식 할부거래(구독프리드 상조·120회 만기)는 별개 계약이며, 상조 서비스 미이용 후 120회 만기 완료 익월 해지 신청 시 납입 원금 100%가 환급됩니다.
        </div>
      </section>

      <section aria-label="하이마트 구독 × 구독프리드 핵심 진행 방식" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] flex items-center justify-center shrink-0">
            <CreditCard size={19} aria-hidden="true" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-[#E11D48] mb-0.5">STEP 01 · 제휴카드 필수 결제</div>
            <h3 className="text-sm font-extrabold text-[#0F172A]">약정 개월수대로 총액 분할 결제</h3>
            <p className="mt-1 text-xs text-[#64748B] leading-relaxed">
              하이마트 가전 구독은 제휴카드 발급을 통해 전체 구독 총액을 선택하신 36개월·60개월 기간대로 나누어 결제합니다.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] flex items-center justify-center shrink-0">
            <Banknote size={19} aria-hidden="true" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-[#059669] mb-0.5">STEP 02 · 상조회비 카드납부 &amp; 현금입금</div>
            <h3 className="text-sm font-extrabold text-[#0F172A]">매월 계좌 캐시백 + 카드 실적 인정</h3>
            <p className="mt-1 text-xs text-[#64748B] leading-relaxed">
              상조 월 회비는 제휴카드로 납부하여 전월 실적에 합산되고, 결합 지원금은 매월 고객님 계좌로 현금 캐시백 입금됩니다.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] flex items-center justify-center shrink-0">
            <CalendarClock size={19} aria-hidden="true" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-[#475569] mb-0.5">STEP 03 · 120회 만기 100% 환급</div>
            <h3 className="text-sm font-extrabold text-[#0F172A]">90회 납입 · 30회 거치 후 원금 환급</h3>
            <p className="mt-1 text-xs text-[#64748B] leading-relaxed">
              90회 납입 후 91~120회차는 추가 납입 없이 거치하며, 상조 미이용 만기 익월 해지 신청 시 납입 원금 전액을 돌려받습니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
