/* ==========================================================================
   WILD COLOR – Pagina Peroxide (Oxidizing emulsion cream)
   Riquadro in alto: le 6 bottiglie (2,5 · 5 · 10 · 20 · 30 · 40 vol)
   si alternano in loop, ognuna per 10 secondi (SLOT_MS).
   A ogni bottiglia:
   - la frase della bottiglia precedente si cancella e a sinistra si scrive
     a macchina quella della nuova bottiglia (una frase per ogni volume,
     .oxy-text__set nello stesso ordine delle bottiglie);
   - i 4 quadrati bianchi si riempiono in diagonale (dall'angolo in basso
     a destra, dal quadrato in basso verso l'alto) fino al livello del PDF;
   - il numero sopra sale insieme al colore fino al valore della bottiglia;
   - la scritta VOL sotto i quadrati pulsa (fino al 150%) mentre si riempiono.
   Quando la frase è scritta e i quadrati sono pieni, tutto resta fermo
   fino allo scadere dei 10 secondi, poi si passa alla bottiglia successiva.
   Si ferma quando il riquadro non è visibile. Con "riduci movimento"
   resta ferma la prima bottiglia nello stato finale.
   ========================================================================== */
(function () {
  'use strict';

  var SLOT_MS      = 10000; // tempo totale di ogni bottiglia (10 s, giro completo 60 s)
  var ERASE_MS     = 300;   // cancellazione della frase precedente (tutta)
  var TYPE_START   = 380;   // inizio battitura
  var TYPE_CHAR_MS = 20;    // battitura: ms per lettera (frasi da ~170 lettere ≈ 3,5 s)
  var FILL_START   = 450;   // inizio riempimento quadrati
  var FILL_BASE_MS = 300;   // riempimento: tempo fisso...
  var FILL_PER_10  = 550;   // ...+ tempo ogni 10 volumi (= ogni quadrato)
  var PULSE_MS     = 500;   // durata indicativa di una pulsazione di VOL
  var PULSE_SCALE  = 1.5;   // dimensione massima di VOL (150%)
  // (la dissolvenza tra le bottiglie è nel CSS: .oxy-bottle, 0,45 s)

  /* Cifre del font Gobold Bold, ricavate dal PDF (unità del font: 2048/em).
     [avanzamento, tracciato SVG] */
  var GLYPHS = {
    "0": [1103, "M983 381Q983 -51 551 -51Q120 -51 120 381V1581Q120 2014 551 2014Q983 2014 983 1581ZM650 1581Q650 1694 552 1694H550Q453 1694 453 1581V381Q453 268 551 268Q650 268 650 381Z"],
    "1": [1123, "M728 1982V299H993V-20H130V299H395V1663H130V1982Z"],
    "2": [1123, "M130 421Q130 695 403 890Q659 1073 660 1196V1581Q660 1694 563 1694H561Q463 1694 463 1581V1298H130V1581Q130 2014 561 2014Q993 2014 993 1581V1189Q993 910 719 714Q463 531 463 397V299H993V-20H130Z"],
    "3": [1123, "M460 382Q463 269 562 269Q660 269 663 382V716Q663 811 631 825Q613 833 569 833H448V1152H591Q623 1152 637 1160Q663 1175 663 1264V1581Q660 1694 562 1694Q463 1694 460 1581V1298H130V1581Q130 2013 562 2014Q993 2014 993 1581V1262Q993 1058 859 989Q993 920 993 716V382Q993 -51 562 -51Q130 -50 130 382V665H460Z"],
    "4": [1123, "M959 1982V780H1068V461H959V-20H626V461H52V732L555 1982ZM390 780H626V1379Z"],
    "5": [1124, "M651 938Q651 1030 620 1043Q602 1052 555 1052Q543 1052 530 1051Q465 1048 457 993L453 895H120L164 1982H984V1663H484L468 1328Q499 1364 636 1364Q655 1364 674 1362Q834 1348 918 1233Q984 1142 984 938V381Q984 -51 552 -51Q121 -51 121 381V633H454V381Q454 268 552 268Q651 268 651 381Z"],
    "6": [1123, "M993 381Q993 -51 561 -51Q130 -51 130 381V1581Q130 2014 561 2014Q993 2014 993 1581V1298H660V1581Q660 1694 562 1694H560Q463 1694 463 1581V1156Q506 1195 633 1195Q655 1195 679 1193Q826 1178 909 1088Q993 997 993 771ZM463 381Q463 268 561 268Q660 268 660 381V771Q660 864 629 876Q611 885 564 885Q552 885 539 884Q463 881 463 771Z"],
    "7": [1123, "M121 1663V1982H1008V1759L608 -20H267L645 1663Z"],
    "8": [1123, "M460 1261Q460 1144 561 1144Q663 1144 663 1261V1581Q660 1694 562 1694Q463 1694 460 1581ZM130 713Q130 917 264 986Q130 1055 130 1259V1581Q130 2013 562 2014Q993 2014 993 1581V1259Q993 1055 859 986Q993 917 993 713V382Q993 -51 562 -51Q130 -50 130 382ZM460 382Q463 269 562 269Q660 269 663 382V713Q663 808 631 822Q613 830 566 830Q553 830 539 829Q460 826 460 713Z"],
    "9": [1123, "M660 1581Q660 1694 562 1694Q463 1694 463 1581V1191Q463 1099 494 1086Q511 1078 557 1078Q569 1078 584 1079Q660 1081 660 1191ZM130 1581Q130 2013 562 2014Q993 2014 993 1581V381Q993 -51 561 -51Q130 -51 130 381V665H463V381Q463 269 561 268H563Q660 268 660 381V807Q615 767 487 767Q467 767 444 769Q297 784 214 874Q130 966 130 1191Z"],
    ",": [641, "M120 345H521V36L408 -347H176L234 -20H120Z"]
  };
  var EM      = 2048;
  var SIZE    = 115.7647;          // corpo del numero nel PDF (pt)
  var TRACK   = -0.05 * SIZE;      // spaziatura lettere (-50/1000 em)
  var CENTER  = 761.3;             // asse del numero (pt sulla pagina)
  var BASE    = 162.92;            // linea di base (pt dall'alto)
  var SVGNS   = 'http://www.w3.org/2000/svg';

  var sheet = document.querySelector('.oxy-sheet');
  if (!sheet) return;

  var bottles = Array.prototype.slice.call(sheet.querySelectorAll('.oxy-bottle'));
  var fills   = Array.prototype.slice.call(sheet.querySelectorAll('.oxy-square__fill'));
  var numSvg  = sheet.querySelector('.oxy-num');
  var vol     = sheet.querySelector('.oxy-vol');
  var textBox = sheet.querySelector('.oxy-text');
  var cursor  = sheet.querySelector('.oxy-text__cursor');
  if (!bottles.length || fills.length !== 4 || !numSvg || !textBox) return;

  var data = bottles.map(function (img) {
    var vol = parseFloat(img.getAttribute('data-vol'));
    return {
      img: img,
      vol: vol,
      decimals: (vol % 1) ? 1 : 0,
      color: img.getAttribute('data-color'),
      // livello finale in "mezze diagonali": 2 = un quadrato pieno
      level: parseFloat(img.getAttribute('data-level')),
      fillMs: FILL_BASE_MS + FILL_PER_10 * vol / 10
    };
  });

  /* ---- Numero ---------------------------------------------------------- */
  var numGroup = document.createElementNS(SVGNS, 'g');
  numSvg.appendChild(numGroup);
  var lastLabel = null;

  function drawNumber(label) {
    if (label === lastLabel) return;
    lastLabel = label;
    var s = SIZE / EM, w = 0, i, ch;
    for (i = 0; i < label.length; i++) {
      ch = GLYPHS[label[i]];
      if (ch) w += ch[0] * s + TRACK;
    }
    var x = CENTER - w / 2;
    while (numGroup.firstChild) numGroup.removeChild(numGroup.firstChild);
    for (i = 0; i < label.length; i++) {
      ch = GLYPHS[label[i]];
      if (!ch) continue;
      var p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', ch[1]);
      p.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + BASE + ') scale(' + s.toFixed(5) + ' ' + (-s).toFixed(5) + ')');
      numGroup.appendChild(p);
      x += ch[0] * s + TRACK;
    }
  }

  function formatVol(v, decimals) {
    return decimals ? v.toFixed(1).replace('.', ',') : String(Math.round(v));
  }

  /* ---- Quadrati -------------------------------------------------------- */
  // c da 0 a 2: il colore entra dall'angolo in basso a destra
  // (c = 1 metà quadrato in diagonale, c = 2 quadrato pieno)
  function clipFor(c) {
    if (c <= 0) return 'polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%)';
    if (c >= 2) return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)';
    var k = (2 - c) * 100;               // linea x + y = k (in %)
    if (c <= 1) {
      var a = (k - 100).toFixed(2) + '%';
      return 'polygon(100% ' + a + ', 100% ' + a + ', 100% 100%, ' + a + ' 100%, ' + a + ' 100%)';
    }
    var b = k.toFixed(2) + '%';
    return 'polygon(' + b + ' 0%, 100% 0%, 100% 100%, 0% 100%, 0% ' + b + ')';
  }

  var lastClip = ['', '', '', ''];
  function drawSquares(level) {
    // fills[0] è il quadrato più in basso
    for (var i = 0; i < 4; i++) {
      var c = Math.max(0, Math.min(2, level - 2 * i));
      var clip = clipFor(c);
      if (clip !== lastClip[i]) {
        fills[i].style.clipPath = clip;
        fills[i].style.webkitClipPath = clip;
        lastClip[i] = clip;
      }
    }
  }

  /* ---- Scritta VOL ---------------------------------------------------- */
  // pulsazioni intere durante il riempimento: parte e finisce al 100%
  var lastScale = null;
  function drawVol(t, fillMs) {
    if (!vol) return;
    var scale = 1;
    if (t > 0 && t < fillMs) {
      var pulses = Math.max(1, Math.round(fillMs / PULSE_MS));
      var w = Math.sin(Math.PI * pulses * t / fillMs);
      scale = 1 + (PULSE_SCALE - 1) * w * w;
    }
    if (scale === lastScale) return;
    lastScale = scale;
    vol.style.transform = scale === 1 ? '' : 'scale(' + scale.toFixed(3) + ')';
  }

  /* ---- Testo a macchina ------------------------------------------------ */
  // Una frase per bottiglia (.oxy-text__set, stesso ordine delle bottiglie).
  // Ogni riga è una riga a sé, giustificata come nella brochure: tutte le
  // lettere sono già al loro posto (nascoste) e si accendono una alla volta,
  // così il testo non si sposta mentre si scrive.
  var sets = Array.prototype.slice.call(textBox.querySelectorAll('.oxy-text__set'));
  if (sets.length !== bottles.length) return;

  sets = sets.map(function (set) {
    var chars = [];
    Array.prototype.forEach.call(set.querySelectorAll('.oxy-line'), function (line) {
      splitLine(line, chars);
    });
    return { chars: chars, typeMs: chars.length * TYPE_CHAR_MS };
  });

  function splitLine(line, chars) {
    var words = [];
    var nodes = Array.prototype.slice.call(line.childNodes);
    line.textContent = '';
    var word = null;
    nodes.forEach(function (node) {
      var bold = node.nodeName === 'STRONG';
      var t = node.textContent.replace(/\s+/g, ' ');
      for (var i = 0; i < t.length; i++) {
        if (t[i] === ' ') { word = null; continue; }
        if (!word) {
          word = document.createElement('span');
          word.className = 'oxy-word';
          line.appendChild(word);
          words.push(word);
        }
        var span = document.createElement('span');
        span.className = 'oxy-ch' + (bold ? ' is-bold' : '');
        span.textContent = t[i];
        word.appendChild(span);
        chars.push(span);
      }
    });
  }

  var chars = sets[0].chars;  // lettere della frase sullo schermo
  var shown = 0;              // quante sono visibili
  function showChars(k, n) {
    if (sets[k].chars !== chars) {
      // cambio di frase: la precedente è già cancellata, per sicurezza si spegne
      for (var j = 0; j < shown; j++) chars[j].classList.remove('is-on');
      chars = sets[k].chars;
      shown = 0;
    }
    n = Math.max(0, Math.min(chars.length, Math.round(n)));
    if (n === shown) return;
    // si cambiano solo le lettere tra il vecchio e il nuovo numero
    var from = Math.min(n, shown), to = Math.max(n, shown);
    for (var i = from; i < to; i++) chars[i].classList.toggle('is-on', i < n);
    shown = n;
    placeCursor();
  }

  function placeCursor() {
    if (!cursor || !chars.length) return;
    var box = textBox.getBoundingClientRect();
    var x, r;
    if (shown > 0) {
      r = chars[shown - 1].getBoundingClientRect();
      x = r.right;
    } else {
      r = chars[0].getBoundingClientRect();
      x = r.left;
    }
    cursor.style.transform = 'translate(' + (x - box.left).toFixed(1) + 'px,' + (r.top - box.top).toFixed(1) + 'px)';
    cursor.style.height = r.height.toFixed(1) + 'px';
  }

  // se con il font del dispositivo una riga non sta, si riduce il corpo
  // (controllate le righe di tutte e 6 le frasi: il corpo è uguale per tutte)
  function fitText() {
    textBox.style.setProperty('--oxy-fit', 1);
    var fit = 1;
    var lines = textBox.querySelectorAll('.oxy-line');
    for (var guard = 0; guard < 12; guard++) {
      var over = false;
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].scrollWidth > lines[i].clientWidth + 1) { over = true; break; }
      }
      if (!over) break;
      fit -= 0.04;
      textBox.style.setProperty('--oxy-fit', fit.toFixed(2));
    }
    placeCursor();
  }

  /* ---- Linea del tempo ------------------------------------------------- */
  var reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var current = -1;
  var elapsed = 0;          // ms trascorsi (solo quando visibile)
  var last    = null;
  var raf     = null;
  var visible = false;

  function setBottle(i) {
    if (i === current) return;
    current = i;
    data.forEach(function (d, j) { d.img.classList.toggle('is-active', j === i); });
    sheet.style.setProperty('--oxy-color', data[i].color);
  }

  function easeOut(t) { return 1 - (1 - t) * (1 - t); }

  function render(t) {
    var i = Math.floor(t / SLOT_MS) % data.length;
    var s = t % SLOT_MS;                 // tempo dentro la bottiglia
    var d = data[i];
    setBottle(i);

    // testo: cancella la frase precedente (tutta in ERASE_MS) e scrive la nuova
    var k = (i + data.length - 1) % data.length;   // bottiglia precedente
    var typeEnd = TYPE_START + sets[i].typeMs;
    if (s < ERASE_MS) {
      if (t < SLOT_MS) showChars(i, 0);           // primo giro: niente da cancellare
      else showChars(k, sets[k].chars.length * (1 - s / ERASE_MS));
    } else if (s < TYPE_START) {
      showChars(i, 0);
    } else {
      showChars(i, sets[i].chars.length * Math.min(1, (s - TYPE_START) / sets[i].typeMs));
    }
    textBox.classList.toggle('is-typing', s < typeEnd);

    // quadrati, numero e VOL
    var p = Math.max(0, Math.min(1, (s - FILL_START) / d.fillMs));
    p = easeOut(p);
    drawSquares(d.level * p);
    drawNumber(formatVol(d.vol * p, d.decimals));
    drawVol(s - FILL_START, d.fillMs);
  }

  function frame(now) {
    if (last !== null) elapsed += Math.min(100, now - last);
    last = now;
    render(elapsed);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf || reduce) return;
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

  fitText();
  window.addEventListener('resize', fitText);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitText);

  if (reduce) {
    // stato finale della prima bottiglia, testo intero, nessun movimento
    setBottle(0);
    showChars(0, sets[0].chars.length);
    drawSquares(data[0].level);
    drawNumber(formatVol(data[0].vol, data[0].decimals));
    return;
  }

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
