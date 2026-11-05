/* ==========================================================================
   WILDCARE – Pagina Finishing Products
   Tre "punti di arrivo" (uno per prodotto) che si susseguono in loop.
   Passaggio da un prodotto al successivo:
     1. il testo si cancella; i quadratini della cornice fanno un'onda
        (in senso orario dall'angolo in alto a sinistra) e passano al colore
        nuovo; la foto cambia con un'onda di quadrati (come la pagina Bleach);
     2. i quadrati grandi sopra la cornice si cancellano uno alla volta
        appena parte l'onda e, quando l'onda ha finito il giro della cornice,
        vengono ribattuti nel colore nuovo, come a macchina (da 2 a 4);
     3. il testo si riscrive a macchina nel colore nuovo;
     4. fermo HOLD_MS, poi prodotto successivo.
   Le lettere sono già al loro posto, nascoste, e si accendono una alla
   volta: il testo non si sposta mentre si scrive. Il corpo è lo stesso per
   tutti i blocchi (36 pt del PDF, ridotto solo se il blocco più lungo non sta).
   Si ferma quando il riquadro non è visibile o la scheda è nascosta.
   Con "riduci movimento": prodotti interi che cambiano ogni HOLD_STILL_MS.
   ========================================================================== */
(function () {
  'use strict';

  var TYPE_MS       = 22;     // tempo per lettera in scrittura
  var HOLD_MS       = 3000;   // fermo sul punto di arrivo
  var ERASE_MS      = 600;    // cancellazione del testo (tutto il blocco)
  var SQ_ERASE_MS   = 110;    // un quadrato grande cancellato ogni… (da quando parte l'onda)
  var SQ_TYPE_MS    = 230;    // un quadrato grande battuto ogni…
  var TEXT_GAP_MS   = 300;    // pausa prima del testo
  var HOLD_STILL_MS = 9000;   // "riduci movimento": durata di ogni prodotto

  var FRAME_STEP_MS = 11;     // ritardo tra un quadratino e il successivo (deve coincidere con il CSS)
  var FRAME_SQ_MS   = 600;    // durata dell'animazione di ogni quadratino (CSS)
  var WAVE_COLS     = 6;      // onda della foto: quadrati colonne × righe
  var WAVE_ROWS     = 7;
  var WAVE_SPREAD   = 900;    // ritardo massimo tra il primo e l'ultimo quadrato (ms)
  var WAVE_TILE_MS  = 520;    // durata di ogni quadrato (CSS)

  /* Cornice: griglia 36 × 40 nel rettangolo esterno (785,86 × 872,33 pt),
     passo 21,969 × 21,933 pt; due file su ogni lato. */
  var COLS = 36, ROWS = 40;
  var STEP_X = 21.9694 / 785.86 * 100;
  var STEP_Y = 21.9333 / 872.33 * 100;

  Array.prototype.forEach.call(document.querySelectorAll('.fin-sheet'), initSheet);

  function initSheet(sheet) {
    var area    = sheet.querySelector('.fin-text');
    var cursor  = sheet.querySelector('.fin-text__cursor');
    var blocks  = Array.prototype.slice.call(sheet.querySelectorAll('.fin-block'));
    var slides  = Array.prototype.slice.call(sheet.querySelectorAll('.fin-slide'));
    var bigs    = Array.prototype.slice.call(sheet.querySelectorAll('.fin-big'));
    var frameEl = sheet.querySelector('.fin-frame');
    var waveBox = sheet.querySelector('.fin-wave');
    if (!area || blocks.length < 2 || slides.length !== blocks.length || !frameEl || !waveBox) return;

    /* ---- Cornice: 288 quadratini, numerati in senso orario --------------- */
    var frameSteps = 0;
    (function buildFrame() {
      var frag = document.createDocumentFragment();
      var last = COLS - 1, bottom = ROWS - 1;
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var top = r <= 1, low = r >= bottom - 1, left = c <= 1, right = c >= last - 1;
          if (!(top || low || left || right)) continue;
          var t;
          if (top) t = c;                                           // in alto →
          else if (right) t = last + r;                             // a destra ↓
          else if (low) t = last + bottom + (last - c);             // in basso ←
          else t = last + bottom + last + (bottom - r);             // a sinistra ↑
          frameSteps = Math.max(frameSteps, t);
          var sq = document.createElement('span');
          sq.className = 'fin-sq';
          sq.style.left = (c * STEP_X).toFixed(4) + '%';
          sq.style.top  = (r * STEP_Y).toFixed(4) + '%';
          sq.style.setProperty('--i', t);
          frag.appendChild(sq);
        }
      }
      frameEl.appendChild(frag);
    })();
    var FRAME_WAVE_MS = frameSteps * FRAME_STEP_MS + FRAME_SQ_MS;

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
              span.className = 'fin-ch';
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
      return {
        el: block,
        chars: chars,
        shown: 0,
        color: getComputedStyle(block).getPropertyValue('--fin-c').trim(),
        squares: Math.min(bigs.length, parseInt(block.getAttribute('data-squares'), 10) || 0),
        typeMs: chars.length * TYPE_MS
      };
    });

    /* tempi di ogni passaggio (verso il prodotto successivo) */
    data.forEach(function (d) {
      d.sqTypeAt = FRAME_WAVE_MS;    // quando l'onda ha finito il giro della cornice
      d.textAt   = d.sqTypeAt + d.squares * SQ_TYPE_MS + TEXT_GAP_MS;
      d.total    = d.textAt + d.typeMs + HOLD_MS;
    });
    var cycle = data.reduce(function (sum, d) { return sum + d.total; }, 0);

    /* ---- Corpo comune a tutti i blocchi (al massimo 36 pt) --------------- */
    function fits() {
      var limit = area.getBoundingClientRect().height;
      return data.every(function (d) { return d.el.getBoundingClientRect().height <= limit; });
    }

    function fitText() {
      area.style.setProperty('--fin-fit', '1');
      if (!fits()) {
        var lo = 0.5, hi = 1;
        for (var i = 0; i < 10; i++) {
          var mid = (lo + hi) / 2;
          area.style.setProperty('--fin-fit', mid.toFixed(4));
          if (fits()) lo = mid; else hi = mid;
        }
        area.style.setProperty('--fin-fit', lo.toFixed(4));
      }
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

    /* ---- Quadrati grandi ------------------------------------------------- */
    var bigShown = -1, bigColor = '';
    function showBigs(n, color) {
      if (color !== bigColor) {
        bigs.forEach(function (b) { b.style.setProperty('--fin-big', color); });
        bigColor = color;
      }
      if (n === bigShown) return;
      bigs.forEach(function (b, i) { b.classList.toggle('is-on', i < n); });
      bigShown = n;
    }

    /* ---- Foto: onda di quadrati (come la pagina Bleach) ------------------ */
    var tiles = [];
    (function buildWave() {
      var frag = document.createDocumentFragment();
      var maxD = (WAVE_COLS - 1) + (WAVE_ROWS - 1);
      for (var r = 0; r < WAVE_ROWS; r++) {
        for (var c = 0; c < WAVE_COLS; c++) {
          var t = document.createElement('span');
          t.className = 'fin-wave__tile';
          t.style.left   = (c / WAVE_COLS * 100) + '%';
          t.style.top    = (r / WAVE_ROWS * 100) + '%';
          t.style.width  = (100 / WAVE_COLS) + '%';
          t.style.height = (100 / WAVE_ROWS) + '%';
          t.style.backgroundSize = (WAVE_COLS * 100) + '% ' + (WAVE_ROWS * 100) + '%';
          t.style.backgroundPosition = (c / (WAVE_COLS - 1) * 100) + '% ' + (r / (WAVE_ROWS - 1) * 100) + '%';
          // parte dall'angolo in alto a sinistra, come l'onda della cornice
          t.style.transitionDelay = Math.round((c + r) / maxD * WAVE_SPREAD) + 'ms';
          frag.appendChild(t);
          tiles.push(t);
        }
      }
      waveBox.appendChild(frag);
    })();

    var shownSlide = 0, waveTimer = null, waveTo = 0;

    function showSlide(i, animate) {
      if (i === shownSlide && !waveTimer) return;
      if (waveTimer) finishSlide(waveTo);
      if (i === shownSlide) return;
      shownSlide = i;
      if (!animate) { finishSlide(i); return; }
      var img = slides[i];
      var url = 'url("' + (img.currentSrc || img.src) + '")';
      tiles.forEach(function (t) { t.style.backgroundImage = url; });
      void waveBox.offsetWidth;                      // parte da quadrati chiusi
      waveBox.classList.add('is-on');
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

    /* ---- Cornice: onda e cambio colore ----------------------------------- */
    var frameTimer = null;

    function setFrame(color) {
      clearTimeout(frameTimer);
      frameTimer = null;
      frameEl.style.setProperty('--fin-frame', color);
      frameEl.classList.remove('is-waving');
    }

    function waveFrame(from, to) {
      if (frameTimer) setFrame(frameEl.style.getPropertyValue('--fin-to'));
      frameEl.style.setProperty('--fin-from', from);
      frameEl.style.setProperty('--fin-to', to);
      frameEl.classList.remove('is-waving');
      void frameEl.offsetWidth;
      frameEl.classList.add('is-waving');
      frameTimer = setTimeout(function () { setFrame(to); }, FRAME_WAVE_MS + 50);
    }

    /* ---- Linea del tempo ------------------------------------------------- */
    var lastStep = null;

    function render(t) {
      var round = Math.floor(t / cycle);
      t = t % cycle;
      for (var k = 0; k < data.length; k++) {
        var d = data[k];
        if (t >= d.total) { t -= d.total; continue; }
        var p = data[(k + data.length - 1) % data.length];

        // inizio di un nuovo passaggio: onda della cornice e cambio foto
        var step = round * data.length + k;
        if (lastStep !== null && step !== lastStep) {
          waveFrame(p.color, d.color);
          showSlide(k, true);
        }
        lastStep = step;

        // testo: cancella il precedente, poi scrive il nuovo
        var n, typing = false;
        if (t < ERASE_MS) {
          setBlock(p);
          n = p.chars.length * (1 - t / ERASE_MS);
          showChars(p, n);
          typing = n > 0;
        } else {
          setBlock(d);
          if (t < d.textAt) n = 0;
          else if (t < d.textAt + d.typeMs) { n = d.chars.length * (t - d.textAt) / d.typeMs; typing = true; }
          else n = d.chars.length;
          showChars(d, n);
        }
        area.classList.toggle('is-typing', typing);

        // quadrati grandi: cancellati uno alla volta appena parte l'onda,
        // ribattuti quando l'onda ha finito il giro
        if (t < d.sqTypeAt) {
          showBigs(Math.max(0, p.squares - Math.floor(t / SQ_ERASE_MS) - 1), p.color);
        } else {
          showBigs(Math.min(d.squares, Math.floor((t - d.sqTypeAt) / SQ_TYPE_MS) + 1), d.color);
        }
        return;
      }
    }

    var reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var elapsed = data[0].sqTypeAt;   // si parte con il primo prodotto già in cornice:
    var last = null, raf = null, visible = false;   // si battono i quadrati e il testo

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

    setFrame(data[0].color);

    if (reduce) {
      // prodotti interi, senza battitura né onde
      var index = 0;
      var showStill = function () {
        var d = data[index % data.length];
        setBlock(d);
        showChars(d, d.chars.length);
        showBigs(d.squares, d.color);
        setFrame(d.color);
        showSlide(index % data.length, false);
        index++;
      };
      showStill();
      fitText();
      setInterval(showStill, HOLD_STILL_MS);
      return;
    }

    setBlock(data[0]);
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
