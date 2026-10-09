// Hero, right side: a vertical 3D cylinder of project cards (after a "bank card carousel" brief).
// Cards flow upward continuously with a short dwell at the centre; smoothstep pushes them up/down
// and flips them so their backs show; they leave past the top/bottom edge in perspective.
// The centre card tilts toward the cursor with inertia. Every card has real thickness
// (5 stacked slices). Data is read from the projects grid, so hidden projects stay hidden.
// Clicking the centre card opens its project.
(function () {
  var stage = document.querySelector(".hero-cards");
  if (!stage) return;
  var space = stage.querySelector(".hero-cards-space");

  var projects = Array.prototype.map.call(document.querySelectorAll(".projects-grid .project-card"), function (card) {
    var img = card.querySelector("img");
    var link = card.querySelector(".project-card-link");
    return {
      cover: img.getAttribute("src"),
      title: card.querySelector(".project-card-title").textContent.trim(),
      meta: card.querySelector(".project-card-meta").textContent.trim(),
      href: link.getAttribute("href")
    };
  });
  var count = projects.length;
  if (count < 3) return;

  var D = 1350; // perspective distance (matches the CSS)
  var SPEED = 0.0016; // progress per frame
  var SLICES = [-1.47, -0.73, 0, 0.73, 1.47]; // card thickness, back → front
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var cardW = 0;
  var cardH = 0;
  var progress = 0;
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  var cards = [];

  function el(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
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
        var img = el("img", "hc-cover", slice);
        img.src = p.cover;
        img.alt = "";
        el("span", "hc-sheen", slice);
        var dots = el("span", "hc-dots", slice);
        el("i", "", dots);
        el("i", "", dots);
      } else if (k === 0) {
        slice = el("div", "hc-face hc-back", card);
        var blur = el("img", "hc-cover hc-blur", slice);
        blur.src = p.cover;
        blur.alt = "";
        el("span", "hc-stripe", slice);
        var info = el("div", "hc-info", slice);
        el("strong", "", info).textContent = p.title;
        el("span", "", info).textContent = p.meta;
        el("span", "hc-go", info).textContent = "VIEW PROJECT →";
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
    cardW = Math.round(Math.min(420, Math.max(220, w * 0.62), h * 0.62 * 1.5925));
    cardH = Math.round(cardW / 1.5925);
    space.style.width = cardW + "px";
    space.style.height = cardH + "px";
  }

  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  var front = 0;
  function render() {
    var h = stage.clientHeight;
    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;

    var rounded = Math.round(progress);
    var diff = progress - rounded; // -0.5 … 0.5
    // magnetic step: a short dwell at the centre, then it speeds to the next card
    var eased = (Math.sign(diff) * Math.pow(Math.abs(diff) * 2, 4.2)) / 2;
    var active = rounded + eased;
    front = ((rounded % count) + count) % count;

    var gap = 36;
    var peek = -55; // the second card's edge sits just past the stage edge

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
        z = 400 + t * (220 - 400);
        rot = t * 132;
      } else if (a <= 2) {
        t = smooth(a - 1);
        var yEnd = (h / 2 - peek) / (D / (D + 60)) - cardH / 2;
        y = -s * (cardH + gap + t * (yEnd - (cardH + gap)));
        z = 220 + t * (-60 - 220);
        rot = 132 + t * (175 - 132);
      } else {
        t = smooth(Math.min(a - 2, 1));
        var y2 = (h / 2 - peek) / (D / (D + 60)) - cardH / 2;
        var y3 = (h / 2 + 100) / (D / (D + 250)) + cardH / 2;
        y = -s * (y2 + t * (y3 - y2));
        z = -60 + t * (-250 + 60);
        rot = 175 + t * (195 - 175);
      }

      var centre = Math.max(0, 1 - a);
      var rx = -s * rot + -mouse.y * 12 * centre;
      var ry = mouse.x * 15 * centre;

      card.style.zIndex = Math.round(z + 300);
      card.classList.toggle("is-front", a < 0.25);
      card.style.transform =
        "translateY(" + y.toFixed(2) + "px) translateZ(" + z.toFixed(2) + "px) rotateX(" + rx.toFixed(2) +
        "deg) rotateY(" + ry.toFixed(2) + "deg) rotateZ(-3deg)";
    }
  }

  // only animate while the hero is on screen
  var visible = true;
  var raf = 0;
  function loop() {
    raf = 0;
    if (!visible) return;
    progress += SPEED;
    render();
    raf = requestAnimationFrame(loop);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !raf && !reduce) raf = requestAnimationFrame(loop);
    }).observe(stage);
  }

  window.addEventListener("mousemove", function (e) {
    mouse.tx = Math.max(-1, Math.min(1, (e.clientX - innerWidth / 2) / (innerWidth / 2)));
    mouse.ty = Math.max(-1, Math.min(1, (e.clientY - innerHeight / 2) / (innerHeight / 2)));
  });
  document.addEventListener("mouseleave", function () {
    mouse.tx = mouse.ty = 0;
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
  if (!reduce) raf = requestAnimationFrame(loop);
})();
