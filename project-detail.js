// Detail pages:
// - the first page is handled by the enter zoom / cover morph, see project-detail.css
// - every following page (image or section) fades up once it is well inside the viewport
// - motion videos load and play only while near the viewport
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasObserver = "IntersectionObserver" in window;
  var first = document.querySelector(".detail-pages > :first-child");

  // leaving for the projects list: only morph the cover back when it is on screen,
  // otherwise it would fly in from far above or below
  if (first) {
    var coverName = first.style.viewTransitionName;
    window.addEventListener("pageswap", function (e) {
      var r = first.getBoundingClientRect();
      first.style.viewTransitionName = r.bottom < 0 || r.top > window.innerHeight ? "none" : coverName;
      // a skipped transition rejects these promises, which is expected
      if (e.viewTransition) {
        e.viewTransition.ready.catch(function () {});
        e.viewTransition.finished.catch(function () {});
      }
    });
    window.addEventListener("pageshow", function () {
      first.style.viewTransitionName = coverName;
    });
  }

  // motion videos
  var videos = document.querySelectorAll(".detail-pages video[data-src]");
  if (videos.length) {
    if (reduceMotion || !hasObserver) {
      videos.forEach(function (video) {
        video.src = video.dataset.src;
        video.controls = reduceMotion;
        if (!reduceMotion) video.autoplay = true;
      });
    } else {
      var videoObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var video = entry.target;
            if (entry.isIntersecting) {
              if (!video.getAttribute("src")) video.src = video.dataset.src;
              var playing = video.play();
              if (playing && playing.catch) playing.catch(function () {});
            } else if (!video.paused) {
              video.pause();
            }
          });
        },
        { rootMargin: "200px 0px" }
      );
      videos.forEach(function (video) {
        videoObserver.observe(video);
      });
    }
  }

  // project videos: stay paused until the play button is pressed, then use the native controls;
  // background music pauses while the video plays and comes back afterwards if it is still switched on
  document.querySelectorAll(".detail-video").forEach(function (box) {
    var video = box.querySelector("video");
    var button = box.querySelector(".detail-video-play");
    var soundToggle = document.querySelector(".detail-sound");
    var pausedMusic = [];

    button.addEventListener("click", function () {
      video.controls = true;
      var playing = video.play();
      if (playing && playing.catch) playing.catch(function () {});
    });

    video.addEventListener("play", function () {
      box.classList.add("is-started");
      document.querySelectorAll("audio").forEach(function (audio) {
        if (!audio.paused) {
          audio.pause();
          pausedMusic.push(audio);
        }
      });
    });

    function resumeMusic() {
      var on = soundToggle && soundToggle.getAttribute("aria-pressed") === "true";
      pausedMusic.forEach(function (audio) {
        if (!on) return;
        var p = audio.play();
        if (p && p.catch) p.catch(function () {});
      });
      pausedMusic = [];
    }

    video.addEventListener("pause", resumeMusic);
    video.addEventListener("ended", resumeMusic);
  });

  if (reduceMotion || !hasObserver) return;

  var pages = document.querySelectorAll(".detail-pages > :not(:first-child)");
  if (!pages.length) return;

  document.documentElement.classList.add("reveal-ready");

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    // wait until the page top passes 85% of the viewport height so the motion is actually seen
    { rootMargin: "0px 0px -15% 0px", threshold: 0 }
  );

  pages.forEach(function (page) {
    observer.observe(page);
  });
})();
