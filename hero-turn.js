// Hero avatar: a head turn (left profile -> front -> right profile) as transparent WebP
// frames drawn on a canvas, so the purple glow behind shows around her without tinting her.
// Horizontal pointer movement scrubs through the frames, so she turns as the cursor
// (or a finger dragging sideways) moves.
(function () {
  var root = document.querySelector(".hero-turn");
  var canvas = root && root.querySelector("canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var COUNT = parseInt(root.dataset.frames, 10);
  var BASE = root.dataset.src; // e.g. "src/projects/hero/turn/"
  var VERSION = root.dataset.v || "1";
  var FRONT = parseFloat(root.dataset.front) || 0.5; // looking straight ahead, as a fraction
  var SENSITIVITY = 0.8; // one full screen-width swipe moves 80% of the turn

  var frames = new Array(COUNT);
  var target = FRONT; // 0..1
  var shown = FRONT;
  var drawn = -1;
  var prevX = null;

  function pad(n) {
    return ("00" + n).slice(-3);
  }

  function load(i) {
    if (frames[i]) return frames[i];
    var img = new Image();
    img.decoding = "async";
    img.src = BASE + pad(i) + ".webp?v=" + VERSION;
    img.onload = function () {
      if (Math.round(shown * (COUNT - 1)) === i) drawn = -1; // repaint if it's the one we want
      kick();
    };
    frames[i] = img;
    return img;
  }

  // nearest loaded frame to i, so scrubbing works before everything has arrived
  function nearestLoaded(i) {
    for (var d = 0; d < COUNT; d++) {
      var a = frames[i - d], b = frames[i + d];
      if (a && a.complete && a.naturalWidth) return a;
      if (b && b.complete && b.naturalWidth) return b;
    }
    return null;
  }

  function draw() {
    var i = Math.round(shown * (COUNT - 1));
    var img = nearestLoaded(i);
    if (!img || i === drawn) return;
    if (canvas.width !== img.naturalWidth) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    if (frames[i].complete) drawn = i;
  }

  var raf = 0;
  function tick() {
    raf = 0;
    shown += (target - shown) * 0.35; // a little easing so slow moves don't step
    if (Math.abs(target - shown) < 0.001) shown = target;
    draw();
    if (shown !== target || drawn === -1) kick();
  }
  function kick() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  // front frame first, then the rest outward from it
  var front = Math.round(FRONT * (COUNT - 1));
  load(front);
  for (var d = 1; d < COUNT; d++) {
    if (front - d >= 0) load(front - d);
    if (front + d < COUNT) load(front + d);
  }

  function move(x) {
    if (prevX === null) {
      prevX = x;
      return;
    }
    var delta = x - prevX;
    prevX = x;
    if (!delta) return;
    target = Math.max(0, Math.min(1, target + (delta / window.innerWidth) * SENSITIVITY));
    kick();
  }

  window.addEventListener("mousemove", function (e) {
    move(e.clientX);
  });
  window.addEventListener("touchstart", function (e) {
    prevX = e.touches[0].clientX;
  }, { passive: true });
  window.addEventListener("touchmove", function (e) {
    move(e.touches[0].clientX);
  }, { passive: true });
})();
