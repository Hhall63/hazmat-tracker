// Kept out of route.ts on purpose: Next.js route modules may only export HTTP
// handlers + route config, so shared helpers live in a sibling module.
export const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
export const MAX_BYTES = 2 * 1024 * 1024

export function validateUpload(type: string, size: number): string | null {
  if (!ALLOWED.includes(type)) return 'Unsupported file type'
  if (size > MAX_BYTES) return 'File too large (max 2 MB)'
  return null
}
