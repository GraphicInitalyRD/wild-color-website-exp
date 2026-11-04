/* ==========================================================================
   WILD COLOR – Hair Color Cream: le 3 ragazze nei riquadri si rimescolano
   - ferme 2,5 s, poi volano insieme per 1,8 s su traiettorie curve e
     irregolari ("sciame") e si posano in un ordine nuovo, all'infinito;
   - disposizione sempre come nel PDF: 1ª e 3ª allineate a sinistra, quella
     in mezzo allineata a destra; sovrapposizioni fisse (25,6 e 17,4 pt), quindi
     l'ingombro verticale complessivo resta identico (y 38,85 → 461,09 pt);
   - si ferma se il riquadro è fuori schermo o la scheda del browser è nascosta;
   - con "riduci movimento" restano ferme nell'ordine di partenza.
   Misure in pt della pagina del PDF (836,22 × 1130,06), trasformate in %.
   ========================================================================== */
(function () {
  'use strict';

  var box = document.querySelector('.hc-girls');
  if (!box || !box.animate) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var PAGE_W = 836.22, PAGE_H = 1130.06;
  var TOP = 38.850;                 // bordo alto del primo riquadro (centro del filo)
  var LEFT = 27.004;                // 1º e 3º riquadro: filo sinistro
  var RIGHT = 316.829;              // riquadro di mezzo: filo destro
  var OVERLAP = [25.607, 17.426];   // sovrapposizione 1º/2º e 2º/3º
  var SWARM = { x0: 6, x1: 330, y0: 18, y1: 478 };   // area del volo (a sinistra dei pulsanti)
  var HOLD = 2500, FLIGHT = 1800, STAGGER = 70;

  var cards = Array.prototype.slice.call(box.querySelectorAll('.hc-girl')).map(function (el) {
    return {
      el: el,
      w: parseFloat(el.getAttribute('data-w')),   // riquadro (centro del filo), pt
      h: parseFloat(el.getAttribute('data-h')),
      s: parseFloat(el.getAttribute('data-s'))    // spessore del filo, pt
    };
  });
  if (cards.length !== 3) return;

  var order = [0, 1, 2];            // ordine di partenza = quello del PDF
  var pos = layout(order);

  function layout(ord) {
    var y = TOP, out = [];
    ord.forEach(function (i, k) {
      var c = cards[i];
      out[i] = { x: k === 1 ? RIGHT - c.w : LEFT, y: y, r: 0 };
      y += c.h - (OVERLAP[k] || 0);
    });
    return out;
  }

  function css(c, p) {
    return {
      left: ((p.x - c.s / 2) / PAGE_W * 100).toFixed(4) + '%',
      top: ((p.y - c.s / 2) / PAGE_H * 100).toFixed(4) + '%',
      transform: 'rotate(' + p.r.toFixed(2) + 'deg)'
    };
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  // Catmull-Rom: curva morbida che passa per tutti i punti
  function cr(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
  }

  function path(c, from, to) {
    var pts = [from];
    for (var n = 0; n < 3; n++) {
      pts.push({ x: rnd(SWARM.x0, SWARM.x1 - c.w), y: rnd(SWARM.y0, SWARM.y1 - c.h), r: rnd(-7, 7) });
    }
    pts.push(to);
    var ext = [pts[0]].concat(pts, [pts[pts.length - 1]]);
    var frames = [], seg = pts.length - 1, steps = 12;
    for (var s = 0; s < seg; s++) {
      for (var k = 0; k < steps; k++) {
        var t = k / steps, a = ext[s], b = ext[s + 1], d = ext[s + 2], e = ext[s + 3];
        frames.push(css(c, { x: cr(a.x, b.x, d.x, e.x, t), y: cr(a.y, b.y, d.y, e.y, t), r: cr(a.r, b.r, d.r, e.r, t) }));
      }
    }
    frames.push(css(c, to));
    return frames;
  }

  function nextOrder() {
    var all = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]].filter(function (o) {
      return o.join() !== order.join();
    });
    return all[Math.floor(Math.random() * all.length)];
  }

  function shuffle(done) {
    order = nextOrder();
    var target = layout(order), left = cards.length;
    cards.forEach(function (c, i) {
      c.el.style.zIndex = String(1 + Math.floor(Math.random() * 3));
      var anim = c.el.animate(path(c, pos[i], target[i]), {
        duration: FLIGHT - STAGGER * 2,
        delay: STAGGER * i,
        easing: 'cubic-bezier(.42, 0, .3, 1)',
        fill: 'forwards'
      });
      anim.onfinish = function () {
        var f = css(c, target[i]);
        c.el.style.left = f.left;
        c.el.style.top = f.top;
        c.el.style.transform = '';
        anim.cancel();
        if (--left === 0) { pos = target; done(); }
      };
    });
  }

  // si muove solo quando si vede
  var visible = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(box);
  } else {
    visible = true;
  }

  function tick() {
    if (!visible || document.hidden) { setTimeout(tick, 500); return; }
    shuffle(function () { setTimeout(tick, HOLD); });
  }
  setTimeout(tick, HOLD);
})();
