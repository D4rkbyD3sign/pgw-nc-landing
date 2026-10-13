// The pre-launch gate (spec §2.6, §5.20): THE CIRCUIT THAT WAITS.
//
// ⛔ A CURTAIN, NOT A LOCK. GitHub Pages serves files only: it cannot check a password on a server, so this check runs
// in the visitor's browser. It stops the public, advisers and search engines. It does NOT stop someone determined:
// every file of the site is still fetchable directly. That is acceptable ONLY because everything on this page is meant
// to be public. Nothing private ever goes behind this gate.
//
// The password is never in the source. The skin holds only gateHash, the SHA-256 of it; this file hashes what is typed
// and compares. The unlock lasts the tab's session (sessionStorage, which private modes may refuse: a failed read or
// write means the gate shows again next load, never that it opens). Wrong password: the spark, the input clears, one
// polite line. No lockout, no counter.

const KEY = 'pgw-gate'
const HEX64 = /^[0-9a-f]{64}$/
const OPEN_MS = 600        // the power-up: left trace, bridge, far traces in sequence (css/screen.css)
const CONNECTED_MS = 1000  // then "You're connected." holds for a second (Adam, 13 Oct, in session; not yet in the spec)
const FADE_MS = 400        // then the screen fades and the load-in begins

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function storedUnlock(hash) {
  try {
    return window.sessionStorage.getItem(KEY) === hash
  } catch {
    return false   // ⛔ storage refused: the gate shows
  }
}

function storeUnlock(hash) {
  try {
    window.sessionStorage.setItem(KEY, hash)
  } catch {
    // Private mode: the unlock lasts this page view only. The next load meets the gate again, which is the safe side.
  }
}

/**
 * Resolves once the page may render: at once when the gate is off (skin gate: false, or ?gate=false on a local preview
 * host), at once when this tab already unlocked it, otherwise when the right password is typed. NEVER resolves when the
 * gate cannot work (no gate screen in the markup, a malformed hash, no Web Crypto): it fails closed, with one error.
 * @param {{gate:boolean}} state
 * @param {{gateHash:string}} skin
 * @param {{error:string}} words copy.gate
 * @param {boolean} reduce prefers-reduced-motion
 */
export function passGate(state, skin, words, reduce) {
  const html = document.documentElement
  const screen = document.getElementById('gate')
  if (!state.gate) {
    // Gate off. The stamped screen only exists while the skin says gate: true (gen_skin.py); on a local preview with
    // ?gate=false it is present and simply removed.
    screen?.remove()
    return Promise.resolve()
  }
  const hash = String(skin.gateHash || '').toLowerCase()
  if (!HEX64.test(hash)) {
    console.error('[gate] skin.gateHash is not a SHA-256 hex string; the page stays behind the gate.')
    return new Promise(() => {})
  }
  if (!screen) {
    console.error('[gate] the gate is on but its screen is missing from index.html (re-run gen_skin.py); the page stays closed.')
    return new Promise(() => {})
  }
  if (storedUnlock(hash)) {
    screen.remove()
    return Promise.resolve()
  }
  // The real check disagrees with head.js's early guess (e.g. the hash changed at GO): show the gate.
  html.classList.remove('gate-passed')

  const form = screen.querySelector('#gate-form')
  const input = screen.querySelector('#gate-input')
  const msg = screen.querySelector('#gate-msg')
  const heading = screen.querySelector('#gate-h')
  input.focus({ preventScroll: true })

  return new Promise((resolve) => {
    let busy = false
    form.addEventListener('submit', async (e) => {
      e.preventDefault()   // the form never leaves the page (and the CSP's form-action 'none' would refuse it anyway)
      if (busy) return
      busy = true
      let ok = false
      try {
        if (!(window.crypto && crypto.subtle)) throw new Error('Web Crypto is unavailable (an insecure origin?)')
        ok = (await sha256Hex(input.value)) === hash
      } catch (err) {
        console.error('[gate] could not check the password; the gate stays.', err)
      }
      if (!ok) {
        input.value = ''
        // Clear, then set on the next frame, so a second wrong try is announced again.
        msg.textContent = ''
        requestAnimationFrame(() => { msg.textContent = words.error })
        screen.classList.remove('is-wrong')
        void screen.offsetWidth   // restart the spark
        screen.classList.add('is-wrong')
        input.focus({ preventScroll: true })
        busy = false
        return
      }
      storeUnlock(hash)
      input.value = ''
      input.blur()
      msg.textContent = ''
      // "You're connected." (Adam, 13 Oct): the heading turns as the circuit powers up, and holds for a second before
      // the page. The heading is aria-live, so a screen reader hears it too. The password block steps away.
      heading.textContent = words.connected
      screen.classList.remove('is-wrong')
      screen.classList.add('is-open')
      if (reduce) {
        // Reduced motion: no power-up and no fade, but the words still hold for their second (a pause, not motion).
        setTimeout(() => { screen.remove(); resolve() }, CONNECTED_MS)
        return
      }
      setTimeout(() => {
        // Powered and said: the page mounts BENEATH the (fixed) gate, so the load-in begins as the screen fades.
        resolve()
        screen.classList.add('is-gone')
        setTimeout(() => screen.remove(), FADE_MS)
      }, OPEN_MS + CONNECTED_MS)
    })
  })
}
