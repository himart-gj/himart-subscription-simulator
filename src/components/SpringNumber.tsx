import { useEffect, useRef, useState } from 'react'

interface SpringNumberProps {
  value: number
  prefix?: string
  suffix?: string
  className?: string
  durationMs?: number
}

/**
 * Restrained Emil Kowalski-style number ticker (260ms ease-out).
 * Strictly uses tabular-nums so numeric transitions produce zero CLS.
 */
export function SpringNumber({
  value,
  prefix = '',
  suffix = '',
  className = '',
  durationMs = 260,
}: SpringNumberProps) {
  const [displayValue, setDisplayValue] = useState<number>(value)
  const previousRef = useRef<number>(value)

  useEffect(() => {
    const startVal = previousRef.current
    const targetVal = value
    if (startVal === targetVal) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let rafId = 0
    const startTime = performance.now()

    const tick = (now: number) => {
      if (prefersReduced) {
        previousRef.current = targetVal
        setDisplayValue(targetVal)
        return
      }
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = Math.round(startVal + (targetVal - startVal) * eased)
      setDisplayValue(next)

      if (progress < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        previousRef.current = targetVal
        setDisplayValue(targetVal)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      previousRef.current = targetVal
    }
  }, [value, durationMs])

  return (
    <span className={`tabular-nums whitespace-nowrap ${className}`}>
      {prefix}
      {Math.round(displayValue).toLocaleString('ko-KR')}
      {suffix}
    </span>
  )
}
