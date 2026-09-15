// Work experience:
// - each part enters as it scrolls into view: the intro lines rise and unblur one after another, every
//   timeline item slides in from the right while its dot pops and its line draws down
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

  // parts entering together (e.g. the first two items) are staggered
  var enter = new IntersectionObserver(
    function (entries) {
      var batch = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.style.transitionDelay = batch++ * 0.15 + "s";
        el.classList.add("is-in");
        enter.unobserve(el);
        setTimeout(function () {
          el.style.transitionDelay = "";
        }, 1500);
      });
    },
    { rootMargin: "0px 0px -12% 0px" }
  );
  enter.observe(section.querySelector(".exp-intro"));
  items.forEach(function (item) {
    enter.observe(item);
  });

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
