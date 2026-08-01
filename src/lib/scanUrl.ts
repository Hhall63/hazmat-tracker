export function tankScanPath(id: string): string {
  return `/scan/tank/${id}`
}

export function equipmentScanPath(id: string): string {
  return `/scan/equipment/${id}`
}

export function problemScanPath(): string {
  return '/scan/problem'
}

export function toAbsoluteUrl(path: string, origin: string): string {
  return `${origin.replace(/\/$/, '')}${path}`
}
