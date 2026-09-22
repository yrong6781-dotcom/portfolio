// Arc card carousel for the projects section (adapted from the Auragate ArcCardCarousel).
// Each card's signed distance from the active one (wrapped into [-half, +half])
// drives its place on a downward-curving arc:
//   translateX(pos * stepX) translateY(abs * dropY + centreBump) rotate(pos * tilt)
// Only the centre card is interactive; prev / next / arrow keys / swipes turn it.
(function () {
  var root = document.querySelector(".arc-carousel");
  if (!root) return;

  var track = root.querySelector(".arc-track");
  var cards = Array.prototype.slice.call(root.querySelectorAll(".arc-card"));
  var total = cards.length;
  var half = Math.floor(total / 2);
  var active = Math.floor(total / 2);
  var mq = window.matchMedia("(max-width: 767px)");

  // Landscape cards sized from the viewport; spacing, drop and tilt scale with the
  // card so the arc keeps the same shape at every width.
  function dims() {
    var vw = document.documentElement.clientWidth;
    var cardW = mq.matches ? Math.min(vw * 0.82, 360) : Math.max(420, Math.min(vw * 0.42, 640));
    var cardH = Math.round(cardW * (mq.matches ? 0.8 : 0.72));
    var dropY = Math.round(cardW * 0.09);
    var bump = Math.round(cardW * 0.05);
    return {
      cardW: Math.round(cardW),
      cardH: cardH,
      stepX: Math.round(cardW * (mq.matches ? 0.78 : 0.84)),
      dropY: dropY,
      tilt: 6,
      bump: bump,
      containerH: cardH + dropY * 2 + bump + 24,
    };
  }

  function layout() {
    var d = dims();
    track.style.height = d.containerH + "px";
    cards.forEach(function (card, i) {
      var pos = i - active;
      if (pos > half) pos -= total;
      if (pos < -half) pos += total;
      var abs = Math.abs(pos);
      var isCenter = pos === 0;

      card.style.width = d.cardW + "px";
      card.style.height = d.cardH + "px";
      card.style.marginLeft = -d.cardW / 2 + "px";
      card.style.transform =
        "translateX(" + pos * d.stepX + "px) translateY(" + (abs * d.dropY + (isCenter ? d.bump : 0)) + "px) rotate(" + pos * d.tilt + "deg)";
      card.style.opacity = isCenter ? "1" : String(Math.max(0, 0.6 - (abs - 1) * 0.2));
      card.style.zIndex = String(100 - abs);
      card.style.pointerEvents = isCenter ? "auto" : "none";
      card.classList.toggle("is-center", isCenter);

      var link = card.querySelector(".arc-card-face");
      link.tabIndex = isCenter ? 0 : -1;
      card.setAttribute("aria-hidden", isCenter ? "false" : "true");
    });
  }

  function go(dir) {
    active = (active + dir + total) % total;
    layout();
  }

  root.querySelector(".arc-btn--prev").addEventListener("click", function () { go(-1); });
  root.querySelector(".arc-btn--next").addEventListener("click", function () { go(1); });

  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
  });

  // swipe on touch screens
  var startX = null;
  track.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse") startX = e.clientX;
  });
  window.addEventListener("pointerup", function (e) {
    if (startX === null) return;
    var dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  });

  var resizeQueued = false;
  window.addEventListener("resize", function () {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(function () {
      resizeQueued = false;
      layout();
    });
  });
  layout();
})();
