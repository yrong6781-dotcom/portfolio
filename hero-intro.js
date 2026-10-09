// Hero entrance: the label fades in, the headline types out one character at a time with a
// blinking caret, and each keyword tag and the action row rise in while it types.
// Every character is laid out from the start (just invisible), so nothing reflows as it types.
(function () {
  var line = document.querySelector("[data-typewriter]");
  if (!line) return;
  var root = line.closest(".text-content");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var SPEED = 70; // ms per character
  var START = 450; // ms before typing starts

  line.setAttribute("aria-label", line.textContent.replace(/\s+/g, " ").trim());

  // wrap every character in a span, keeping <br> and the gradient span in place
  var chars = [];
  (function wrap(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        var text = child.textContent.replace(/\s+/g, " ");
        if (!text.trim()) return child.remove();
        var frag = document.createDocumentFragment();
        Array.prototype.forEach.call(text.trim(), function (ch) {
          var span = document.createElement("span");
          span.className = "tw-char";
          span.setAttribute("aria-hidden", "true");
          span.textContent = ch;
          frag.appendChild(span);
          chars.push(span);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && child.tagName !== "BR") {
        wrap(child);
      }
    });
  })(line);

  var caret = document.createElement("span");
  caret.className = "tw-caret";
  caret.setAttribute("aria-hidden", "true");

  var rise = Array.prototype.slice.call(root.querySelectorAll(".hero-tags li, .hero-actions"));
  var label = root.querySelector(".hero-label");

  if (reduce) {
    root.classList.add("hero-intro-done");
    return;
  }
  root.classList.add("hero-intro-run");

  // wait for the preloader (hidden on window load) so the typing is actually seen
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);

  function start() {
    requestAnimationFrame(function () {
      if (label) label.classList.add("is-in");
    });

    // tags and buttons come in while the line is typing, not after it
    rise.forEach(function (el, i) {
      setTimeout(function () {
        el.classList.add("is-in");
      }, START + 500 + i * 110);
    });

    var i = 0;
    setTimeout(function step() {
      if (i < chars.length) {
        chars[i].classList.add("is-in");
        chars[i].after(caret);
        i++;
        setTimeout(step, chars[i - 1].textContent === "，" || chars[i - 1].textContent === "。" ? SPEED * 4 : SPEED);
      } else {
        setTimeout(function () {
          caret.classList.add("is-done");
        }, 1600);
      }
    }, START);
  }
})();
