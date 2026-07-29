import type { Prisma } from '@prisma/client'

const sensitiveKeyPattern =
  /password|passphrase|token|secret|authorization|cookie|private.?key|credential|card.?number|cvv|cvc|personal.?id|database.?url|connection.?string/i

const personalKeyPattern = /email|phone|telephone|document|cpf|cnpj|address|ipaddress|ip$/i

export const redactSensitiveText = (value: string) =>
  value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [PROTECTED]')
    .replace(
      /\b(mysql|postgres(?:ql)?|mongodb(?:\+srv)?):\/\/[^@\s]+@/gi,
      '$1://[PROTECTED]@'
    )
    .replace(
      /([?&](?:token|secret|password|key|signature)=)[^&\s]+/gi,
      '$1[PROTECTED]'
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
      '[PROTECTED_JWT]'
    )

const maskEmail = (value: string) => {
  const [local, domain] = value.split('@')
  if (!domain) return '[MASKED]'
  return `${local.slice(0, 2)}***@${domain}`
}

const maskPersonalValue = (key: string, value: unknown) => {
  if (typeof value !== 'string') return '[MASKED]'
  if (/email/i.test(key)) return maskEmail(value)
  if (/ip/i.test(key)) return value.replace(/([.:])[^.:]+$/, '$1***')
  return value.length <= 4 ? '[MASKED]' : `${value.slice(0, 2)}***${value.slice(-2)}`
}

export const sanitizeSensitiveData = (
  value: unknown,
  options: { maskPersonalData?: boolean; depth?: number } = {}
): unknown => {
  const depth = options.depth ?? 0
  if (depth > 12) return '[MAX_DEPTH]'
  if (value === null || value === undefined) return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'string') return redactSensitiveText(value)
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.slice(0, 500).map((item) =>
      sanitizeSensitiveData(item, { ...options, depth: depth + 1 })
    )
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      if (sensitiveKeyPattern.test(key)) return [key, '[PROTECTED]']
      if (options.maskPersonalData && personalKeyPattern.test(key)) {
        return [key, maskPersonalValue(key, item)]
      }
      return [
        key,
        sanitizeSensitiveData(item, { ...options, depth: depth + 1 })
      ]
    })
  )
}

export const toSafeJson = (
  value: unknown,
  options?: { maskPersonalData?: boolean }
): Prisma.InputJsonValue | undefined => {
  if (value === undefined || value === null) return undefined
  return sanitizeSensitiveData(value, options) as Prisma.InputJsonValue
}
