// THE WRAPPED FLAIR (spec §5.9b–c, record 271): the hero window's power-on, its circuit, and the wrap headline's entrance.
// The awards deck's B1 power-on, shortened for a web page: about 5 s, once per load, never looped. See css/flair.css for the look.
// - The mark is IN THE MARKUP (index.html, manual D1), so with no script the page still shows the filled mark on a lit image.
//   This file only adds the unpowered classes and steps them, per the §5.9b table.
// - A tap, click or key at any moment jumps to the end state (§5.13's rule). Once the power-on is over, its listeners are gone.
// - Standby: one pulse on one live trace every 9 s, taking turns, never two at once, skipped while the tab is hidden.
// - Reduced motion: the end state at once, no pulses, no standby timer (spec §8).
// CSP (style-src 'self'): styles are set through the CSSOM (el.style.x) or classes only; never a style attribute, never a <style>.

const NS = 'http://www.w3.org/2000/svg'
const PAD_LIT = 1800   // a pad lights on a pulse's arrival and settles after 1.8 s (§5.9b)
const STANDBY = 9000

const svgEl = (tag, attrs = {}, cls) => {
  const n = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
  if (cls) n.setAttribute('class', cls)
  return n
}

// Traces carry current INTO the window from the right side of the page (from 1180px, where there is paper to cross).
// Long straight runs, 45° bends, pads where a trace meets the frame, vias at the dim ends: the awards deck's reveal circuit.
// Every trace stays right of the window and enters it only at its frame, so nothing crosses the window or the top bar's logo.
function buildCircuit(hero) {
  const svg = svgEl('svg', { 'aria-hidden': 'true', focusable: 'false' }, 'wcircuit')
  hero.append(svg)
  let live = []
  function layout() {
    svg.replaceChildren()
    live = []
    const win = hero.querySelector('.whero-win')
    const r = win.getBoundingClientRect(), hr = hero.getBoundingClientRect()
    const W = document.documentElement.clientWidth
    const top = -72, H = r.height + 72 + 48
    svg.setAttribute('width', W); svg.setAttribute('height', H)
    svg.style.left = `${-hr.left}px`; svg.style.top = `${top}px`
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    const L = r.left, R = r.right, T = -top, B = T + r.height, w = r.width, h = r.height
    if (W - R < 60) return   // no paper to cross: no circuit
    const caps = []
    // Every trace is a list of points; its end is the last point (a pad on the frame, or a via in the paper).
    const mk = (pts, kind, end) => {
      const d = 'M ' + pts.map((q) => q.join(' ')).join(' L ')
      const [ex, ey] = pts[pts.length - 1]
      svg.append(svgEl('path', { d, pathLength: '100' }, `t ${kind}`))
      const cap = svgEl('circle', { cx: ex, cy: ey, r: end === 'via' ? 5 : 4.5 }, end)
      if (kind === 'live') { const p = svgEl('path', { d, pathLength: '100' }, 'pulse'); svg.append(p); live.push({ p, pad: cap }) }
      caps.push(cap)
    }
    const xR = W + 4, j = 28
    // live 1: from the right edge, into the frame's right side at 40% of its height
    let y0 = T + h * 0.22, y1 = T + h * 0.40
    mk([[xR, y0], [R + 64 + (y1 - y0), y0], [R + 64, y1], [R, y1]], 'live', 'pad')
    // live 2: from the top right, into the frame's top at 84% of its width
    const xt = L + w * 0.84
    mk([[xR, T - 44], [xt + 28, T - 44], [xt, T - 16], [xt, T]], 'live', 'pad')
    // live 3: from below on the right, into the frame's right side at 78%
    y0 = B + 36; y1 = T + h * 0.78
    mk([[xR, y0], [R + 40 + (y0 - y1), y0], [R + 40, y1], [R, y1]], 'live', 'pad')
    // dim texture (22%): two end on vias in the paper, one on an unlit pad at the frame
    mk([[xR, T + h * 0.30], [R + 110, T + h * 0.30]], 'dim', 'via')
    y0 = T + h * 0.58
    mk([[xR, y0], [R + 60 + j, y0], [R + 60, y0 + j], [R, y0 + j]], 'dim', 'pad')
    mk([[xR, T + h * 0.92], [R + 150, T + h * 0.92]], 'dim', 'via')
    svg.append(...caps)   // the caps sit above the traces
  }
  layout()
  let raf = 0
  const soon = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; layout() }) }
  addEventListener('resize', soon)
  new ResizeObserver(soon).observe(hero)   // the hero's width moves with a scrollbar too, not only with a resize
  return {
    /** Run one pulse along live trace i (after `delay` s); its pad lights on arrival. */
    pulse(i, delay = 0) {
      const o = live[i % (live.length || 1)]
      if (!o) return
      o.p.classList.remove('go'); void o.p.getBBox(); o.p.style.animationDelay = `${delay}s`; o.p.classList.add('go')
      o.p.addEventListener('animationend', () => {
        o.p.classList.remove('go')
        o.pad.classList.add('lit'); setTimeout(() => o.pad.classList.remove('lit'), PAD_LIT)
      }, { once: true })
    },
    /** Stop every pulse in flight (an early end). */
    stop() { svg.querySelectorAll('.pulse.go').forEach((p) => p.classList.remove('go')) },
    get running() { return !!svg.querySelector('.pulse.go') },
  }
}

/** @param {{reduce:boolean}} opts */
export function startFlair({ reduce }) {
  const hero = document.querySelector('.whero')
  if (!hero) return
  const block = document.querySelector('.wrapblock')
  const run = hero.querySelector('.whero-mark .run')
  const circuit = buildCircuit(hero)
  const STEPS = ['s-ring', 's-bars', 's-lights', 'on']
  const timers = []
  const at = (s, fn) => timers.push(setTimeout(fn, s * 1000))
  let done = false
  const end = () => { done = true; removeEventListener('pointerdown', early); removeEventListener('keydown', early) }
  const finish = () => {
    timers.forEach(clearTimeout)
    hero.classList.add(...STEPS)
    hero.classList.remove('off')
    block?.classList.remove('enter', 'charge')
    if (run) run.style.opacity = '0'
  }
  // A tap, click or key during the power-on: the end state at once (manual D4: the image keeps its 1.1 s ease).
  function early() { if (done) return; hero.classList.add('skip'); block?.classList.add('skip'); circuit.stop(); finish(); end() }

  if (reduce) { finish(); return }   // the end state at once; no pulses, no standby timer

  // The unpowered state goes on WITHOUT transitions. The page has already been laid out lit (main.js measures it, and so does the
  // circuit, before this line), so a transition from there would fade the lit end state DOWN before powering it on. Check 4,
  // run 1, caught exactly that: brightness .82 and the ring at .95 at 0.02 s. One style pass with transitions off, then they return.
  hero.classList.add('notx', 'off')
  block?.classList.add('notx', 'enter', 'charge')
  void hero.offsetWidth
  hero.classList.remove('notx'); block?.classList.remove('notx')
  addEventListener('pointerdown', early)
  addEventListener('keydown', early)
  at(0.06, () => { circuit.pulse(0, 0); circuit.pulse(1, 0.25); circuit.pulse(2, 0.5) })
  at(0.3, () => block?.classList.remove('enter'))
  at(0.9, () => {
    hero.classList.add('s-ring')
    if (!run) return
    run.style.opacity = '1'
    run.animate([{ strokeDashoffset: 6 }, { strokeDashoffset: -100 }], { duration: 1300, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' })
      .finished.then(() => { run.style.opacity = '0' })
  })
  at(2.1, () => hero.classList.add('s-bars'))
  at(2.6, () => block?.classList.remove('charge'))
  at(2.8, () => hero.classList.add('s-lights'))
  at(4.8, () => { hero.classList.add('on'); hero.classList.remove('off'); end() })

  // STANDBY: one pulse on one live trace every 9 s, taking turns; never while another runs, never while hidden.
  let k = 0
  setInterval(() => { if (done && !document.hidden && !circuit.running) circuit.pulse(k++) }, STANDBY)
}
