/**
 * TRAI ecosystem bar.
 * ---------------------------------------------------------------------------
 * One script, both stacks. It has no framework dependency, so the static
 * Blue-Gold site and the React portfolio can share it verbatim.
 *
 * Behaviour:
 *   • Reads the canonical registry (trai-ecosystem.json).
 *   • Renders a slim switcher pinned to the top of the viewport.
 *   • Marks the current property and omits its own link.
 *   • Properties with no URL yet render as non-clickable with their stage,
 *     so a venture in development can never look like a live site.
 *   • Emits Organization + WebSite JSON-LD so search engines understand the
 *     properties as one entity rather than eight unrelated domains.
 *
 * Usage:
 *   <script src="/shared/trai-ecosystem.js" data-property="bluegold" defer></script>
 *
 * Standalone guarantee: if the registry fails to load the bar simply does not
 * render. Nothing else on the page depends on it.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var SELF = (script && script.dataset.property) || 'trai';
  // An empty data-base is meaningful (root-relative), so test for presence
  // rather than truthiness — '' || '/shared' would silently mis-resolve.
  var BASE = (script && script.dataset.base !== undefined) ? script.dataset.base : '/shared';

  var CSS = [
    '.trai-eco{position:fixed;top:0;left:0;right:0;z-index:200;display:flex;align-items:center;',
    'gap:.75rem;padding:.4rem clamp(.75rem,3vw,1.5rem);background:#05070a;',
    'border-bottom:1px solid rgba(216,163,58,.16);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;',
    'font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;overflow-x:auto;',
    'scrollbar-width:none;-ms-overflow-style:none}',
    '.trai-eco::-webkit-scrollbar{display:none}',
    '.trai-eco__brand{color:#d8aa43;font-weight:600;white-space:nowrap;text-decoration:none;flex:none}',
    '.trai-eco__list{display:flex;gap:.2rem;align-items:center;flex:1;white-space:nowrap}',
    '.trai-eco a.trai-eco__item{color:rgba(237,230,216,.55);text-decoration:none;padding:.3rem .55rem;',
    'border:1px solid transparent;transition:color .2s,border-color .2s;white-space:nowrap}',
    '.trai-eco a.trai-eco__item:hover{color:#d8aa43;border-color:rgba(216,163,58,.35)}',
    '.trai-eco__item--self{color:#EDE6D8;border-color:rgba(216,163,58,.45)}',
    '.trai-eco__item--soon{color:rgba(237,230,216,.26);padding:.3rem .55rem;white-space:nowrap;cursor:default}',
    '.trai-eco__item--soon i{font-style:normal;opacity:.6;font-size:.9em}',
    '.trai-eco:focus-within a:focus-visible{outline:2px solid #F0C463;outline-offset:2px}',
    'body{padding-top:var(--trai-eco-h,2.05rem)}',
    '@media(prefers-reduced-motion:reduce){.trai-eco a{transition:none}}'
  ].join('');

  function inject(reg) {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var nav = document.createElement('nav');
    nav.className = 'trai-eco';
    nav.setAttribute('aria-label', 'TRAI ecosystem');

    var trai = reg.properties.filter(function (p) { return p.id === 'trai'; })[0];
    var brandHref = (trai && trai.url) || '#';
    nav.innerHTML =
      '<a class="trai-eco__brand" href="' + brandHref + '">TRAI</a>' +
      '<span class="trai-eco__list"></span>';

    var list = nav.querySelector('.trai-eco__list');

    reg.properties.forEach(function (p) {
      if (p.id === 'trai') return;
      var el;
      if (p.id === SELF) {
        el = document.createElement('span');
        el.className = 'trai-eco__item trai-eco__item--self';
        el.setAttribute('aria-current', 'page');
        el.textContent = p.name;
      } else if (p.url) {
        el = document.createElement('a');
        el.className = 'trai-eco__item';
        el.href = p.url;
        el.textContent = p.name;
        if (/^https?:/.test(p.url)) {
          el.target = '_blank';
          el.rel = 'noopener';
        }
        el.title = p.role + ' — ' + p.blurb;
      } else {
        el = document.createElement('span');
        el.className = 'trai-eco__item--soon';
        el.innerHTML = p.name + ' <i>· ' + p.stage + '</i>';
        el.title = p.role + ' — ' + p.blurb;
      }
      list.appendChild(el);
    });

    document.body.insertBefore(nav, document.body.firstChild);

    // Publish the measured height so each stack can offset its own fixed
    // chrome. Without this the bar sits on top of a site's sticky nav and
    // silently swallows its clicks.
    var setH = function () {
      var h = Math.ceil(nav.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--trai-eco-h', h + 'px');
    };
    setH();
    if (window.ResizeObserver) new ResizeObserver(setH).observe(nav);
    window.addEventListener('resize', setH, { passive: true });
  }

  function schema(reg) {
    var o = reg.organization;
    var sites = reg.properties.filter(function (p) { return p.url; })
                              .map(function (p) { return p.url; });
    var ld = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: o.name,
      alternateName: o.short,
      slogan: o.standard,
      address: {
        '@type': 'PostalAddress',
        addressLocality: o.locality,
        addressRegion: o.region,
        addressCountry: o.country
      },
      founder: { '@type': 'Person', name: o.founder, sameAs: o.github },
      sameAs: sites
    };
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  }

  function boot(reg) {
    try { schema(reg); } catch (e) { /* schema is optional */ }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { inject(reg); });
    } else {
      inject(reg);
    }
  }

  // Registry may be inlined by a build step; otherwise fetch it.
  if (window.TRAI_ECOSYSTEM) {
    boot(window.TRAI_ECOSYSTEM);
  } else {
    fetch(BASE + '/trai-ecosystem.json')
      .then(function (r) { return r.json(); })
      .then(boot)
      .catch(function () { /* standalone: bar simply does not render */ });
  }
})();
