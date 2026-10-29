/* ==========================================================================
   WILD COLOR – Pagina Peroxide, riquadro in basso (istruzioni d'uso)
   I 3 blocchi (COLOR USAGE · BLENDING · OXYGEN USAGE) si scrivono a
   macchina uno alla volta nello spazio nero a sinistra della ragazza:
   scrive → pausa → cancella → blocco successivo, in loop.
   Il testo segue il bordo dei capelli (shape-outside nel CSS) e non ci va
   mai sopra. Tutte le lettere sono già al loro posto, nascoste, e si
   accendono una alla volta: così il testo giustificato non si sposta.
   Il corpo è lo stesso per i 3 blocchi: il più grande che fa stare il
   blocco più lungo nell'area (calcolato all'avvio e quando cambia la misura).
   Si ferma quando il riquadro non è visibile. Con "riduci movimento"
   i blocchi compaiono interi e cambiano ogni HOLD_STILL_MS.
   ========================================================================== */
(function () {
  'use strict';

  var TYPE_MS       = 22;    // tempo per lettera in scrittura
  var HOLD_MS       = 4000;  // pausa a blocco completo
  var ERASE_MS      = 700;   // cancellazione (tutto il blocco)
  var GAP_MS        = 400;   // pausa a riquadro vuoto
  var HOLD_STILL_MS = 12000; // "riduci movimento": durata di ogni blocco

  var sheet = document.querySelector('.usage-sheet');
  if (!sheet) return;
  var area   = sheet.querySelector('.usage-text');
  var cursor = sheet.querySelector('.usage-text__cursor');
  var blocks = Array.prototype.slice.call(sheet.querySelectorAll('.usage-block'));
  if (!area || !blocks.length) return;

  /* ---- Lettere: ogni carattere (spazi esclusi) in uno <span> ----------- */
  function splitChars(node, out) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        var text = child.textContent.replace(/\s+/g, ' ');
        var frag = document.createDocumentFragment();
        for (var i = 0; i < text.length; i++) {
          if (text[i] === ' ') {
            frag.appendChild(document.createTextNode(' '));
          } else {
            var span = document.createElement('span');
            span.className = 'usage-ch';
            span.textContent = text[i];
            frag.appendChild(span);
            out.push(span);
          }
        }
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1 && !child.classList.contains('usage-block__shape')) {
        splitChars(child, out);
      }
    });
  }

  var data = blocks.map(function (block) {
    var chars = [];
    splitChars(block, chars);
    var typeMs = chars.length * TYPE_MS;
    return {
      el: block,
      chars: chars,
      last: block.lastElementChild,
      shown: 0,
      typeMs: typeMs,
      total: typeMs + HOLD_MS + ERASE_MS + GAP_MS
    };
  });
  var cycle = data.reduce(function (sum, d) { return sum + d.total; }, 0);

  /* ---- Corpo comune ai 3 blocchi --------------------------------------- */
  function fits() {
    var limit = area.getBoundingClientRect().height;
    return data.every(function (d) {
      var top = d.el.getBoundingClientRect().top;
      return d.last.getBoundingClientRect().bottom - top <= limit;
    });
  }

  function fitText() {
    var lo = 0.5, hi = 1.6;
    for (var i = 0; i < 12; i++) {
      var mid = (lo + hi) / 2;
      area.style.setProperty('--usage-fit', mid.toFixed(4));
      if (fits()) lo = mid; else hi = mid;
    }
    area.style.setProperty('--usage-fit', lo.toFixed(4));
    placeCursor();
  }

  /* ---- Disegno --------------------------------------------------------- */
  var current = null;

  function setBlock(d) {
    if (d === current) return;
    if (current) showChars(current, 0);
    current = d;
    data.forEach(function (x) { x.el.classList.toggle('is-active', x === d); });
  }

  function showChars(d, n) {
    n = Math.max(0, Math.min(d.chars.length, Math.round(n)));
    if (n === d.shown) return;
    var from = Math.min(n, d.shown), to = Math.max(n, d.shown);
    for (var i = from; i < to; i++) d.chars[i].classList.toggle('is-on', i < n);
    d.shown = n;
    if (d === current) placeCursor();
  }

  function placeCursor() {
    if (!cursor || !current) return;
    var box = area.getBoundingClientRect();
    var n = current.shown;
    var r = current.chars[Math.max(0, n - 1)].getBoundingClientRect();
    var x = n > 0 ? r.right : r.left;
    cursor.style.transform = 'translate(' + (x - box.left).toFixed(1) + 'px,' + (r.top - box.top).toFixed(1) + 'px)';
    cursor.style.height = r.height.toFixed(1) + 'px';
  }

  function render(t) {
    t = t % cycle;
    for (var i = 0; i < data.length; i++) {
      var d = data[i];
      if (t >= d.total) { t -= d.total; continue; }
      setBlock(d);
      var n;
      if (t < d.typeMs) n = d.chars.length * t / d.typeMs;                        // scrive
      else if (t < d.typeMs + HOLD_MS) n = d.chars.length;                       // pausa
      else if (t < d.typeMs + HOLD_MS + ERASE_MS)                                // cancella
        n = d.chars.length * (1 - (t - d.typeMs - HOLD_MS) / ERASE_MS);
      else n = 0;                                                                // vuoto
      showChars(d, n);
      area.classList.toggle('is-typing', t < d.typeMs || (t >= d.typeMs + HOLD_MS && n > 0));
      return;
    }
  }

  /* ---- Linea del tempo ------------------------------------------------- */
  var reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var elapsed = 0, last = null, raf = null, visible = false;

  function frame(now) {
    if (last !== null) elapsed += Math.min(100, now - last);
    last = now;
    render(elapsed);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (raf) return;
    last = null;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }
  function update() {
    if (visible && !document.hidden) start(); else stop();
  }

  var resizeQueued = false;
  window.addEventListener('resize', function () {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(function () { resizeQueued = false; fitText(); });
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitText);

  if (reduce) {
    // blocchi interi, senza battitura, che cambiano ogni HOLD_STILL_MS
    var index = 0;
    var showStill = function () {
      setBlock(data[index]);
      showChars(data[index], data[index].chars.length);
      index = (index + 1) % data.length;
    };
    showStill();
    fitText();
    setInterval(showStill, HOLD_STILL_MS);
    return;
  }

  setBlock(data[0]);
  fitText();
  render(0);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      update();
    }).observe(sheet);
  } else {
    visible = true;
  }
  document.addEventListener('visibilitychange', update);
  update();
})();
