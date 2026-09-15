// Driveletics video reel on the home page:
// - paused on the first frame until the big play button (or the picture) is pressed
// - custom controls: play / pause, click or drag to seek (arrow keys step 5s), time, mute
// - controls fade out after 2.5s without pointer movement while playing
// - background music pauses while the video plays and resumes if the sound switch is still on
// - the video pauses when scrolled out of view
(function () {
  var player = document.querySelector(".reel-player");
  if (!player) return;

  var video = player.querySelector(".reel-video");
  var bigPlay = player.querySelector(".reel-big-play");
  var toggle = player.querySelector(".reel-toggle");
  var mute = player.querySelector(".reel-mute");
  var bar = player.querySelector(".reel-progress");
  var fill = player.querySelector(".reel-progress-fill");
  var time = player.querySelector(".reel-time");
  var music = document.getElementById("audioPlayer");
  var soundSwitch = document.getElementById("switchforsound");
  var pausedMusic = false;
  var idleTimer;

  function format(t) {
    t = Math.max(0, Math.floor(t || 0));
    var m = Math.floor(t / 60);
    var s = t % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function render() {
    var d = isFinite(video.duration) ? video.duration : 0;
    var p = d ? video.currentTime / d : 0;
    time.textContent = format(video.currentTime) + " / " + format(d);
    fill.style.transform = "scaleX(" + p + ")";
    bar.setAttribute("aria-valuenow", Math.round(p * 100));
  }

  function play() {
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  function togglePlay() {
    if (video.paused || video.ended) play();
    else video.pause();
  }

  function wake() {
    player.classList.remove("is-idle");
    clearTimeout(idleTimer);
    if (!video.paused) {
      idleTimer = setTimeout(function () {
        player.classList.add("is-idle");
      }, 2500);
    }
  }

  bigPlay.addEventListener("click", play);
  toggle.addEventListener("click", togglePlay);

  // touch: while the controls are hidden, a tap only brings them back instead of pausing
  var lastPointer = "mouse";
  video.addEventListener("pointerdown", function (e) {
    lastPointer = e.pointerType;
  });
  video.addEventListener("click", function () {
    if (lastPointer !== "mouse" && player.classList.contains("is-idle")) {
      wake();
      return;
    }
    togglePlay();
  });

  video.addEventListener("play", function () {
    player.classList.add("is-started", "is-playing");
    toggle.setAttribute("aria-label", "暂停");
    if (music && !music.paused) {
      music.pause();
      pausedMusic = true;
    }
    wake();
  });

  // also fires when the video reaches its end
  video.addEventListener("pause", function () {
    player.classList.remove("is-playing", "is-idle");
    clearTimeout(idleTimer);
    toggle.setAttribute("aria-label", "播放");
    if (pausedMusic) {
      pausedMusic = false;
      if (soundSwitch && soundSwitch.checked) {
        var p = music.play();
        if (p && p.catch) p.catch(function () {});
      }
    }
  });

  video.addEventListener("timeupdate", render);
  video.addEventListener("loadedmetadata", render);

  mute.addEventListener("click", function () {
    video.muted = !video.muted;
    player.classList.toggle("is-muted", video.muted);
    mute.setAttribute("aria-label", video.muted ? "开启声音" : "静音");
  });

  function seekTo(clientX) {
    if (!video.duration) return;
    var r = bar.getBoundingClientRect();
    var p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    video.currentTime = p * video.duration;
    render();
  }

  function onDrag(e) {
    seekTo(e.clientX);
  }

  bar.addEventListener("pointerdown", function (e) {
    seekTo(e.clientX);
    try {
      bar.setPointerCapture(e.pointerId);
    } catch (err) {}
    bar.addEventListener("pointermove", onDrag);
    wake();
  });

  function endDrag() {
    bar.removeEventListener("pointermove", onDrag);
  }

  bar.addEventListener("pointerup", endDrag);
  bar.addEventListener("pointercancel", endDrag);

  bar.addEventListener("keydown", function (e) {
    if (!video.duration || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + (e.key === "ArrowRight" ? 5 : -5)));
    render();
  });

  player.addEventListener("pointermove", wake);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting && !video.paused) video.pause();
    }).observe(player);
  }
})();
