// ImplementAI 2026 skin. 2027 = a new file with the same shape. Shell code never changes for a new year.
// Generated from build/tools/skin-template.js by build/tools/gen_skin.py. Every string under `copy`,
// the tier map and the motif were PASTED by that script from their source files, never typed.
// Flipping one of the four fields below is a one-line hand edit; that is expected and fine.
export const skin = {
  // ---- the four hand-set fields (spec §2.2). One line each. ----
  appOpen: false,                       // flip to true by hand once the app is confirmed ready (Lumen + Adam)
  appOpensOn: '',                       // '' = "The conference app opens soon." (Adam, 8 Oct: no date on the page)
  materialsLinked: false,               // true ONLY once the app's Materials tab links to PGW's folder
  highlightsVideo: '',                  // '' = wrap V1; a YouTube URL = wrap V2

  // ---- clock boundaries, as instants (spec §2.1) ----
  liveFrom:   '2026-10-28T21:30:00Z',   // 08:30 Thu 29 Oct, Australia/Hobart
  wrappedFrom: '2026-10-30T13:00:00Z',  // 00:00 Sat 31 Oct, Australia/Hobart

  // ---- media + copy carried by the skin ----
  trailerId: 'lcDtq65xtgs',
  // content-gated (spec §6.3): empty = NOT rendered at all.
  // What to wear (spec §3 item 7): cards in date order, each { label, value }. [] = section absent.
  whatToWear: [{"label": "Conference days · Thu & Fri", "value": "Business casual"}, {"label": "Mustique cruise · Thu evening", "value": "Cocktail"}, {"label": "Annual Awards Dinner · Fri evening", "value": "Cocktail"}],
  // Getting there text panel (plain text; a blank line starts a new paragraph). '' = absent.
  gettingThere: '',
  // day-card headings (manual Revision 1): '' = not rendered. Index 0 = day 1.
  dayHeadings: ['', ''],
  // cruise departure line under the cruise row (spec §5.6; wording approved by Adam 8 Oct).
  // {pier} is filled from the app's data (that session's venue.name), never typed. '' = line absent.
  cruiseSessionId: 'd1-cruise',
  cruiseDepartLine: "Expected to depart from {pier}",

  // ---- the venue map (spec §5.12): Google's own Share → Embed a map src, pasted verbatim. Tap-to-load. ----
  mapEmbedSrc: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2923.5562243067557!2d147.32649!3d-42.88221!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xaa6e758528293ea7%3A0xfacbfc6406ac23e!2sCrowne%20Plaza%20Hobart%20by%20IHG!5e0!3m2!1sen!2sau!4v1791453734333!5m2!1sen!2sau",

  // ---- where the app lives, and this year's host city (shown beside the dates) ----
  appUrl: 'https://app.pgwconference.com.au',
  city: 'Hobart',

  // ---- partner tiers: a keyed COPY of the app's PARTNER_TIER (data.js:372-378 @ v33, ec9b718) ----
  // The app does not export it. js/data.js checks this against the app's partners at every load and
  // console.errors any drift; an untiered partner still renders, last in the ticker. Delete this
  // copy once the app exports PARTNER_TIER (v34).
  partnerTiers: {"pep": "main", "afic": "platinum", "afm": "platinum", "gyrostat": "platinum", "hub24": "platinum", "mst": "platinum", "paradino": "platinum", "centuria": "goldplus", "macquarie": "goldplus", "millbrook": "goldplus", "openmarkets": "goldplus", "trilogy": "goldplus", "wam": "goldplus", "ellerston": "gold", "russell": "gold", "tal": "gold", "gda": "sponsor"},

  // ---- the ImplementAI node mark (PGW brand guide v1, motif box). Swaps out with the theme. ----
  motif: "<svg class=\"net\" viewBox=\"0 0 140 110\" fill=\"none\" aria-hidden=\"true\" focusable=\"false\"> <g stroke=\"#C8D562\" stroke-width=\"1\" opacity=\"0.95\"> <line x1=\"26\" y1=\"30\" x2=\"70\" y2=\"20\"/><line x1=\"70\" y1=\"20\" x2=\"110\" y2=\"40\"/> <line x1=\"26\" y1=\"30\" x2=\"48\" y2=\"66\"/><line x1=\"48\" y1=\"66\" x2=\"70\" y2=\"20\"/> <line x1=\"48\" y1=\"66\" x2=\"92\" y2=\"78\"/><line x1=\"92\" y1=\"78\" x2=\"110\" y2=\"40\"/> </g> <g fill=\"#C8D562\"> <circle cx=\"26\" cy=\"30\" r=\"3.4\"/><circle cx=\"70\" cy=\"20\" r=\"4\"/><circle cx=\"110\" cy=\"40\" r=\"3.4\"/> <circle cx=\"48\" cy=\"66\" r=\"3\"/><circle cx=\"92\" cy=\"78\" r=\"3.6\"/> </g> </svg>",

  // ---- every word on the page ----
  copy: {
    "heroEyebrow": "PGW National Conference 2026",
    "title": {
      "lead": "Implement",
      "mark": "AI",
      "year": "2026"
    },
    "intro": [
      "Every year, PGW's advisers come together in one room. It's where our community catches up, and the conversations between sessions matter as much as the ones on stage. This time it's Hobart, and for the first time, it's two full days.",
      "This year's theme, ImplementAI, is built around one question: what does AI actually change about the way you advise? Our educational partners, speakers and fellow advisers are here to show what's working in practices now, how it was set up, and where it still falls short.",
      "You'll leave knowing what's worth trying, and what isn't."
    ],
    "wrap": {
      "eyebrow": "ImplementAI 2026 · Hobart",
      "headline": "That's a wrap on ImplementAI 2026.",
      "thanks": "Thank you to everyone who joined us in Hobart. The best part of every conference is the people in the room, and this year's room was a good one. Thank you to our educational partners and speakers for sharing what's really working.",
      "v1Close": "Highlights from Hobart are on their way. See you in 2027.",
      "v2Lead": "Watch the highlights from Hobart.",
      "v2Close": "See you in 2027."
    },
    "map": {
      "title": "Map: Crowne Plaza Hobart, 110 Liverpool Street",
      "show": "Show map",
      "poster": "Crowne Plaza Hobart · 110 Liverpool Street"
    },
    "app": {
      "topbar": "Conference app",
      "pending": "The conference app opens {appOpensOn}.",
      "pendingSoon": "The conference app opens soon.",
      "heroPill": "Open the conference app →",
      "heroHelper": "Agenda, speakers and everything on the day.",
      "live": "We're live",
      "wrappedMaterials": "Revisit the sessions",
      "wrappedPlain": "Conference app"
    },
    "countdownLabel": "08:30 Thu 29 Oct · Hobart time (AEDT)",
    "trailer": {
      "play": "Watch the trailer",
      "iframeTitle": "PGW National Conference: ImplementAI 2026 Introduction",
      "close": "Close video ✕"
    },
    "photo": {
      "alt": "PGW's advisers together in one room at the 2025 National Conference",
      "caption": "National Conference 2025, Gold Coast"
    },
    "cpd": {
      "text": "Participation may earn you up to 12 hours of training toward your annual training requirements, including knowledge areas if appropriate. At the conclusion of the conference these hours will be automatically added to your Kaplan training register."
    },
    "labels": {
      "planEyebrow": "What's planned",
      "planHeading": "Two days in Hobart",
      "planLede": "The headlines. The full agenda lives in the app.",
      "whereEyebrow": "Where",
      "bringEyebrow": "Before you pack",
      "bringHeading": "What to wear",
      "partnersEyebrow": "Educational partners",
      "partnersHeading": "With thanks to our educational partners",
      "speakersEyebrow": "Speakers",
      "speakersHeading": "Who's presenting",
      "questionsEyebrow": "Questions?"
    },
    "mainPartner": "Main partner",
    "mock": {
      "platinum": "Platinum partners",
      "ticker": "Gold Plus and Gold partners · Friday drinks sponsor",
      "maps": "Open in Google Maps ↗",
      "countdownEyebrow": "Doors open in",
      "timerAria": "Time until the conference opens"
    },
    "contacts": [
      {
        "name": "Tracey Gould",
        "role": "Relationships & Operations Manager",
        "email": "tracey@pgwfinancial.com.au"
      },
      {
        "name": "Ben Ross",
        "role": "Chief Operating Officer",
        "email": "ben@pgwfinancial.com.au"
      }
    ],
    "footer": {
      "name": "PGW Financial Services Pty Ltd",
      "afsl": "AFSL 384 713",
      "abn": "ABN 15 123 835 441",
      "policies": [
        {
          "label": "Financial Services Guide",
          "href": "https://cdn.prod.website-files.com/61b83d1f10d746f3ab9857ab/65e65fb2f170d72f9f6e0891_FSG%20-%20PGW%20Financial%20Services%20Pty%20Ltd%20-%2021st%20February%202024%20v1.pdf"
        },
        {
          "label": "PGW Privacy Policy",
          "href": "https://cdn.prod.website-files.com/61b83d1f10d746f3ab9857ab/6284447558e2a21b75b3e6b1_PGW%20Privacy%20and%20Spam%20Policy%20-%20May%202022%20v11.pdf"
        },
        {
          "label": "CPD Policy",
          "href": "https://cdn.prod.website-files.com/61b83d1f10d746f3ab9857ab/69672e69b9b33841020f3cbd_Training%20%26%20CPD%20Policy%20-%20January%202026%20V13.pdf"
        }
      ],
      "copyright": "Copyright © 2026, PGW Financial Services Pty Ltd. All Rights Reserved."
    },
    "og": {
      "title": "ImplementAI 2026 · PGW National Conference",
      "description": "29–30 October · Hobart"
    }
  },
}
