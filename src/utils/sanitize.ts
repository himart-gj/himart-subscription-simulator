/**
 * Input sanitization utilities to prevent Google Sheets Formula Injection
 * (including full-width Unicode & multi-line triggers) and HTML/XSS/URL payloads.
 */

const FORMULA_PREFIX_REGEX = /^[\s]*[=+\-@|\t\r\n＝＋－＠｜]/

function stripControlChars(input: string): string {
  let out = ''
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i)
    const isUnsafeControl =
      (code >= 0x00 && code <= 0x08) ||
      code === 0x0b ||
      code === 0x0c ||
      (code >= 0x0e && code <= 0x1f) ||
      code === 0x7f
    if (!isUnsafeControl) {
      out += input[i]
    }
  }
  return out
}

/**
 * Strips dangerous control characters, neutralizes HTML angle brackets,
 * and prefixes a leading apostrophe if the value starts with a spreadsheet formula trigger.
 */
export function sanitizeForSheet(raw: string, maxLength = 300): string {
  const cleaned = stripControlChars(raw)
    .replace(/[<>]/g, '')
    .replace(/\r?\n/g, ' ')
    .trim()
    .slice(0, maxLength)

  if (!cleaned) return ''
  if (FORMULA_PREFIX_REGEX.test(cleaned)) {
    return `'${cleaned}`
  }
  return cleaned
}

/**
 * Sanitizes multi-line memo text while neutralizing formula injection on both
 * the overall cell start and any subsequent newline-delimited lines.
 */
export function sanitizeMemoForSheet(raw: string, maxLength = 500): string {
  const cleanedLines = stripControlChars(raw)
    .replace(/[<>]/g, '')
    .split(/\r?\n/)
    .map((line) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return ''
      return FORMULA_PREFIX_REGEX.test(trimmedLine) ? `'${trimmedLine}` : trimmedLine
    })
    .filter(Boolean)
    .join('\n')
    .slice(0, maxLength)

  if (!cleanedLines) return ''
  if (FORMULA_PREFIX_REGEX.test(cleanedLines)) {
    return `'${cleanedLines}`
  }
  return cleanedLines
}

/**
 * Normalizes Korean phone numbers to digits and hyphens only (no formula risk).
 */
export function sanitizePhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

/**
 * Validates and sanitizes image URLs:
 * - Blocks protocol-relative URLs (//evil.com), javascript:, data:, file:, etc.
 * - Allows safe relative local asset paths (./... or single /...)
 * - Requires https: for external URLs (allows http: only on localhost/127.0.0.1 for local dev)
 */
export function sanitizeImageUrl(raw: string): string {
  const trimmed = stripControlChars(raw).trim()
  if (!trimmed) return ''

  if (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return trimmed
  }

  if (trimmed.startsWith('./') || (trimmed.startsWith('/') && !trimmed.startsWith('//'))) {
    if (trimmed.includes('..')) return ''
    return trimmed.replace(/[<>"'`\s\\]/g, '')
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'https:') {
      return parsed.toString()
    }
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return parsed.toString()
    }
    return ''
  } catch {
    return ''
  }
}
