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

  function dims() {
    return mq.matches
      ? { cardW: 230, cardH: 320, stepX: 170, dropY: 34, tilt: 7, containerH: 460, bump: 22 }
      : { cardW: 300, cardH: 420, stepX: 295, dropY: 52, tilt: 8, containerH: 560, bump: 30 };
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

  if (mq.addEventListener) mq.addEventListener("change", layout);
  else mq.addListener(layout);
  layout();
})();
