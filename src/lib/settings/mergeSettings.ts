import { AppSettings, DEFAULT_SETTINGS } from './types'

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Recursively overlay incoming values over a base object.
 *  Plain objects are merged key-by-key over the UNION of base and incoming keys (recursing
 *  when both sides are plain objects); arrays and scalars are replaced wholesale when provided;
 *  undefined incoming keeps base; a non-object incoming falls back to the base when the base is
 *  a plain object.
 *  Tradeoff: because we walk the union (not just base keys), unknown top-level keys in `stored`
 *  that don't exist in DEFAULT_SETTINGS survive into the result instead of being stripped. This
 *  is intentional -- it's required so Record-shaped sections (e.g. scanActions.overrides, whose
 *  default is `{}`) keep arbitrary incoming entries -- and is safe because all consumers read
 *  typed fields only. */
function deepMerge<T>(base: T, incoming: unknown): T {
  if (!isPlainObject(base)) return (incoming === undefined ? base : (incoming as T))
  if (!isPlainObject(incoming)) return base
  const result = { ...(base as Record<string, unknown>) }
  const keys = new Set([...Object.keys(result), ...Object.keys(incoming)])
  for (const key of keys) {
    const baseValue = result[key]
    const incomingValue = incoming[key]
    if (incomingValue === undefined) continue
    result[key] = isPlainObject(baseValue)
      ? deepMerge(baseValue, incomingValue)
      : structuredClone(incomingValue)
  }
  return result as T
}

/** Overlay a stored (possibly partial) config over DEFAULT_SETTINGS.
 *  Object sub-sections are deep-merged; array/scalar sub-values are replaced. */
export function mergeSettings(stored: unknown): AppSettings {
  if (!isPlainObject(stored)) return structuredClone(DEFAULT_SETTINGS)
  return deepMerge(structuredClone(DEFAULT_SETTINGS), stored)
}
