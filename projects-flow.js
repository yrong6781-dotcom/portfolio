// Projects 3D card flow. Every card is placed from its distance d to the front card:
// d = 0 is full size, flat and bright with its info panel open; side cards shrink, turn
// toward the centre and darken. Moving the mouse onto a side card (after a short pause),
// clicking it, the arrow buttons, arrow keys or a sideways swipe bring it to the front.
(function () {
  var flow = document.querySelector(".projects-flow");
  if (!flow) return;
  var track = flow.querySelector(".flow-track");
  var cards = Array.prototype.slice.call(track.querySelectorAll(".flow-card"));
  var count = flow.querySelector(".flow-count");
  if (!cards.length) return;

  var SCALE = [1, 0.74, 0.58, 0.48];
  var BRIGHT = [1, 0.5, 0.32, 0.22];
  var ANGLE = 28; // degrees side cards turn toward the centre
  var GAP = 20;

  // start on the second card (ProcureSmart) so there is a card on each side
  var front = Math.min(1, cards.length - 1);
  var lockedUntil = 0;

  function phone() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  function layout() {
    var w = cards[0].offsetWidth;
    var panel = phone() ? 0 : cards[front].querySelector(".flow-panel").offsetWidth + 14;
    // centre the front cover + its panel; x is each cover's centre relative to the track centre
    var frontX = -panel / 2;
    var xs = [];
    xs[front] = frontX;
    [-1, 1].forEach(function (dir) {
      var edge = frontX + dir * (w / 2 + (dir > 0 ? panel : 0) + GAP);
      for (var i = front + dir, d = 1; i >= 0 && i < cards.length; i += dir, d++) {
        var s = SCALE[Math.min(d, SCALE.length - 1)];
        var seen = w * s * Math.cos((ANGLE * Math.PI) / 180); // width after scaling and turning
        var overlap = d === 1 ? 0 : seen * 0.45;
        xs[i] = edge + dir * (seen / 2 - overlap);
        edge = edge + dir * (seen - overlap);
      }
    });

    cards.forEach(function (card, i) {
      var d = Math.abs(i - front);
      var k = Math.min(d, SCALE.length - 1);
      var turn = i === front ? 0 : i < front ? ANGLE : -ANGLE;
      card.style.transform =
        "translateX(" + xs[i].toFixed(1) + "px) rotateY(" + turn + "deg) scale(" + SCALE[k] + ")";
      card.style.filter = d ? "brightness(" + BRIGHT[k] + ") saturate(.7)" : "none";
      card.style.opacity = d > 3 ? 0 : 1;
      card.style.zIndex = 50 - d;
      card.classList.toggle("is-front", i === front);
      card.setAttribute("aria-hidden", d > 0 ? "true" : "false");
      card.querySelectorAll("a").forEach(function (a) {
        a.tabIndex = i === front ? 0 : -1;
      });
    });
    if (count) count.textContent = pad(front + 1) + " / " + pad(cards.length);
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function go(i) {
    i = Math.max(0, Math.min(cards.length - 1, i));
    if (i === front) return;
    front = i;
    lockedUntil = performance.now() + 550; // let the cards settle before hover can switch again
    layout();
  }

  // hover: the side card under the pointer comes forward after a short pause
  var hoverTimer = 0;
  track.addEventListener("mousemove", function (e) {
    var card = e.target.closest && e.target.closest(".flow-card");
    clearTimeout(hoverTimer);
    if (!card || card.classList.contains("is-front")) return;
    hoverTimer = setTimeout(function () {
      if (performance.now() >= lockedUntil) go(cards.indexOf(card));
    }, 90);
  });
  track.addEventListener("mouseleave", function () {
    clearTimeout(hoverTimer);
  });

  // a click on a side card brings it forward instead of opening the project
  track.addEventListener("click", function (e) {
    var card = e.target.closest(".flow-card");
    if (card && !card.classList.contains("is-front")) {
      e.preventDefault();
      go(cards.indexOf(card));
    }
  });

  flow.querySelectorAll(".flow-arrow").forEach(function (btn) {
    btn.addEventListener("click", function () {
      go(front + parseInt(btn.dataset.dir, 10));
    });
  });

  flow.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") go(front - 1);
    if (e.key === "ArrowRight") go(front + 1);
  });

  var startX = null;
  track.addEventListener("touchstart", function (e) {
    startX = e.touches[0].clientX;
  }, { passive: true });
  track.addEventListener("touchend", function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) go(front + (dx < 0 ? 1 : -1));
  });

  layout();
  window.addEventListener("resize", layout);
  window.addEventListener("load", layout);
})();
