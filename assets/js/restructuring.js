/* ==========================================================================
   WILDCARE – Pagina Restructuring Products
   Quattro "punti di arrivo" in loop (pagine 1-4 del PDF):
     0) tutti i prodotti   – fermo 2 s (il testo Mask si cancella nel cambio)
     1) shampoo 1000 ml    – si scrive il testo Shampoo, poi fermo 3 s
     2) shampoo 250 ml     – testo Shampoo fisso, fermo 3 s
     3) maschera 250 ml    – il testo Shampoo si cancella, si scrive il testo
                             Mask, poi fermo 6 s
   Ogni cambio (CHANGE_MS):
     - il blocco dei 4 quadratini pieni parte dall'angolo in alto a sinistra,
       fa il giro della cornice in senso orario facendo ingrandire i
       quadratini che lascia dietro di sé (scia a onda) e torna al suo posto;
     - nello stesso tempo la foto nuova entra con l'onda di quadrati 6 × 7
       (come Bleach), anche lei dall'angolo in alto a sinistra: parte insieme
       al blocco, che però arriva al suo posto un po' prima (RUN_MS).
   Il testo si scrive quando la foto nuova è arrivata. Le lettere sono già al
   loro posto, nascoste, e si accendono una alla volta: il testo non si
   sposta mentre si scrive (24 pt del PDF, ridotto solo se non sta).
   Tutto è calcolato dal tempo trascorso (uguale a qualsiasi velocità del
   computer). Si ferma quando il riquadro non è visibile o la scheda è nascosta.
   Con "riduci movimento": foto intere che cambiano ogni HOLD_STILL_MS.
   ========================================================================== */
(function () {
  'use strict';

  var CHANGE_MS     = 2400;   // cambio foto (onda di quadrati)
  var RUN_MS        = 2000;   // giro del blocco pieno: parte con l'onda e arriva un po' prima della fine
  var TYPE_MS       = 12;     // tempo per lettera in scrittura
  var ERASE_MS      = 600;    // cancellazione del testo (all'inizio del cambio)
  var HOLD_STILL_MS = 7000;   // "riduci movimento": durata di ogni foto

  /* La sequenza: foto di arrivo, testo che si cancella nel cambio, testo
     che si scrive all'arrivo, testo fisso, sosta finale (ms). */
  var STEPS = [
    { to: 0, erase: 'mask',                     hold: 2000 },
    { to: 1,                  type: 'shampoo',  hold: 3000 },
    { to: 2,                  keep: 'shampoo',  hold: 3000 },
    { to: 3, erase: 'shampoo', type: 'mask',    hold: 6000 }
  ];

  /* Onda di quadrati della foto (come Bleach) */
  var WAVE_COLS  = 6, WAVE_ROWS = 7;
  var TILE_MS    = 600;                    // crescita di ogni quadrato
  var WAVE_SPREAD = CHANGE_MS - TILE_MS;   // ritardo tra il primo e l'ultimo quadrato

  /* Cornice: griglia 36 × 40 nel rettangolo esterno (785,862 × 872,323 pt),
     passo 21,969 × 21,933 pt; due file su ogni lato. */
  var COLS = 36, ROWS = 40;
  var STEP_X = 21.9694 / 785.862 * 100;
  var STEP_Y = 21.9333 / 872.323 * 100;
  var RUN_EASE   = 0.12;     // accelerazione/frenata del blocco (frazione del giro)
  /* Scia dietro il blocco: ogni quadratino vuoto, appena il blocco lo ha
     lasciato, si allarga (SQ_RISE_MS) e torna piano alla misura normale
     (entro SQ_WAVE_MS); i quadratini pieni restano della loro misura. */
  var SQ_RISE_MS = 120;      // crescita fino al massimo
  var SQ_WAVE_MS = 900;      // durata totale (crescita + ritorno)
  var WAVE_SCALE = 0.5;      // ingrandimento massimo (1,5)

  Array.prototype.forEach.call(document.querySelectorAll('.rs-sheet'), initSheet);

  function initSheet(sheet) {
    var area    = sheet.querySelector('.rs-text');
    var cursor  = sheet.querySelector('.rs-text__cursor');
    var slides  = Array.prototype.slice.call(sheet.querySelectorAll('.rs-slide'));
    var frameEl = sheet.querySelector('.rs-frame');
    var waveBox = sheet.querySelector('.rs-wave');
    var blockEls = {};
    Array.prototype.forEach.call(sheet.querySelectorAll('.rs-block'), function (b) {
      blockEls[b.getAttribute('data-block')] = b;
    });
    if (!area || slides.length !== STEPS.length || !frameEl || !waveBox ||
        !blockEls.shampoo || !blockEls.mask) return;

    /* ---- Cornice: 288 quadratini lungo un percorso di 144 posizioni ------
       Ogni posizione è una coppia di quadratini (le due file della fascia):
       in alto colonne 0→35, a destra righe 2→39, in basso colonne 33→0,
       a sinistra righe 37→2. Il blocco pieno occupa due posizioni
       consecutive: a riposo la 0 e la 1 = il quadrato 2 × 2 in alto a sinistra. */
    var PATH = 0, cells = [];
    (function buildFrame() {
      var last = COLS - 1, bottom = ROWS - 1;
      var slotsOf = [];
      var c, r;
      for (c = 0; c <= last; c++)          slotsOf.push([[c, 0], [c, 1]]);
      for (r = 2; r <= bottom; r++)        slotsOf.push([[last - 1, r], [last, r]]);
      for (c = last - 2; c >= 0; c--)      slotsOf.push([[c, bottom - 1], [c, bottom]]);
      for (r = bottom - 2; r >= 2; r--)    slotsOf.push([[0, r], [1, r]]);
      PATH = slotsOf.length;               // 144
      var frag = document.createDocumentFragment();
      slotsOf.forEach(function (pair, s) {
        pair.forEach(function (cr) {
          var sq = document.createElement('span');
          sq.className = 'rs-sq';
          sq.style.left = (cr[0] * STEP_X).toFixed(4) + '%';
          sq.style.top  = (cr[1] * STEP_Y).toFixed(4) + '%';
          frag.appendChild(sq);
          cells.push({ el: sq, slot: s, full: false, sc: 1 });
        });
      });
      frameEl.appendChild(frag);
    })();

    /* Onda: scia dietro il blocco. Ogni posizione si allarga quando il blocco
       la lascia (la coda passa oltre) e torna piano alla misura normale.
       head = posizione della testa del blocco: a riposo 1; un giro va da 1 a 1 + PATH. */
    var passedAt = [], prevHead = 1;
    for (var s0 = 0; s0 < PATH; s0++) passedAt.push(-Infinity);

    function drawFrame(head, now, moving) {
      var h = Math.floor(head);
      // la testa arriva in s → la posizione s − 2 è appena stata lasciata dalla coda
      for (var s = Math.floor(prevHead) + 1; s <= h; s++) passedAt[(s - 2 + PATH) % PATH] = now;
      prevHead = head;
      for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        var behind = ((h - cell.slot) % PATH + PATH) % PATH;   // 0 = testa del blocco
        var full = behind <= 1;
        var swell = 0;
        var age = now - passedAt[cell.slot];
        if (!full && age >= 0 && age < SQ_WAVE_MS) {
          if (age < SQ_RISE_MS) { var q = age / SQ_RISE_MS; swell = 1 - (1 - q) * (1 - q); }
          else swell = Math.pow(1 - (age - SQ_RISE_MS) / (SQ_WAVE_MS - SQ_RISE_MS), 2);
        }
        var sc = Math.round((1 + WAVE_SCALE * swell) * 100) / 100;
        if (full !== cell.full) { cell.el.classList.toggle('is-full', full); cell.full = full; }
        if (sc !== cell.sc) { cell.el.style.setProperty('--sc', sc); cell.sc = sc; }
      }
    }

    /* Giro del blocco: velocità costante, con una breve accelerazione alla
       partenza e una breve frenata all'arrivo. */
    function runEase(u) {
      var a = RUN_EASE, v = 1 / (1 - a);
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      if (u < a) return v * u * u / (2 * a);
      if (u > 1 - a) { var r = 1 - u; return 1 - v * r * r / (2 * a); }
      return v * (u - a / 2);
    }

    /* ---- Foto: onda di quadrati (come Bleach) ----------------------------- */
    var tiles = [];
    (function buildWave() {
      var frag = document.createDocumentFragment();
      var maxD = (WAVE_COLS - 1) + (WAVE_ROWS - 1);
      for (var r = 0; r < WAVE_ROWS; r++) {
        for (var c = 0; c < WAVE_COLS; c++) {
          var t = document.createElement('span');
          t.className = 'rs-wave__tile';
          t.style.left   = (c / WAVE_COLS * 100) + '%';
          t.style.top    = (r / WAVE_ROWS * 100) + '%';
          t.style.width  = (100 / WAVE_COLS) + '%';
          t.style.height = (100 / WAVE_ROWS) + '%';
          t.style.backgroundSize = (WAVE_COLS * 100) + '% ' + (WAVE_ROWS * 100) + '%';
          t.style.backgroundPosition = (c / (WAVE_COLS - 1) * 100) + '% ' + (r / (WAVE_ROWS - 1) * 100) + '%';
          frag.appendChild(t);
          // parte dall'angolo in alto a sinistra, come il blocco della cornice
          tiles.push({ el: t, delay: (c + r) / maxD * WAVE_SPREAD, k: -1 });
        }
      }
      waveBox.appendChild(frag);
    })();

    function easeOut(u) { return 1 - Math.pow(1 - u, 3); }

    var shownSlide = 0;
    function setSlide(i) {
      if (i === shownSlide) return;
      shownSlide = i;
      slides.forEach(function (img, j) { img.classList.toggle('is-active', j === i); });
    }

    function startWave(i) {
      var img = slides[i];
      var url = 'url("' + (img.currentSrc || img.src) + '")';
      tiles.forEach(function (t) { t.el.style.backgroundImage = url; t.el.style.setProperty('--k', 0); t.k = 0; });
      waveBox.classList.add('is-on');
    }
    function drawWave(t) {
      for (var i = 0; i < tiles.length; i++) {
        var tile = tiles[i];
        var u = (t - tile.delay) / TILE_MS;
        var k = u <= 0 ? 0 : u >= 1 ? 1.02 : Math.round(easeOut(u) * 1.02 * 1000) / 1000;
        if (k !== tile.k) { tile.el.style.setProperty('--k', k); tile.k = k; }
      }
    }
    function endWave() { waveBox.classList.remove('is-on'); }

    /* ---- Lettere: ogni carattere (spazi esclusi) in uno <span> ----------- */
    var chars = {};
    Object.keys(blockEls).forEach(function (name) {
      var list = [];
      (function splitChars(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var text = child.textContent.replace(/\s+/g, ' ');
            var frag = document.createDocumentFragment();
            for (var i = 0; i < text.length; i++) {
              if (text[i] === ' ') {
                frag.appendChild(document.createTextNode(' '));
              } else {
                var span = document.createElement('span');
                span.className = 'rs-ch';
                span.textContent = text[i];
                frag.appendChild(span);
                list.push(span);
              }
            }
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1) {
            splitChars(child);
          }
        });
      })(blockEls[name]);
      chars[name] = { list: list, shown: 0 };
    });

    function showChars(name, n) {
      var b = chars[name];
      n = Math.max(0, Math.min(b.list.length, Math.round(n)));
      if (n === b.shown) return;
      var from = Math.min(n, b.shown), to = Math.max(n, b.shown);
      for (var i = from; i < to; i++) b.list[i].classList.toggle('is-on', i < n);
      b.shown = n;
    }

    var cursorBlock = 'shampoo';
    function placeCursor() {
      if (!cursor) return;
      var b = chars[cursorBlock];
      var box = area.getBoundingClientRect();
      var r = b.list[Math.max(0, b.shown - 1)].getBoundingClientRect();
      var x = b.shown > 0 ? r.right : r.left;
      cursor.style.transform = 'translate(' + (x - box.left).toFixed(1) + 'px,' + (r.top - box.top).toFixed(1) + 'px)';
      cursor.style.height = r.height.toFixed(1) + 'px';
    }

    // corpo comune ai due blocchi: 24 pt, ridotto solo se il più lungo non sta
    function fitText() {
      area.style.setProperty('--rs-fit', '1');
      var limit = area.getBoundingClientRect().height;
      function tallest() {
        return Math.max(blockEls.shampoo.getBoundingClientRect().height,
                        blockEls.mask.getBoundingClientRect().height);
      }
      if (tallest() > limit) {
        var lo = 0.5, hi = 1;
        for (var i = 0; i < 10; i++) {
          var mid = (lo + hi) / 2;
          area.style.setProperty('--rs-fit', mid.toFixed(4));
          if (tallest() <= limit) lo = mid; else hi = mid;
        }
        area.style.setProperty('--rs-fit', lo.toFixed(4));
      }
      placeCursor();
    }

    /* ---- Linea del tempo -------------------------------------------------- */
    var starts = [], total = 0;
    STEPS.forEach(function (st) {
      st.typeMs = st.type ? chars[st.type].list.length * TYPE_MS : 0;
      st.dur = CHANGE_MS + st.typeMs + st.hold;
      starts.push(total);
      total += st.dur;
    });

    var lastStep = null;

    function render(elapsed) {
      var cycle = Math.floor(elapsed / total);
      var tc = elapsed - cycle * total;
      var i = STEPS.length - 1;
      while (i > 0 && tc < starts[i]) i--;
      var st = STEPS[i];
      var t = tc - starts[i];
      var stepId = cycle * STEPS.length + i;

      // inizio di un cambio: parte l'onda della foto nuova
      var newStep = lastStep !== null && stepId !== lastStep;
      if (newStep) {
        setSlide((st.to + STEPS.length - 1) % STEPS.length);
        startWave(st.to);
        prevHead = 1;
      }
      lastStep = stepId;

      var changing = t < CHANGE_MS && stepId > 0;      // all'apertura la foto 1 è già al suo posto
      if (changing && waveBox.classList.contains('is-on')) {
        drawWave(t);
      } else if (waveBox.classList.contains('is-on') || t >= CHANGE_MS) {
        setSlide(st.to);
        endWave();
      }

      // blocco di quadratini pieni: un giro completo, parte con l'onda della foto
      // e arriva poco prima che sia finita
      if (changing && t < RUN_MS) drawFrame(1 + runEase(t / RUN_MS) * PATH, elapsed, true);
      else drawFrame(stepId > 0 ? 1 + PATH : 1, elapsed, false);

      // testo
      var counts = { shampoo: 0, mask: 0 };
      var typing = false;
      if (st.erase && t < ERASE_MS) {
        counts[st.erase] = chars[st.erase].list.length * (1 - t / ERASE_MS);
        cursorBlock = st.erase;
        typing = counts[st.erase] > 0.5;
      } else if (st.keep) {
        counts[st.keep] = chars[st.keep].list.length;
        cursorBlock = st.keep;
      } else if (st.type) {
        cursorBlock = st.type;
        if (t >= CHANGE_MS) {
          var u = (t - CHANGE_MS) / st.typeMs;
          counts[st.type] = chars[st.type].list.length * Math.min(1, u);
          typing = u < 1;
        }
      } else {
        cursorBlock = 'shampoo';                       // in attesa del prossimo testo
      }
      showChars('shampoo', counts.shampoo);
      showChars('mask', counts.mask);
      placeCursor();
      area.classList.toggle('is-typing', typing);
    }

    var reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var elapsed = CHANGE_MS;   // si parte con tutti i prodotti già in cornice
    var last = null, raf = null, visible = false;

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

    drawFrame(1, 0, false);

    if (reduce) {
      // foto intere con il loro testo, senza onde né battitura
      var index = 0;
      var still = function () {
        var st = STEPS[index % STEPS.length];
        setSlide(st.to);
        var name = st.type || st.keep || null;
        showChars('shampoo', name === 'shampoo' ? Infinity : 0);
        showChars('mask', name === 'mask' ? Infinity : 0);
      };
      fitText();
      still();
      setInterval(function () { index++; still(); }, HOLD_STILL_MS);
      return;
    }

    fitText();
    render(elapsed);
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
  }
})();
