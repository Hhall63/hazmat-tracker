import { AppSettings, DEFAULT_SETTINGS } from './types'

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Recursively overlay incoming values over a base object.
 *  Plain objects are merged key-by-key (recursing when both sides are plain objects);
 *  arrays and scalars are replaced wholesale when provided; undefined incoming keeps base;
 *  a non-object incoming falls back to the base when the base is a plain object. */
function deepMerge<T>(base: T, incoming: unknown): T {
  if (!isPlainObject(base)) return (incoming === undefined ? base : (incoming as T))
  if (!isPlainObject(incoming)) return base
  const result = { ...(base as Record<string, unknown>) }
  for (const key of Object.keys(result)) {
    const baseValue = result[key]
    const incomingValue = incoming[key]
    if (incomingValue === undefined) continue
    result[key] = isPlainObject(baseValue)
      ? deepMerge(baseValue, incomingValue)
      : incomingValue
  }
  return result as T
}

/** Overlay a stored (possibly partial) config over DEFAULT_SETTINGS.
 *  Object sub-sections are deep-merged; array/scalar sub-values are replaced. */
export function mergeSettings(stored: unknown): AppSettings {
  if (!isPlainObject(stored)) return structuredClone(DEFAULT_SETTINGS)
  return deepMerge(structuredClone(DEFAULT_SETTINGS), stored)
}
