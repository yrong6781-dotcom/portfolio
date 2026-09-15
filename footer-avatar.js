// Footer avatar: eyes follow the cursor, the head leans toward it, cheeks blush
// when the cursor comes close, hearts float up while hovering, and a click makes her bounce.
// Layer coordinates are in the source artwork's pixels (data-src-width wide).
(function () {
  var root = document.getElementById("footer-avatar");
  if (!root) return;

  var rig = root.querySelector(".avatar-rig");
  var irises = root.querySelectorAll(".avatar-iris");
  var srcWidth = parseFloat(root.dataset.srcWidth) || 1530;
  var eyes = (root.dataset.eyes || "589,1103,946,1075").split(",").map(Number);
  var eyeCenter = { x: (eyes[0] + eyes[2]) / 2, y: (eyes[1] + eyes[3]) / 2 };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MAX_X = 28; // iris travel, source pixels
  var MAX_Y = 10;

  var mouse = null;
  var lastMove = 0;
  var gaze = { x: 0, y: 0 };
  var tilt = { x: 0, y: 0 };
  var running = false;
  var visible = false;
  var hovering = false;
  var nextHeart = 0;

  document.addEventListener("mousemove", function (e) {
    mouse = { x: e.clientX, y: e.clientY };
    lastMove = performance.now();
  });

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function spawnHeart(burst) {
    var heart = document.createElement("span");
    heart.className = "avatar-heart";
    heart.setAttribute("aria-hidden", "true");
    heart.textContent = Math.random() < 0.7 ? "\u{1F497}" : "✨";
    heart.style.left = 25 + Math.random() * 50 + "%";
    heart.style.top = 8 + Math.random() * 22 + "%";
    heart.style.setProperty("--drift", (Math.random() * 60 - 30).toFixed(0) + "px");
    heart.style.setProperty("--rise", (burst ? 90 + Math.random() * 60 : 60 + Math.random() * 30).toFixed(0) + "px");
    heart.style.fontSize = (burst ? 18 + Math.random() * 12 : 14 + Math.random() * 8).toFixed(0) + "px";
    root.appendChild(heart);
    heart.addEventListener("animationend", function () {
      heart.remove();
    });
  }

  function frame(now) {
    if (!visible) {
      running = false;
      return;
    }
    var rect = root.getBoundingClientRect();
    var scale = rect.width / srcWidth;
    var cx = rect.left + eyeCenter.x * scale;
    var cy = rect.top + eyeCenter.y * scale;

    var targetX = 0;
    var targetY = 0;
    var near = false;
    var idle = !mouse || now - lastMove > 3000;

    if (!idle) {
      var vx = mouse.x - cx;
      var vy = mouse.y - cy;
      var d = Math.sqrt(vx * vx + vy * vy) || 1;
      var reach = Math.min(d / 220, 1);
      targetX = (vx / d) * reach;
      targetY = (vy / d) * reach;
      near = d < rect.width * 1.1;
      hovering =
        mouse.x >= rect.left && mouse.x <= rect.right && mouse.y >= rect.top && mouse.y <= rect.bottom;
    } else {
      // idle: glance around slowly
      var t = now / 1000;
      targetX = Math.sin(t * 0.7) * 0.6 + Math.sin(t * 1.9) * 0.15;
      targetY = Math.sin(t * 0.9 + 1) * 0.35;
      hovering = false;
    }

    gaze.x = lerp(gaze.x, targetX, 0.16);
    gaze.y = lerp(gaze.y, targetY, 0.16);
    var ix = gaze.x * MAX_X * scale;
    var iy = gaze.y * MAX_Y * scale;
    for (var i = 0; i < irises.length; i++) {
      irises[i].style.transform = "translate(" + ix.toFixed(2) + "px," + iy.toFixed(2) + "px)";
    }

    if (!reduceMotion) {
      tilt.x = lerp(tilt.x, idle ? 0 : targetX, 0.08);
      tilt.y = lerp(tilt.y, idle ? 0 : targetY, 0.08);
      rig.style.transform =
        "perspective(900px) rotateY(" + (tilt.x * 8).toFixed(2) + "deg) rotateX(" + (-tilt.y * 5).toFixed(2) +
        "deg) rotate(" + (tilt.x * 3).toFixed(2) + "deg) translateX(" + (tilt.x * 6).toFixed(2) + "px)";

      if (hovering && now > nextHeart) {
        spawnHeart(false);
        nextHeart = now + 520;
      }
    }

    root.classList.toggle("is-near", near && !idle);
    root.classList.toggle("is-hover", hovering);

    requestAnimationFrame(frame);
  }

  function start() {
    if (!running && visible) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        visible = entries[0].isIntersecting;
        start();
      },
      { rootMargin: "200px 0px" }
    ).observe(root);
  } else {
    visible = true;
    start();
  }

  root.addEventListener("click", function () {
    if (reduceMotion) return;
    root.classList.remove("is-bounce");
    void root.offsetWidth; // restart the animation
    root.classList.add("is-bounce");
    for (var i = 0; i < 7; i++) {
      setTimeout(function () {
        spawnHeart(true);
      }, i * 60);
    }
  });
  root.addEventListener("animationend", function (e) {
    if (e.target === rig) root.classList.remove("is-bounce");
  });
})();
