// The data adapter: the ONLY file that knows where the app's data comes from (manual Phase 2).
//
// CHOICE: RUNTIME import of the live app's own module, cross-origin (CORS `*`, verified 6 Oct).
// WHY: the app is still being filled in before Hobart (titles, topics, a provisional partner), and a
// build-time copy would go stale silently with nobody owning the re-copy. The partner logos already
// load from the app's origin at run time, so the page leans on that origin either way.
// COST, AND HOW IT FAILS: if the app is unreachable or its shape changes, each derived part comes back
// null and its section renders ABSENT, never broken or half-filled. Logged in STATUS.md.
//
// To switch to a build-time copy later: copy the app's js/data.js to js/vendor/app-data-vNN.js and change
// APP_DATA below to './vendor/app-data-vNN.js'. Nothing else changes.

const APP_ORIGIN = 'https://app.pgwconference.com.au/'
const APP_DATA = new URL('js/data.js', APP_ORIGIN).href

const isStr = (v) => typeof v === 'string' && v.trim() !== ''
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const HHMM = /^\d{2}:\d{2}$/

// Each part is checked on its own, so one changed shape takes out one section, not the page.
function checkConference(c) {
  const ok = c && Array.isArray(c.days) && c.days.length > 0 &&
    c.days.every((d) => Number.isInteger(d.day) && ISO_DATE.test(d.date) && isStr(d.label))
  return ok ? c : null
}
function checkVenue(v) {
  return v && isStr(v.name) && isStr(v.address) && isStr(v.mapUrl) && /^https:\/\//.test(v.mapUrl) ? v : null
}
function checkSessions(s) {
  return Array.isArray(s) && s.every((x) => Number.isInteger(x.day) && HHMM.test(x.start) && isStr(x.title)) ? s : null
}
function checkSpeakers(s) {
  return Array.isArray(s) && s.length > 0 && s.every((x) => isStr(x.id) && isStr(x.name) && isStr(x.org)) ? s : null
}

/** Unique by id (the count rule: by id, never by line). A duplicate id is reported and rendered once. */
function uniqueById(list, what) {
  const seen = new Map()
  for (const item of list) {
    if (seen.has(item.id)) console.error(`[data] duplicate ${what} id "${item.id}" in the app's data: rendered once`)
    else seen.set(item.id, item)
  }
  return [...seen.values()]
}

/**
 * Attach a tier to every partner from the skin's keyed copy, and check the copy against the app.
 * Every app partner must have a tier; every tier id must exist in the app. Any mismatch is a
 * console.error naming the id(s). ⛔ A partner with no tier is NEVER dropped: it gets tier null and
 * renders last in the ticker (the app's own rule, data.js:369).
 */
export function tierPartners(partners, partnerTiers) {
  const appIds = new Set(partners.map((p) => p.id))
  // hasOwnProperty.call, not Object.hasOwn: the latter needs iOS 15.4+ (Wren N-2).
  const has = (id) => Object.prototype.hasOwnProperty.call(partnerTiers, id)
  const untiered = partners.filter((p) => !has(p.id)).map((p) => p.id)
  const ghosts = Object.keys(partnerTiers).filter((id) => !appIds.has(id))
  if (untiered.length) console.error(`[data] partner tier check: no tier in skin.partnerTiers for ${untiered.join(', ')}. Rendered LAST in the ticker; add the id(s) to the skin.`)
  if (ghosts.length) console.error(`[data] partner tier check: skin.partnerTiers names ${ghosts.join(', ')}, which the app no longer has.`)
  return partners.map((p) => ({
    id: p.id,
    name: p.name,
    tier: has(p.id) ? partnerTiers[p.id] : null,
    logo: isStr(p.logo) ? new URL(p.logo, APP_ORIGIN).href : null,
  }))
}

/**
 * Partner speakers (spec §6.1, revised 13 Oct): name, title, org, PHOTO and BIO. The photo is the app's own file,
 * referenced from the app's origin as the partner logos are; '' when the app has none (the row shows initials).
 * The bio is the app's text, verbatim; '' when the app has none (the row is plain, not a button).
 * ⛔ No CSS zoom or crop here or anywhere: a photo that sits badly in its frame is re-cropped at source, in the app.
 */
export function mapSpeaker(s) {
  return {
    id: s.id,
    name: s.name,
    title: isStr(s.title) ? s.title : '',
    org: s.org,
    photo: isStr(s.photo) ? new URL(s.photo, APP_ORIGIN).href : '',
    bio: isStr(s.bio) ? s.bio.trim() : '',
  }
}

function checkPartners(p) {
  return Array.isArray(p) && p.length > 0 && p.every((x) => isStr(x.id) && isStr(x.name)) ? p : null
}

/**
 * Load the app's data. Resolves to null if the module cannot be loaded at all; otherwise to an object
 * whose parts are each either valid or null:
 *   { conference, venue, tagline, sessions, partners (with tier + absolute logo), speakers (with photo + bio), CONFERENCE_TZ }
 * @param {Record<string,string>} partnerTiers skin.partnerTiers
 * @param {string} [source] override for tests only; production uses the app's origin
 */
export async function loadData(partnerTiers, source = APP_DATA) {
  let m
  try {
    m = await import(source)
  } catch (err) {
    console.error(`[data] could not load the app's data from ${source}; derived sections render absent.`, err)
    return null
  }
  const conference = checkConference(m.conference)
  const partnersRaw = checkPartners(m.partners)
  const speakersRaw = checkSpeakers(m.speakers)
  const out = {
    conference,
    venue: checkVenue(m.conference?.venue),
    tagline: isStr(m.conference?.tagline) ? m.conference.tagline : null,
    sessions: checkSessions(m.sessions),
    partners: partnersRaw ? tierPartners(uniqueById(partnersRaw, 'partner'), partnerTiers) : null,
    speakers: speakersRaw ? uniqueById(speakersRaw, 'speaker').map(mapSpeaker) : null,
    CONFERENCE_TZ: isStr(m.CONFERENCE_TZ) ? m.CONFERENCE_TZ : null,
  }
  for (const [k, v] of Object.entries(out)) if (v === null) console.error(`[data] the app's "${k}" is missing or changed shape; its section renders absent.`)
  return out
}
