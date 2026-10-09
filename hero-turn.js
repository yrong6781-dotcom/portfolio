// Hero avatar: the video is a head turn (left profile -> front -> right profile).
// Horizontal pointer movement scrubs it forward/backward, so she turns as the cursor
// (or a finger dragging sideways) moves. Seeks are queued through "seeked" so fast
// moves don't flood the decoder.
(function () {
  var video = document.querySelector(".hero-turn-video");
  if (!video) return;

  var SENSITIVITY = 0.8; // one full screen-width swipe moves 80% of the clip
  var FRONT = 0.375; // where the face looks straight ahead, as a fraction of the clip

  var prevX = null;
  var targetTime = 0;
  var seeking = false;

  function seek() {
    if (Math.abs(video.currentTime - targetTime) < 0.001) return;
    seeking = true;
    video.currentTime = targetTime;
  }

  video.addEventListener("seeked", function () {
    seeking = false;
    seek(); // the target may have moved while the last seek ran
  });

  function toFront() {
    targetTime = video.duration * FRONT;
    seek();
  }
  video.addEventListener("loadedmetadata", toFront);
  if (video.readyState >= 1) toFront();

  function move(x) {
    if (prevX === null) {
      prevX = x;
      return;
    }
    var delta = x - prevX;
    prevX = x;
    if (!video.duration || !delta) return;
    targetTime += (delta / window.innerWidth) * SENSITIVITY * video.duration;
    targetTime = Math.max(0, Math.min(video.duration, targetTime));
    if (!seeking) seek();
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
