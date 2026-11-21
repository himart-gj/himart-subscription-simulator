import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { INITIAL_HERO_PRESETS } from '../../data/initialSeedData'
import type {
  BundleLineItem,
  PolicyConfig,
  ProductItem,
  RecommendedBundle,
  SubscriptionTerm,
} from '../../types/domain'
import {
  calculateBenefitSimulation,
  formatKRW,
  recommendZeroCostLifeCare,
} from '../../utils/calculator'

interface HeroPresetManagerTabProps {
  heroPresets: RecommendedBundle[]
  products: ProductItem[]
  policy: PolicyConfig
  busy?: boolean
  onSaveHeroPreset: (preset: RecommendedBundle, isNew: boolean) => Promise<void> | void
  onDeleteHeroPreset: (presetId: string) => Promise<void> | void
  onReorderHeroPresets: (nextPresets: RecommendedBundle[]) => Promise<void> | void
}

const HERO_BADGE_PRESETS = ['단품 인기 1위', '신혼·입주 추천', '살림효자', '대형 베스트', '이달의 특가']

export function HeroPresetManagerTab({
  heroPresets,
  products,
  policy,
  busy = false,
  onSaveHeroPreset,
  onDeleteHeroPreset,
  onReorderHeroPresets,
}: HeroPresetManagerTabProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [badge, setBadge] = useState('단품 인기 1위')
  const [defaultTerm, setDefaultTerm] = useState<SubscriptionTerm>(60)
  const [items, setItems] = useState<BundleLineItem[]>([])
  const [visible, setVisible] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setBadge('단품 인기 1위')
    setDefaultTerm(60)
    setItems([])
    setVisible(true)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (preset: RecommendedBundle) => {
    setEditingId(preset.id)
    setName(preset.name)
    setDescription(preset.description)
    setBadge(preset.badge)
    setDefaultTerm(preset.defaultTerm)
    setItems(preset.items.map((i) => ({ ...i })))
    setVisible(preset.visible)
    setFormError(null)
    setModalOpen(true)
  }

  const movePreset = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= heroPresets.length) return
    const copy = [...heroPresets]
    const [removed] = copy.splice(index, 1)
    copy.splice(target, 0, removed)
    void onReorderHeroPresets(
      copy.map((p, i) => ({ ...p, sortOrder: i + 1, slotType: 'hero' })),
    )
  }

  const toggleVisible = (preset: RecommendedBundle) => {
    void onSaveHeroPreset({ ...preset, visible: !preset.visible, slotType: 'hero' }, false)
  }

  const toggleProductInPreset = (product: ProductItem) => {
    const exists = items.some((i) => i.productId === product.id)
    if (exists) {
      setItems(items.filter((i) => i.productId !== product.id))
    } else {
      const term: SubscriptionTerm =
        defaultTerm === 60 && product.monthly60
          ? 60
          : defaultTerm === 36 && product.monthly36
            ? 36
            : product.monthly60
              ? 60
              : 36
      setItems([...items, { productId: product.id, term, quantity: 1 }])
    }
  }

  const setItemTerm = (productId: string, term: SubscriptionTerm) => {
    setItems(items.map((i) => (i.productId === productId ? { ...i, term } : i)))
  }

  const handleRestoreDefaults = () => {
    void onReorderHeroPresets(
      INITIAL_HERO_PRESETS.map((p, idx) => ({ ...p, sortOrder: idx + 1, slotType: 'hero' })),
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!name.trim()) {
      setFormError('메인 카드 제목을 입력해 주세요.')
      return
    }
    if (items.length === 0) {
      setFormError('포함할 가전을 1개 이상 선택해 주세요 (단품 1개 또는 복수 세트 모두 가능).')
      return
    }

    if (editingId) {
      const existing = heroPresets.find((p) => p.id === editingId)
      await onSaveHeroPreset(
        {
          id: editingId,
          name: name.trim(),
          description: description.trim(),
          badge: badge.trim() || '추천',
          defaultTerm,
          items,
          visible,
          sortOrder: existing?.sortOrder ?? heroPresets.length + 1,
          slotType: 'hero',
        },
        false,
      )
    } else {
      await onSaveHeroPreset(
        {
          id: `hero-${Date.now().toString(36)}`,
          name: name.trim(),
          description: description.trim(),
          badge: badge.trim() || '추천',
          defaultTerm,
          items,
          visible,
          sortOrder: heroPresets.length + 1,
          slotType: 'hero',
        },
        true,
      )
    }
    setModalOpen(false)
  }

  const previewUnits = recommendZeroCostLifeCare({
    cart: items,
    products,
    policy,
  })
  const previewSim = calculateBenefitSimulation({
    cart: items,
    products,
    lifeCare: previewUnits,
    cardEnabled: true,
    coverShortfallWithLivingSpend: true,
    policy,
  })

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={16} aria-hidden="true" className="text-[#E11D48]" />
            <h3 className="text-sm font-extrabold text-[#0F172A]">
              첫 메인 화면 원클릭 추천 슬롯 관리 ({heroPresets.filter((h) => h.visible).length}개 노출 중 / 상위 4개 메인 표시)
            </h3>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            첫 화면 상단에 노출되는 4개 원클릭 추천 구성(단품 1개 또는 다품목 세트)을 자유롭게 추가·수정·순서 변경할 수 있으며, 구글 시트(`HeroPresets` / `Sets`)에 즉시 저장됩니다.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {heroPresets.length === 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={handleRestoreDefaults}
              className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-xs font-bold text-[#334155] cursor-pointer"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>기본 4종 불러오기</span>
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-sm font-extrabold shrink-0 cursor-pointer"
          >
            <Plus size={16} aria-hidden="true" />
            <span>원클릭 추천 슬롯 추가</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {heroPresets.map((preset, idx) => {
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
          const activeMainSlot = preset.visible && idx < 4

          return (
            <div
              key={preset.id}
              className={`rounded-2xl bg-white border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                activeMainSlot
                  ? 'border-[#FECDD3] shadow-[0_1px_4px_rgba(225,29,72,0.06)]'
                  : 'border-[#E2E8F0] opacity-75 bg-[#F8FAFC]'
              }`}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-extrabold tabular-nums ${
                      idx === 0 && preset.visible
                        ? 'bg-[#0F172A] text-white'
                        : activeMainSlot
                          ? 'bg-[#FFF1F2] text-[#E11D48]'
                          : 'bg-[#E2E8F0] text-[#475569]'
                    }`}
                  >
                    {idx === 0 && preset.visible
                      ? '슬롯 1 · 첫 화면 기본 선택'
                      : activeMainSlot
                        ? `슬롯 ${idx + 1} · 메인 노출`
                        : '대기 슬롯'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#FFF1F2] text-[#BE123C] text-[11px] font-bold">
                    {preset.badge}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] text-[11px] font-bold tabular-nums">
                    {preset.items.length === 1 ? '단품 1종' : `${preset.items.length}종 세트`}
                  </span>
                </div>

                <div className="text-base font-extrabold text-[#0F172A]">{preset.name}</div>
                {preset.description && (
                  <p className="text-xs text-[#64748B]">{preset.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold pt-1 tabular-nums">
                  <span className="text-[#475569]">
                    기본 월 {formatKRW(sim.phaseA.grossSubscription)}
                  </span>
                  <span className="text-[#0F172A]">
                    → 상조 결합 시 월 체감 {formatKRW(sim.phaseA.afterLifeCareEffective)} ({sim.totalLifeCareUnits}구좌 자동맞춤)
                  </span>
                  <span className="text-[#059669]">
                    → 카드 실적 충족 시{' '}
                    {sim.phaseA.monthlySurplusCash > 0
                      ? `월 0원 (+${formatKRW(sim.phaseA.monthlySurplusCash)} 캐시백)`
                      : `월 ${formatKRW(sim.phaseA.effectiveMonthlyPay)}`}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={busy || idx === 0}
                  onClick={() => movePreset(idx, -1)}
                  aria-label="위로 이동"
                  className="w-9 h-9 rounded-xl border border-[#E2E8F0] flex items-center justify-center text-[#475569] disabled:opacity-30 cursor-pointer"
                >
                  <ArrowUp size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={busy || idx === heroPresets.length - 1}
                  onClick={() => movePreset(idx, 1)}
                  aria-label="아래로 이동"
                  className="w-9 h-9 rounded-xl border border-[#E2E8F0] flex items-center justify-center text-[#475569] disabled:opacity-30 cursor-pointer"
                >
                  <ArrowDown size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggleVisible(preset)}
                  className={`inline-flex items-center gap-1 h-9 px-3 rounded-xl border text-xs font-bold cursor-pointer disabled:opacity-50 ${
                    preset.visible
                      ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
                      : 'bg-[#F1F5F9] border-[#CBD5E1] text-[#64748B]'
                  }`}
                >
                  {preset.visible ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                  <span>{preset.visible ? '노출 ON' : '숨김'}</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openEdit(preset)}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-xl bg-white border border-[#E2E8F0] text-xs font-bold text-[#0F172A] cursor-pointer disabled:opacity-50"
                >
                  <Edit3 size={14} aria-hidden="true" />
                  <span>수정</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDeleteHeroPreset(preset.id)}
                  aria-label={`${preset.name} 삭제`}
                  className="w-9 h-9 rounded-xl border border-[#E2E8F0] hover:border-[#FECDD3] hover:bg-[#FFF1F2] text-[#64748B] hover:text-[#E11D48] flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0F172A]/50 p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white border border-[#E2E8F0] shadow-xl">
            <div className="sticky top-0 z-10 bg-white px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#0F172A]">
                {editingId ? '메인 원클릭 추천 슬롯 수정' : '새 메인 원클릭 추천 슬롯 추가'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-[#F1F5F9] flex items-center justify-center text-[#475569] cursor-pointer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  메인 카드 제목 <span className="text-[#E11D48]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 로보락 올인원 로봇청소기 맞춤 설계"
                  className="w-full h-11 px-3 rounded-xl border border-[#CBD5E1] text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  보조 설명 (선택)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="예: 가장 문의가 많은 60개월 케어 포함 단독 구성"
                  className="w-full h-11 px-3 rounded-xl border border-[#CBD5E1] text-base"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    상단 강조 배지
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {HERO_BADGE_PRESETS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBadge(b)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          badge === b
                            ? 'bg-[#E11D48] text-white'
                            : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569]'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="배지 직접 입력"
                    className="w-full h-10 px-3 rounded-xl border border-[#CBD5E1] text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    기본 선택 기간 (품목별 개별 변경 가능)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([36, 60] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDefaultTerm(t)}
                        className={`h-11 rounded-xl border text-sm font-bold cursor-pointer ${
                          defaultTerm === t
                            ? 'bg-[#0F172A] border-[#0F172A] text-white'
                            : 'bg-white border-[#E2E8F0] text-[#475569]'
                        }`}
                      >
                        {t}개월
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-[#334155]">
                    포함할 가전 선택 ({items.length}개 선택됨 — 단품 1개도 등록 가능)
                  </span>
                  {items.length > 0 && (
                    <span className="text-xs font-bold text-[#059669] tabular-nums">
                      상조 결합 체감: 월 {formatKRW(previewSim.phaseA.afterLifeCareEffective)} ({previewSim.totalLifeCareUnits}구좌 자동맞춤)
                    </span>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto rounded-xl border border-[#E2E8F0] divide-y divide-[#F1F5F9]">
                  {products.map((p) => {
                    const selected = items.find((i) => i.productId === p.id)
                    return (
                      <div
                        key={p.id}
                        className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          selected ? 'bg-[#FFF1F2]/40' : 'bg-white'
                        }`}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => toggleProductInPreset(p)}
                            className="h-4 w-4 accent-[#E11D48] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#0F172A] truncate">
                              [{p.brand}] {p.name}
                            </div>
                            <div className="text-[11px] text-[#64748B] tabular-nums">
                              36개월 {p.monthly36 ? formatKRW(p.monthly36) : '미지원'} · 60개월{' '}
                              {p.monthly60 ? formatKRW(p.monthly60) : '미지원'}
                            </div>
                          </div>
                        </label>

                        {selected && (
                          <div className="inline-flex rounded-lg bg-white border border-[#E2E8F0] p-0.5 self-end sm:self-auto shrink-0">
                            <button
                              type="button"
                              disabled={!p.monthly36}
                              onClick={() => p.monthly36 && setItemTerm(p.id, 36)}
                              className={`px-2 py-1 rounded text-[11px] font-bold ${
                                !p.monthly36
                                  ? 'text-[#CBD5E1]'
                                  : selected.term === 36
                                    ? 'bg-[#0F172A] text-white'
                                    : 'text-[#64748B] cursor-pointer'
                              }`}
                            >
                              36개월
                            </button>
                            <button
                              type="button"
                              disabled={!p.monthly60}
                              onClick={() => p.monthly60 && setItemTerm(p.id, 60)}
                              className={`px-2 py-1 rounded text-[11px] font-bold ${
                                !p.monthly60
                                  ? 'text-[#CBD5E1]'
                                  : selected.term === 60
                                    ? 'bg-[#0F172A] text-white'
                                    : 'text-[#64748B] cursor-pointer'
                              }`}
                            >
                              60개월
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {formError && (
                <div className="rounded-xl bg-[#FFF1F2] border border-[#FECDD3] px-3 py-2 text-xs font-bold text-[#BE123C]">
                  {formError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-11 px-4 rounded-xl border border-[#E2E8F0] text-sm font-bold text-[#475569] cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-extrabold cursor-pointer"
                >
                  {editingId ? '슬롯 변경사항 저장' : '메인 원클릭 슬롯 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
