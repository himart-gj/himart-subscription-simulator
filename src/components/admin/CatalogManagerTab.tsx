import { useMemo, useState } from 'react'
import { Edit3, Eye, EyeOff, Plus, Search, Trash2, X } from 'lucide-react'
import { DEFAULT_CATEGORIES } from '../../data/initialSeedData'
import type { ProductItem } from '../../types/domain'
import { formatKRW } from '../../utils/calculator'
import { ProductCard } from '../ProductCard'
import { ProductThumbnail } from '../ProductThumbnail'

interface CatalogManagerTabProps {
  products: ProductItem[]
  busy?: boolean
  onSaveProduct: (product: ProductItem, isNew: boolean) => Promise<void> | void
  onDeleteProduct: (productId: string) => Promise<void> | void
}

interface ProductFormState {
  id: string | null
  name: string
  modelCode: string
  brand: string
  customBrand: string
  category: string
  customCategory: string
  isLargeAppliance: boolean
  imageUrl: string
  monthly36: string
  monthly60: string
  careTagsText: string
  visible: boolean
}

const EMPTY_FORM: ProductFormState = {
  id: null,
  name: '',
  modelCode: '',
  brand: '삼성',
  customBrand: '',
  category: '냉장고/냉동고',
  customCategory: '',
  isLargeAppliance: true,
  imageUrl: '',
  monthly36: '',
  monthly60: '',
  careTagsText: '정기케어, 연장보증',
  visible: true,
}

export function CatalogManagerTab({
  products,
  busy = false,
  onSaveProduct,
  onDeleteProduct,
}: CatalogManagerTabProps) {
  const [filterCat, setFilterCat] = useState('전체')
  const [filterBrand, setFilterBrand] = useState('전체')
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const categoryOptions = useMemo(() => {
    const base = DEFAULT_CATEGORIES.filter((c) => c !== '전체') as string[]
    for (const p of products) {
      if (p.category && !base.includes(p.category)) base.push(p.category)
    }
    return base
  }, [products])

  const brandOptions = useMemo(() => {
    const base = ['삼성', 'LG', '로보락', '쿠쿠', '다이슨']
    for (const p of products) {
      if (p.brand && !base.includes(p.brand)) base.push(p.brand)
    }
    return base
  }, [products])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (filterCat === '대형가전') { if (!p.isLargeAppliance) return false } else if (filterCat !== '전체' && p.category !== filterCat) return false
      if (filterBrand !== '전체' && p.brand !== filterBrand) return false
      if (q) {
        const hay = `${p.name} ${p.brand} ${p.modelCode} ${p.category}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [products, filterCat, filterBrand, query])

  const openCreateModal = () => {
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const openEditModal = (item: ProductItem) => {
    const brandKnown = brandOptions.includes(item.brand)
    const catKnown = categoryOptions.includes(item.category)
    setForm({
      id: item.id,
      name: item.name,
      modelCode: item.modelCode,
      brand: brandKnown ? item.brand : '__CUSTOM__',
      customBrand: brandKnown ? '' : item.brand,
      category: catKnown ? item.category : '__CUSTOM__',
      customCategory: catKnown ? '' : item.category,
      isLargeAppliance: item.isLargeAppliance,
      imageUrl: item.imageUrl,
      monthly36: item.monthly36 ? String(item.monthly36) : '',
      monthly60: item.monthly60 ? String(item.monthly60) : '',
      careTagsText: item.careTags.join(', '),
      visible: item.visible,
    })
    setFormError(null)
    setModalOpen(true)
  }

  const toggleVisibility = (item: ProductItem) => {
    void onSaveProduct({ ...item, visible: !item.visible }, false)
  }

  const deleteProduct = (id: string) => {
    void onDeleteProduct(id)
  }

  const previewProduct: ProductItem = useMemo(() => {
    const resolvedBrand =
      form.brand === '__CUSTOM__' ? form.customBrand.trim() || '신규브랜드' : form.brand
    const resolvedCategory =
      form.category === '__CUSTOM__'
        ? form.customCategory.trim() || '신규카테고리'
        : form.category
    const m36 = Number(form.monthly36)
    const m60 = Number(form.monthly60)
    return {
      id: form.id || 'preview',
      name: form.name.trim() || '상품명을 입력하세요',
      modelCode: form.modelCode.trim() || 'MODEL-CODE',
      brand: resolvedBrand,
      category: resolvedCategory,
      isLargeAppliance: form.isLargeAppliance,
      imageUrl: form.imageUrl.trim(),
      monthly36: Number.isFinite(m36) && m36 > 0 ? Math.round(m36) : null,
      monthly60: Number.isFinite(m60) && m60 > 0 ? Math.round(m60) : null,
      careTags: form.careTagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      visible: form.visible,
      sortOrder: 99,
    }
  }, [form])

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const finalBrand =
      form.brand === '__CUSTOM__' ? form.customBrand.trim() : form.brand.trim()
    const finalCategory =
      form.category === '__CUSTOM__' ? form.customCategory.trim() : form.category.trim()

    if (!form.name.trim()) {
      setFormError('상품명을 입력해 주세요.')
      return
    }
    if (!finalBrand) {
      setFormError('브랜드를 선택하거나 입력해 주세요.')
      return
    }
    if (!finalCategory) {
      setFormError('카테고리를 선택하거나 입력해 주세요.')
      return
    }

    const m36 = form.monthly36.trim() ? Number(form.monthly36) : null
    const m60 = form.monthly60.trim() ? Number(form.monthly60) : null
    if ((!m36 || m36 <= 0) && (!m60 || m60 <= 0)) {
      setFormError('36개월 또는 60개월 월 구독료 중 최소 1개는 양수로 입력해 주세요.')
      return
    }

    const tags = form.careTagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    if (form.id) {
      const existing = products.find((p) => p.id === form.id)
      const updated: ProductItem = {
        id: form.id,
        name: form.name.trim(),
        modelCode: form.modelCode.trim(),
        brand: finalBrand,
        category: finalCategory,
        isLargeAppliance: form.isLargeAppliance,
        imageUrl: form.imageUrl.trim(),
        monthly36: m36 && m36 > 0 ? Math.round(m36) : null,
        monthly60: m60 && m60 > 0 ? Math.round(m60) : null,
        careTags: tags,
        visible: form.visible,
        sortOrder: existing?.sortOrder ?? products.length + 1,
      }
      await onSaveProduct(updated, false)
    } else {
      const newItem: ProductItem = {
        id: `prod-${Date.now().toString(36)}`,
        name: form.name.trim(),
        modelCode: form.modelCode.trim() || 'NEW-MODEL',
        brand: finalBrand,
        category: finalCategory,
        isLargeAppliance: form.isLargeAppliance,
        imageUrl: form.imageUrl.trim(),
        monthly36: m36 && m36 > 0 ? Math.round(m36) : null,
        monthly60: m60 && m60 > 0 ? Math.round(m60) : null,
        careTags: tags,
        visible: form.visible,
        sortOrder: products.length + 1,
      }
      await onSaveProduct(newItem, true)
    }

    setModalOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Monthly Promotional Price Update Hint */}
      <div className="rounded-2xl bg-paper border border-rule px-4 py-3 text-xs text-ink-2 leading-relaxed">
        <strong className="font-extrabold text-ink">월별 행사 단가 업데이트 안내:</strong> 매월 프로모션·행사 일정에 맞춰 품목별 36·60개월 구독료를 수정 저장하시면 고객 화면(단품·복수·세트·원클릭 4종)의 <strong className="text-positive">추천상품 자동맞춤 결합 + 제휴카드 혜택</strong>에 즉시 자동 반영되며, 고객 화면에도 행사일 변동 가능 안내가 함께 표시됩니다.
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl bg-surface border border-rule p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="상품명, 모델명, 브랜드 검색"
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-paper border border-rule focus:bg-surface focus:border-ink focus:outline-none text-base"
            />
          </div>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="h-11 px-3 rounded-xl bg-paper border border-rule text-base font-medium text-ink"
          >
            <option value="전체">전체 카테고리</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="h-11 px-3 rounded-xl bg-paper border border-rule text-base font-medium text-ink"
          >
            <option value="전체">전체 브랜드</option>
            {brandOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-accent hover:bg-accent-hover text-on-ink text-sm font-extrabold transition-colors shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          <span>새 품목 추가</span>
        </button>
      </div>

      {/* Product List */}
      <div className="space-y-2.5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl bg-surface border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
              item.visible ? 'border-rule' : 'border-rule bg-paper opacity-75'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <ProductThumbnail
                src={item.imageUrl}
                alt={item.name}
                category={item.category}
                className="w-16 h-14 rounded-xl border border-rule shrink-0"
                iconSize={22}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="font-bold px-2 py-0.5 rounded bg-field text-ink">
                    {item.brand}
                  </span>
                  <span className="font-semibold text-muted">{item.category}</span>
                  <span className="font-mono text-subtle">{item.modelCode}</span>
                </div>
                <div className="text-sm font-extrabold text-ink mt-0.5 truncate">
                  {item.name}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs tabular-nums">
                  <span className="font-semibold text-ink-2">
                    36개월:{' '}
                    <strong className="text-ink">
                      {item.monthly36 ? formatKRW(item.monthly36) : '미지원'}
                    </strong>
                  </span>
                  <span className="font-semibold text-ink-2">
                    60개월:{' '}
                    <strong className="text-ink">
                      {item.monthly60 ? formatKRW(item.monthly60) : '미지원'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-rule">
              <button
                type="button"
                disabled={busy}
                onClick={() => toggleVisibility(item)}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold cursor-pointer disabled:opacity-50 ${
                  item.visible
                    ? 'bg-positive-soft border-positive-rule text-positive'
                    : 'bg-field border-rule-strong text-muted'
                }`}
              >
                {item.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>{item.visible ? '노출 ON' : '숨김'}</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => openEditModal(item)}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-xl bg-surface hover:bg-paper border border-rule text-xs font-bold text-ink cursor-pointer disabled:opacity-50"
              >
                <Edit3 size={14} />
                <span>수정</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => deleteProduct(item.id)}
                aria-label={`${item.name} 삭제`}
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-surface hover:bg-accent-soft border border-rule hover:border-accent-rule text-muted hover:text-accent cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal with Live ProductCard Preview */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={form.id ? '품목 수정' : '새 품목 추가'}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/55 p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-surface border border-rule ">
            <div className="sticky top-0 z-10 bg-surface px-5 py-4 border-b border-rule flex items-center justify-between">
              <h3 className="text-base font-extrabold text-ink">
                {form.id ? '구독 품목 수정' : '새 구독 품목 추가'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-field flex items-center justify-center text-ink-2 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveForm}
              className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* Form Fields (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink-2 mb-1">
                      카테고리
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full h-11 px-3 rounded-xl bg-surface border border-rule-strong text-base"
                    >
                      {categoryOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ 새 카테고리 직접 입력</option>
                    </select>
                    {form.category === '__CUSTOM__' && (
                      <input
                        type="text"
                        value={form.customCategory}
                        onChange={(e) =>
                          setForm({ ...form, customCategory: e.target.value })
                        }
                        placeholder="예: 정수기/생활가전"
                        className="mt-2 w-full h-11 px-3 rounded-xl border border-ink text-base"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-2 mb-1">
                      브랜드
                    </label>
                    <select
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      className="w-full h-11 px-3 rounded-xl bg-surface border border-rule-strong text-base"
                    >
                      {brandOptions.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ 신규 브랜드 직접 입력</option>
                    </select>
                    {form.brand === '__CUSTOM__' && (
                      <input
                        type="text"
                        value={form.customBrand}
                        onChange={(e) =>
                          setForm({ ...form, customBrand: e.target.value })
                        }
                        placeholder="예: 위니아, 발뮤다"
                        className="mt-2 w-full h-11 px-3 rounded-xl border border-ink text-base"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink-2 mb-1">
                      상품명 <span className="text-accent">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="예: BESPOKE AI 4도어 냉장고"
                      className="w-full h-11 px-3 rounded-xl border border-rule-strong text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-2 mb-1">
                      모델명
                    </label>
                    <input
                      type="text"
                      value={form.modelCode}
                      onChange={(e) => setForm({ ...form, modelCode: e.target.value })}
                      placeholder="예: RF85DB9581AP"
                      className="w-full h-11 px-3 rounded-xl border border-rule-strong text-base font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-2 mb-1">
                    제품 이미지 URL (비워두거나 로드 실패 시 가전 아이콘 자동 표시)
                  </label>
                  <input
                    type="text"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="./products/fridge.jpg 또는 https://..."
                    className="w-full h-11 px-3 rounded-xl border border-rule-strong text-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink-2 mb-1">
                      36개월 월 구독료 (원 · 미지원 시 공란)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={form.monthly36}
                      onChange={(e) => setForm({ ...form, monthly36: e.target.value })}
                      placeholder="예: 29800"
                      className="w-full h-11 px-3 rounded-xl border border-rule-strong text-base tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-2 mb-1">
                      60개월 월 구독료 (원 · 미지원 시 공란)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={form.monthly60}
                      onChange={(e) => setForm({ ...form, monthly60: e.target.value })}
                      placeholder="예: 49900"
                      className="w-full h-11 px-3 rounded-xl border border-rule-strong text-base tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-2 mb-1">
                    케어/보증 핵심 포인트 태그 (쉼표로 구분)
                  </label>
                  <input
                    type="text"
                    value={form.careTagsText}
                    onChange={(e) => setForm({ ...form, careTagsText: e.target.value })}
                    placeholder="정기 살균케어, 5년 무상 A/S, 필터교체"
                    className="w-full h-11 px-3 rounded-xl border border-rule-strong text-base"
                  />
                </div>

                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-ink-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isLargeAppliance}
                      onChange={(e) =>
                        setForm({ ...form, isLargeAppliance: e.target.checked })
                      }
                      className="h-4 w-4 accent-ink"
                    />
                    <span>‘대형가전’ 탭에도 함께 노출</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs font-bold text-ink-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.visible}
                      onChange={(e) => setForm({ ...form, visible: e.target.checked })}
                      className="h-4 w-4 accent-positive"
                    />
                    <span>고객 화면에 즉시 노출</span>
                  </label>
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
                    {form.id ? '품목 변경사항 반영' : '카탈로그에 품목 추가'}
                  </button>
                </div>
              </div>

              {/* Real-time Live Card Preview (5 cols) */}
              <div className="lg:col-span-5 rounded-2xl bg-paper border border-rule p-4">
                <div className="text-xs font-extrabold text-ink-2 mb-3">
                  실시간 고객 화면 카드 미리보기
                </div>
                <div className="max-w-[290px] mx-auto pointer-events-none">
                  <ProductCard
                    product={previewProduct}
                    inCartCount={0}
                    onAdd={() => {}}
                  />
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
