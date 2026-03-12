// Browser-side laser pointer cursor for Marp presentations.
// Injected into the HTML output via marp.config.js engine wrapper.
//
// Reads CSS custom properties from the first <section> to configure appearance.
// Does nothing if --bespoke-marp-cursor-size is not set.
//
// Window roles (set by bespoke.js on document.body as data-bespoke-view):
//   "presenter" → track mouse and broadcast normalised coordinates
//   ""          → receive broadcasts and render the cursor dot
//   (unset)     → bespoke not active; fall back to local cursor in same window
;(function () {
  var section = document.querySelector('section')
  if (!section) return

  var style = getComputedStyle(section)
  var size = style.getPropertyValue('--bespoke-marp-cursor-size').trim()
  if (!size) return

  var color = style.getPropertyValue('--bespoke-marp-cursor-color').trim() || '#ff0000'
  var glow = style.getPropertyValue('--bespoke-marp-cursor-glow').trim() || 'rgba(255,0,0,0.4)'
  var duration = style.getPropertyValue('--bespoke-marp-cursor-duration').trim() || '0.3s'
  var idle = style.getPropertyValue('--bespoke-marp-cursor-idle').trim() || '1s'
  var idleMs = parseFloat(idle) * 1000

  var CHANNEL = 'marp-laser-cursor'

  // Returns the currently active slide element.
  function activeSlide() {
    return (
      document.querySelector('section[data-bespoke-active]') ||
      document.querySelector('section')
    )
  }

  function createDot() {
    var el = document.createElement('div')
    el.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'pointer-events:none',
      'z-index:2147483647',
      'border-radius:50%',
      'transform:translate(-50%,-50%)',
      'width:' + size,
      'height:' + size,
      'background:' + color,
      'box-shadow:0 0 ' + size + ' ' + size + ' ' + glow,
      'opacity:0',
      'transition:opacity ' + duration,
    ].join(';')
    document.body.appendChild(el)
    return el
  }

  // Presenter window: normalise mouse position relative to active slide and
  // broadcast over BroadcastChannel.
  function setupPresenter() {
    var ch = new BroadcastChannel(CHANNEL)

    document.addEventListener('mousemove', function (e) {
      var slide = activeSlide()
      if (!slide) return
      var r = slide.getBoundingClientRect()
      ch.postMessage({
        type: 'move',
        x: (e.clientX - r.left) / r.width,
        y: (e.clientY - r.top) / r.height,
      })
    })

    document.addEventListener('mouseleave', function () {
      ch.postMessage({ type: 'leave' })
    })
  }

  // Display (audience) window: receive normalised coordinates and map them
  // onto the local slide rect so the dot follows regardless of window size.
  function setupDisplay() {
    var dot = createDot()
    var timer = null

    var ch = new BroadcastChannel(CHANNEL)
    ch.addEventListener('message', function (e) {
      if (e.data.type === 'leave') {
        clearTimeout(timer)
        dot.style.opacity = '0'
        return
      }
      var slide = activeSlide()
      if (!slide) return
      var r = slide.getBoundingClientRect()
      dot.style.left = r.left + e.data.x * r.width + 'px'
      dot.style.top = r.top + e.data.y * r.height + 'px'
      dot.style.opacity = '1'
      clearTimeout(timer)
      timer = setTimeout(function () {
        dot.style.opacity = '0'
      }, idleMs)
    })
  }

  // Fallback: bespoke.js is not active (e.g. file:// preview without server).
  // Show a local cursor dot in the same window.
  function setupLocal() {
    var dot = createDot()
    var timer = null

    document.addEventListener('mousemove', function (e) {
      dot.style.left = e.clientX + 'px'
      dot.style.top = e.clientY + 'px'
      dot.style.opacity = '1'
      clearTimeout(timer)
      timer = setTimeout(function () {
        dot.style.opacity = '0'
      }, idleMs)
    })

    document.addEventListener('mouseleave', function () {
      clearTimeout(timer)
      dot.style.opacity = '0'
    })
  }

  // Initialise after bespoke.js has run (it sets data-bespoke-view on <body>
  // synchronously during script execution, so DOMContentLoaded is safe).
  window.addEventListener('DOMContentLoaded', function () {
    var view = document.body.getAttribute('data-bespoke-view')
    if (view === 'presenter') {
      setupPresenter()
    } else if (view === '') {
      setupDisplay()
    } else {
      setupLocal()
    }
  })
})()
