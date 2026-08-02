import { AppSettings, DEFAULT_SETTINGS } from './types'

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Overlay a stored (possibly partial) config over DEFAULT_SETTINGS.
 *  Object sub-sections are shallow-merged; array/scalar sub-values are replaced. */
export function mergeSettings(stored: unknown): AppSettings {
  if (!isPlainObject(stored)) return structuredClone(DEFAULT_SETTINGS)
  const result = structuredClone(DEFAULT_SETTINGS)
  for (const key of Object.keys(result) as (keyof AppSettings)[]) {
    const incoming = (stored as Record<string, unknown>)[key]
    if (incoming === undefined) continue
    const base = result[key]
    if (isPlainObject(base) && isPlainObject(incoming)) {
      result[key] = { ...(base as object), ...(incoming as object) } as never
    } else {
      result[key] = incoming as never
    }
  }
  return result
}
