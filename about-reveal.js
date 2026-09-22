// Scroll-driven character reveal for [data-reveal] paragraphs (About section).
// Mirrors framer-motion's useScroll({ offset: ["start 0.8", "end 0.2"] }):
// progress is 0 when the paragraph's top reaches 80% of the viewport and 1 when
// its bottom reaches 20%. Character i brightens from 0.2 to 1 over
// [i/n - 0.1, i/n + 0.05] of that progress, so the text lights up left to right.
(function () {
  var paragraphs = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if (!paragraphs.length) return;

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var items = paragraphs.map(function (p) {
    var text = p.textContent.replace(/\s+/g, " ").trim();
    p.setAttribute("aria-label", text);
    p.textContent = "";
    var chars = Array.from(text);
    var spans = chars.map(function (c) {
      var ch = c === " " ? " " : c;
      var wrap = document.createElement("span");
      wrap.className = "reveal-char";
      wrap.setAttribute("aria-hidden", "true");
      var ghost = document.createElement("span");
      ghost.className = "reveal-ghost";
      ghost.textContent = ch;
      var live = document.createElement("span");
      live.className = "reveal-live";
      live.textContent = ch;
      wrap.appendChild(ghost);
      wrap.appendChild(live);
      p.appendChild(wrap);
      return live;
    });
    return { el: p, spans: spans };
  });

  function update() {
    var vh = window.innerHeight;
    items.forEach(function (item) {
      var r = item.el.getBoundingClientRect();
      var span = 0.6 * vh + r.height;
      var progress = reduced ? 1 : Math.min(1, Math.max(0, (0.8 * vh - r.top) / span));
      var n = item.spans.length;
      item.spans.forEach(function (s, i) {
        var at = i / n;
        var start = Math.max(0, at - 0.1);
        var end = Math.min(1, at + 0.05);
        var t = Math.min(1, Math.max(0, (progress - start) / (end - start)));
        s.style.opacity = (0.2 + 0.8 * t).toFixed(3);
      });
    });
  }

  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      update();
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();
