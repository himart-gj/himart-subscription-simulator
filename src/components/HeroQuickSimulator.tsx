import {
  ArrowRight,
  Check,
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
  onOpenProductDetail?: (product: ProductItem) => void
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
  onOpenProductDetail,
  onOpenCustomizer,
}: HeroQuickSimulatorProps) {
  const isEmpty = result.mode === 'empty'
  const isMixed = result.mode === 'mixed'
  const phaseA = result.phaseA
  const hasExtraCashback = phaseA.monthlySurplusCash > 0
  const productMap = new Map(products.map((p) => [p.id, p]))

  const activePreset = presets.find((p) => p.id === activePresetId) ?? presets[0]

  const activeTiers = result.lifeCarePerTier.filter((t) => t.quantity > 0)
  const freedSummaryLabel =
    activeTiers.length > 0
      ? activeTiers.map((t) => `${t.label} × ${t.quantity}구좌`).join(' + ')
      : '구독플러스 미선택'

  const payYearsText =
    result.lifeCarePayMonths % 12 === 6
      ? `${Math.floor(result.lifeCarePayMonths / 12)}년 6개월`
      : `${(result.lifeCarePayMonths / 12).toFixed(0)}년`
  const maturityYearsText = `${Math.round(result.lifeCareMaturityMonths / 12)}년`

  return (
    <div className="space-y-7">
      {/* 1. EDITORIAL SHOWROOM MASTHEAD */}
      <section
        aria-label="롯데하이마트 경기광주점 가전구독 쇼룸 안내"
        className="rounded-xl bg-surface border border-rule overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <figure className="lg:col-span-7 lg:order-2 relative bg-field border-b lg:border-b-0 lg:border-l border-rule">
            <img
              src={HERO_SHOWROOM_DATA_URI}
              alt="롯데하이마트 경기광주점 빌트인 냉장고와 워시타워 가전구독 쇼룸"
              fetchPriority="high"
              className="w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-auto lg:h-full object-cover object-center"
            />
            <figcaption className="px-3.5 py-2 bg-surface border-t border-rule text-[11px] text-muted flex items-center justify-between gap-2">
              <span className="truncate">경기광주점 가전구독 쇼룸</span>
              <span className="tabular-nums whitespace-nowrap shrink-0">이배재로 8 · 전용주차</span>
            </figcaption>
          </figure>

          <div className="lg:col-span-5 lg:order-1 p-5 sm:p-7 lg:p-8 flex flex-col justify-between gap-5">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-accent">
                  롯데하이마트 경기광주점 공식 혜택관
                </span>
                <span className="text-rule-strong" aria-hidden="true">|</span>
                <span className="font-medium text-muted">
                  {autoOptimizeFreed ? '추천상품 자동맞춤' : '구좌 직접 설정 중'}
                </span>
              </div>

              <h2 className="text-[21px] sm:text-[26px] font-bold text-ink tracking-[-0.03em] leading-[1.34] break-keep">
                <span className="block">원하는 새 가전은 월 천원대로,</span>
                <span className="block">만기엔 납입금 100% 돌려받으세요</span>
              </h2>

              <p className="text-[13px] sm:text-sm text-ink-2 leading-[1.6] break-keep">
                아래 인기 추천 4종을 원클릭으로 비교해 보시거나, 원하는 가전을 따로 골라 전용 맞춤 혜택표를 확인해 보세요.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
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
                <span>인기 세트 보기</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ONE-CLICK 4 RECOMMENDED PRESETS (EXCLUSIVELY FOR MAIN HOME) */}
      {presets.length > 0 && (
        <section
          aria-label="인기 추천 4개 구성 원클릭 비교"
          className="space-y-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-0.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="text-[16px] sm:text-[17px] font-bold text-ink tracking-tight">
                인기 추천 구성 원클릭 비교
              </h3>
              <span className="text-xs text-muted">
                눌러보시면 아래 추천 구성 혜택표가 바로 바뀝니다
              </span>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="메인 원클릭 추천 구성"
            className="preset-tab-row grid grid-cols-1 xl:grid-cols-2 gap-2.5"
          >
            {presets.map((preset) => {
              const isSelected = (activePreset?.id ?? '') === preset.id
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

                  <ProductThumbnail
                    src={leadProd?.imageUrl}
                    alt={preset.shortTitle}
                    category={leadProd?.category}
                    brand={leadProd?.brand}
                    className="w-13 h-13 sm:w-14 sm:h-14 rounded-lg shrink-0 border border-rule bg-field"
                    iconSize={18}
                  />

                  <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-bold text-accent">
                          {preset.badge}
                        </span>
                        <span className="text-[11px] text-muted tabular-nums">
                          {termLabel} · 만기 100% 환급형
                        </span>
                      </div>
                      <div className="text-[14px] sm:text-[15px] font-bold text-ink leading-snug break-keep">
                        {preset.shortTitle}
                      </div>
                    </div>

                    <div className="sm:text-right tabular-nums shrink-0 flex flex-col sm:items-end gap-0.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-rule/70">
                      <div className="flex flex-wrap items-baseline gap-1.5 sm:justify-end">
                        <span className="text-[11px] text-subtle line-through">
                          월 {formatKRW(sim.phaseA.grossSubscription)}
                        </span>
                        <span className="text-[11px] font-bold text-ink-2">
                          추천 혜택가
                        </span>
                        <span className="text-[16px] sm:text-[17px] font-black text-ink tracking-tight">
                          월 {formatKRW(sim.phaseA.afterLifeCareEffective)}
                        </span>
                      </div>
                      <span className="text-[11px] sm:text-xs font-bold text-positive">
                        카드 사용 시 월 {formatKRW(sim.phaseA.effectiveMonthlyPay)}
                        {sim.phaseA.monthlySurplusCash > 0 &&
                          ` (+${sim.phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원 캐시백)`}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* 3. MAIN HOME PRESET BENEFIT STATEMENT */}
      <section
        aria-label="원클릭 추천 구성 혜택 설계표"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        <div
          id="benefit-statement-card"
          className="order-1 lg:order-2 lg:col-span-6 rounded-xl bg-surface border border-ink overflow-hidden scroll-mt-20"
        >
          <div className="px-5 py-3.5 bg-ink text-on-ink flex items-center justify-between gap-2">
            <span className="text-[14px] font-bold tracking-tight truncate">
              {activePreset ? `${activePreset.shortTitle} 혜택표` : '추천 구성 맞춤 혜택표'}
            </span>
            <span className="text-xs font-medium text-on-ink/80 tabular-nums shrink-0">
              {isEmpty
                ? '품목 선택 대기'
                : isMixed
                  ? '36+60개월 혼합 약정'
                  : `${result.durationMonths || 60}개월 약정 기준`}
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* STEP 1 HERO: Recommended Benefit Price */}
            <div className="rounded-xl bg-field border border-ink p-4 sm:p-5 space-y-3.5 tabular-nums">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-ink">
                  {autoOptimizeFreed ? '추천상품 자동맞춤 혜택가' : '선택 구좌 적용 혜택가'}
                </span>
                {result.totalLifeCareUnits > 0 && (
                  <span className="px-2 py-0.5 rounded bg-positive-soft border border-positive-rule text-[11px] font-bold text-positive">
                    만기 시 납입금 100% 환급형
                  </span>
                )}
              </div>

              <div className="space-y-1 text-xs border-b border-rule pb-3">
                <div className="flex items-center justify-between gap-2 text-ink-2">
                  <span>가전 원 구독료 ({phaseA.label} 약정 분할)</span>
                  <span className="font-semibold text-ink whitespace-nowrap shrink-0">
                    월 {phaseA.grossSubscription.toLocaleString('ko-KR')}원
                  </span>
                </div>
                {phaseA.lifeCareCashback > 0 && (
                  <div className="flex items-center justify-between gap-2 text-accent font-semibold">
                    <span>(−) 구독플러스(Hi구독 플러스) 월 현금지원</span>
                    <span className="whitespace-nowrap shrink-0">
                      -월 {phaseA.lifeCareCashback.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xs sm:text-[13px] font-bold text-ink-2">
                  카드 조건 없이도 기본 월 체감가
                </span>
                <div className="ml-auto flex items-baseline gap-1 whitespace-nowrap">
                  <span className="text-sm font-bold text-ink">월</span>
                  <SpringNumber
                    value={isEmpty ? 0 : phaseA.afterLifeCareEffective}
                    suffix="원"
                    className="text-[30px] sm:text-[34px] font-black tracking-tight text-ink"
                  />
                </div>
              </div>

              {phaseA.afterLifeCareSurplus > 0 && !isEmpty && (
                <div className="text-right text-xs font-bold text-positive">
                  +매월 {phaseA.afterLifeCareSurplus.toLocaleString('ko-KR')}원 계좌 입금
                </div>
              )}

              {isMixed && result.phaseB && (
                <div className="pt-2 border-t border-rule flex items-center justify-between gap-2 text-xs text-ink-2">
                  <span>37~60개월차 기본 월 체감가</span>
                  <span className="font-bold text-ink">
                    {result.phaseB.afterLifeCareSurplus > 0
                      ? `월 0원 (+${result.phaseB.afterLifeCareSurplus.toLocaleString('ko-KR')}원/월)`
                      : `월 ${result.phaseB.afterLifeCareEffective.toLocaleString('ko-KR')}원`}
                  </span>
                </div>
              )}
            </div>

            {/* 100% PRINCIPAL REFUND VISUAL FLOW */}
            {result.totalLifeCareUnits > 0 && (
              <div className="rounded-xl bg-surface border border-rule p-3.5 sm:p-4 space-y-2.5 tabular-nums">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                    <ShieldCheck size={15} aria-hidden="true" className="text-positive shrink-0" />
                    <span>사라지는 비용이 아닌 100% 원금 환급 구조</span>
                  </span>
                  <span className="text-xs font-extrabold text-positive">
                    만기 환급 <SpringNumber value={result.lifeCareMaturityRefundTotal} suffix="원" />
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="rounded-lg bg-field px-2 py-2 border border-rule">
                    <div className="text-[10px] font-medium text-muted">
                      1~{result.lifeCarePayMonths}회 적립
                    </div>
                    <div className="text-xs font-bold text-ink mt-0.5 whitespace-nowrap">
                      월 {result.lifeCareMonthlyDues.toLocaleString('ko-KR')}원
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">{payYearsText} 별도납입</div>
                  </div>
                  <div className="rounded-lg bg-field px-2 py-2 border border-rule">
                    <div className="text-[10px] font-medium text-muted">
                      {result.lifeCarePayMonths + 1}~{result.lifeCareMaturityMonths}회 거치
                    </div>
                    <div className="text-xs font-bold text-ink mt-0.5 whitespace-nowrap">월 0원</div>
                    <div className="text-[10px] text-muted mt-0.5">추가 납입 없음</div>
                  </div>
                  <div className="rounded-lg bg-positive-soft px-2 py-2 border border-positive-rule">
                    <div className="text-[10px] font-bold text-positive">
                      {result.lifeCareMaturityMonths}회 ({maturityYearsText}) 만기
                    </div>
                    <div className="text-xs font-extrabold text-positive mt-0.5 whitespace-nowrap">
                      100% 원금 환급
                    </div>
                    <div className="text-[10px] text-positive/85 mt-0.5">미이용 해지 기준</div>
                  </div>
                </div>

                <p className="text-[11px] font-semibold text-ink-2 leading-snug pt-0.5">
                  실납입은 {payYearsText}({result.lifeCarePayMonths}회)로 끝나며, 잔여 {result.lifeCareDeferMonths}회 0원 거치 후 {maturityYearsText}({result.lifeCareMaturityMonths}회) 만기 시 원금 전액을 돌려받습니다.
                </p>
              </div>
            )}

            {/* STEP 2 BONUS: Affiliate Card */}
            <div className="rounded-xl bg-surface border border-rule-strong p-4 space-y-2.5 tabular-nums">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-ink">
                  + 제휴카드 추가 혜택 적용 시
                </span>
                <span className="text-xs font-bold text-accent">
                  {result.cardBenefitActive
                    ? `-월 ${policy.cardMonthlyCashback.toLocaleString('ko-KR')}원 캐시백`
                    : '현재 미사용 기준'}
                </span>
              </div>

              {result.cardAutoMetByLifeCare ? (
                <p className="text-[11px] font-semibold text-positive">
                  지원상품 자동납부({formatKRW(result.cardRecognizedSpend)})만으로 전월 30만 원 실적 자동 충족 (추가 카드 지출 0원)
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-field px-3 py-2">
                  <span className="text-[11px] text-ink-2 leading-snug">
                    납입금 외 평소 생활비{' '}
                    <strong className="font-bold text-ink">
                      월 {formatKRW(result.cardShortfall)}
                    </strong>
                    만 추가 사용 시 전월 실적 충족
                  </span>
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
                    {result.cardCoverShortfall ? '카드 혜택 ON' : '카드 미사용'}
                  </button>
                </div>
              )}

              {result.cardBenefitActive && (
                <div className="pt-2.5 border-t border-rule space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-ink-2">
                      제휴카드 추가 적용 시 최종 월 체감가
                    </span>
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                      <span className="text-lg sm:text-xl font-black text-accent whitespace-nowrap">
                        월 <SpringNumber value={isEmpty ? 0 : phaseA.effectiveMonthlyPay} suffix="원" />
                      </span>
                      {hasExtraCashback && !isEmpty && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-positive-soft border border-positive-rule text-positive text-xs font-bold whitespace-nowrap">
                          +매월 {phaseA.monthlySurplusCash.toLocaleString('ko-KR')}원 통장 입금
                        </span>
                      )}
                    </div>
                  </div>

                  {isMixed && result.phaseB && (
                    <div className="flex items-center justify-between gap-2 text-xs text-positive font-bold">
                      <span>37~60개월차 최종 월 체감가 (36M 완납 후)</span>
                      <span className="whitespace-nowrap">
                        {result.phaseB.monthlySurplusCash > 0
                          ? `월 0원 (+${result.phaseB.monthlySurplusCash.toLocaleString('ko-KR')}원/월)`
                          : `월 ${result.phaseB.effectiveMonthlyPay.toLocaleString('ko-KR')}원`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PRIMARY RESERVATION CTA */}
            <div className="space-y-2 pt-0.5">
              <button
                type="button"
                onClick={onOpenConsultModal}
                className="w-full h-12 px-4 rounded-lg bg-accent hover:bg-accent-hover text-accent-ink text-sm sm:text-[15px] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <MessageSquare size={16} aria-hidden="true" className="shrink-0" />
                <span>내 맞춤 견적 · 100% 환급 일정표 카톡·문자 받기</span>
              </button>

              <p className="text-[11px] text-muted text-center leading-snug">
                신청만으로 가입·결제되지 않으며, 당월 경기광주점 추가 행사가까지 확인해 보내드립니다.
              </p>
            </div>
          </div>
        </div>

        {/* LEFT ON DESKTOP / SECOND ON MOBILE: Selected Preset Appliance Card */}
        <div className="order-2 lg:order-1 lg:col-span-6">
          <div className="rounded-xl bg-surface border border-rule p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-rule">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-[15px] font-bold text-ink whitespace-nowrap">
                  선택된 추천 구성 품목
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
                <span>다른 가전 골라담기</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>

            {isEmpty ? (
              <div className="rounded-lg border border-dashed border-rule-strong bg-field/50 p-8 text-center space-y-3">
                <p className="text-sm font-bold text-ink-2">
                  위 인기 구성을 누르거나 원하는 가전을 골라보세요
                </p>
                <button
                  type="button"
                  onClick={() => onOpenCustomizer('products')}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-ink text-on-ink text-xs font-bold cursor-pointer"
                >
                  <span>가전 골라 담기</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            ) : result.lines.length === 1 ? (
              (() => {
                const line = result.lines[0]
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    <div
                      onClick={() => onOpenProductDetail?.(line.product)}
                      className={`sm:col-span-5 ${onOpenProductDetail ? 'cursor-pointer' : ''}`}
                    >
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
                          {line.term}개월 분할결제
                        </span>
                      </div>
                      <h4
                        onClick={() => onOpenProductDetail?.(line.product)}
                        className={`text-base sm:text-[17px] font-bold text-ink leading-snug break-keep ${
                          onOpenProductDetail ? 'cursor-pointer hover:underline' : ''
                        }`}
                      >
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
                      {onOpenProductDetail && (
                        <button
                          type="button"
                          onClick={() => onOpenProductDetail(line.product)}
                          className="text-xs font-bold text-ink-2 underline underline-offset-2 hover:text-ink cursor-pointer"
                        >
                          이런 집 추천 · 색상 보기
                        </button>
                      )}
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
                    onClick={() => onOpenProductDetail?.(line.product)}
                    className={`py-3 first:pt-0 last:pb-0 flex items-center gap-3 ${
                      onOpenProductDetail ? 'cursor-pointer' : ''
                    }`}
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
                          {line.term}개월
                        </span>
                        {line.quantity > 1 && (
                          <span className="font-bold text-accent tabular-nums">
                            ×{line.quantity}
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] sm:text-sm font-bold text-ink leading-snug break-keep mt-0.5 hover:underline">
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

            {!isEmpty && (
              <div className="rounded-lg bg-field border border-rule px-3.5 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-bold text-muted">
                    추천상품 자동맞춤 ({result.totalLifeCareUnits}구좌)
                  </div>
                  <div className="text-xs font-bold text-ink">
                    {freedSummaryLabel}
                  </div>
                </div>
                <span className="text-xs font-extrabold text-positive tabular-nums">
                  매월 {formatKRW(result.lifeCareMonthlyCashback)} 현금 입금
                </span>
              </div>
            )}

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
                <span>인기 세트 묶음 보기</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
