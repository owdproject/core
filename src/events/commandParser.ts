export function shellEscape(str: string): string {
  if (str === '') {
    return "''"
  }
  return `${str.replace(/'/g, `'\\''`)}`
}

export function padEnd(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length)
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

export function parseCommandLine(input: string): { name: string; args: string[] } {
  const trimmed = input.trim()
  if (!trimmed) {
    return { name: '', args: [] }
  }
  const [name = '', ...args] = trimmed.split(/\s+/)
  return { name, args }
}
