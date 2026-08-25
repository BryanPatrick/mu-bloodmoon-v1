// Part C/D/J -- server-side enforcement of the slot registry. Every write
// path (draft update, publish) runs through validateSlotValue before
// anything touches the database. This is the actual boundary that keeps
// the CMS from ever sending arbitrary layout/CSS/code -- the registry
// declares what's possible, this file is what actually refuses the rest.
import type { SlotDefinition, VisualTokenAxis } from './slot-registry'
import { VISUAL_TOKEN_VALUES } from './slot-registry'

export class SlotValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SlotValidationError'
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const assertString = (value: unknown, field: string, maxLength?: number, minLength?: number) => {
  if (typeof value !== 'string') throw new SlotValidationError(`${field} deve ser texto.`)
  if (minLength !== undefined && value.trim().length < minLength) {
    throw new SlotValidationError(`${field} deve ter ao menos ${minLength} caractere(s).`)
  }
  if (maxLength !== undefined && value.length > maxLength) {
    throw new SlotValidationError(`${field} excede o limite de ${maxLength} caracteres.`)
  }
}

const assertUrl = (value: unknown, field: string, maxLength: number) => {
  if (value === '' || value === null || value === undefined) return
  assertString(value, field, maxLength)
  try {
    const parsed = new URL(value as string)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new SlotValidationError(`${field} deve usar http(s).`)
    }
  } catch {
    throw new SlotValidationError(`${field} nao e uma URL valida.`)
  }
}

export interface AssetLookup {
  (assetId: string): { id: string; category: string } | undefined
}

export interface ReferenceLookup {
  (kind: string, entryId: string): boolean
}

// Validates the leaf value of a single typed field (used both for a plain
// slot and for each field inside an ORDERED_LIST's itemShape).
function validateTyped(
  type: SlotDefinition['type'],
  value: unknown,
  field: string,
  constraints: SlotDefinition['constraints'],
  assets: AssetLookup
) {
  switch (type) {
    case 'TEXT':
    case 'RICH_TEXT_LIMITED':
      assertString(value, field, constraints.maxLength)
      return
    case 'LINK':
      assertUrl(value, field, constraints.maxLength ?? 512)
      return
    case 'BOOLEAN':
      if (typeof value !== 'boolean') throw new SlotValidationError(`${field} deve ser verdadeiro/falso.`)
      return
    case 'DATE_TIME':
      if (value !== null && Number.isNaN(Date.parse(String(value)))) {
        throw new SlotValidationError(`${field} deve ser uma data valida.`)
      }
      return
    case 'COLOR_TOKEN':
    case 'FONT_TOKEN':
      // Bare token slots aren't used standalone today (tokens ride on
      // visualTokens instead) but are validated the same way if ever used.
      assertString(value, field, 40)
      return
    case 'REFERENCE': {
      if (value === null) return
      if (typeof value !== 'string') throw new SlotValidationError(`${field} deve referenciar um id.`)
      if (constraints.referenceKind === 'LAUNCHER_ASSET' && !assets(value)) {
        throw new SlotValidationError(`${field} referencia um asset inexistente.`)
      }
      return
    }
    case 'IMAGE': {
      if (value === null) return
      if (typeof value !== 'string') throw new SlotValidationError(`${field} deve referenciar um asset de imagem.`)
      const asset = assets(value)
      if (!asset) throw new SlotValidationError(`${field} referencia um asset inexistente.`)
      return
    }
    default:
      throw new SlotValidationError(`Tipo de slot desconhecido para ${field}.`)
  }
}

export function validateVisualTokenOverrides(
  slot: SlotDefinition,
  overrides: unknown
): Record<string, string> | undefined {
  if (overrides === undefined || overrides === null) return undefined
  if (!isPlainObject(overrides)) {
    throw new SlotValidationError(`${slot.id}: tokens visuais devem ser um objeto.`)
  }
  const result: Record<string, string> = {}
  for (const [axis, value] of Object.entries(overrides)) {
    if (!slot.visualTokens.includes(axis as VisualTokenAxis)) {
      throw new SlotValidationError(`${slot.id}: eixo de token "${axis}" nao permitido para este slot.`)
    }
    const allowed = VISUAL_TOKEN_VALUES[axis as VisualTokenAxis]
    if (typeof value !== 'string' || !allowed.includes(value)) {
      throw new SlotValidationError(`${slot.id}: valor de token invalido para "${axis}".`)
    }
    result[axis] = value
  }
  return result
}

// Full value for a slot is always `{ value: <typed content>, tokens?: {...} }`
// -- kept as one JSON blob per LauncherSlotContent row, but the two parts
// are validated independently so a bad token can never smuggle in through
// the content field or vice versa.
export function validateSlotValue(
  slot: SlotDefinition,
  input: unknown,
  assets: AssetLookup
): { value: unknown; tokens?: Record<string, string> } {
  if (!isPlainObject(input)) {
    throw new SlotValidationError(`${slot.id}: corpo invalido -- esperado { value, tokens? }.`)
  }
  const { value, tokens } = input as { value: unknown; tokens?: unknown }
  const tokenResult = validateVisualTokenOverrides(slot, tokens)

  if (slot.type === 'ORDERED_LIST') {
    if (!Array.isArray(value)) throw new SlotValidationError(`${slot.id}: valor deve ser uma lista.`)
    const maxItems = slot.constraints.maxItems ?? Infinity
    const minItems = slot.constraints.minItems ?? 0
    if (value.length > maxItems) throw new SlotValidationError(`${slot.id}: maximo de ${maxItems} item(ns).`)
    if (value.length < minItems) throw new SlotValidationError(`${slot.id}: minimo de ${minItems} item(ns).`)
    const shape = slot.constraints.itemShape ?? {}
    value.forEach((item, index) => {
      if (!isPlainObject(item)) throw new SlotValidationError(`${slot.id}[${index}]: item invalido.`)
      for (const [key, fieldType] of Object.entries(shape)) {
        if (!(key in item)) {
          if (fieldType === 'BOOLEAN') continue
          throw new SlotValidationError(`${slot.id}[${index}].${key} e obrigatorio.`)
        }
        validateTyped(fieldType, item[key], `${slot.id}[${index}].${key}`, slot.constraints, assets)
      }
      const extraKeys = Object.keys(item).filter((key) => !(key in shape))
      if (extraKeys.length > 0) {
        throw new SlotValidationError(`${slot.id}[${index}]: campo(s) nao permitido(s): ${extraKeys.join(', ')}.`)
      }
    })
    return { value, tokens: tokenResult }
  }

  if (slot.required && (value === null || value === undefined || value === '')) {
    throw new SlotValidationError(`${slot.id} e obrigatorio.`)
  }
  if (value !== null || slot.required) {
    validateTyped(slot.type, value, slot.id, slot.constraints, assets)
  }
  return { value, tokens: tokenResult }
}
