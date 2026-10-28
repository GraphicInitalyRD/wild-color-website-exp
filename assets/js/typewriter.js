/* ==========================================================================
   WILD COLOR – Testo "a macchina da scrivere"
   Legge le righe da <ul data-typewriter-lines> (testo vero, per Google e
   lettori di schermo) e le scrive una alla volta in .typewriter__text:
   scrive → pausa → cancella → riga successiva, all'infinito.
   Le parti in <strong> della riga restano in grassetto mentre si scrivono.
   Si ferma quando il riquadro non è visibile. Con "riduci movimento"
   le righe compaiono intere, senza battitura.
   Se una riga è troppo lunga per l'area, il corpo si riduce solo per quella riga.
   Funziona per più riquadri nella stessa pagina, ognuno con la sua lista.
   ========================================================================== */
(function () {
  'use strict';

  var TYPE_MS   = 38;    // tempo medio per lettera
  var ERASE_MS  = 14;    // tempo per lettera in cancellazione
  var HOLD_MS   = 2600;  // pausa a riga completa
  var GAP_MS    = 450;   // pausa a riquadro vuoto

  // Riga → pezzi [{ t: testo, b: grassetto }] con gli spazi normalizzati
  function parseLine(li) {
    var segs = [];
    li.childNodes.forEach(function (node) {
      var t = node.textContent.replace(/\s+/g, ' ');
      if (!t) return;
      segs.push({ t: t, b: node.nodeName === 'STRONG' || node.nodeName === 'B' });
    });
    if (segs.length) {
      segs[0].t = segs[0].t.replace(/^ /, '');
      segs[segs.length - 1].t = segs[segs.length - 1].t.replace(/ $/, '');
    }
    var plain = segs.map(function (s) { return s.t; }).join('');
    return { segs: segs, plain: plain, len: plain.length };
  }

  document.querySelectorAll('.typewriter').forEach(function (box) {
    var out = box.querySelector('.typewriter__text');
    var src = document.getElementById(box.getAttribute('data-source'));
    if (!out || !src) return;

    var lines = Array.prototype.map.call(src.querySelectorAll('li'), parseLine);
    if (!lines.length) return;

    var reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var index   = 0;
    var timer   = null;
    var running = false;

    function wait(ms, fn) { timer = setTimeout(fn, ms); }

    // mostra i primi n caratteri della riga, rispettando i grassetti
    function show(line, n) {
      out.textContent = '';
      for (var i = 0; i < line.segs.length && n > 0; i++) {
        var seg  = line.segs[i];
        var part = seg.t.slice(0, n);
        n -= part.length;
        if (seg.b) {
          var strong = document.createElement('strong');
          strong.textContent = part;
          out.appendChild(strong);
        } else {
          out.appendChild(document.createTextNode(part));
        }
      }
    }

    // piccola variazione per un ritmo più naturale; pausa dopo la punteggiatura
    function typeDelay(ch) {
      var d = TYPE_MS * (0.6 + Math.random() * 0.8);
      if (/[,.:;]/.test(ch)) d += 160;
      return d;
    }

    function type(line, i) {
      box.classList.add('is-typing');
      if (i > line.len) {
        box.classList.remove('is-typing');
        return wait(HOLD_MS, function () { erase(line, line.len); });
      }
      show(line, i);
      wait(typeDelay(line.plain.charAt(i - 1)), function () { type(line, i + 1); });
    }

    function erase(line, i) {
      box.classList.add('is-typing');
      if (i < 0) {
        box.classList.remove('is-typing');
        index = (index + 1) % lines.length;
        return wait(GAP_MS, next);
      }
      show(line, i);
      wait(ERASE_MS, function () { erase(line, i - 1); });
    }

    function showStatic() {
      show(lines[index], lines[index].len);
      wait(HOLD_MS + 1200, function () {
        index = (index + 1) % lines.length;
        next();
      });
    }

    // Prima di scrivere una riga: la misura intera con il font del dispositivo
    // e, solo se non sta nell'area, riduce il corpo (--tw-fit) quanto basta.
    // Fissa anche l'altezza finale del blocco (in em), così mentre scrive
    // il testo non si sposta in verticale.
    // Tutto nello stesso fotogramma: a schermo non si vede nulla.
    function fit(line) {
      var scale = 1;
      box.style.setProperty('--tw-fit', scale);
      out.style.minHeight = '';
      show(line, line.len);
      while (out.offsetHeight > box.clientHeight && scale > 0.6) {
        scale = Math.round((scale - 0.04) * 100) / 100;
        box.style.setProperty('--tw-fit', scale);
      }
      var em = parseFloat(getComputedStyle(out).fontSize);
      out.style.minHeight = (out.offsetHeight / em) + 'em';
      out.textContent = '';
    }

    function next() {
      fit(lines[index]);
      reduce ? showStatic() : type(lines[index], 0);
    }

    function start() { if (!running) { running = true; out.textContent = ''; next(); } }
    function stop()  { running = false; clearTimeout(timer); }

    // parte solo quando il riquadro è sullo schermo
    var inView = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        inView && !document.hidden ? start() : stop();
      }, { threshold: 0.25 }).observe(box);
    } else {
      start();
    }

    // scheda del browser nascosta: ferma; tornando visibile riprende
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : (inView && start());
    });
  });
})();
