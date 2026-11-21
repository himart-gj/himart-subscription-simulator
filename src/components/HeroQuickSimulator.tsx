import {
  ArrowRight,
  Check,
  Info,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
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
    <div className="space-y-8">
      {/* 1. EDITORIAL SHOWROOM MASTHEAD (Natural-light photography + quiet Swiss/Korean typography) */}
      <section
        aria-label="롯데하이마트 경기광주점 가전구독 쇼룸 안내"
        className="rounded-xl bg-surface border border-rule overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Natural Sunlit Showroom Photograph (No dark gradient wash or floating badges) */}
          <figure className="lg:col-span-7 lg:order-2 relative bg-field border-b lg:border-b-0 lg:border-l border-rule">
            <img
              src={HERO_SHOWROOM_DATA_URI}
              alt="롯데하이마트 경기광주점 빌트인 냉장고와 워시타워 가전구독 쇼룸"
              fetchPriority="high"
              className="w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-auto lg:h-full object-cover object-center"
            />
            <figcaption className="px-3.5 py-2 bg-surface border-t border-rule text-[11px] text-muted flex items-center justify-between gap-2">
              <span className="truncate">경기광주점 빌트인 구독 쇼룸 예시</span>
              <span className="tabular-nums whitespace-nowrap shrink-0">이배재로 8 · 무료주차</span>
            </figcaption>
          </figure>

          {/* Editorial Headline & Primary Navigation */}
          <div className="lg:col-span-5 lg:order-1 p-5 sm:p-7 lg:p-8 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-accent">
                  롯데하이마트 경기광주점 공식 가전구독
                </span>
                <span className="text-rule-strong" aria-hidden="true">|</span>
                <span className="font-medium text-muted">
                  {autoOptimizeFreed ? '천원단위 상조 자동 맞춤' : '구좌 직접 조정 중'}
                </span>
              </div>

              <h2 className="text-[22px] sm:text-[27px] font-bold text-ink tracking-[-0.03em] leading-[1.3]">
                원하는 가전 구독료, 상조 캐시백과 제휴카드로 매달 가볍게
              </h2>

              <p className="text-[13px] sm:text-sm text-ink-2 leading-[1.65] break-keep">
                전체 구독 총액을 약정 개월수(36·60개월)로 제휴카드 분할 결제하고, 매달 계좌로 현금 입금되는 상조 지원금과 제휴카드 캐시백을 반영한 실제 월 체감가를 투명하게 비교해 보세요.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onOpenCustomizer('products')}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-ink hover:bg-ink-hover text-on-ink text-[13px] font-bold transition-colors cursor-pointer"
              >
                <SlidersHorizontal size={15} aria-hidden="true" />
                <span>원하는 가전 직접 골라 담기</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onOpenCustomizer('bundles')}
                className="inline-flex items-center justify-center h-11 px-4 rounded-lg bg-surface hover:bg-field border border-rule-strong text-ink text-[13px] font-semibold transition-colors cursor-pointer"
              >
                <span>추천 세트 보기</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ONE-CLICK RECOMMENDED PRESETS (Strictly 1-column full-width rows on Fold & below: grid-cols-1 xl:grid-cols-2) */}
      {presets.length > 0 && (
        <section
          aria-label="인기 추천 구성 바로 선택"
          className="space-y-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-0.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="text-[16px] sm:text-[17px] font-bold text-ink tracking-tight">
                인기 추천 구성 원클릭 비교
              </h3>
              <span className="text-xs text-muted">
                항목을 선택하면 아래 명세서가 즉시 바뀝니다
              </span>
            </div>
            {!activePresetId && !isEmpty && (
              <span className="text-xs font-bold text-accent tabular-nums">
                직접 담은 구성 ({result.totalQuantity}대) 적용 중
              </span>
            )}
          </div>

          <div
            role="tablist"
            aria-label="메인 원클릭 추천 구성"
            className="preset-tab-row grid grid-cols-1 xl:grid-cols-2 gap-2.5"
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
              const termLabel =
                sim.mode === 'mixed'
                  ? '36+60개월 혼합'
                  : `${sim.durationMonths || 60}개월`

              return (
                <button
                  key={preset.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => onSelectPreset(preset)}
                  className={`w-full text-left px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-3 sm:gap-3.5 ${
                    isSelected
                      ? 'bg-surface border-ink ring-1 ring-ink'
                      : 'bg-surface hover:bg-field/60 border-rule hover:border-rule-strong'
                  }`}
                >
                  {/* Radio Selection Indicator */}
                  <span
                    aria-hidden="true"
                    className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'border-accent bg-accent text-accent-ink'
                        : 'border-rule-strong bg-surface'
                    }`}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} aria-hidden="true" />}
                  </span>

                  {/* Studio Appliance Thumbnail */}
                  <ProductThumbnail
                    src={leadProd?.imageUrl}
                    alt={preset.shortTitle}
                    category={leadProd?.category}
                    brand={leadProd?.brand}
                    className="w-13 h-13 sm:w-14 sm:h-14 rounded-lg shrink-0 border border-rule bg-field"
                    iconSize={18}
                  />

                  {/* Full Single-Row Layout (No Truncated Ellipsis on Fold or Mobile) */}
                  <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-bold text-accent">
                          {preset.badge}
                        </span>
                        <span className="text-[11px] text-muted tabular-nums">
                          {termLabel}
                        </span>
                      </div>
                      <div className="text-[14px] sm:text-[15px] font-bold text-ink leading-snug break-keep">
                        {preset.shortTitle}
                      </div>
                    </div>

                    <div className="sm:text-right tabular-nums shrink-0 flex flex-wrap sm:flex-col items-baseline sm:items-end gap-x-2 gap-y-0.5 pt-0.5 sm:pt-0 border-t sm:border-t-0 border-rule/70">
                      <span className="text-[11px] text-muted">
                        원금 {formatKRW(sim.phaseA.grossSubscription)} / 상조체감 {formatKRW(sim.phaseA.afterLifeCareEffective)}
                      </span>
                      <span className="text-[13px] sm:text-[14px] font-extrabold text-ink">
                        카드 반영 시 월 {formatKRW(sim.phaseA.effectiveMonthlyPay)}
                        {sim.phaseA.monthlySurplusCash > 0 && (
                          <span className="ml-1 text-[12px] font-bold text-positive">
                            (+{sim.phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* 3. MAIN 12-COL EDITORIAL STATEMENT & APPLIANCE DETAIL (Paper Ledger, Zero Neon/Dark-Slate Slop) */}
      <section
        aria-label="선택 구성 및 월별 체감가 명세서"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* RIGHT ON DESKTOP / FIRST ON MOBILE: Clean Paper Financial Statement */}
        <div className="order-1 lg:order-2 lg:col-span-6 rounded-xl bg-surface border border-ink overflow-hidden">
          {/* Statement Top Band */}
          <div className="px-5 py-3.5 bg-ink text-on-ink flex items-center justify-between gap-2">
            <span className="text-[14px] font-bold tracking-tight">
              월별 납부 및 캐시백 명세서
            </span>
            <span className="text-xs font-medium text-on-ink/80 tabular-nums">
              {isEmpty
                ? '품목 선택 대기'
                : isMixed
                  ? '36+60개월 혼합 약정'
                  : `${result.durationMonths || 60}개월 약정 기준`}
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* 3-Step Paper Ledger */}
            <div className="divide-y divide-rule text-xs sm:text-[13px] tabular-nums">
              {/* Row 1: Subscription Gross */}
              <div className="pb-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <div className="font-bold text-ink">
                    1. 가전 구독 월 결제액 (제휴카드 약정개월 분할)
                  </div>
                  <div className="text-[11px] text-muted">
                    총 구독액 {result.overallTotalGross.toLocaleString('ko-KR')}원 ÷ 약정기간 분할 결제 ({phaseA.label})
                  </div>
                </div>
                <span className="font-extrabold text-ink text-sm whitespace-nowrap shrink-0">
                  월 {phaseA.grossSubscription.toLocaleString('ko-KR')}원
                </span>
              </div>

              {/* Row 2: Freed Cash Deposit */}
              <div className="py-3.5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-bold text-ink">
                      2. 구독프리드 상조 지원금 (매월 현금 캐시백 입금)
                    </div>
                    <div className="text-[11px] text-muted">
                      상조 월 회비 {result.lifeCareMonthlyDues.toLocaleString('ko-KR')}원은 제휴카드 납부, 지원금은 계좌 현금 입금
                    </div>
                  </div>
                  <span className="font-extrabold text-accent text-sm whitespace-nowrap shrink-0">
                    -월 {phaseA.lifeCareCashback.toLocaleString('ko-KR')}원
                  </span>
                </div>

                <div className="rounded-lg bg-field px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-ink-2">
                    제휴카드 혜택 제외, 상조 결합 1차 월 체감가
                  </span>
                  <span className="text-[13px] font-extrabold text-ink whitespace-nowrap shrink-0">
                    월 {phaseA.afterLifeCareEffective.toLocaleString('ko-KR')}원
                  </span>
                </div>
              </div>

              {/* Row 3: Affiliate Card Cashback */}
              <div className="pt-3.5 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-ink">
                    3. Hi-Class 제휴카드 캐시백 (조건 충족 시)
                  </span>
                  <span className="font-extrabold text-accent text-sm whitespace-nowrap shrink-0">
                    {result.cardBenefitActive
                      ? `-월 ${policy.cardMonthlyCashback.toLocaleString('ko-KR')}원`
                      : '미적용 (0원)'}
                  </span>
                </div>

                {result.cardAutoMetByLifeCare ? (
                  <p className="text-[11px] font-semibold text-positive">
                    상조 월 회비({formatKRW(result.cardRecognizedSpend)}) 카드 납부만으로 전월 실적 30만 원 자동 충족 (추가 지출 0원)
                  </p>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-field px-3 py-2">
                    <div className="text-[11px] text-ink-2 leading-snug">
                      상조회비 실적 {formatKRW(result.cardRecognizedSpend)} 외{' '}
                      <strong className="font-bold text-ink">
                        생활비 월 {formatKRW(result.cardShortfall)} 추가 사용 시
                      </strong>{' '}
                      월 {formatKRW(policy.cardMonthlyCashback)} 캐시백 적용
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={result.cardCoverShortfall}
                      onClick={() => onToggleCoverShortfall(!result.cardCoverShortfall)}
                      className={`self-start sm:self-auto px-2.5 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                        result.cardCoverShortfall
                          ? 'bg-ink border-ink text-on-ink'
                          : 'bg-surface border-rule-strong text-ink-2'
                      }`}
                    >
                      {result.cardCoverShortfall ? '추가실적 반영 ON' : '상조회비만 반영'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Final Customer Effective Price Box */}
            <div className="rounded-xl bg-field border border-rule-strong p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-ink-2">
                  {isMixed
                    ? '1~36개월차 최종 고객 월 체감가'
                    : `${result.durationMonths || 60}개월 최종 고객 월 체감가`}
                </span>
                {isZeroEffective && !isEmpty && (
                  <span className="px-2 py-0.5 rounded bg-surface border border-rule text-[11px] font-bold text-ink whitespace-nowrap shrink-0">
                    구독료 전액 상쇄
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className="text-sm font-bold text-ink-2">월 체감</span>
                  <SpringNumber
                    value={isEmpty ? 0 : phaseA.effectiveMonthlyPay}
                    suffix="원"
                    className="text-[30px] sm:text-[34px] font-black tracking-tight tabular-nums text-ink"
                  />
                </div>
                {hasExtraCashback && !isEmpty && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-positive-soft border border-positive-rule text-positive text-xs font-bold tabular-nums whitespace-nowrap">
                    매월 +{phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원 현금 입금
                  </span>
                )}
              </div>

              {isMixed && result.phaseB && (
                <div className="pt-2 border-t border-rule flex items-center justify-between gap-2 text-xs text-ink-2 tabular-nums">
                  <span>37~60개월차 최종 체감가</span>
                  <span className="font-bold text-ink">
                    {result.phaseB.monthlySurplusCash > 0
                      ? `체감 0원 (+${result.phaseB.monthlySurplusCash.toLocaleString('ko-KR')}원/월 입금)`
                      : `월 ${result.phaseB.effectiveMonthlyPay.toLocaleString('ko-KR')}원`}
                  </span>
                </div>
              )}
            </div>

            {/* 120-Month Maturity Principal Refund Summary */}
            {result.totalLifeCareUnits > 0 && (
              <div className="rounded-lg bg-surface border border-rule px-3.5 py-3 space-y-1 tabular-nums">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-bold text-ink">
                    <ShieldCheck size={14} aria-hidden="true" className="text-positive shrink-0" />
                    <span>{result.lifeCareMaturityMonths}회 만기 시 상조 납입 원금 100% 환급</span>
                  </span>
                  <span className="font-extrabold text-ink text-sm whitespace-nowrap shrink-0">
                    <SpringNumber value={result.lifeCareMaturityRefundTotal} suffix="원" />
                  </span>
                </div>
                <p className="text-[11px] text-muted leading-snug">
                  제휴카드 월 {result.lifeCareMonthlyDues.toLocaleString('ko-KR')}원 × {result.lifeCarePayMonths}회 납입 후 {result.lifeCareDeferMonths}회 거치(0원), 만기 미이용 해지 시 전액 환급
                </p>
              </div>
            )}

            {/* Primary Consultation CTA + Monthly Price Variability Note */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onOpenConsultModal}
                className="w-full h-12 px-4 rounded-lg bg-accent hover:bg-accent-hover text-accent-ink text-sm sm:text-[15px] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <MessageSquare size={16} aria-hidden="true" className="shrink-0" />
                <span>이 구성 상세 견적 및 환급표 카톡으로 받기</span>
              </button>

              <p className="text-[11px] text-muted leading-snug flex items-start gap-1.5">
                <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-subtle" />
                <span>
                  표시 구독료는 당월 업로드 기준이며 월별 프로모션 및 행사 일정에 따라 일부 변동될 수 있습니다(상담 시 당일 행사 혜택가 안내).
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* LEFT ON DESKTOP / SECOND ON MOBILE: Selected Appliance Breakdown & Freed Summary */}
        <div className="order-2 lg:order-1 lg:col-span-6 space-y-4">
          <div className="rounded-xl bg-surface border border-rule p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-rule">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-[15px] font-bold text-ink whitespace-nowrap">
                  선택된 구독 가전 내역
                </h3>
                {!isEmpty && (
                  <span className="px-2 py-0.5 rounded bg-field text-[11px] font-bold text-ink-2 tabular-nums whitespace-nowrap">
                    총 {result.totalQuantity}대 ({isMixed ? '36+60개월 혼합' : `${result.durationMonths}개월`})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onOpenCustomizer('products')}
                className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>품목 변경하기</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>

            {isEmpty ? (
              <div className="rounded-lg border border-dashed border-rule-strong bg-field/50 p-8 text-center space-y-3">
                <p className="text-sm font-bold text-ink-2">
                  위 추천 구성을 선택하거나 원하는 가전을 직접 담아보세요
                </p>
                <button
                  type="button"
                  onClick={() => onOpenCustomizer('products')}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-ink text-on-ink text-xs font-bold cursor-pointer"
                >
                  <span>가전 선택 화면 열기</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            ) : result.lines.length === 1 ? (
              (() => {
                const line = result.lines[0]
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    <div className="sm:col-span-5">
                      <ProductThumbnail
                        src={line.product.imageUrl}
                        alt={line.product.name}
                        category={line.product.category}
                        brand={line.product.brand}
                        className="aspect-[4/3] w-full rounded-lg border border-rule bg-field"
                        iconSize={28}
                      />
                    </div>
                    <div className="sm:col-span-7 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-ink text-on-ink font-bold">
                          {line.product.brand}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-field border border-rule font-semibold text-ink-2 tabular-nums">
                          {line.term}개월 제휴카드 분할결제
                        </span>
                      </div>
                      <h4 className="text-base sm:text-[17px] font-bold text-ink leading-snug break-keep">
                        {line.product.name}
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {line.product.careTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded bg-field text-[11px] font-medium text-ink-2"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="pt-2.5 border-t border-rule flex items-baseline justify-between gap-2 tabular-nums">
                        <span className="text-xs text-muted">
                          총 구독액 {line.contractTotal.toLocaleString('ko-KR')}원
                        </span>
                        <span className="text-sm font-bold text-ink">
                          원 구독료 월 {line.lineTotal.toLocaleString('ko-KR')}원
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })()
            ) : (
              <div className="divide-y divide-rule">
                {result.lines.map((line) => (
                  <div
                    key={`hero-${line.product.id}-${line.term}`}
                    className="py-3 first:pt-0 last:pb-0 flex items-center gap-3"
                  >
                    <ProductThumbnail
                      src={line.product.imageUrl}
                      alt={line.product.name}
                      category={line.product.category}
                      brand={line.product.brand}
                      className="w-15 h-13 rounded-lg shrink-0 border border-rule bg-field"
                      iconSize={20}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-bold text-ink-2">
                          {line.product.brand}
                        </span>
                        <span className="text-muted tabular-nums">
                          {line.term}개월 약정
                        </span>
                        {line.quantity > 1 && (
                          <span className="font-bold text-accent tabular-nums">
                            ×{line.quantity}
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] sm:text-sm font-bold text-ink leading-snug break-keep mt-0.5">
                        {line.product.name}
                      </div>
                      <div className="text-[11px] text-muted tabular-nums mt-0.5">
                        원 구독료 월 {line.lineTotal.toLocaleString('ko-KR')}원 (총 {(line.contractTotal / 10000).toFixed(0)}만원)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Auto-Matched Freed Breakdown */}
            {!isEmpty && (
              <div className="rounded-lg bg-field border border-rule p-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink">
                    자동 맞춤 결합 구좌 ({result.totalLifeCareUnits}구좌)
                  </span>
                  <span className="text-xs font-bold text-positive tabular-nums">
                    현금 캐시백 월 {formatKRW(result.lifeCareMonthlyCashback)}
                  </span>
                </div>
                <div className="text-xs font-semibold text-ink-2">
                  {freedSummaryLabel}
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  상조 혜택만으로 무리하게 0원을 맞추지 않고 천원 단위 잔액({formatKRW(phaseA.afterLifeCareEffective)})만 남긴 뒤, 필수 발급 제휴카드 캐시백으로 0원 이하가 되도록 설계한 추천안입니다.
                </p>
              </div>
            )}

            {/* Dedicated Page-Switch Action Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => onOpenCustomizer('products')}
                className="h-11 px-4 rounded-lg bg-ink hover:bg-ink-hover text-on-ink text-xs sm:text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <SlidersHorizontal size={14} aria-hidden="true" />
                <span>원하는 가전 직접 골라 담기</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenCustomizer('bundles')}
                className="h-11 px-4 rounded-lg bg-surface hover:bg-field border border-rule-strong text-ink text-xs sm:text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>추천 세트 보기 및 구좌 조정</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          <p className="px-1 text-[11px] text-muted leading-relaxed">
            <strong className="font-bold text-ink-2">필수 안내:</strong> 롯데하이마트 가전 구독(제휴카드 약정개월 분할결제)과 선불식 할부거래(구독프리드 상조, 120회 만기)는 별개 계약이며, 상조 서비스 미이용 후 120회 만기 완료 익월 해지 신청 시 납입 원금 100%가 환급됩니다.
          </p>
        </div>
      </section>

      {/* 4. QUIET EDITORIAL 3-COLUMN SPECIFICATION STRIP (Replaces AI Colored Icon Tiles) */}
      <section
        aria-label="하이마트 가전구독 진행 구조 요약"
        className="pt-6 border-t border-rule grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8"
      >
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold text-accent tabular-nums">01</div>
          <h3 className="text-sm font-bold text-ink">약정 개월수 총액 분할결제</h3>
          <p className="text-xs text-muted leading-relaxed">
            하이마트 가전 구독은 필수 발급 제휴카드를 통해 전체 구독 총액을 선택하신 36개월 또는 60개월 기간대로 나누어 결제합니다.
          </p>
        </div>

        <div className="space-y-1 md:border-l md:border-rule md:pl-6">
          <div className="text-xs font-mono font-bold text-accent tabular-nums">02</div>
          <h3 className="text-sm font-bold text-ink">상조회비 카드납부 및 현금 캐시백</h3>
          <p className="text-xs text-muted leading-relaxed">
            상조 월 회비는 제휴카드로 납부하여 전월 실적에 100% 합산되고, 결합 지원금은 매월 고객님 계좌로 현금 입금됩니다.
          </p>
        </div>

        <div className="space-y-1 md:border-l md:border-rule md:pl-6">
          <div className="text-xs font-mono font-bold text-accent tabular-nums">03</div>
          <h3 className="text-sm font-bold text-ink">90회 납입 후 120회 만기 원금 환급</h3>
          <p className="text-xs text-muted leading-relaxed">
            90회 납입 완료 후 91~120회차는 납입 없이 거치하며, 상조 미이용 시 만기 익월 해지 신청으로 납입 원금 전액을 돌려받습니다.
          </p>
        </div>
      </section>
    </div>
  )
}
