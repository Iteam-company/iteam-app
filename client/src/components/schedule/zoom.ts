import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
} from 'react'

// ── Zoom model ────────────────────────────────────────────────────────────────
//
// One continuous value drives all three views:
//
//   0 ── year ──── 1 ── month ──── 2 ── week
//
// Fractional values are mid-gesture. Each level sits at scale 1 / opacity 1 when
// `zoom` lands on it and fades as `zoom` moves away. Neighbouring levels meet at
// the same scale halfway between them, so the crossfade reads as one surface
// being magnified rather than two views swapping.
//
// The zoom value deliberately lives OUTSIDE React state. Re-rendering three
// calendar grids (the year view alone is 365 nodes) on every animation frame
// drops frames; instead each frame writes transform/opacity straight to the
// layer elements, and snapping hands off to a CSS transition that the compositor
// runs on its own. React state only tracks the settled level, which changes at
// most once per gesture.

export const YEAR = 0
export const MONTH = 1
export const WEEK = 2
export const LEVELS = [YEAR, MONTH, WEEK] as const

export type Level = typeof LEVELS[number]

/** Subtle — the fade should carry the transition, not the scaling. */
const SCALE_SPREAD = 0.16
/** Resistance past the first/last level, so the ends feel elastic. */
const RUBBER = 0.25
/** Trackpad pinch travel → zoom levels. */
const WHEEL_SENSITIVITY = 0.012
/** Settle delay after the last wheel event (wheel pinch has no "end" event). */
const WHEEL_SETTLE_MS = 120
/** Long, soft ease-out — the shape iOS uses for view transitions. */
const SNAP_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'
const SNAP_MS = 460
const LAYER_TRANSITION =
  `opacity ${SNAP_MS}ms ${SNAP_EASE}, transform ${SNAP_MS}ms ${SNAP_EASE}`

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** s(x) + s(1-x) === 1, so the two active layers always sum to full opacity. */
const smoothstep = (p: number) => p * p * (3 - 2 * p)

export function useZoomLayers(initial: Level) {
  const zoomRef = useRef<number>(initial)
  const layerRefs = useRef<Array<HTMLDivElement | null>>([])
  const [level, setLevel] = useState<Level>(initial)

  /** Write the zoom straight to the DOM — no React render involved. */
  const paint = useCallback((z: number, animate: boolean) => {
    zoomRef.current = z

    for (const lvl of LEVELS) {
      const el = layerRefs.current[lvl]
      if (!el) continue

      const d = z - lvl
      const dist = Math.abs(d)
      const visible = dist < 1

      el.style.transition = animate ? LAYER_TRANSITION : 'none'
      el.style.transform = `scale(${(1 + d * SCALE_SPREAD).toFixed(4)})`
      el.style.opacity = visible ? smoothstep(1 - dist).toFixed(4) : '0'
      // visibility (not display) keeps the layer out of the tab order and off
      // the paint list without forcing a re-layout when it comes back.
      el.style.visibility = visible ? 'visible' : 'hidden'
      // Only the front-most layer is interactive, so a half-faded view can
      // never swallow a click.
      el.style.pointerEvents = dist < 0.5 ? 'auto' : 'none'
    }
  }, [])

  /** Ease to the nearest level and let CSS run the animation. */
  const snap = useCallback((from?: number) => {
    const target = clamp(Math.round(from ?? zoomRef.current), YEAR, WEEK) as Level
    paint(target, true)
    setLevel(target)
  }, [paint])

  // Position the layers before first paint, so nothing flashes stacked.
  useLayoutEffect(() => { paint(zoomRef.current, false) }, [paint])

  return { zoomRef, layerRefs, level, paint, snap }
}

/**
 * Pinch-to-zoom over `ref`, covering all three ways a browser reports it:
 *  - Safari fires the non-standard gesture* events
 *  - Chrome/Edge/Firefox report a trackpad pinch as wheel + ctrlKey
 *  - touch screens give us two touch points to measure directly
 */
export function usePinchZoom(
  ref: React.RefObject<HTMLElement | null>,
  ctl: ReturnType<typeof useZoomLayers>,
) {
  const { zoomRef, paint, snap } = ctl

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let settleTimer: ReturnType<typeof setTimeout> | null = null
    let gestureStartZoom = 0
    let pinchStartDist = 0

    // Elastic past the ends instead of a hard stop.
    const withRubber = (z: number) => {
      if (z < YEAR) return YEAR + (z - YEAR) * RUBBER
      if (z > WEEK) return WEEK + (z - WEEK) * RUBBER
      return z
    }

    const settleSoon = () => {
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(() => snap(), WHEEL_SETTLE_MS)
    }

    // ── trackpad pinch (Chrome/Edge/Firefox) ────────────────────────────────
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return          // plain scroll — leave it alone
      e.preventDefault()
      paint(withRubber(zoomRef.current - e.deltaY * WHEEL_SENSITIVITY), false)
      settleSoon()
    }

    // ── trackpad pinch (Safari) ─────────────────────────────────────────────
    const onGestureStart = (e: Event) => {
      e.preventDefault()
      gestureStartZoom = zoomRef.current
    }
    const onGestureChange = (e: Event) => {
      e.preventDefault()
      const scale = (e as Event & { scale: number }).scale
      if (!scale) return
      paint(withRubber(gestureStartZoom + Math.log2(scale)), false)
    }
    const onGestureEnd = (e: Event) => { e.preventDefault(); snap() }

    // ── touch pinch ─────────────────────────────────────────────────────────
    const distance = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      )

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      pinchStartDist = distance(e.touches)
      gestureStartZoom = zoomRef.current
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchStartDist) return
      e.preventDefault()
      // Doubling the finger spread advances exactly one level.
      paint(withRubber(gestureStartZoom + Math.log2(distance(e.touches) / pinchStartDist)), false)
    }
    const onTouchEnd = () => {
      if (!pinchStartDist) return
      pinchStartDist = 0
      snap()
    }

    // passive:false — these need preventDefault to stop the browser zooming the
    // page instead of our calendar.
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('gesturestart', onGestureStart as EventListener)
    el.addEventListener('gesturechange', onGestureChange as EventListener)
    el.addEventListener('gestureend', onGestureEnd as EventListener)
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      if (settleTimer) clearTimeout(settleTimer)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('gesturestart', onGestureStart as EventListener)
      el.removeEventListener('gesturechange', onGestureChange as EventListener)
      el.removeEventListener('gestureend', onGestureEnd as EventListener)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [ref, zoomRef, paint, snap])
}
