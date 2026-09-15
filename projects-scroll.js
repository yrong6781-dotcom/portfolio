// Projects:
// - desktop: the section pins while vertical scroll slides the card track sideways;
//   trackpad horizontal swipes and mouse drags move the same track.
// - touch tablets / reduced motion: native horizontal swipe (mouse drag still works).
// - phones (<= 768px): cards stack vertically, see style.css.
(function () {
  var scroller = document.getElementById("projects-scroller");
  if (!scroller) return;

  var sticky = scroller.querySelector(".projects-sticky");
  var viewport = scroller.querySelector(".projects-viewport");
  var track = document.getElementById("projects-track");
  var bar = document.getElementById("projects-progress-bar");
  var pinQuery = window.matchMedia(
    "(min-width: 769px) and (min-height: 560px) and (hover: hover) and (prefers-reduced-motion: no-preference)"
  );
  var shift = 0;
  var ticking = false;

  function isPinned() {
    return scroller.classList.contains("is-pinned");
  }

  // how far into the pinned range the page is scrolled (0..shift), or null when not pinned on screen
  function pinnedPosition() {
    var pos = -scroller.getBoundingClientRect().top;
    return pos >= -1 && pos <= shift + 1 ? Math.min(shift, Math.max(0, pos)) : null;
  }

  function scrollPageBy(dy) {
    if (dy) window.scrollBy({ top: dy, behavior: "instant" });
  }

  function update() {
    ticking = false;
    var progress = 0;

    if (isPinned()) {
      var top = scroller.getBoundingClientRect().top;
      progress = shift ? Math.min(1, Math.max(0, -top / shift)) : 0;
      track.style.transform = "translate3d(" + -progress * shift + "px, 0, 0)";
    } else {
      var max = viewport.scrollWidth - viewport.clientWidth;
      progress = max > 0 ? viewport.scrollLeft / max : 0;
    }

    if (bar) bar.style.transform = "scaleX(" + progress + ")";
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  function layout() {
    var pinned = pinQuery.matches;
    scroller.classList.toggle("is-pinned", pinned);
    track.style.transform = "";

    if (pinned) {
      shift = Math.max(0, track.scrollWidth - viewport.clientWidth);
      scroller.style.height = sticky.offsetHeight + shift + "px";
    } else {
      shift = 0;
      scroller.style.height = "";
    }

    update();
    if (window.AOS) window.AOS.refresh();
  }

  // trackpad horizontal swipe while pinned: turn it into page scroll so the track follows
  viewport.addEventListener(
    "wheel",
    function (e) {
      if (!isPinned() || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      var pos = pinnedPosition();
      if (pos === null) return;
      if ((e.deltaX < 0 && pos <= 0) || (e.deltaX > 0 && pos >= shift)) return;
      e.preventDefault();
      var dx = e.deltaX * (e.deltaMode === 1 ? 16 : 1);
      scrollPageBy(Math.min(shift, Math.max(0, pos + dx)) - pos);
    },
    { passive: false }
  );

  // mouse drag
  var drag = null;
  var suppressClick = false;

  viewport.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (!isPinned() && viewport.scrollWidth <= viewport.clientWidth) return;
    drag = { x: e.clientX, moved: false };
  });

  window.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    drag.moved = true;
    drag.x = e.clientX;
    viewport.classList.add("is-dragging");

    if (isPinned()) {
      var pos = pinnedPosition();
      if (pos !== null) scrollPageBy(Math.min(shift, Math.max(0, pos - dx)) - pos);
    } else {
      viewport.scrollLeft -= dx;
    }
  });

  window.addEventListener("pointerup", function () {
    if (!drag) return;
    if (drag.moved) {
      suppressClick = true;
      setTimeout(function () {
        suppressClick = false;
      }, 0);
    }
    drag = null;
    viewport.classList.remove("is-dragging");
  });

  viewport.addEventListener(
    "click",
    function (e) {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  window.addEventListener("scroll", requestUpdate, { passive: true });
  viewport.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", layout);
  window.addEventListener("load", layout);
  if (pinQuery.addEventListener) pinQuery.addEventListener("change", layout);

  layout();
})();
