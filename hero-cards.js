// Hero, right side: a vertical 3D cylinder of project cards that flips cards downward.
// Each card is a dark framed card (YR mark + number, inset cover, type + title + arrow) with a
// designed back (collection label, big faded mark, title, number) and real thickness (5 slices).
// Autoplay starts on its own: each card holds at the centre, then rolls on; ← / → step,
// hovering the front card pauses it and tilts the card toward the pointer. Cards are staggered
// left/right with a slight twist. Data comes from the projects grid, so hidden projects stay
// hidden. Clicking the centre card opens its project.
(function () {
  var stage = document.querySelector(".hero-cards");
  if (!stage) return;
  var space = stage.querySelector(".hero-cards-space");
  var counter = stage.querySelector(".hc-count");

  var projects = Array.prototype.map.call(document.querySelectorAll(".projects-grid .project-card"), function (card) {
    return {
      cover: card.querySelector("img").getAttribute("src"),
      title: card.querySelector(".project-card-title").textContent.trim(),
      meta: card.querySelector(".project-card-meta").textContent.trim(),
      href: card.querySelector(".project-card-link").getAttribute("href")
    };
  });
  var count = projects.length;
  if (count < 3) return;

  var D = 1350; // perspective distance (matches the CSS)
  var HOLD = 2000; // ms a card rests at the centre
  var MOVE = 800; // ms to roll to the next card
  var SLICES = [-1.6, -0.8, 0, 0.8, 1.6]; // card thickness, back → front
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var cardW = 0;
  var cardH = 0;
  var progress = 0;
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 }; // whole-window tilt
  var hover = { x: 0, y: 0, tx: 0, ty: 0, on: false }; // tilt toward the pointer on the front card
  var cards = [];

  function el(tag, cls, parent, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }
  function mark(parent) {
    var m = el("span", "hc-mark", parent, "YR");
    el("i", "", m, "✳");
    return m;
  }

  projects.forEach(function (p, i) {
    var card = el("a", "hc-card", space);
    card.href = p.href;
    card.setAttribute("aria-label", "查看 " + p.title);
    card.tabIndex = -1;
    SLICES.forEach(function (z, k) {
      var slice;
      if (k === SLICES.length - 1) {
        slice = el("div", "hc-face hc-front", card);
        var top = el("div", "hc-top", slice);
        mark(top);
        el("span", "hc-num", top, "/ " + pad(i + 1));
        var media = el("div", "hc-media", slice);
        var img = el("img", "", media);
        img.src = p.cover;
        img.alt = "";
        var foot = el("div", "hc-foot", slice);
        var text = el("div", "hc-text", foot);
        el("span", "hc-meta", text, p.meta);
        el("strong", "hc-title", text, p.title);
        el("span", "hc-arrow", foot, "↗");
      } else if (k === 0) {
        slice = el("div", "hc-face hc-back", card);
        el("span", "hc-back-label", slice, "YAN RONG / COLLECTION");
        mark(el("div", "hc-back-mark", slice));
        el("span", "hc-back-title", slice, p.title);
        el("span", "hc-back-num", slice, pad(i + 1) + " / " + pad(count));
        slice.style.transform = "translateZ(" + z + "px) rotateX(180deg)";
        return;
      } else {
        slice = el("div", "hc-face hc-edge", card);
      }
      slice.style.transform = "translateZ(" + z + "px)";
    });
    cards.push(card);
  });

  function measure() {
    var w = stage.clientWidth;
    var h = stage.clientHeight;
    cardW = Math.round(Math.min(280, Math.max(200, w * 0.4), h * 0.36 * 1.3));
    cardH = Math.round(cardW / 1.3);
    space.style.width = cardW + "px";
    space.style.height = cardH + "px";
    stage.style.setProperty("--hc-w", cardW + "px");
  }

  // where the second card out sits: close behind the first, never past the stage edge
  function second(h) {
    return Math.min((cardH + 6) * 1.55, (h / 2 + 40) / (D / (D + 60)) - cardH / 2);
  }

  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  function render() {
    var h = stage.clientHeight;
    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;
    hover.x += (hover.tx - hover.x) * 0.1;
    hover.y += (hover.ty - hover.y) * 0.1;

    var active = progress;
    var gap = 6; // tight stack
    var current = ((Math.round(active) % count) + count) % count;
    if (counter) counter.textContent = pad(current + 1) + " / " + pad(count);

    for (var i = 0; i < count; i++) {
      var card = cards[i];
      var offset = i - active;
      while (offset > count / 2) offset -= count;
      while (offset < -count / 2) offset += count;
      var a = Math.abs(offset);
      var s = Math.sign(offset);

      if (a > 3) {
        card.style.visibility = "hidden";
        continue;
      }
      card.style.visibility = "visible";

      var y, z, rot, t;
      if (a <= 1) {
        t = smooth(a);
        y = -s * t * (cardH + gap);
        z = 400 + t * (200 - 400);
        rot = t * 128;
      } else if (a <= 2) {
        t = smooth(a - 1);
        var yEnd = second(h);
        y = -s * (cardH + gap + t * (yEnd - (cardH + gap)));
        z = 200 + t * (-60 - 200);
        rot = 128 + t * (175 - 128);
      } else {
        t = smooth(Math.min(a - 2, 1));
        var y2 = second(h);
        var y3 = (h / 2 + 100) / (D / (D + 250)) + cardH / 2;
        y = -s * (y2 + t * (y3 - y2));
        z = -60 + t * (-250 + 60);
        rot = 175 + t * (195 - 175);
      }

      // staggered: cards above drift left, below drift right, each with its own small twist
      var x = -offset * cardW * 0.07;
      var twist = -6 + offset * 3;

      var centre = Math.max(0, 1 - a);
      var rx = -s * rot + (-mouse.y * 5 - hover.y * 10) * centre;
      var ry = -8 + (mouse.x * 6 + hover.x * 12) * centre; // a constant 3D slant, like a card held at an angle
      var lift = 1 + (hover.on ? 0.03 : 0) * centre;

      card.style.zIndex = Math.round(z + 300);
      card.classList.toggle("is-front", a < 0.25);
      card.style.transform =
        "translateX(" + x.toFixed(2) + "px) translateY(" + y.toFixed(2) + "px) translateZ(" + z.toFixed(2) +
        "px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) rotateZ(" + twist.toFixed(2) +
        "deg) scale(" + lift.toFixed(3) + ")";
    }
  }

  // timeline: rest at a whole step, then ease to the next (or previous) one
  var visible = true;
  var raf = 0;
  var from = 0;
  var to = 0;
  var phaseStart = 0;
  var moving = false;
  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function go(dir) {
    from = progress;
    to = Math.round(moving ? to : progress) + dir;
    moving = true;
    phaseStart = performance.now();
    kick();
  }
  function loop(now) {
    raf = 0;
    if (!visible) return;
    if (!phaseStart) phaseStart = now;
    var t = now - phaseStart;
    if (moving) {
      var k = Math.min(1, t / MOVE);
      progress = from + (to - from) * ease(k);
      if (k >= 1) {
        moving = false;
        phaseStart = now;
      }
    } else if (hover.on || reduce) {
      phaseStart = now; // keep resting
    } else if (t >= HOLD) {
      go(1);
    }
    render();
    kick();
  }
  function kick() {
    if (!raf && visible) raf = requestAnimationFrame(loop);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) {
        phaseStart = 0;
        kick();
      }
    }).observe(stage);
  }

  window.addEventListener("mousemove", function (e) {
    mouse.tx = Math.max(-1, Math.min(1, (e.clientX - innerWidth / 2) / (innerWidth / 2)));
    mouse.ty = Math.max(-1, Math.min(1, (e.clientY - innerHeight / 2) / (innerHeight / 2)));
    var card = e.target.closest && e.target.closest(".hc-card.is-front");
    hover.on = !!card;
    if (card) {
      var r = card.getBoundingClientRect();
      hover.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      hover.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    } else {
      hover.tx = hover.ty = 0;
    }
  });
  document.addEventListener("mouseleave", function () {
    mouse.tx = mouse.ty = hover.tx = hover.ty = 0;
    hover.on = false;
  });

  stage.querySelectorAll(".hc-step").forEach(function (btn) {
    btn.addEventListener("click", function () {
      go(parseInt(btn.dataset.dir, 10));
    });
  });

  // only the centre card opens its project; the others are just passing by
  space.addEventListener("click", function (e) {
    var card = e.target.closest(".hc-card");
    if (card && !card.classList.contains("is-front")) e.preventDefault();
  });

  measure();
  render();
  window.addEventListener("resize", function () {
    measure();
    render();
  });
  kick();
})();
