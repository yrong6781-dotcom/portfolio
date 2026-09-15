// Projects screen motion:
// - the heading, each card, the reel heading and the player fade up as they scroll into view;
//   parts entering together (cards in the same row) are staggered
// - hover dimming and the whole-card link are pure CSS, see style.css
// - reduced motion: nothing is hidden or animated
(function () {
  var section = document.getElementById("projects");
  if (!section) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

  var targets = section.querySelectorAll(".projects-section-div, .project-card, .reel-head, .reel-player");
  section.classList.add("motion-ready");

  var observer = new IntersectionObserver(
    function (entries) {
      var batch = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.style.transitionDelay = batch++ * 0.1 + "s";
        el.classList.add("is-in");
        observer.unobserve(el);
        setTimeout(function () {
          el.style.transitionDelay = "";
          el.classList.add("is-settled");
        }, 1200);
      });
    },
    // start early so the section never sits empty on screen
    { rootMargin: "0px 0px -8% 0px" }
  );

  targets.forEach(function (el) {
    observer.observe(el);
  });
})();
