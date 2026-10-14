// THE TRACE (spec §5.15): PGW's ImplementAI mark grown into a structure. One lime line runs down the left gutter from
// the monitor to the door, and each section's node lights as you reach it. Input at the top, result at the bottom.
//
// Geometry: NETWORK (Adam, 12 Oct). The mark's own diagonal jogs (~34px) into each node; the line alternates between two
// lanes: 15% / 45% of the 40px gutter from 900px, 30% / 70% of the 20px gutter on phones. It lives in the GUTTER ONLY: an absolutely positioned SVG inside .page, exactly as
// wide as the gutter and clipped to it, so it can never cause sideways scroll or sit on content. Decorative: aria-hidden.

const NS = 'http://www.w3.org/2000/svg'
const JOG = 34
const DRAW_TO = 0.62   // the lit line draws to the point 62% down the viewport

/** @param {HTMLElement} page the .page element  @param {{reduce:boolean}} opts */
export function startTrace(page, { reduce }) {
  const svg = document.createElementNS(NS, 'svg')
  svg.classList.add('trace')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  const base = document.createElementNS(NS, 'path')
  const prog = document.createElementNS(NS, 'path')
  const dots = document.createElementNS(NS, 'g')
  base.classList.add('base')
  prog.classList.add('prog')
  svg.append(base, prog, dots)
  page.prepend(svg)

  let pts = [], samples = [], L = 0, pageTop = 0

  const visible = (e) => e.getClientRects().length > 0
  const anchorOf = (el) => (el.classList.contains('monitor') ? el
    : [...el.querySelectorAll('[data-anchor]')].find(visible) || el.querySelector('.eyebrow') || el)

  function build() {
    const ref = page.querySelector('.monitor')?.parentElement || page.querySelector('.wrap')
    const nodes = [...page.querySelectorAll('[data-node]')].filter(visible)
    if (!ref || !nodes.length) { svg.style.display = 'none'; return }
    svg.style.display = ''
    const pr = page.getBoundingClientRect()
    const rr = ref.getBoundingClientRect()
    const g = parseFloat(getComputedStyle(ref).paddingLeft) || 0   // the gutter: 20px on phones, 40px from 900px
    const H = page.offsetHeight
    pageTop = pr.top + scrollY
    svg.style.left = `${Math.round(rr.left - pr.left)}px`
    svg.setAttribute('width', String(g))
    svg.setAttribute('height', String(H))
    svg.setAttribute('viewBox', `0 0 ${g} ${H}`)
    // Lanes (spec §5.15, Nicole via Adam, option B, 13 Oct): 15% / 45% of the 40px gutter from 900px, so the near lane
    // sits 21.5px off the text; 30% / 70% of the 20px phone gutter, unchanged. Keyed on the gutter the CSS gives, as the mock.
    const lanes = (g >= 40 ? [0.15, 0.45] : [0.3, 0.7]).map((f) => Math.round(g * f) + 0.5)
    pts = nodes.map((e, i) => {
      const r = anchorOf(e).getBoundingClientRect()
      return {
        x: lanes[i % 2],
        y: Math.round(r.top - pr.top + r.height / 2) + 0.5,
        end: e.hasAttribute('data-end'),
        dark: e.classList.contains('monitor') || !!e.closest('.band--dark'),
      }
    })
    // A short horizontal "power lead" from the monitor's left edge (the gutter's right edge) into the first node.
    let d = `M ${g} ${pts[0].y} H ${pts[0].x}`
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i], j = Math.max(0, Math.min(JOG, (q.y - p.y) / 2))
      d += ` V ${q.y - j} L ${q.x} ${q.y}`
    }
    base.setAttribute('d', d)
    prog.setAttribute('d', d)
    L = prog.getTotalLength()
    prog.style.strokeDasharray = `${L} ${L}`
    samples = []
    for (let k = 0; k <= 400; k++) { const l = (L * k) / 400; samples.push([l, prog.getPointAtLength(l).y]) }
    dots.replaceChildren(...pts.map((p) => {
      const n = document.createElementNS(NS, 'g')
      if (p.dark) n.classList.add('on-dark')
      const r = p.end ? 5.5 : 3.4   // the door's node is the larger "terminal"
      const halo = document.createElementNS(NS, 'circle')
      halo.classList.add('halo')
      const dot = document.createElementNS(NS, 'circle')
      dot.classList.add('dot')
      for (const [c, rad] of [[halo, r + 6], [dot, r]]) { c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', rad) }
      n.append(halo, dot)
      return n
    }))
    update()
  }

  function update() {
    if (!pts.length) return
    // At the page bottom everything is lit; under reduced motion it is fully drawn and still.
    const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 2
    const target = reduce || atEnd ? Infinity : scrollY - pageTop + innerHeight * DRAW_TO
    let drawn = L
    if (target !== Infinity) { const s = samples.find(([, y]) => y >= target); drawn = s ? s[0] : L }
    prog.style.strokeDashoffset = String(L - drawn)
    ;[...dots.children].forEach((n, i) => n.classList.toggle('lit', pts[i].y <= target))
  }

  // Recompute on resize, content-height changes, fonts loaded and state changes (pgw:layout: the load-in, the theatre,
  // a bio or a definition opening all fire it).
  let raf = 0
  const soon = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; build() }) }
  new ResizeObserver(soon).observe(page)
  addEventListener('resize', soon)
  addEventListener('pgw:layout', soon)
  addEventListener('load', soon)
  document.fonts?.ready.then(soon)
  let sraf = 0
  addEventListener('scroll', () => { if (!sraf) sraf = requestAnimationFrame(() => { sraf = 0; update() }) }, { passive: true })
  build()
}
