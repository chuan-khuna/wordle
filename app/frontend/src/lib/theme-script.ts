import { THEMES } from "./themes";

export const STORAGE_KEY = "wordle-theme";
export const SYSTEM = "system";
export const LIGHT_DEFAULT = "rose-pine-dawn";
export const DARK_DEFAULT = "rose-pine";

const ids = THEMES.map((theme) => theme.id);

/** Inline script for <head>: sets data-theme before the first paint, so there is no flash.
 *  Written as a string so it runs before React; keep it free of imports. It also sets
 *  data-theme-choice (a theme id or "system") for the picker, and follows the system
 *  setting while the choice is "system". */
export const themeScript = `(function () {
  var ids = ${JSON.stringify(ids)};
  var root = document.documentElement;
  var choice = "${SYSTEM}";
  try {
    var saved = localStorage.getItem("${STORAGE_KEY}");
    if (saved && ids.indexOf(saved) !== -1) choice = saved;
  } catch (e) {}
  var query = window.matchMedia("(prefers-color-scheme: dark)");
  function apply() {
    root.setAttribute("data-theme-choice", choice);
    root.setAttribute("data-theme", choice === "${SYSTEM}" ? (query.matches ? "${DARK_DEFAULT}" : "${LIGHT_DEFAULT}") : choice);
  }
  apply();
  query.addEventListener("change", function () { if (choice === "${SYSTEM}") apply(); });
  window.addEventListener("wordle-theme", function (event) { choice = event.detail; apply(); });
})();`;
