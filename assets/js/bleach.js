/* ==========================================================================
   WILD COLOR – Pagina Bleach (Bleaching Powder Plex Nine+)
   Un solo riquadro: titolo fisso, a destra le due immagini (acrobata e
   barattolo) che si alternano, a sinistra il testo diviso in blocchi
   scritti a macchina: scrive → pausa → cancella → blocco successivo.
   A ogni nuovo blocco cambia l'immagine con una "onda di quadrati"
   (come i quadratini del titolo) che parte dall'angolo in alto a destra,
   e i 36 quadratini in alto fanno un'onda da sinistra a destra.
   Tutte le lettere sono già al loro posto, nascoste, e si accendono una
   alla volta: il testo non si sposta mentre si scrive. Il corpo è lo stesso
   per tutti i blocchi: il più grande che fa stare il blocco più lungo.
   Si ferma quando il riquadro non è visibile. Con "riduci movimento"
   blocchi interi e immagini che cambiano ogni HOLD_STILL_MS, senza onda.
   ========================================================================== */
(function () {
  'use strict';

  var TYPE_MS       = 22;     // tempo per lettera in scrittura
  var HOLD_MS       = 3500;   // pausa a blocco completo
  var ERASE_MS      = 600;    // cancellazione (tutto il blocco)
  var GAP_MS        = 500;    // pausa a testo vuoto (qui parte il cambio immagine)
  var HOLD_STILL_MS = 12000;  // "riduci movimento": durata di ogni blocco
  var WAVE_COLS     = 6;      // quadrati dell'onda (colonne × righe): pochi e grandi,
  var WAVE_ROWS     = 7;      // così l'animazione resta leggera
  var WAVE_SPREAD   = 800;    // ritardo massimo tra il primo e l'ultimo quadrato (ms)
  var WAVE_TILE_MS  = 520;    // durata di ogni quadrato (deve coincidere con il CSS)

  var sheet = document.querySelector('.bleach-sheet');
  if (!sheet) return;
  var area    = sheet.querySelector('.bleach-text');
  var cursor  = sheet.querySelector('.bleach-text__cursor');
  var blocks  = Array.prototype.slice.call(sheet.querySelectorAll('.bleach-block'));
  var slides  = Array.prototype.slice.call(sheet.querySelectorAll('.bleach-slide'));
  var waveBox = sheet.querySelector('.bleach-wave');
  var squares = sheet.querySelector('.bleach-squares');
  if (!area || !blocks.length || slides.length < 2 || !waveBox) return;

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
            span.className = 'bleach-ch';
            span.textContent = text[i];
            frag.appendChild(span);
            out.push(span);
          }
        }
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1) {
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
      shown: 0,
      typeMs: typeMs,
      total: typeMs + HOLD_MS + ERASE_MS + GAP_MS
    };
  });
  var cycle = data.reduce(function (sum, d) { return sum + d.total; }, 0);

  /* ---- Corpo comune a tutti i blocchi ---------------------------------- */
  function fits() {
    var limit = area.getBoundingClientRect().height;
    return data.every(function (d) { return d.el.getBoundingClientRect().height <= limit; });
  }

  function fitText() {
    var lo = 0.5, hi = 2;
    for (var i = 0; i < 12; i++) {
      var mid = (lo + hi) / 2;
      area.style.setProperty('--bleach-fit', mid.toFixed(4));
      if (fits()) lo = mid; else hi = mid;
    }
    area.style.setProperty('--bleach-fit', lo.toFixed(4));
    placeCursor();
  }

  /* ---- Testo ----------------------------------------------------------- */
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

  /* ---- Immagini: onda di quadrati -------------------------------------- */
  // ogni quadrato mostra il suo pezzo dell'immagine nuova e cresce da 0 a 1;
  // a onda finita l'immagine nuova diventa quella di base e i quadrati spariscono
  var tiles = [];
  (function buildWave() {
    var frag = document.createDocumentFragment();
    var maxD = (WAVE_COLS - 1) + (WAVE_ROWS - 1);
    for (var r = 0; r < WAVE_ROWS; r++) {
      for (var c = 0; c < WAVE_COLS; c++) {
        var t = document.createElement('span');
        t.className = 'bleach-wave__tile';
        t.style.left   = (c / WAVE_COLS * 100) + '%';
        t.style.top    = (r / WAVE_ROWS * 100) + '%';
        t.style.width  = (100 / WAVE_COLS) + '%';
        t.style.height = (100 / WAVE_ROWS) + '%';
        t.style.backgroundSize = (WAVE_COLS * 100) + '% ' + (WAVE_ROWS * 100) + '%';
        t.style.backgroundPosition = (c / (WAVE_COLS - 1) * 100) + '% ' + (r / (WAVE_ROWS - 1) * 100) + '%';
        // parte dall'angolo in alto a destra, vicino ai quadratini del titolo
        var dist = ((WAVE_COLS - 1 - c) + r) / maxD;
        t.style.transitionDelay = Math.round(dist * WAVE_SPREAD) + 'ms';
        frag.appendChild(t);
        tiles.push(t);
      }
    }
    waveBox.appendChild(frag);
  })();

  var targetSlide = 0;     // immagine mostrata (o in arrivo con l'onda)
  var waveTimer   = null;
  var waveTo      = 0;     // immagine in arrivo con l'onda in corso

  function slideUrl(i) {
    var img = slides[i];
    return img.currentSrc || img.src;
  }

  function showSlide(i, animate) {
    if (i === targetSlide) return;
    targetSlide = i;
    if (waveTimer) finishSlide(waveTo);            // onda precedente non finita: la chiude
    if (!animate) {
      finishSlide(i);
      return;
    }
    var url = 'url("' + slideUrl(i) + '")';
    tiles.forEach(function (t) { t.style.backgroundImage = url; });
    void waveBox.offsetWidth;                      // parte da quadrati chiusi
    waveBox.classList.add('is-on');
    if (squares) {                                 // onda dei quadratini in alto
      squares.classList.remove('is-waving');
      void squares.offsetWidth;
      squares.classList.add('is-waving');
    }
    waveTo = i;
    waveTimer = setTimeout(function () { finishSlide(i); }, WAVE_SPREAD + WAVE_TILE_MS + 50);
  }

  function finishSlide(i) {
    clearTimeout(waveTimer);
    waveTimer = null;
    slides.forEach(function (img, j) { img.classList.toggle('is-active', j === i); });
    waveBox.classList.add('is-reset');
    waveBox.classList.remove('is-on');
    void waveBox.offsetWidth;
    waveBox.classList.remove('is-reset');
  }

  /* ---- Linea del tempo ------------------------------------------------- */
  function render(t) {
    var round = Math.floor(t / cycle);
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

      // immagine: alterna a ogni blocco (contando anche i giri precedenti);
      // il cambio parte nella pausa a testo vuoto prima del blocco successivo
      var count = round * data.length + i;
      if (t >= d.typeMs + HOLD_MS + ERASE_MS) count += 1;
      showSlide(count % slides.length, true);
      return;
    }
  }

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
    // blocchi interi e immagini alternate, senza battitura né onda
    var index = 0;
    var showStill = function () {
      setBlock(data[index % data.length]);
      showChars(current, current.chars.length);
      showSlide(index % slides.length, false);
      index++;
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
