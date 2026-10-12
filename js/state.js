// The state engine (spec §2). Two independent axes and nothing else:
//   the CLOCK (automatic, from the skin's two instants) and the FOUR HAND-SET FIELDS (from the skin).
// Review override (spec §2.5, revised 6 Oct): URL params `state`, `appOpen`, `appOpensOn`, `materialsLinked`,
// `highlightsVideo` each override one value, e.g. ?state=live&appOpen=false, ON A LOCAL PREVIEW HOST ONLY.
// Overrides are read from the URL every load: never stored, never written anywhere, no visible control ships.

export const CLOCKS = ['before', 'live', 'wrapped']

// Review overrides are honoured ONLY on a local preview host (Adam, 6 Oct; Wren G-1; spec §2.5).
// On the public site every override parameter is ignored and the skin's real values render.
// ⛔ EXACT membership of a two-item set: never includes/startsWith/endsWith, so `localhost.attacker.com`
// and `127.0.0.1.nip.io` are refused. An empty hostname (file://) is refused too.
export const PREVIEW_HOSTS = new Set(['127.0.0.1', 'localhost'])
export const isPreviewHost = (hostname) => typeof hostname === 'string' && PREVIEW_HOSTS.has(hostname)

/** The page's hostname, or undefined. ⛔ Fails CLOSED: if `location` is missing or throws, no overrides. */
function currentHostname() {
  try {
    return globalThis.location ? globalThis.location.hostname : undefined
  } catch {
    return undefined
  }
}

/**
 * Which clock state an instant falls in. Compared as instants (UTC milliseconds) against the skin's
 * boundaries, so no offset is ever hard-coded: the skin carries the moments, 2027 changes data.
 */
export function clockAt(skin, now) {
  const live = Date.parse(skin.liveFrom)
  const wrapped = Date.parse(skin.wrappedFrom)
  if (Number.isNaN(live) || Number.isNaN(wrapped) || !(live < wrapped)) {
    console.error('[state] skin.liveFrom / skin.wrappedFrom are not two valid instants in order; showing BEFORE.')
    return 'before'
  }
  if (now >= wrapped) return 'wrapped'
  if (now >= live) return 'live'
  return 'before'
}

/**
 * @param {object} [opts]
 * @param {string} [opts.hostname] the page's hostname; defaults to location.hostname (fail-closed)
 * @returns {{clock:'before'|'live'|'wrapped', clockOverridden:boolean, overridesAllowed:boolean, appOpen:boolean,
 *            appOpensOn:string, materialsLinked:boolean, highlightsVideo:string}}
 */
export function resolveState(skin, { now = Date.now(), search = '', hostname = currentHostname() } = {}) {
  const overridesAllowed = isPreviewHost(hostname)
  // Not a preview host → read NO URL parameter at all: the clock from Date.now(), the four fields from the skin.
  const q = new URLSearchParams(overridesAllowed ? search : '')

  const bool = (key, fallback) => {
    if (!q.has(key)) return fallback
    const v = q.get(key)
    if (v === 'true') return true
    if (v === 'false') return false
    console.warn(`[state] ignoring ?${key}=${v} (use true or false)`)
    return fallback
  }
  const text = (key, fallback) => (q.has(key) ? q.get(key) : fallback)

  let clock = clockAt(skin, now)
  let clockOverridden = false
  if (q.has('state')) {
    const v = q.get('state')
    if (CLOCKS.includes(v)) { clock = v; clockOverridden = true }
    else console.warn(`[state] ignoring ?state=${v} (use before, live or wrapped)`)
  }

  const state = {
    clock,
    clockOverridden,
    overridesAllowed,
    appOpen: bool('appOpen', skin.appOpen === true),
    appOpensOn: String(text('appOpensOn', skin.appOpensOn) ?? '').trim(),
    materialsLinked: bool('materialsLinked', skin.materialsLinked === true),
    highlightsVideo: String(text('highlightsVideo', skin.highlightsVideo) ?? '').trim(),
  }

  // Spec §2.3, RULED by Adam 8 Oct (option a): an empty appOpensOn is the normal case, not a launch blocker.
  // main.js renders "The conference app opens soon." when it is empty. (The former console.error path is removed.)

  return state
}
