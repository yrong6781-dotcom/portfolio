// Work experience:
// - the intro and timeline items fade / rise / unblur in, staggered, when the section comes into view
// - while scrolling, each item's line fills from top to bottom as it passes a marker at 60% of the
//   viewport height; items the marker has reached light up, the ones below stay dimmed
// - reduced motion: everything is shown at once, fully filled
(function () {
  var section = document.getElementById("experience");
  if (!section) return;

  var items = Array.prototype.slice.call(section.querySelectorAll(".exp-item"));
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach(function (item) {
      item.classList.add("is-reached");
      item.style.setProperty("--fill", "1");
    });
    return;
  }

  section.classList.add("exp-armed");

  var enter = new IntersectionObserver(
    function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      section.classList.add("is-in");
      enter.disconnect();
    },
    { rootMargin: "0px 0px -20% 0px" }
  );
  enter.observe(section.querySelector(".exp-layout"));

  var ticking = false;

  function update() {
    ticking = false;
    var marker = window.innerHeight * 0.6;

    items.forEach(function (item) {
      var r = item.getBoundingClientRect();
      var fill = Math.min(1, Math.max(0, (marker - r.top) / Math.max(1, r.height)));
      item.style.setProperty("--fill", fill.toFixed(3));
      item.classList.toggle("is-reached", r.top <= marker);
      item.classList.toggle("is-current", r.top <= marker && r.bottom > marker);
    });
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  update();
})();
