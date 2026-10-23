/* ==========================================================================
   WILD COLOR – Color Chart: finestra d'ingrandimento delle ciocche
   - clic su una ciocca: si apre l'ingrandimento con il nome sopra
   - frecce (o tasti ← →, o swipe sul telefono): ciocca precedente/successiva
   - X, tasto Esc o clic fuori dalla scheda: chiude
   ========================================================================== */
(function () {
  'use strict';

  var swatches = Array.prototype.slice.call(document.querySelectorAll('.cc-swatch'));
  var box = document.getElementById('cc-lightbox');
  if (!swatches.length || !box) return;

  var card    = box.querySelector('.cc-lightbox__card');
  var nameEl  = box.querySelector('.cc-lightbox__name');
  var famEl   = box.querySelector('.cc-lightbox__family');
  var lineEl  = box.querySelector('.cc-lightbox__line');
  var img     = box.querySelector('.cc-lightbox__img');
  var btnClose = box.querySelector('.cc-lightbox__close');
  var btnPrev  = box.querySelector('.cc-lightbox__nav--prev');
  var btnNext  = box.querySelector('.cc-lightbox__nav--next');

  var current = -1;
  var opener = null;

  function show(i) {
    current = (i + swatches.length) % swatches.length;
    var s = swatches[current].dataset;
    nameEl.textContent = s.name;
    famEl.textContent  = s.family;
    lineEl.textContent = s.line;
    img.src = s.src;
    img.alt = s.name + ' – ' + s.family;
    // precarica le ciocche vicine
    [current - 1, current + 1].forEach(function (n) {
      var t = swatches[(n + swatches.length) % swatches.length];
      (new Image()).src = t.dataset.src;
    });
  }

  function open(i) {
    opener = swatches[i];
    show(i);
    box.hidden = false;
    requestAnimationFrame(function () { box.classList.add('is-open'); });
    document.body.classList.add('menu-open');          // blocca lo scroll della pagina
    btnClose.focus();
  }

  function close() {
    box.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    setTimeout(function () { box.hidden = true; img.src = ''; }, 250);
    if (opener) opener.focus();
  }

  swatches.forEach(function (el, i) {
    el.addEventListener('click', function () { open(i); });
  });

  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', function () { show(current - 1); });
  btnNext.addEventListener('click', function () { show(current + 1); });

  // clic sullo sfondo scuro (fuori dalla scheda)
  box.addEventListener('click', function (e) { if (!card.contains(e.target)) close(); });

  // tastiera
  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(current - 1);
    else if (e.key === 'ArrowRight') show(current + 1);
    else if (e.key === 'Tab') {                          // il focus resta nella finestra
      var f = [btnClose, btnPrev, btnNext];
      var k = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  // swipe sul telefono
  var x0 = null;
  card.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  card.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
