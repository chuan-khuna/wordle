import { THEMES } from "./themes";

export const STORAGE_KEY = "wordle-theme";
/** Rosé Pine Light: the theme when nothing valid is stored. */
export const DEFAULT_THEME = "rose-pine-dawn";

const ids = THEMES.map((theme) => theme.id);

/** Inline script for <head>: sets data-theme before the first paint, so there is no flash.
 *  Written as a string so it runs before React; keep it free of imports. A stored id that is
 *  not a theme (including "system" from old visits) gives the default. */
export const themeScript = `(function () {
  var ids = ${JSON.stringify(ids)};
  var root = document.documentElement;
  var theme = "${DEFAULT_THEME}";
  try {
    var saved = localStorage.getItem("${STORAGE_KEY}");
    if (saved && ids.indexOf(saved) !== -1) theme = saved;
  } catch (e) {}
  root.setAttribute("data-theme", theme);
  window.addEventListener("wordle-theme", function (event) {
    if (ids.indexOf(event.detail) !== -1) root.setAttribute("data-theme", event.detail);
  });
})();`;
