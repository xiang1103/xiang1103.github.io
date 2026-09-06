// Manual light/dark toggle. The theme is already resolved before first paint by
// the inline script in <head>; this only handles clicks and persistence.
//
// data-theme absent  -> follow the OS setting
// data-theme="light" -> forced light
// data-theme="dark"  -> forced dark
(function () {
  var button = document.querySelector(".theme-toggle");
  if (!button) return;

  var root = document.documentElement;

  function currentTheme() {
    var forced = root.getAttribute("data-theme");
    if (forced === "dark" || forced === "light") return forced;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  button.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {
      // Private mode or blocked storage: the choice just won't persist.
    }
  });
})();
