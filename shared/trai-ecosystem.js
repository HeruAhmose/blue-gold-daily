/**
 * TRAI ecosystem compatibility loader.
 * Legacy consumers are forwarded to the current TRAI Organism Protocol v5 runtime.
 */
(function () {
  "use strict";
  if (window.TRAIOrganismV5) return;

  var current = document.currentScript;
  if (!current) return;

  var existing = document.querySelector('script[data-trai-world][src*="trai-organism-v5.js"]');
  if (existing) return;

  var next = document.createElement("script");
  next.src = new URL("trai-organism-v5.js", current.src).href;
  next.defer = true;
  next.dataset.traiWorld =
    current.dataset.property === "bluegold" ? "bluegold" : "trai";
  next.dataset.traiStatic =
    current.dataset.property === "bluegold" ? "true" : "false";
  current.after(next);
})();
