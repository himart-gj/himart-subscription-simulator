import { useState } from 'react'
import { ChevronDown, Scale } from 'lucide-react'
import { LEGAL_DISCLOSURES } from '../data/legalNotices'

export function LegalDisclosureSection() {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    'separate-contract': true,
  })

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <section
      aria-label="필수 법적 고지사항 및 유의사항"
      className="mt-12 rounded-xl bg-surface border border-rule overflow-hidden"
    >
      <div className="px-5 sm:px-6 py-4 bg-field border-b border-rule flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale size={15} className="text-ink shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-bold text-ink tracking-tight">
            가입 전 필수 확인 법적 고지사항 (공정거래위원회 지침 및 공식 약관 기준)
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            const allOpen = LEGAL_DISCLOSURES.every((d) => openIds[d.id])
            const next: Record<string, boolean> = {}
            for (const d of LEGAL_DISCLOSURES) next[d.id] = !allOpen
            setOpenIds(next)
          }}
          className="text-xs font-semibold text-ink-2 hover:text-ink self-start sm:self-auto cursor-pointer"
        >
          {LEGAL_DISCLOSURES.every((d) => openIds[d.id]) ? '전체 접기' : '전체 펼치기'}
        </button>
      </div>

      <div className="divide-y divide-rule">
        {LEGAL_DISCLOSURES.map((item) => {
          const isOpen = !!openIds[item.id]
          return (
            <div key={item.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggle(item.id)}
                className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-field/60 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-accent tabular-nums">
                      {item.number}
                    </span>
                    <span className="text-[13px] sm:text-sm font-bold text-ink">
                      {item.title}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted truncate sm:whitespace-normal">
                    {item.summary}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`text-muted shrink-0 transition-transform duration-150 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 sm:px-6 pb-4 pt-0.5 space-y-2 text-[12px] sm:text-[13px] text-ink-2 leading-relaxed bg-surface">
                  {item.paragraphs.map((p, idx) => (
                    <p key={idx} className="pl-5 relative">
                      <span className="absolute left-1.5 top-2 w-1 h-1 rounded-full bg-subtle" />
                      {p}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
