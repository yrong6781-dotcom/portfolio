// Hero avatar: the video is a head turn (left profile -> front -> right profile).
// Horizontal mouse movement scrubs it forward/backward, so she turns as the cursor moves.
// Seeks are queued through "seeked" so fast mouse moves don't flood the decoder.
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

  video.addEventListener("loadedmetadata", function () {
    targetTime = video.duration * FRONT;
    seek();
  });
  if (video.readyState >= 1) {
    targetTime = video.duration * FRONT;
    seek();
  }

  window.addEventListener("mousemove", function (e) {
    if (prevX === null) {
      prevX = e.clientX;
      return;
    }
    var delta = e.clientX - prevX;
    prevX = e.clientX;
    if (!video.duration || !delta) return;
    targetTime += (delta / window.innerWidth) * SENSITIVITY * video.duration;
    targetTime = Math.max(0, Math.min(video.duration, targetTime));
    if (!seeking) seek();
  });
})();
