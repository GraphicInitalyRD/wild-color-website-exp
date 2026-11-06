/* ==========================================================================
   WILDCARE – Pagina Leave-in
   Due "punti di arrivo" (ragazza con la bottiglia, bottiglia) in loop.
   Passaggio da una foto all'altra:
     1. dal foro dello spray della foto che c'è (data-nozzle) parte uno
        spruzzo: una nebbia di goccioline bianche che si allarga a raggiera
        fino a riempire la cornice; dietro la nebbia compare la foto nuova,
        poi la nebbia svanisce;
     2. intanto il blocco dei 4 quadratini pieni parte dall'angolo in alto a
        sinistra, fa il giro della cornice in senso orario facendo
        ingrandire i quadratini al suo passaggio (onda) e torna al suo posto;
     3. il testo si cancella e si riscrive a macchina;
     4. fermo HOLD_MS, poi passaggio successivo.
   Le lettere sono già al loro posto, nascoste, e si accendono una alla
   volta: il testo non si sposta mentre si scrive (26 pt del PDF, ridotto
   solo se non sta).
   Si ferma quando il riquadro non è visibile o la scheda è nascosta.
   Con "riduci movimento": foto intere che cambiano ogni HOLD_STILL_MS.
   ========================================================================== */
(function () {
  'use strict';

  var TYPE_MS       = 12;     // tempo per lettera in scrittura
  var HOLD_MS       = 3000;   // fermo sul punto di arrivo
  var ERASE_MS      = 600;    // cancellazione del testo
  var TEXT_AT       = 800;    // inizio della scrittura (dall'inizio del passaggio)
  var HOLD_STILL_MS = 9000;   // "riduci movimento": durata di ogni foto

  var SPRAY_MS      = 2400;   // durata dello spruzzo (foto nuova tutta scoperta alla fine)
  var RUN_MS        = SPRAY_MS;   // giro del blocco pieno: parte e arriva insieme allo spruzzo
  var RUN_EASE      = 0.12;   // accelerazione/frenata del blocco (frazione del giro, all'inizio e alla fine)

  /* Cornice: griglia 36 × 40 nel rettangolo esterno (785,862 × 872,323 pt),
     passo 21,969 × 21,933 pt; due file su ogni lato. */
  var COLS = 36, ROWS = 40;
  var STEP_X = 21.9694 / 785.862 * 100;
  var STEP_Y = 21.9333 / 872.323 * 100;

  /* Onda dei quadratini attorno al blocco pieno (in posizioni del percorso) */
  var WAVE_MS     = 600;      // ogni quadratino torna alla misura normale in… (come Finishing Products)
  var WAVE_AHEAD  = 3;        // posizioni davanti al blocco che si gonfiano un po'
  var WAVE_SCALE  = 0.5;      // ingrandimento massimo (1,5 come in Finishing Products)

  Array.prototype.forEach.call(document.querySelectorAll('.li-sheet'), initSheet);

  function initSheet(sheet) {
    var area    = sheet.querySelector('.li-text');
    var cursor  = sheet.querySelector('.li-text__cursor');
    var block   = sheet.querySelector('.li-block');
    var slides  = Array.prototype.slice.call(sheet.querySelectorAll('.li-slide'));
    var frameEl = sheet.querySelector('.li-frame');
    var canvas  = sheet.querySelector('.li-spray');
    if (!area || !block || slides.length < 2 || !frameEl || !canvas || !canvas.getContext) return;

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
          sq.className = 'li-sq';
          sq.style.left = (cr[0] * STEP_X).toFixed(4) + '%';
          sq.style.top  = (cr[1] * STEP_Y).toFixed(4) + '%';
          frag.appendChild(sq);
          cells.push({ el: sq, slot: s, full: false, sc: 1 });
        });
      });
      frameEl.appendChild(frag);
    })();

    /* Onda: ogni quadratino si ingrandisce quando il blocco gli arriva
       addosso e torna piano alla misura normale (WAVE_MS), come l'onda di
       Finishing Products; quelli appena davanti al blocco si gonfiano un po'.
       head = posizione della testa del blocco: a riposo 1; un giro va da 1 a 1 + PATH. */
    var passedAt = [], prevHead = 1;
    for (var s0 = 0; s0 < PATH; s0++) passedAt.push(-Infinity);

    function drawFrame(head, now, moving) {
      var h = Math.floor(head);
      for (var s = Math.floor(prevHead) + 1; s <= h; s++) passedAt[s % PATH] = now;
      prevHead = head;
      for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        var behind = ((h - cell.slot) % PATH + PATH) % PATH;   // 0 = testa del blocco
        var full = behind <= 1;
        var swell = 0;
        var age = now - passedAt[cell.slot];
        if (age >= 0 && age < WAVE_MS) swell = Math.pow(1 - age / WAVE_MS, 2);
        if (moving) {
          var ahead = ((cell.slot - head) % PATH + PATH) % PATH;
          if (ahead < WAVE_AHEAD) swell = Math.max(swell, Math.pow(1 - ahead / WAVE_AHEAD, 2));
        }
        var sc = Math.round((1 + WAVE_SCALE * swell) * 100) / 100;
        if (full !== cell.full) { cell.el.classList.toggle('is-full', full); cell.full = full; }
        if (sc !== cell.sc) { cell.el.style.setProperty('--sc', sc); cell.sc = sc; }
      }
    }

    /* ---- Lettere: ogni carattere (spazi esclusi) in uno <span> ----------- */
    var chars = [];
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
              span.className = 'li-ch';
              span.textContent = text[i];
              frag.appendChild(span);
              chars.push(span);
            }
          }
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          splitChars(child);
        }
      });
    })(block);

    var TYPE_TOTAL = chars.length * TYPE_MS;
    var STEP_TOTAL = Math.max(TEXT_AT + TYPE_TOTAL, SPRAY_MS, RUN_MS) + HOLD_MS;
    var shown = 0;

    function showChars(n) {
      n = Math.max(0, Math.min(chars.length, Math.round(n)));
      if (n === shown) return;
      var from = Math.min(n, shown), to = Math.max(n, shown);
      for (var i = from; i < to; i++) chars[i].classList.toggle('is-on', i < n);
      shown = n;
      placeCursor();
    }

    function placeCursor() {
      if (!cursor) return;
      var box = area.getBoundingClientRect();
      var r = chars[Math.max(0, shown - 1)].getBoundingClientRect();
      var x = shown > 0 ? r.right : r.left;
      cursor.style.transform = 'translate(' + (x - box.left).toFixed(1) + 'px,' + (r.top - box.top).toFixed(1) + 'px)';
      cursor.style.height = r.height.toFixed(1) + 'px';
    }

    function fitText() {
      area.style.setProperty('--li-fit', '1');
      var limit = area.getBoundingClientRect().height;
      if (block.getBoundingClientRect().height > limit) {
        var lo = 0.5, hi = 1;
        for (var i = 0; i < 10; i++) {
          var mid = (lo + hi) / 2;
          area.style.setProperty('--li-fit', mid.toFixed(4));
          if (block.getBoundingClientRect().height <= limit) lo = mid; else hi = mid;
        }
        area.style.setProperty('--li-fit', lo.toFixed(4));
      }
      placeCursor();
    }

    /* ---- Spruzzo -----------------------------------------------------------
       Tutto su un canvas sopra le foto, calcolato dall'avanzamento u (0 → 1),
       quindi uguale a qualsiasi velocità del computer:
       - il fronte dello spruzzo parte dal foro e si allarga a raggiera
         (veloce all'inizio, poi rallenta) fino a coprire tutta la cornice;
       - la nuvola: tante macchie bianche morbide dentro il fronte, che si
         allargano con lui, con il bordo irregolare; a metà svanisce;
       - le goccioline: puntini bianchi finissimi che volano via dal foro
         lasciando una scia corta, un po' davanti alla nuvola;
       - la foto nuova compare dentro la nuvola, poco dietro il fronte
         (maschera con lo stesso bordo irregolare), così il cambio è coperto.
       A fine spruzzo la foto nuova diventa quella attiva e il canvas si svuota. */
    var ctx = canvas.getContext('2d');
    var mask = document.createElement('canvas');
    var mctx = mask.getContext('2d');
    var MASK_W = 140;                       // maschera piccola: ingrandita ha il bordo morbido

    // macchia morbida bianca, disegnata una volta sola e riusata
    var blob = document.createElement('canvas');
    blob.width = blob.height = 64;
    (function () {
      var b = blob.getContext('2d');
      var g = b.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.5, 'rgba(255,255,255,.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      b.fillStyle = g;
      b.fillRect(0, 0, 64, 64);
    })();

    var cw = 0, ch = 0, dpr = 1;
    function sizeCanvas() {
      var r = canvas.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cw = Math.round(r.width * dpr);
      ch = Math.round(r.height * dpr);
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      var mh = Math.round(MASK_W * ch / cw);
      if (mask.width !== MASK_W || mask.height !== mh) { mask.width = MASK_W; mask.height = mh; }
    }

    // generatore casuale con seme (ogni spruzzo diverso, ma fisso durante lo spruzzo)
    function rng(seed) {
      return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    // 0 → 1: parte veloce e rallenta, come uno spruzzo nell'aria
    function decel(u) { u = Math.max(0, Math.min(1, u)); return (1 - Math.exp(-3.2 * u)) / (1 - Math.exp(-3.2)); }
    function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

    var FRONT_END = 0.62;                    // il fronte copre tutta la cornice a questo punto dello spruzzo
    var spray = null;

    function startSpray(fromIdx, toIdx) {
      sizeCanvas();
      var img = slides[toIdx];
      if (!cw || !img.complete || !img.naturalWidth) { spray = null; return false; }
      var nz = (slides[fromIdx].getAttribute('data-nozzle') || '50 50').split(/\s+/).map(parseFloat);
      var ox = nz[0] / 100, oy = nz[1] / 100;           // in frazioni del riquadro
      var aspect = ch / cw;
      // distanza dal foro all'angolo più lontano (in larghezze del riquadro)
      var maxR = Math.max(
        Math.hypot(ox, oy * aspect), Math.hypot(1 - ox, oy * aspect),
        Math.hypot(ox, (1 - oy) * aspect), Math.hypot(1 - ox, (1 - oy) * aspect));
      var rand = rng((Math.random() * 1e9) | 0);
      var i, a;

      // bordo irregolare: raggio del fronte per ogni direzione (rumore liscio)
      var EDGE = 48, edge = [], k;
      var h1 = rand() * 6.3, h2 = rand() * 6.3, h3 = rand() * 6.3;
      for (i = 0; i < EDGE; i++) {
        a = i / EDGE * Math.PI * 2;
        edge.push(0.86 + 0.07 * Math.sin(3 * a + h1) + 0.05 * Math.sin(5 * a + h2) + 0.04 * Math.sin(9 * a + h3) + 0.03 * (rand() - 0.5));
      }
      // nuvola: macchie a distanza fissa (in frazione del fronte)
      var cloud = [];
      for (i = 0; i < 240; i++) {
        a = rand() * Math.PI * 2;
        k = Math.round(a / (Math.PI * 2) * EDGE) % EDGE;
        cloud.push({
          cos: Math.cos(a), sin: Math.sin(a),
          rho: Math.pow(rand(), 0.6) * edge[k],      // più fitta verso il bordo del fronte
          size: 0.16 + rand() * 0.24,                // in frazione del fronte
          alpha: 0.025 + rand() * 0.045
        });
      }
      // goccioline
      var drops = [];
      for (i = 0; i < 1600; i++) {
        a = rand() * Math.PI * 2;
        drops.push({
          cos: Math.cos(a), sin: Math.sin(a),
          dist: maxR * (0.15 + 1.0 * Math.pow(rand(), 0.55)),
          t0: Math.pow(rand(), 1.5) * 0.5,
          life: 0.22 + rand() * 0.3,
          size: 0.3 + rand() * 0.8,
          alpha: 0.35 + rand() * 0.55
        });
      }

      spray = { to: toIdx, img: img, ox: ox, oy: oy, maxR: maxR, edge: edge, cloud: cloud, drops: drops };
      canvas.classList.add('is-on');
      return true;
    }

    // contorno irregolare del fronte, di raggio R (px), sul contesto c, centrato in (x, y)
    function edgePath(c, s, x, y, R) {
      var n = s.edge.length;
      c.beginPath();
      for (var i = 0; i <= n; i++) {
        var a = i / n * Math.PI * 2, r = R * s.edge[i % n] / 0.86;
        if (i === 0) c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        else c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      c.closePath();
    }

    function drawSpray(u) {
      var s = spray;
      if (!s) return;
      var W = cw, H = ch, i, p, age, d, d0, r, x, y;
      var ox = s.ox * W, oy = s.oy * H;
      var full = s.maxR * W * 1.08;                                // raggio che copre tutto
      var front = full * decel(u / FRONT_END);                     // fronte della nuvola (px)
      var reveal = full * decel((u - 0.07) / FRONT_END);           // foto nuova, poco dietro

      // 1) maschera della foto nuova: forma irregolare con bordo sfumato, dietro il fronte
      var MW = mask.width, MH = mask.height, ms = MW / W;
      mctx.clearRect(0, 0, MW, MH);
      if (reveal > 0) {
        // bordo sfumato: quattro contorni uno dentro l'altro, sovrapposti
        mctx.fillStyle = '#fff';
        for (var f = 0; f < 4; f++) {
          mctx.globalAlpha = f === 3 ? 1 : 0.3;
          edgePath(mctx, s, s.ox * MW, s.oy * MH, reveal * ms * (1 - 0.08 * f));
          mctx.fill();
        }
        mctx.globalAlpha = 1;
      }
      if (u > FRONT_END) {                                          // si chiude tutto: niente buchi
        mctx.globalAlpha = clamp01((u - FRONT_END) / 0.1);
        mctx.fillStyle = '#fff';
        mctx.fillRect(0, 0, MW, MH);
        mctx.globalAlpha = 1;
      }

      // 2) foto nuova attraverso la maschera
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(mask, 0, 0, W, H);
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(s.img, 0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';

      // 3) nuvola: compare subito, resta finché il fronte arriva in fondo, poi svanisce
      var cloudA = clamp01(u / 0.08) * (1 - clamp01((u - FRONT_END * 0.8) / (1 - FRONT_END * 0.8)));
      if (cloudA > 0) {
        for (i = 0; i < s.cloud.length; i++) {
          p = s.cloud[i];
          d = p.rho * front;
          r = p.size * front + 4 * dpr;
          ctx.globalAlpha = p.alpha * cloudA;
          ctx.drawImage(blob, ox + p.cos * d - r, oy + p.sin * d - r, r * 2, r * 2);
        }
      }

      // 4) goccioline con una scia corta verso il foro
      ctx.strokeStyle = '#fff';
      ctx.lineCap = 'round';
      for (i = 0; i < s.drops.length; i++) {
        p = s.drops[i];
        age = (u - p.t0) / p.life;
        if (age <= 0 || age >= 1) continue;
        d  = p.dist * decel(age) * W;
        d0 = p.dist * decel(age - 0.025) * W;                      // dove era poco fa
        ctx.globalAlpha = p.alpha * Math.pow(1 - age, 1.3);
        ctx.lineWidth = p.size * dpr * (0.8 + 0.7 * d / (s.maxR * W));
        ctx.beginPath();
        ctx.moveTo(ox + p.cos * d0, oy + p.sin * d0);
        ctx.lineTo(ox + p.cos * d + 0.01, oy + p.sin * d);
        ctx.stroke();
      }

      // 5) sbuffo luminoso all'uscita dal foro
      if (u < 0.25) {
        r = (0.025 + 0.2 * u) * W;
        ctx.globalAlpha = 0.9 * (1 - u / 0.25);
        ctx.drawImage(blob, ox - r, oy - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }

    function endSpray() {
      canvas.classList.remove('is-on');
      if (cw) ctx.clearRect(0, 0, cw, ch);
      spray = null;
    }

    var shownSlide = 0;
    function setSlide(i) {
      if (i === shownSlide) return;
      shownSlide = i;
      slides.forEach(function (img, j) { img.classList.toggle('is-active', j === i); });
    }

    /* Giro del blocco: velocità costante, con una breve accelerazione alla
       partenza e una breve frenata all'arrivo (RUN_EASE), così si muove
       subito con lo spruzzo e si ferma esattamente alla fine. */
    function runEase(u) {
      var a = RUN_EASE, v = 1 / (1 - a);            // velocità di crociera
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      if (u < a) return v * u * u / (2 * a);
      if (u > 1 - a) { var r = 1 - u; return 1 - v * r * r / (2 * a); }
      return v * (u - a / 2);
    }

    /* ---- Linea del tempo -------------------------------------------------- */
    var lastStep = null;

    function render(t) {
      var elapsedNow = t;
      var step = Math.floor(t / STEP_TOTAL);
      t = t % STEP_TOTAL;
      var to = step % slides.length;                       // foto di arrivo di questo passaggio
      var from = (to + slides.length - 1) % slides.length;

      // inizio di un nuovo passaggio: parte lo spruzzo dal foro della foto che c'è
      var newStep = lastStep !== null && step !== lastStep;
      if (newStep) {
        endSpray();
        setSlide(from);
        if (!startSpray(from, to)) setSlide(to);           // foto non ancora pronta: cambio secco
      }
      lastStep = step;

      // spruzzo
      if (spray) {
        if (t < SPRAY_MS) drawSpray(t / SPRAY_MS);
        else { setSlide(spray.to); endSpray(); }
      }

      // blocco di quadratini pieni: un giro completo, sincronizzato con lo spruzzo
      // (parte quando esce lo spruzzo, arriva quando la nebbia è svanita)
      // (non al primo passaggio: all'apertura la ragazza è già al suo posto)
      if (newStep) prevHead = 1;
      if (step > 0 && t < RUN_MS) {
        var e = runEase(t / RUN_MS);
        drawFrame(1 + e * PATH, elapsedNow, true);
      } else {
        drawFrame(step > 0 ? 1 + PATH : 1, elapsedNow, false);
      }

      // testo: si cancella, poi si riscrive
      var typing = false;
      if (t < ERASE_MS) {
        showChars(chars.length * (1 - t / ERASE_MS));
        typing = shown > 0;
      } else if (t < TEXT_AT) {
        showChars(0);
      } else if (t < TEXT_AT + TYPE_TOTAL) {
        showChars(chars.length * (t - TEXT_AT) / TYPE_TOTAL);
        typing = true;
      } else {
        showChars(chars.length);
      }
      area.classList.toggle('is-typing', typing);
    }

    var reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var elapsed = TEXT_AT;     // si parte con la ragazza già in cornice: si scrive il testo
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
      requestAnimationFrame(function () {
        resizeQueued = false;
        fitText();
        if (!spray) sizeCanvas();   // durante uno spruzzo il canvas si ridimensiona a quello dopo
      });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitText);

    drawFrame(1, 0, false);

    if (reduce) {
      // foto intere, senza spruzzo, onda né battitura
      var index = 0;
      showChars(chars.length);
      fitText();
      setInterval(function () { index++; setSlide(index % slides.length); }, HOLD_STILL_MS);
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
