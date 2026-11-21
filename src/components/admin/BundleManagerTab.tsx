import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import type {
  BundleLineItem,
  PolicyConfig,
  ProductItem,
  RecommendedBundle,
  SubscriptionTerm,
} from '../../types/domain'
import { calculateBenefitSimulation, formatKRW } from '../../utils/calculator'

interface BundleManagerTabProps {
  bundles: RecommendedBundle[]
  products: ProductItem[]
  policy: PolicyConfig
  busy?: boolean
  onSaveSet: (bundle: RecommendedBundle, isNew: boolean) => Promise<void> | void
  onDeleteSet: (bundleId: string) => Promise<void> | void
  onReorderSets: (nextBundles: RecommendedBundle[]) => Promise<void> | void
}

const BADGE_PRESETS = ['인기', '신혼추천', '살림효자', '입주특가']

export function BundleManagerTab({
  bundles,
  products,
  policy,
  busy = false,
  onSaveSet,
  onDeleteSet,
  onReorderSets,
}: BundleManagerTabProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [badge, setBadge] = useState('인기')
  const [defaultTerm, setDefaultTerm] = useState<SubscriptionTerm>(60)
  const [items, setItems] = useState<BundleLineItem[]>([])
  const [visible, setVisible] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setBadge('인기')
    setDefaultTerm(60)
    setItems([])
    setVisible(true)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (b: RecommendedBundle) => {
    setEditingId(b.id)
    setName(b.name)
    setDescription(b.description)
    setBadge(b.badge)
    setDefaultTerm(b.defaultTerm)
    setItems(b.items.map((i) => ({ ...i })))
    setVisible(b.visible)
    setFormError(null)
    setModalOpen(true)
  }

  const moveBundle = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= bundles.length) return
    const copy = [...bundles]
    const [removed] = copy.splice(index, 1)
    copy.splice(target, 0, removed)
    void onReorderSets(copy.map((b, i) => ({ ...b, sortOrder: i + 1 })))
  }

  const toggleBundleVisible = (bundle: RecommendedBundle) => {
    void onSaveSet({ ...bundle, visible: !bundle.visible }, false)
  }

  const deleteBundle = (id: string) => {
    void onDeleteSet(id)
  }

  const toggleProductInBundle = (product: ProductItem) => {
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
    setItems(
      items.map((i) => (i.productId === productId ? { ...i, term } : i)),
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!name.trim()) {
      setFormError('세트 이름을 입력해 주세요.')
      return
    }
    if (items.length === 0) {
      setFormError('세트에 포함할 가전 품목을 1개 이상 선택해 주세요.')
      return
    }

    if (editingId) {
      const existing = bundles.find((b) => b.id === editingId)
      const updated: RecommendedBundle = {
        id: editingId,
        name: name.trim(),
        description: description.trim(),
        badge: badge.trim() || '추천',
        defaultTerm,
        items,
        visible,
        sortOrder: existing?.sortOrder ?? bundles.length + 1,
      }
      await onSaveSet(updated, false)
    } else {
      const next: RecommendedBundle = {
        id: `bundle-${Date.now().toString(36)}`,
        name: name.trim(),
        description: description.trim(),
        badge: badge.trim() || '추천',
        defaultTerm,
        items,
        visible,
        sortOrder: bundles.length + 1,
      }
      await onSaveSet(next, true)
    }
    setModalOpen(false)
  }

  const previewSim = calculateBenefitSimulation({
    cart: items,
    products,
    lifeCare: { q40: 0, q50: 0, q60: 0 },
    cardEnabled: false,
    coverShortfallWithLivingSpend: false,
    policy,
  })

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface border border-rule p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-ink">
            추천 세트 묶음 관리 ({bundles.length}개)
          </h3>
          <p className="text-xs text-muted mt-0.5">
            대형 입주 세트뿐만 아니라 밥솥+청소기+로봇청소기 등 혼합 기간(36+60개월) 소형 세트도
            자유롭게 구성할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-accent hover:bg-accent-hover text-on-ink text-sm font-extrabold shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          <span>새 추천 세트 만들기</span>
        </button>
      </div>

      <div className="space-y-3">
        {bundles.map((bundle, idx) => {
          const sim = calculateBenefitSimulation({
            cart: bundle.items,
            products,
            lifeCare: { q40: 0, q50: 0, q60: 0 },
            cardEnabled: false,
            coverShortfallWithLivingSpend: false,
            policy,
          })
          return (
            <div
              key={bundle.id}
              className={`rounded-2xl bg-surface border border-rule p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                bundle.visible ? '' : 'opacity-70 bg-paper'
              }`}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-accent-soft text-accent text-[11px] font-bold">
                    {bundle.badge}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-field text-ink-2 text-[11px] font-bold tabular-nums">
                    {bundle.items.length}개 품목 ·{' '}
                    {sim.mode === 'mixed'
                      ? '36+60개월 혼합'
                      : `${sim.durationMonths}개월 단일`}
                  </span>
                </div>
                <div className="text-base font-extrabold text-ink">{bundle.name}</div>
                <p className="text-xs text-muted">{bundle.description}</p>
                <div className="text-xs font-bold text-ink-2 tabular-nums pt-1">
                  {sim.mode === 'mixed' && sim.phaseB
                    ? `1~36개월차 월 ${formatKRW(sim.phaseA.grossSubscription)} → 37~60개월차 월 ${formatKRW(sim.phaseB.grossSubscription)}`
                    : `기본 월 구독료 ${formatKRW(sim.phaseA.grossSubscription)}`}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={busy || idx === 0}
                  onClick={() => moveBundle(idx, -1)}
                  aria-label="위로 이동"
                  className="w-9 h-9 rounded-xl border border-rule flex items-center justify-center text-ink-2 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  disabled={busy || idx === bundles.length - 1}
                  onClick={() => moveBundle(idx, 1)}
                  aria-label="아래로 이동"
                  className="w-9 h-9 rounded-xl border border-rule flex items-center justify-center text-ink-2 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggleBundleVisible(bundle)}
                  className={`inline-flex items-center gap-1 h-9 px-3 rounded-xl border text-xs font-bold cursor-pointer disabled:opacity-50 ${
                    bundle.visible
                      ? 'bg-positive-soft border-positive-rule text-positive'
                      : 'bg-field border-rule-strong text-muted'
                  }`}
                >
                  {bundle.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  <span>{bundle.visible ? '노출 ON' : '숨김'}</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openEdit(bundle)}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-xl bg-surface border border-rule text-xs font-bold text-ink cursor-pointer disabled:opacity-50"
                >
                  <Edit3 size={14} />
                  <span>수정</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => deleteBundle(bundle.id)}
                  aria-label={`${bundle.name} 삭제`}
                  className="w-9 h-9 rounded-xl border border-rule hover:border-accent-rule hover:bg-accent-soft text-muted hover:text-accent flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bundle Builder Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/55 p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-surface border border-rule ">
            <div className="sticky top-0 z-10 bg-surface px-5 py-4 border-b border-rule flex items-center justify-between">
              <h3 className="text-base font-extrabold text-ink">
                {editingId ? '추천 세트 수정' : '새 추천 세트 빌더'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-field flex items-center justify-center text-ink-2 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">
                  세트 이름 <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 주방·청소 살림효자 소형 3종 세트"
                  className="w-full h-11 px-3 rounded-xl border border-rule-strong text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">
                  한줄 설명
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="고객에게 세트의 핵심 장점을 한 문장으로 안내하세요"
                  className="w-full h-11 px-3 rounded-xl border border-rule-strong text-base"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-2 mb-1">
                    강조 배지
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {BADGE_PRESETS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBadge(b)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          badge === b
                            ? 'bg-accent text-on-ink'
                            : 'bg-paper border border-rule text-ink-2'
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
                    placeholder="직접 입력 가능"
                    className="w-full h-10 px-3 rounded-xl border border-rule-strong text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-2 mb-1">
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
                            ? 'bg-ink border-ink text-on-ink'
                            : 'bg-surface border-rule text-ink-2'
                        }`}
                      >
                        {t}개월
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Product Checkbox Picker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-ink-2">
                    포함할 품목 선택 ({items.length}개 선택됨)
                  </span>
                  {items.length > 0 && (
                    <span className="text-xs font-bold text-positive tabular-nums">
                      {previewSim.mode === 'mixed' && previewSim.phaseB
                        ? `1~36m: ${formatKRW(previewSim.phaseA.grossSubscription)} / 37~60m: ${formatKRW(previewSim.phaseB.grossSubscription)}`
                        : `합계: 월 ${previewSim.phaseA.grossSubscription.toLocaleString('ko-KR')}원`}
                    </span>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto rounded-xl border border-rule divide-y divide-rule">
                  {products.map((p) => {
                    const selected = items.find((i) => i.productId === p.id)
                    return (
                      <div
                        key={p.id}
                        className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          selected ? 'bg-accent-soft/60' : 'bg-surface'
                        }`}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => toggleProductInBundle(p)}
                            className="h-4 w-4 accent-accent shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-ink truncate">
                              [{p.brand}] {p.name}
                            </div>
                            <div className="text-[11px] text-muted tabular-nums">
                              36개월 {p.monthly36 ? formatKRW(p.monthly36) : '미지원'} · 60개월{' '}
                              {p.monthly60 ? formatKRW(p.monthly60) : '미지원'}
                            </div>
                          </div>
                        </label>

                        {selected && (
                          <div className="inline-flex rounded-lg bg-surface border border-rule p-0.5 self-end sm:self-auto shrink-0">
                            <button
                              type="button"
                              disabled={!p.monthly36}
                              onClick={() => p.monthly36 && setItemTerm(p.id, 36)}
                              className={`px-2 py-1 rounded text-[11px] font-bold ${
                                !p.monthly36
                                  ? 'text-subtle'
                                  : selected.term === 36
                                    ? 'bg-ink text-on-ink'
                                    : 'text-muted cursor-pointer'
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
                                  ? 'text-subtle'
                                  : selected.term === 60
                                    ? 'bg-ink text-on-ink'
                                    : 'text-muted cursor-pointer'
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
                <div className="rounded-xl bg-accent-soft border border-accent-rule px-3 py-2 text-xs font-bold text-accent">
                  {formError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-11 px-4 rounded-xl border border-rule text-sm font-bold text-ink-2 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-ink hover:bg-ink-hover text-on-ink text-sm font-extrabold cursor-pointer"
                >
                  {editingId ? '세트 변경사항 저장' : '추천 세트 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
