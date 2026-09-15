// Shared by the home page and the project detail pages:
// - custom cursor (inner dot + trailing ring, grows over links / buttons / labels)
// - background music that keeps its on/off state and position across pages
(function () {
  /* ---------------- cursor ---------------- */
  function cursorEl(id) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.className = id;
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
    }
    return el;
  }

  var cursorInner = cursorEl("cursor-inner");
  var cursorOuter = cursorEl("cursor-outer");
  var HOVER_TARGETS = "a,label,button";

  // stay hidden until the mouse first moves, instead of sitting in the top-left corner
  cursorInner.style.opacity = "0";
  cursorOuter.style.opacity = "0";

  document.addEventListener("mousemove", function (e) {
    cursorInner.style.opacity = "";
    cursorOuter.style.opacity = "";
    cursorInner.style.left = e.clientX + "px";
    cursorInner.style.top = e.clientY + "px";
    cursorOuter.animate(
      { left: e.clientX + "px", top: e.clientY + "px" },
      { duration: 500, fill: "forwards" }
    );
  });

  document.addEventListener("mouseover", function (e) {
    if (e.target.closest && e.target.closest(HOVER_TARGETS)) {
      cursorInner.classList.add("hover");
      cursorOuter.classList.add("hover");
    }
  });

  document.addEventListener("mouseout", function (e) {
    var from = e.target.closest && e.target.closest(HOVER_TARGETS);
    var to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(HOVER_TARGETS);
    if (from && from !== to) {
      cursorInner.classList.remove("hover");
      cursorOuter.classList.remove("hover");
    }
  });

  /* ---------------- email / phone links ---------------- */
  // mailto: / tel: only work when a mail app or a phone can take them; on desktops that often
  // does nothing, so also copy the address / number and say so. The link still opens normally.
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopy(text);
      });
    }
    return legacyCopy(text);
  }

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {}
      document.body.removeChild(area);
      ok ? resolve() : reject();
    });
  }

  var toast = null;
  var toastTimer = 0;
  function showToast(message) {
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "copy-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("is-shown");
    }, 2200);
  }

  var canDial = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest('a[href^="mailto:"], a[href^="tel:"]');
    if (!link) return;
    var href = link.getAttribute("href");
    var isPhone = href.indexOf("tel:") === 0;
    if (isPhone && canDial) return; // phones dial directly
    var value = decodeURIComponent(href.replace(/^(mailto|tel):/, "").split("?")[0]).replace(/^\+86/, "");
    copyText(value).then(
      function () {
        showToast((isPhone ? "已复制电话：" : "已复制邮箱：") + value);
      },
      function () {
        showToast((isPhone ? "电话：" : "邮箱：") + value);
      }
    );
  });

  /* ---------------- music ---------------- */
  var KEY = "ry-portfolio-music";
  var MUSIC_SRC = "src/mp3/preloader.mp3";

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  // home page: existing <audio> + settings checkbox; detail pages: created here + bar button
  var homeToggle = document.getElementById("switchforsound");
  var barToggle = document.querySelector(".detail-sound");
  if (!homeToggle && !barToggle) return;

  var audio = document.getElementById("audioPlayer");
  if (!audio) {
    audio = document.createElement("audio");
    audio.loop = true;
    audio.preload = "none";
    audio.src = MUSIC_SRC;
    document.body.appendChild(audio);
  }

  var state = readState();

  function isOn() {
    return homeToggle ? homeToggle.checked : barToggle.getAttribute("aria-pressed") === "true";
  }

  function setToggle(on) {
    if (homeToggle) homeToggle.checked = on;
    if (barToggle) {
      barToggle.setAttribute("aria-pressed", on ? "true" : "false");
      barToggle.setAttribute("aria-label", on ? "关闭背景音乐" : "打开背景音乐");
    }
  }

  function save() {
    writeState({ on: isOn(), t: audio.currentTime || state.t || 0 });
  }

  // browsers may block sound until the visitor interacts with the page: retry on the first gesture
  function waitForGesture() {
    function resume(e) {
      if (barToggle && barToggle.contains(e.target)) return;
      if (homeToggle && e.target.closest && e.target.closest("#labelforsound, #switchforsound")) return;
      document.removeEventListener("pointerdown", resume, true);
      document.removeEventListener("keydown", resume, true);
      if (isOn()) play();
    }
    document.addEventListener("pointerdown", resume, true);
    document.addEventListener("keydown", resume, true);
  }

  function play() {
    var p = audio.play();
    if (p && p.catch) p.catch(waitForGesture);
  }

  function seekToSaved() {
    if (state.t && audio.duration && isFinite(audio.duration)) {
      audio.currentTime = state.t % audio.duration;
    }
  }

  if (state.on) {
    setToggle(true);
    audio.preload = "auto";
    if (audio.readyState >= 1) seekToSaved();
    else audio.addEventListener("loadedmetadata", seekToSaved, { once: true });
    play();
  } else {
    setToggle(false);
  }

  if (homeToggle) {
    // main.js playpause() already plays / pauses on click; just remember the choice
    homeToggle.addEventListener("change", save);
  }

  if (barToggle) {
    barToggle.addEventListener("click", function () {
      var on = !isOn();
      setToggle(on);
      if (on) {
        audio.preload = "auto";
        play();
      } else {
        audio.pause();
      }
      save();
    });
  }

  var lastSave = 0;
  audio.addEventListener("timeupdate", function () {
    var now = Date.now();
    if (now - lastSave > 1000) {
      lastSave = now;
      save();
    }
  });
  window.addEventListener("pagehide", save);
})();
