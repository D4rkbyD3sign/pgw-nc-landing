// Runs in <head>, before first paint. A FILE, not an inline script: the CSP allows no inline script (spec §10.1).
// It only adds classes. If it never runs, nothing is hidden that should show: the gate stays up.
(function () {
  var d = document.documentElement
  d.classList.add('js')
  // A tab that already unlocked the gate this session (js/gate.js stores the hash it matched) skips the gate's flash
  // on reload. ⛔ A failed storage read (private mode throws) leaves the gate showing, never open. js/main.js re-checks.
  try {
    var m = document.querySelector('meta[name="pgw-gate"]')
    if (m && m.content && window.sessionStorage.getItem('pgw-gate') === m.content) d.classList.add('gate-passed')
  } catch (e) {}
})()
