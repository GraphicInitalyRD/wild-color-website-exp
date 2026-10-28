/* ==========================================================================
   WILD COLOR – Home: i capelli cambiano colore a ritmo delle parole
   --------------------------------------------------------------------------
   Le parole sono animate in CSS (home.css). Qui si ascoltano gli eventi di
   quelle animazioni, così il cambio colore resta sempre sincronizzato:

   - schermi larghi  (animazione "word"):   il nuovo colore entra mentre la
     parola svanisce (2,1 s dopo l'inizio), dissolvenza 1,4 s;
   - schermi stretti (animazione "word-m"): il colore cambia mentre la foto
     è spostata sul tubetto (3,2 s dopo l'inizio), dissolvenza 1 s, così
     quando la ragazza rientra i capelli sono già diversi.

   Sequenza: colore originale della foto, poi le tinte hair-01 … hair-NN
   (NN = data-hair-count sulla sezione .home-hero), e si ricomincia.
   ========================================================================== */
(function () {
  "use strict";

  var hero  = document.querySelector(".home-hero");
  var words = document.querySelector(".home-words");
  var layers = document.querySelectorAll(".home-hair");
  if (!hero || !words || layers.length < 2) return;

  var TOTAL = parseInt(hero.getAttribute("data-hair-count"), 10) || 0;
  if (TOTAL < 1) return;
  var PATH  = "assets/img/home/hair/hair-";
  var VER   = hero.getAttribute("data-hair-version") || "";   // contro la cache del browser

  // tempi (secondi) per ciascuna animazione delle parole
  var TIMING = {
    "word":        { at: 2.1, fade: 1.4 },
    "word-soft":   { at: 2.1, fade: 1.4 },
    "word-m":      { at: 3.2, fade: 1.0 },
    "word-soft-m": { at: 2.6, fade: 1.4 }
  };

  var state  = 0;          // 0 = colore originale della foto, 1…TOTAL = tinte
  var front  = null;       // livello visibile in questo momento
  var cache  = {};         // tinte già scaricate e decodificate
  var timer  = null;

  function src(n) { return PATH + (n < 10 ? "0" : "") + n + ".webp" + (VER ? "?v=" + VER : ""); }

  // scarica in anticipo una tinta (non blocca nulla)
  function preload(n) {
    if (n < 1 || cache[n]) return;
    var img = new Image();
    img.decoding = "async";
    cache[n] = { img: img, ready: false };
    img.onload = function () {
      var done = function () { cache[n].ready = true; };
      if (img.decode) img.decode().then(done, done); else done();
    };
    img.onerror = function () { delete cache[n]; };
    img.src = src(n);
  }

  function next(n) { return (n + 1) % (TOTAL + 1); }

  function change(fade) {
    var target = next(state);

    if (target === 0) {
      // ritorno al colore originale: basta far svanire il livello visibile
      if (front) { hero.style.setProperty("--hair-fade", fade + "s"); front.classList.remove("is-on"); }
      front = null;
      state = 0;
      preload(1);
      return;
    }

    // se la tinta non è ancora pronta, si salta questo giro (riprova al prossimo)
    if (!cache[target] || !cache[target].ready) { preload(target); return; }

    var back = front === layers[0] ? layers[1] : layers[0];
    back.src = cache[target].img.src;
    hero.style.setProperty("--hair-fade", fade + "s");

    back.classList.add("is-top");
    if (front) front.classList.remove("is-top");
    // forza il ricalcolo, poi accende il livello nuovo sopra quello vecchio
    void back.offsetWidth;
    back.classList.add("is-on");

    var old = front;
    if (old) {
      setTimeout(function () {
        if (old !== front) old.classList.remove("is-on");
      }, fade * 1000 + 50);
    }

    front = back;
    state = target;
    preload(next(target));
    preload(next(next(target)));
  }

  function onWordStart(e) {
    var t = TIMING[e.animationName];
    if (!t || document.hidden) return;
    clearTimeout(timer);
    timer = setTimeout(function () { change(t.fade); }, t.at * 1000);
  }

  words.addEventListener("animationstart", onWordStart);
  words.addEventListener("animationiteration", onWordStart);

  // le prime tinte si scaricano dopo il caricamento della pagina
  window.addEventListener("load", function () { preload(1); preload(2); });
})();
