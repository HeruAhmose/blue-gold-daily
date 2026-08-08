/**
 * TRAI ecosystem compatibility loader.
 * v4 consumers are forwarded to TRAI Organism Protocol v5.2.
 */
(function () {
  "use strict";
  if (window.TRAIOrganismV5 && window.TRAIOrganismV5.version === "5.2.0") return;

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
