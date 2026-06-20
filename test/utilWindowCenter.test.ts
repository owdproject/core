import { describe, expect, it } from 'vitest'
import {
  computeCenteredPosition,
  resolveDesktopWorkArea,
} from '../runtime/utils/utilWindowCenter'

describe('utilWindowCenter', () => {
  it('computeCenteredPosition centers within work area', () => {
    expect(
      computeCenteredPosition({ x: 0, y: 48, width: 1920, height: 1032 }, 448, 320),
    ).toEqual({ x: 736, y: 404 })
  })

  it('resolveDesktopWorkArea falls back to viewport when work area is empty', () => {
    const area = resolveDesktopWorkArea({ x: 0, y: 0, width: 0, height: 0 })
    expect(area.width).toBe(globalThis.innerWidth)
    expect(area.height).toBe(globalThis.innerHeight)
  })

  it('resolveDesktopWorkArea keeps measured work area when available', () => {
    const measured = { x: 0, y: 48, width: 800, height: 600 }
    expect(resolveDesktopWorkArea(measured)).toEqual(measured)
  })
})
