// THE LOAD-IN (spec §5.13): the screen powers on, the title sequence plays ONCE and stops on PGW's title card, the
// words arrive when the card lands, the scroll is held for a moment, and the screen pulls back into the monitor.
//
// THE TITLE RULE (Adam, 13 Oct): the title appears once, at a size that reads.
//   Phones (portrait) → film + words. Wide (landscape) → film only, and only once it is EARNED: the page starts in
//   film + words and switches when the film actually plays (or, under reduced motion, when the still card has loaded).
//   ANY failure keeps or returns the words: a source error (heard on the <source> too: a missing file reports there,
//   not on the <video>), a video error, a blocked play(), or no frame data after 6s. On failure the film and the still
//   are hidden (charcoal) and the film control is hidden too. If the film starts later (a slow phone), it comes back.

const HOLD_MS = 2500        // the hold (css/landing.css carries the 4s safety release)
const STALL_MS = 6000       // no frame data by then = the film has failed
const WORDS_GAP = 40        // film only: the date + tagline sit 40px under where the card's lettering ends
const FOOT_FADE = 48        // the cue and the control fade together over the first 48px of scroll…
const FOOT_INERT = 24       // …and stop taking clicks past 24px

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const layoutChanged = () => dispatchEvent(new Event('pgw:layout'))

/**
 * @param {HTMLElement} section the .loadin section (already in the document)
 * @param {{skin:object, copy:object, reduce:boolean}} opts
 */
export function startLoadin(section, { skin, copy, reduce }) {
  const html = document.documentElement
  const ts = skin.titleSequence
  const film = section.querySelector('[data-slot="film"]')
  const still = section.querySelector('[data-slot="still"]')
  const ctl = section.querySelector('[data-slot="film-ctl"]')
  const foot = section.querySelector('[data-slot="foot"]')
  const cue = foot.querySelector('.cue')
  const frame = section.querySelector('.loadin-frame')
  const inner = section.querySelector('.loadin-in')
  const words = section.querySelector('[data-slot="words"]')
  const motif = section.querySelector('[data-slot="motif"]')
  const wideQuery = matchMedia('(min-aspect-ratio: 1/1)')

  // ---- the sources: 1080p for wide screens, 720p for every other screen (the last <source> is the fallback) ----
  const src = (url, media) => {
    const s = document.createElement('source')
    s.src = url
    s.type = 'video/mp4'
    if (media) s.media = media
    return s
  }
  const lastSource = src(ts.narrow)
  film.append(src(ts.wide, ts.wideMedia), lastSource)
  film.poster = ts.first
  still.src = ts.end

  let filmOK = false        // the title is "earned": the film is playing, or (reduced motion) the still has loaded
  let userPaused = false
  let rested = false

  const setCtl = () => {
    ctl.textContent = film.ended ? copy.loadin.replay : film.paused ? copy.loadin.play : copy.loadin.pause
  }
  const landed = () => section.classList.remove('waiting')
  const setTitle = () => {
    section.dataset.title = filmOK && wideQuery.matches ? 'film' : 'words'
    placeWords()
    placeMotif()
    layoutChanged()
  }
  const fail = (why) => {
    if (filmOK && why !== 'video-error' && why !== 'source-error') return
    filmOK = false
    section.dataset.film = `failed:${why}`
    section.classList.add('film-failed')
    ctl.hidden = true
    landed()
    setTitle()
  }

  film.addEventListener('playing', () => {
    filmOK = true
    delete section.dataset.film
    section.classList.remove('film-failed')
    film.classList.add('is-playing')
    ctl.hidden = false
    setTitle()
    setCtl()
  })
  lastSource.addEventListener('error', () => fail('source-error'))
  film.addEventListener('error', () => fail('video-error'))
  film.addEventListener('timeupdate', () => { if (film.currentTime >= ts.landsAt) landed() })
  film.addEventListener('ended', () => { landed(); setCtl() })
  film.addEventListener('pause', setCtl)
  film.addEventListener('loadedmetadata', () => { placeWords(); layoutChanged() })

  const play = () => {
    if (userPaused || film.ended) return
    let p
    try {
      p = film.play()
    } catch {
      return fail('play-blocked')
    }
    if (p && typeof p.catch === 'function') p.catch(() => { if (!filmOK) fail('play-blocked') })
  }

  ctl.addEventListener('click', () => {
    if (film.ended) {
      // Replay: restart the film and hold the words again (not under reduced motion: nothing is held there).
      userPaused = false
      film.currentTime = 0
      if (!reduce) section.classList.add('waiting')
      play()
    } else if (film.paused) {
      userPaused = false
      play()
    } else {
      userPaused = true
      film.pause()
    }
  })

  // ---- FILM ONLY: the date + tagline, centred, 40px under where the card's lettering ENDS, measured on every shape ----
  function placeWords() {
    if (section.dataset.title !== 'film') { words.style.top = ''; return }
    const box = (film.classList.contains('is-playing') ? film : still).getBoundingClientRect()
    if (!box.height) return
    const top = box.top + ts.cardEnd * box.height + WORDS_GAP - inner.getBoundingClientRect().top
    words.style.top = `${Math.round(top)}px`
  }

  // ---- THE MOTIF (spec §5.11): text-title mode only, into the free gap beside "2026", BY MEASUREMENT ----
  // Every text line box in the words block is measured; the mark takes the widest box that sits right-aligned in the
  // words column, vertically centred on the "2026" line, and touches no line box (16px clear). 88px max on phones,
  // 220px from 900px. Too little room (under 40px) = no mark at all, never a squeezed one.
  function placeMotif() {
    if (!motif) return
    motif.classList.remove('is-placed')
    if (section.dataset.title === 'film') return
    const year = words.querySelector('.year')
    if (!year) return
    const wr = words.getBoundingClientRect()
    const yr = year.getBoundingClientRect()
    const lineRects = []
    for (const n of words.querySelectorAll('.eyebrow, h1, .when, .tagline')) {
      const r = document.createRange()
      r.selectNodeContents(n)
      for (const rect of r.getClientRects()) if (rect.width && rect.height) lineRects.push(rect)
    }
    const maxW = innerWidth >= 900 ? 220 : 88
    const ratio = 110 / 140
    let w = maxW
    for (let pass = 0; pass < 4; pass++) {
      const h = w * ratio
      const top = yr.top + yr.height / 2 - h / 2
      const left = lineRects.filter((r) => r.bottom > top - 16 && r.top < top + h + 16).reduce((m, r) => Math.max(m, r.right + 16), wr.left)
      const room = wr.right - left
      if (room >= w) break
      w = room
    }
    if (w < 40) return
    const h = w * ratio
    motif.style.width = `${Math.floor(w)}px`
    motif.style.left = `${Math.floor(wr.width - w)}px`
    motif.style.top = `${Math.round(yr.top + yr.height / 2 - h / 2 - wr.top)}px`
    motif.classList.add('is-placed')
  }

  // ---- THE PULL-BACK and THE PINNED FOOT ----
  function onScroll() {
    const h = section.offsetHeight
    const y = scrollY
    if (!reduce) {
      const p = clamp(y / (h * 0.85), 0, 1)
      frame.style.clipPath = p ? `inset(${p * 7}% ${p * 5}% ${p * 9}% ${p * 5}% round ${p * 28}px)` : ''
      inner.style.opacity = String(Math.max(0, 1 - p * 1.5))
    }
    // Adam, 13 Oct: "the replay needs to mirror that of the scroll": same distance, same easing, both inert past 24px.
    const fade = String(clamp(1 - y / FOOT_FADE, 0, 1))
    cue.style.opacity = fade
    ctl.style.opacity = fade
    const inert = y > FOOT_INERT
    foot.inert = inert                                   // out of the tab order too (Safari 15.5+)…
    cue.style.pointerEvents = ctl.style.pointerEvents = inert ? 'none' : ''   // …and no clicks on any browser
    const onScreen = section.getBoundingClientRect().bottom > 0
    foot.classList.toggle('is-gone', !onScreen)
    // The film rests once fully off screen, and resumes only if it had not ended or been paused by the reader.
    if (!onScreen && !film.paused) { rested = true; film.pause() }
    else if (onScreen && rested) { rested = false; if (!userPaused && !film.ended && filmOK) play() }
  }
  let raf = 0
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; onScroll() }) }, { passive: true })
  addEventListener('resize', () => { setTitle(); onScroll() })
  wideQuery.addEventListener?.('change', setTitle)
  document.fonts?.ready.then(() => { placeWords(); placeMotif() })

  setCtl()
  if (reduce) {
    // Reduced motion: no power-on, no hold, no film autoplay. The finished card as a still; Play runs the film if asked.
    section.classList.add('is-still')
    ctl.textContent = copy.loadin.play
    ctl.hidden = false
    const ok = () => { filmOK = true; setTitle() }
    if (still.complete && still.naturalWidth) ok()
    else {
      still.addEventListener('load', ok, { once: true })
      still.addEventListener('error', () => fail('still-error'), { once: true })
    }
  } else {
    // THE HOLD + POWER-ON. The page opens at the top whenever the film plays (a reload part-way down must not play the
    // hold off screen). The hold: wheel and touchmove are swallowed; a tap, click or key releases early.
    try { history.scrollRestoration = 'manual' } catch {}
    scrollTo(0, 0)
    section.classList.add('waiting')
    html.classList.add('po', 'hold')
    const swallow = (e) => { if (html.classList.contains('hold')) e.preventDefault() }
    addEventListener('wheel', swallow, { passive: false })
    addEventListener('touchmove', swallow, { passive: false })
    let timer = 0
    const release = () => {
      clearTimeout(timer)
      removeEventListener('pointerdown', release)
      removeEventListener('keydown', release)
      if (!html.classList.contains('hold') && !html.classList.contains('po')) return
      html.classList.remove('hold', 'po')
      requestAnimationFrame(layoutChanged)
    }
    timer = setTimeout(release, HOLD_MS)
    addEventListener('pointerdown', release)
    addEventListener('keydown', release)
    play()
    setTimeout(() => { if (!filmOK && !userPaused && film.readyState < 2) fail('stalled') }, STALL_MS)
  }
  setTitle()
  onScroll()
  // main.js calls this once the app's facts (the date line, the tagline) have filled the words: re-measure.
  return { relayout: setTitle }
}
