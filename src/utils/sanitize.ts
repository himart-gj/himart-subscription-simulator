/**
 * Input sanitization utilities to prevent Google Sheets Formula Injection
 * and HTML/XSS payloads on both customer write-only forms and admin CMS writes.
 */

const FORMULA_PREFIX_REGEX = /^[\s]*[=+\-@\t\r\n]/
const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/**
 * Strips dangerous control characters, neutralizes HTML angle brackets,
 * and prefixes a leading apostrophe if the value starts with a spreadsheet formula trigger.
 */
export function sanitizeForSheet(raw: string, maxLength = 300): string {
  const cleaned = raw
    .replace(CONTROL_CHARS_REGEX, '')
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
 * Sanitizes multi-line memo text while neutralizing formula injection on line start.
 */
export function sanitizeMemoForSheet(raw: string, maxLength = 500): string {
  const cleaned = raw
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength)

  if (!cleaned) return ''
  if (FORMULA_PREFIX_REGEX.test(cleaned)) {
    return `'${cleaned}`
  }
  return cleaned
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
 * Validates and sanitizes image URLs to allow only safe http(s) or relative local paths.
 */
export function sanitizeImageUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('./') || trimmed.startsWith('/')) {
    return trimmed.replace(/[<>"'`\s]/g, '')
  }
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString()
    }
    return ''
  } catch {
    return ''
  }
}
