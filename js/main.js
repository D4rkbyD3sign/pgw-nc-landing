// Boot: load the skin, resolve state, load the app's data, render. Spec §2 is the spine of every branch.
import { skin } from '../skin/2026.js'
import { resolveState, clockAt } from './state.js'
import { loadData } from './data.js'

const copy = skin.copy
const $ = (sel, root = document) => root.querySelector(sel)
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') e.className = v
    else if (k === 'text') e.textContent = v
    else e.setAttribute(k, v === true ? '' : v)
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) e.append(c)
  return e
}
const path = (obj, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
const slot = (name) => $(`[data-slot="${name}"]`)
const paragraphs = (text) => text.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean)

// ============ which sections each clock state shows (spec §2.4) ============
// ⭐ Reversible call 4 (partners stay on WRAPPED) is the single 'partners' entry in the wrapped list.
const SECTIONS = {
  before: ['topbar', 'hero', 'stage', 'intro', 'plan', 'where', 'bring', 'partners', 'speakers', 'questions', 'footer'],
  live: ['topbar', 'hero', 'stage', 'intro', 'plan', 'where', 'bring', 'partners', 'speakers', 'questions', 'footer'],
  wrapped: ['topbar', 'wrap', 'partners', 'footer'],
}

// ============ app links: the ONLY place one is ever created ============
// ⛔ Spec §9: no dead app link while appOpen is false. Every caller checks state.appOpen first; this helper
// refuses as well, so a future caller cannot slip one in.
function appLink(state, label, kind) {
  if (!state.appOpen) throw new Error('appLink called while appOpen is false')
  return el('a', { class: `pill pill--${kind}`, href: skin.appUrl }, label)
}

// ============ video: click-to-play + THEATRE on play (spec §5.4, manual Revision 2) ============
// One component for the trailer and the WRAPPED highlights video. Everything a host needs lives in its
// data-attributes, so the poster can be rebuilt on close with nothing bound to it: clicks are handled by
// ONE delegated listener (bindVideo below). A listener bound to the play button would die with the
// first poster it was bound to (seen in mock v4).
function videoHost({ id, playLabel, playAria, iframeTitle }) {
  const host = el('div', { class: 'video', 'data-video': id, 'data-iframe-title': iframeTitle, 'data-play-label': playLabel || '', 'data-play-aria': playAria || '' })
  host.append(poster(host))
  return host
}

function poster(host) {
  const { video: id, playLabel, playAria } = host.dataset
  return el('div', { class: 'video-card' },
    el('img', { src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, alt: '', loading: 'lazy', decoding: 'async' }),
    el('button', { class: 'play', type: 'button', 'data-action': 'play', 'aria-label': playAria || null },
      el('i', { 'aria-hidden': 'true' }), playLabel ? el('span', { text: playLabel }) : null))
}

let videoBusy = false
/** Run a DOM change as a View Transition where supported; instantly under reduced motion or without the API.
 *  `after` runs once the change has SETTLED (focus moves wait for it: spec §5.4). */
function transition(mutate, after) {
  if (reduceMotion || typeof document.startViewTransition !== 'function') {
    mutate()
    requestAnimationFrame(() => { after(); videoBusy = false })
    return
  }
  const vt = document.startViewTransition(mutate)
  vt.finished.then(after, after).finally(() => { videoBusy = false })
}

function openVideo(host) {
  if (videoBusy || host.classList.contains('is-open')) return
  videoBusy = true
  const stage = host.closest('.stage')
  transition(() => {
    // Click-to-play: no YouTube iframe, and so no cookies, until the reader asks.
    host.classList.add('is-open')
    stage?.classList.add('is-theatre')
    host.replaceChildren(
      el('div', { class: 'close-row' }, el('button', { class: 'pill pill--quiet close-video', type: 'button', 'data-action': 'close' }, copy.trailer.close)),
      el('iframe', {
        src: `https://www.youtube-nocookie.com/embed/${host.dataset.video}?autoplay=1&rel=0`,
        title: host.dataset.iframeTitle,
        allow: 'autoplay; encrypted-media; picture-in-picture',
        allowfullscreen: true,
      }),
    )
  }, () => {
    host.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'instant' : 'smooth' })
    $('[data-action="close"]', host)?.focus({ preventScroll: true })
  })
}

function closeVideo(host) {
  if (videoBusy || !host.classList.contains('is-open')) return
  videoBusy = true
  transition(() => {
    // Removing the iframe stops the video. The poster comes back fresh.
    host.classList.remove('is-open')
    host.closest('.stage')?.classList.remove('is-theatre')
    host.replaceChildren(poster(host))
  }, () => $('[data-action="play"]', host)?.focus({ preventScroll: true }))
}

function bindVideo() {
  // ⛔ The ONE delegated click listener for every video on the page (Revision 2), and the map's tap (§5.12).
  document.addEventListener('click', (e) => {
    const mapBtn = e.target.closest('[data-action="map"]')
    if (mapBtn) {
      const card = mapBtn.closest('[data-map]')
      if (card && !card.classList.contains('is-loaded')) loadMap(card)
      return
    }
    const btn = e.target.closest('[data-action="play"], [data-action="close"]')
    const host = btn?.closest('.video[data-video]')
    if (!host) return
    if (btn.dataset.action === 'play') openVideo(host)
    else closeVideo(host)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    const host = $('.video.is-open')
    if (host) closeVideo(host)
  })
}

/** "ImplementAI" with the lime bar under "AI": the hero's mark, reused on the wrap headline. */
function withAiMark(text) {
  const word = copy.title.lead + copy.title.mark
  const at = text.indexOf(word)
  if (at < 0) return [document.createTextNode(text)]
  const markAt = at + copy.title.lead.length
  return [
    document.createTextNode(text.slice(0, markAt)),
    el('span', { class: 'ai', text: copy.title.mark }),
    document.createTextNode(text.slice(markAt + copy.title.mark.length)),
  ]
}

function youTubeId(url) {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^(www|m)\./, '')
    let id = null
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0]
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/) || [])[1]
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : null
  } catch {
    return null
  }
}

// ============ sections ============
function renderTopbar(state) {
  // Touchpoint A (spec §2.3). ⭐ Reversible call 2 lives in this one branch:
  // the app pill shows only when the app is open, and never on WRAPPED (its one door is the wrap block).
  if (state.appOpen && state.clock !== 'wrapped') slot('topbar-app').append(appLink(state, copy.app.topbar, 'quiet'))
}

/** Hero facts derived from the app's data: the when-line and the tagline. Absent if the data is. */
function renderHeroFacts(data) {
  if (data?.conference && data.CONFERENCE_TZ) {
    const days = data.conference.days
    const fmt = (iso, opts) => new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', ...opts }).format(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)))
    const first = days[0].date, last = days[days.length - 1].date // index, not Array at(): that needs iOS 15.4+ (Wren N-2)
    const sameMonth = first.slice(0, 7) === last.slice(0, 7)
    const dates = first === last ? fmt(first, { day: 'numeric', month: 'long' })
      : sameMonth ? `${+first.slice(8)}–${fmt(last, { day: 'numeric', month: 'long' })}`
      : `${fmt(first, { day: 'numeric', month: 'long' })} – ${fmt(last, { day: 'numeric', month: 'long' })}`
    slot('when').append(dates, ' ', el('span', { text: `· ${skin.city}` }))

    // The clock and the hero facts must agree (spec §6.1: same source). Announce any disagreement.
    const tzDate = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: data.CONFERENCE_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms)
    const dayAfter = (iso) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + 1)).toISOString().slice(0, 10)
    if (tzDate(Date.parse(skin.liveFrom)) !== first) console.error(`[skin] liveFrom is not on the app's first conference day (${first}).`)
    if (tzDate(Date.parse(skin.wrappedFrom)) !== dayAfter(last)) console.error(`[skin] wrappedFrom is not the midnight after the app's last conference day (${last}).`)
  } else slot('when').remove()

  if (data?.tagline) slot('tagline').textContent = data.tagline
  else slot('tagline').remove()
}

/** The hero parts that need no app data: the motif and the action (Touchpoint B). Rendered before the data step. */
function renderHeroShell(state) {
  slot('motif').innerHTML = skin.motif

  // Touchpoint B (spec §2.3). In LIVE the hero has NO action: the door moves to the countdown card.
  const action = slot('hero-action')
  if (state.clock === 'before') {
    if (state.appOpen) {
      action.append(appLink(state, copy.app.heroPill, 'lime'), el('small', { class: 'helper', text: copy.app.heroHelper }))
    } else if (state.appOpensOn) {
      // The pending line (spec §5.2): a sentence, not a control. Not a link, not focusable, not lime.
      // The date is held on one line (a span, so textContent stays exactly the sentence).
      const [pre, post] = copy.app.pending.split('{appOpensOn}')
      action.append(el('p', { class: 'pending' }, el('span', {}, pre, el('span', { class: 'nowrap', text: state.appOpensOn }), post)))
    } else {
      // No date (Adam, 8 Oct, option a): the same pending line, reading exactly "The conference app opens soon."
      action.append(el('p', { class: 'pending' }, el('span', { text: copy.app.pendingSoon })))
    }
  }
  if (!action.childElementCount) action.remove()
}

function renderStage(state) {
  slot('trailer').replaceWith(videoHost({ id: skin.trailerId, playLabel: copy.trailer.play, iframeTitle: copy.trailer.iframeTitle }))

  const card = slot('countdown')
  if (state.clock === 'live') {
    // Touchpoint C (spec §2.3): "We're live", plus the lime pill only when the app is open.
    card.classList.add('is-live')
    card.append(el('p', { class: 'live-h', text: copy.app.live }))
    if (state.appOpen) card.append(appLink(state, copy.app.heroPill, 'lime'))
    return
  }
  const unit = (name) => el('div', { class: 'tile' }, el('b', { 'data-unit': name, text: '--' }), el('span', { text: name }))
  card.append(
    el('p', { class: 'eyebrow', text: copy.mock.countdownEyebrow }),
    el('div', { class: 'tiles', role: 'timer', 'aria-label': copy.mock.timerAria, 'aria-live': 'off' }, unit('Days'), unit('Hrs'), unit('Min'), unit('Sec')),
    el('p', { class: 'cd-label', text: copy.countdownLabel }),
  )
}

function tickCountdown() {
  const tiles = $('.tiles')
  if (!tiles) return
  let s = Math.max(0, Math.floor((Date.parse(skin.liveFrom) - Date.now()) / 1000))
  const d = Math.floor(s / 86400); s -= d * 86400
  const h = Math.floor(s / 3600); s -= h * 3600
  const m = Math.floor(s / 60); s -= m * 60
  const pad = (n) => String(n).padStart(2, '0')
  const set = (unit, v) => { const b = $(`[data-unit="${unit}"]`, tiles); if (b.textContent !== v) { b.textContent = v; return true } return false }
  set('Days', pad(d)); set('Hrs', pad(h)); set('Min', pad(m))
  const sec = $('[data-unit="Sec"]', tiles)
  if (set('Sec', pad(s)) && !reduceMotion) { sec.classList.remove('tick'); void sec.offsetWidth; sec.classList.add('tick') }
}

function renderIntro() {
  const [open, body, close] = copy.intro
  slot('intro').append(el('p', { class: 'open', id: 'intro-open', text: open }), el('p', { text: body }), el('p', { class: 'close', text: close }))
}

function renderDays(data) {
  // Day cards (manual Revision 1): the day's FIRST session + every SOCIAL session, verbatim from the app.
  const days = data?.conference?.days
  if (days && data.sessions) {
    const toMin = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5)
    const grid = el('div', { class: 'grid2' })
    days.forEach((d, i) => {
      const ofDay = data.sessions.filter((s) => s.day === d.day).sort((a, b) => toMin(a.start) - toMin(b.start))
      if (!ofDay.length) return
      const rows = [ofDay[0], ...ofDay.slice(1).filter((s) => s.kind === 'SOCIAL')]
      const heading = (skin.dayHeadings?.[i] ?? '').trim()
      grid.append(el('article', { class: 'card day' },
        el('p', { class: 'day-label', text: `Day ${d.day} · ${d.label}` }),
        heading ? el('h3', { text: heading }) : null,
        el('ul', {}, ...rows.map((s) => el('li', { class: s.kind === 'SOCIAL' ? 'eve' : null }, el('time', { text: s.start }),
          el('span', { class: 'row-text' }, el('span', { text: s.title }), cruiseLine(s))))),
      ))
    })
    if (grid.childElementCount) slot('days').replaceWith(el('p', { class: 'lede', text: copy.labels.planLede }), grid)
    else slot('days').remove()
  } else slot('days').remove()
}

/** Spec §5.6: the departure line under the cruise row. The pier is that session's venue.name from the app (never
 *  typed); the wording is one skin string. Absent if the string is empty or the app gives no pier. */
function cruiseLine(s) {
  const tpl = (skin.cruiseDepartLine || '').trim()
  const pier = s.venue && typeof s.venue.name === 'string' ? s.venue.name.trim() : ''
  if (!tpl || s.id !== skin.cruiseSessionId || !pier) return null
  return el('span', { class: 'depart', text: tpl.replace('{pier}', pier) })
}

function renderCpd() {
  // PGW's own wording (CPD patch, 6 Oct): plain text, no inline link. The CPD Policy stays linked in the footer.
  slot('cpd').textContent = copy.cpd.text
}

function renderWhere(data) {
  if (!data?.venue) return $('[data-section="where"]').remove()
  const v = data.venue
  const venue = slot('venue')
  venue.append(el('div', { class: 'card venue-card' },
    el('div', { class: 'venue-info' },
      el('h3', { text: v.name }),
      el('address', { text: v.address }),
      el('a', { class: 'pill pill--quiet', href: v.mapUrl, rel: 'noopener' }, copy.mock.maps),
    ),
    skin.mapEmbedSrc ? mapPoster() : null,
  ))
  // ⭐ Reversible call 5, guard 1: the Getting there panel exists only once the skin has content.
  if (skin.gettingThere.trim()) {
    venue.classList.add('has-panel')
    venue.append(el('div', { class: 'panel prose' }, ...paragraphs(skin.gettingThere).map((t) => el('p', { text: t }))))
  }
}

// ============ map card, TAP-TO-LOAD (spec §5.12) ============
// ⛔ No request to Google before the tap: the poster is local (CSS grid + pin + text), and the iframe element is
// created only when the reader taps "Show map" — the same no-cookies-until-asked rule as the trailer (§5.4).
function mapPoster() {
  return el('div', { class: 'map-card', 'data-map': '' },
    el('span', { class: 'map-pin', 'aria-hidden': 'true' }),
    el('p', { class: 'map-line', text: copy.map.poster }),
    el('button', { class: 'pill pill--quiet', type: 'button', 'data-action': 'map' }, copy.map.show))
}
function loadMap(card) {
  const f = el('iframe', {
    src: skin.mapEmbedSrc,
    title: copy.map.title,
    loading: 'lazy',
    referrerpolicy: 'strict-origin-when-cross-origin',
    allowfullscreen: true,
  })
  card.classList.add('is-loaded')
  card.replaceChildren(f)   // instant swap: no animation in any motion setting (reduced motion: none required)
  f.focus()
}

function renderWear() {
  // What to wear (spec §3 item 7): cards in date order. ⭐ Content-gated: an empty list = the section is absent (§6.3).
  const items = Array.isArray(skin.whatToWear) ? skin.whatToWear.filter((w) => w && w.label && w.value) : []
  if (!items.length) return $('[data-section="bring"]').remove()
  slot('bring').append(...items.map((w) => el('div', { class: 'card wear-card' },
    el('p', { class: 'wear-label', text: w.label }), el('p', { class: 'wear-value', text: w.value }))))
}

function renderPartners(data) {
  if (!data?.partners) return $('[data-section="partners"]').remove()
  const host = slot('partners')
  const by = (tier) => data.partners.filter((p) => p.tier === tier)
  const logo = (p, alt) => {
    // ⛔ Never lazy (spec §5.7): ticker logos slide into view and would arrive blank.
    const img = el('img', { src: p.logo, alt, loading: 'eager', decoding: 'async' })
    img.addEventListener('error', () => img.replaceWith(el('span', { class: 'logo-fallback', text: alt || p.name, 'aria-hidden': alt ? null : 'true' })))
    return img
  }

  for (const p of by('main')) {
    host.append(el('div', { class: 'card main-partner' },
      el('p', { class: 'tier', text: copy.mainPartner }),
      p.logo ? logo(p, '') : null,
      el('p', { class: 'pname', text: p.name }),
    ))
  }
  const plat = by('platinum')
  if (plat.length) {
    host.append(el('p', { class: 'tier', text: copy.mock.platinum }),
      el('ul', { class: 'plat' }, ...plat.map((p) => el('li', {}, p.logo ? logo(p, '') : null, el('span', { text: p.name })))))
  }
  // Ticker: Gold Plus → Gold → sponsor, then any untiered partner LAST (never dropped).
  const ticker = [...by('goldplus'), ...by('gold'), ...by('sponsor'), ...data.partners.filter((p) => p.tier === null)]
  if (ticker.length) {
    const list = (dup) => el('ul', { 'aria-hidden': dup ? 'true' : null, class: dup ? 'dup' : null },
      ...ticker.map((p) => el('li', {}, p.logo ? logo(p, dup ? '' : p.name) : el('span', { text: p.name }))))
    host.append(el('p', { class: 'tier', text: copy.mock.ticker }),
      el('div', { class: 'marquee' }, el('div', { class: 'track' }, list(false), list(true))))
  }
}

function renderSpeakers(data) {
  if (!data?.speakers) return $('[data-section="speakers"]').remove()
  slot('speakers').append(...data.speakers.map((s) =>
    el('li', {}, el('b', { text: s.name }), s.title ? el('span', { class: 't', text: s.title }) : null, el('span', { class: 'o', text: s.org }))))
}

function renderContacts() {
  slot('contacts').append(...copy.contacts.map((c) =>
    el('p', { class: 'who' }, el('b', { text: c.name }), el('span', { text: c.role }), el('a', { href: `mailto:${c.email}`, text: c.email }))))
}

function renderFooter() {
  slot('licence-numbers').textContent = `${copy.footer.afsl} · ${copy.footer.abn}`
  slot('policies').append(...copy.footer.policies.map((p) => el('a', { href: p.href, text: p.label })))
}

function renderWrap(state) {
  // ⭐ Reversible call 3: the lime bar under "AI" on the wrap headline is withAiMark() on this one line.
  slot('wrap-headline').append(...withAiMark(copy.wrap.headline))

  // V1 / V2 switch on highlightsVideo ONLY (spec §2.2). Never "is there a video on the page".
  const close = slot('wrap-close')
  const id = state.highlightsVideo ? youTubeId(state.highlightsVideo) : null
  if (state.highlightsVideo && !id) console.error(`[skin] highlightsVideo is set but is not a YouTube URL: "${state.highlightsVideo}". Showing Version 1.`)
  if (id) {
    close.append(
      el('p', { class: 'wrap-p wrap-lead', text: copy.wrap.v2Lead }),
      videoHost({ id, playLabel: null, playAria: copy.wrap.v2Lead, iframeTitle: copy.wrap.v2Lead }),
      el('p', { class: 'wrap-p', text: copy.wrap.v2Close }),
    )
  } else close.append(el('p', { class: 'wrap-p', text: copy.wrap.v1Close }))

  // Touchpoint D (spec §2.3): absent while closed; label depends on materialsLinked.
  const action = slot('wrap-app')
  if (state.appOpen) action.append(appLink(state, state.materialsLinked ? copy.app.wrappedMaterials : copy.app.wrappedPlain, 'quiet'))
  else action.remove()
}

// ============ motion (spec §8): content is visible by default; script only ADDS animation ============
function motion() {
  if (reduceMotion) return
  const els = $$('.rv')
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('rv-on')
    const io = new IntersectionObserver((es) => es.forEach((x) => {
      if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target) }
    }), { rootMargin: '0px 0px -8% 0px' })
    els.forEach((e) => io.observe(e))
  }
  const net = $('.motif')
  if (net) {
    let raf = 0
    addEventListener('scroll', () => {
      if (!raf) raf = requestAnimationFrame(() => { net.style.transform = `translateY(${Math.min(scrollY, 600) * 0.18}px)`; raf = 0 })
    }, { passive: true })
  }
}

// ============ boot ============
async function boot() {
  const state = resolveState(skin, { search: location.search })
  document.documentElement.dataset.state = state.clock

  // Remove every section this clock state does not show, before anything is filled.
  for (const s of $$('[data-section]')) if (!SECTIONS[state.clock].includes(s.dataset.section)) s.remove()

  // Fill every skin word that has a home in the markup.
  for (const n of $$('[data-text]')) n.textContent = path(copy, n.dataset.text) ?? ''
  for (const n of $$('[data-alt]')) n.alt = path(copy, n.dataset.alt) ?? ''

  const has = (name) => SECTIONS[state.clock].includes(name)

  // ---- 1 · Everything that needs NO app data renders first (Wren N-2): a data failure cannot stop it. ----
  if (has('wrap')) renderWrap(state)
  renderTopbar(state)
  if (has('hero')) renderHeroShell(state)
  if (has('stage')) renderStage(state)
  if (has('intro')) renderIntro()
  if (has('plan')) renderCpd()
  if (has('questions')) renderContacts()
  renderFooter()
  if (has('bring')) renderWear()

  document.documentElement.classList.add('ready')
  bindVideo()
  motion()

  // Countdown, and a reload when the real clock crosses a boundary (never under a ?state= override).
  tickCountdown()
  setInterval(() => {
    tickCountdown()
    if (!state.clockOverridden && clockAt(skin, Date.now()) !== state.clock) location.reload()
  }, 1000)

  // ---- 2 · Derived sections. Each is fenced on its own: a failure leaves THAT part absent, never half-filled. ----
  let data = null
  try {
    data = await loadData(skin.partnerTiers)
  } catch (err) {
    console.error('[data] loading the app data failed; derived sections render absent.', err)
  }
  const derived = [
    ['hero', () => renderHeroFacts(data), '[data-slot="when"], [data-slot="tagline"]'],
    ['plan', () => renderDays(data), '[data-slot="days"], [data-section="plan"] .lede, [data-section="plan"] .grid2'],
    ['where', () => renderWhere(data), '[data-section="where"]'],
    ['partners', () => renderPartners(data), '[data-section="partners"]'],
    ['speakers', () => renderSpeakers(data), '[data-section="speakers"]'],
  ]
  for (const [name, render, absentSel] of derived) {
    if (!has(name)) continue
    try {
      render()
    } catch (err) {
      console.error(`[render] the ${name} section failed; its derived part renders absent.`, err)
      for (const n of $$(absentSel)) n.remove()
    }
  }
}

boot().catch((err) => console.error('[boot] the page failed to start.', err))
