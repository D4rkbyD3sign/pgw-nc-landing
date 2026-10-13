// THE RUNWAY (spec §5.7, revised 13 Oct): Gold Plus → Gold → GDA, a real horizontal scroller whose slow drift is driven
// by script, so a person can take over: swipe (phone), drag (mouse, 1:1), sideways trackpad, and ← → arrows.
// Any touch, drag, wheel, focus, hover or arrow pauses the drift; it resumes 2.5s after the last one.
// Endless both ways: two identical lists side by side, and the position wraps at one list's width. When a wrap jumps
// during a drag or an arrow glide, the anchor moves with it (a native smooth scrollBy gets cancelled at the seam).
// ⛔ The vertical mouse wheel does NOT drive the strip: it never ends, so it would trap a page-scroller. Nothing here
// listens for a vertical wheel except to pause; the browser scrolls the page as it always does.
// Reduced motion: none of this runs. The CSS shows the static wrapped grid with no arrows.

const SPEED = 24        // px per second
const RESUME_MS = 2500
const GLIDE_MS = 420

/** @param {HTMLElement} strip the .runway scroller  @param {HTMLElement} nav the arrows' container */
export function startRunway(strip, nav) {
  const first = strip.querySelector('ul')
  let pos = 0, last = 0, holdUntil = 0, drag = null, anim = 0, hovering = false, focused = false
  const listWidth = () => first.getBoundingClientRect().width
  const wrap = () => {
    const h = listWidth()
    if (h > 0) {
      if (strip.scrollLeft >= h) strip.scrollLeft -= h
      else if (strip.scrollLeft <= 0) strip.scrollLeft += h
    }
    pos = strip.scrollLeft
  }
  const pause = () => { holdUntil = performance.now() + RESUME_MS }

  strip.scrollLeft = pos = 1   // just inside, so the first leftward swipe can wrap too
  const step = (t) => {
    const dt = last ? Math.min(64, t - last) : 0
    last = t
    if (!drag && !hovering && !focused && t > holdUntil && !document.hidden) {
      // ⛔ The position lives HERE, in a float. A 1x screen rounds scrollLeft to whole pixels, and one frame's drift is
      // ~0.4px: re-reading the rounded value every frame froze the strip (measured 0 px/s at device scale 1, 13 Oct).
      // Only a real jump (a person scrolled it) re-syncs the float from the strip.
      if (Math.abs(strip.scrollLeft - pos) > 2) pos = strip.scrollLeft
      pos += (SPEED * dt) / 1000
      const h = listWidth()
      if (h > 0) { if (pos >= h) pos -= h; else if (pos <= 0) pos += h }
      strip.scrollLeft = pos
    }
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)

  strip.addEventListener('scroll', () => { if (drag || performance.now() < holdUntil || hovering || focused) wrap() }, { passive: true })
  for (const ev of ['wheel', 'touchstart', 'touchmove']) strip.addEventListener(ev, pause, { passive: true })
  strip.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovering = true })
  strip.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hovering = false; pause() } })
  for (const host of [strip, nav]) {
    host.addEventListener('focusin', () => { focused = true })
    host.addEventListener('focusout', () => { focused = false; pause() })
  }

  // Mouse drag, 1:1 (touch scrolls natively).
  strip.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button) return
    drag = { x: e.clientX, left: strip.scrollLeft }
    strip.setPointerCapture(e.pointerId)
    pause()
  })
  strip.addEventListener('pointermove', (e) => {
    if (!drag) return
    const dx = e.clientX - drag.x
    if (Math.abs(dx) > 3) strip.classList.add('is-dragging')
    strip.scrollLeft = drag.left - dx
    const before = strip.scrollLeft
    wrap()
    drag.left += strip.scrollLeft - before   // a wrap jumped one list-width: move the anchor with it
    pause()
  })
  const end = () => { if (!drag) return; drag = null; strip.classList.remove('is-dragging'); pause() }
  strip.addEventListener('pointerup', end)
  strip.addEventListener('pointercancel', end)

  // The arrows: two tiles per press, 420ms ease-out, animated by hand with a wrap every frame.
  const tilePitch = () => {
    const li = first.querySelector('li')
    if (!li) return 0
    const cs = getComputedStyle(li)
    return li.getBoundingClientRect().width + parseFloat(cs.marginRight || '0')
  }
  const glide = (dir) => {
    pause()
    cancelAnimationFrame(anim)
    const dist = 2 * tilePitch()
    let from = strip.scrollLeft
    const t0 = performance.now()
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / GLIDE_MS)
      const e = 1 - Math.pow(1 - k, 3)
      strip.scrollLeft = from + dir * dist * e
      const before = strip.scrollLeft
      wrap()
      from += strip.scrollLeft - before
      pause()
      if (k < 1) anim = requestAnimationFrame(tick)
    }
    anim = requestAnimationFrame(tick)
  }
  nav.querySelector('[data-dir="prev"]').addEventListener('click', () => glide(-1))
  nav.querySelector('[data-dir="next"]').addEventListener('click', () => glide(1))
}
