/**
 * TRAI Venture Portal v4
 * Shared cross-property navigation for TRAI and True Melange.
 *
 * Design goals:
 * - Every registered venture opens a synopsis before navigation.
 * - Legacy Manus portfolio links are intercepted and redirected safely.
 * - Live destinations use a cinematic transition curtain.
 * - Building ventures remain explorable without pretending to be live.
 * - Native dialog semantics, keyboard focus return, and reduced-motion support.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  var SELF = (script && script.dataset.property) || "trai";
  var configuredBase =
    script && script.dataset.base !== undefined ? script.dataset.base : "/shared";
  var BASE = configuredBase.replace(/\/+$/, "");
  var REDUCED = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  var registry = null;
  var portal = null;
  var transition = null;
  var activeProperty = null;
  var previousFocus = null;
  var navigationTimer = null;

  var LEGACY_ALIASES = [
    {
      id: "trai",
      test: function (url) {
        return /(^|\.)manus\.computer$/i.test(url.hostname);
      }
    }
  ];

  var CSS = [
    ":root{--trai-gold:#d9ab45;--trai-gold2:#f1ca72;--trai-bone:#f2eadc;--trai-ink:#05070a;--trai-deep:#070b12;--trai-eco-h:2.2rem}",
    ".trai-eco{position:fixed;inset:0 0 auto;z-index:9200;display:flex;align-items:center;gap:.8rem;padding:.44rem clamp(.75rem,3vw,1.5rem);background:linear-gradient(180deg,rgba(4,7,11,.985),rgba(4,7,11,.925));border-bottom:1px solid rgba(217,171,69,.22);box-shadow:0 16px 50px rgba(0,0,0,.24);font:600 .62rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;overflow-x:auto;scrollbar-width:none;backdrop-filter:blur(20px) saturate(1.15)}",
    ".trai-eco::-webkit-scrollbar{display:none}",
    ".trai-eco__brand,.trai-eco__item{flex:none;color:inherit;font:inherit;letter-spacing:inherit;text-transform:inherit}",
    ".trai-eco__brand{appearance:none;border:0;background:none;color:var(--trai-gold2);font-weight:800;text-decoration:none;padding:.34rem .1rem;white-space:nowrap;cursor:pointer}",
    ".trai-eco__brand--self{cursor:default}",
    ".trai-eco__list{display:flex;align-items:center;gap:.24rem;white-space:nowrap}",
    ".trai-eco__item{appearance:none;border:1px solid transparent;border-radius:999px;background:transparent;color:rgba(242,234,220,.58);padding:.34rem .62rem;cursor:pointer;transition:transform .22s ease,color .22s ease,border-color .22s ease,background .22s ease,box-shadow .22s ease}",
    ".trai-eco__item:hover{transform:translateY(-1px);color:var(--trai-gold2);border-color:rgba(217,171,69,.35);background:rgba(217,171,69,.055);box-shadow:0 0 26px rgba(217,171,69,.06)}",
    ".trai-eco__item--self{cursor:default;color:var(--trai-bone);border-color:rgba(217,171,69,.45);background:rgba(217,171,69,.045)}",
    ".trai-eco__stage-dot{opacity:.58;font-size:.9em}",
    ".trai-eco :focus-visible,.trai-portal :focus-visible{outline:2px solid var(--trai-gold2);outline-offset:3px}",
    "body{padding-top:var(--trai-eco-h,2.2rem)}",
    "body.trai-portal-open{overflow:hidden}",
    ".trai-portal{width:min(800px,calc(100vw - 1.25rem));max-height:min(88vh,820px);padding:0;border:0;background:transparent;color:var(--trai-bone);overflow:visible}",
    ".trai-portal::backdrop{background:radial-gradient(circle at 50% 34%,rgba(95,67,15,.34),rgba(2,4,8,.9) 58%);backdrop-filter:blur(18px) saturate(.9);opacity:0;transition:opacity .38s ease}",
    ".trai-portal[open].is-open::backdrop{opacity:1}",
    ".trai-portal__frame{--ox:50%;--oy:50%;position:relative;overflow:hidden;border:1px solid rgba(217,171,69,.38);border-radius:30px;background:radial-gradient(circle at 50% 0%,rgba(217,171,69,.12),transparent 34%),linear-gradient(145deg,rgba(14,19,28,.992),rgba(4,7,12,.998));box-shadow:0 40px 130px rgba(0,0,0,.76),0 0 90px rgba(217,171,69,.11),inset 0 0 80px rgba(255,255,255,.018);opacity:0;transform:translateY(24px) scale(.955);transform-origin:var(--ox) var(--oy);transition:transform .48s cubic-bezier(.16,.84,.24,1),opacity .34s ease}",
    ".trai-portal.is-open .trai-portal__frame{opacity:1;transform:translateY(0) scale(1)}",
    ".trai-portal__frame::before,.trai-portal__frame::after{content:'';position:absolute;pointer-events:none}",
    ".trai-portal__frame::before{width:620px;height:620px;left:50%;top:42%;transform:translate(-50%,-50%);border-radius:50%;background:repeating-radial-gradient(circle,transparent 0 34px,rgba(217,171,69,.055) 35px 36px,transparent 37px 68px);mask-image:radial-gradient(circle,#000 0 50%,transparent 74%);animation:traiPortalBreathe 7s ease-in-out infinite}",
    ".trai-portal__frame::after{inset:-42%;background:conic-gradient(from 0deg,transparent 0 14%,rgba(217,171,69,.08) 19%,transparent 27% 54%,rgba(86,124,200,.065) 61%,transparent 68% 100%);animation:traiPortalOrbit 24s linear infinite}",
    ".trai-portal__mesh{position:absolute;inset:0;pointer-events:none;background:linear-gradient(rgba(217,171,69,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(217,171,69,.035) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(circle at 50% 42%,#000 0 20%,transparent 68%);opacity:.42}",
    ".trai-portal__content{position:relative;z-index:2;padding:clamp(1.25rem,4vw,3.1rem)}",
    ".trai-portal__toolbar{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}",
    ".trai-portal__meta{display:flex;gap:.52rem;align-items:center;flex-wrap:wrap;margin:0;color:rgba(242,234,220,.55);font:700 .66rem/1.25 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase}",
    ".trai-portal__stage{display:inline-flex;align-items:center;gap:.4rem;padding:.34rem .58rem;border:1px solid rgba(217,171,69,.28);border-radius:999px;color:var(--trai-gold2);background:rgba(217,171,69,.06)}",
    ".trai-portal__stage::before{content:'';width:.38rem;height:.38rem;border-radius:50%;background:currentColor;box-shadow:0 0 16px currentColor}",
    ".trai-portal__toolbar-actions{display:flex;gap:.45rem}",
    ".trai-portal__icon{width:2.58rem;height:2.58rem;border-radius:50%;border:1px solid rgba(242,234,220,.14);background:rgba(255,255,255,.025);color:var(--trai-bone);display:grid;place-items:center;cursor:pointer;transition:transform .22s ease,border-color .22s ease,background .22s ease}",
    ".trai-portal__icon:hover{transform:translateY(-1px);border-color:rgba(217,171,69,.45);background:rgba(217,171,69,.07)}",
    ".trai-portal__sigil{width:4rem;height:4rem;margin:1.7rem 0 1.25rem;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(217,171,69,.38);background:radial-gradient(circle,rgba(217,171,69,.15),rgba(217,171,69,.025) 58%,transparent 59%);box-shadow:0 0 46px rgba(217,171,69,.13),inset 0 0 22px rgba(217,171,69,.07);font:700 1.08rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--trai-gold2)}",
    ".trai-portal__title{margin:0;color:#fbf4e8;font:600 clamp(2.2rem,7vw,5.2rem)/.92 'Cormorant Garamond','Fraunces',Georgia,serif;letter-spacing:-.035em;text-wrap:balance}",
    ".trai-portal__full{margin:.8rem 0 0;color:rgba(242,234,220,.48);font:600 .71rem/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.15em;text-transform:uppercase}",
    ".trai-portal__lede{max-width:62ch;margin:1.65rem 0 0;color:rgba(242,234,220,.86);font:400 clamp(1rem,2.15vw,1.18rem)/1.74 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
    ".trai-portal__details{margin:1.45rem 0 0;border-top:1px solid rgba(242,234,220,.1);border-bottom:1px solid rgba(242,234,220,.1)}",
    ".trai-portal__details summary{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.9rem 0;cursor:pointer;color:rgba(242,234,220,.68);font:700 .69rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;list-style:none}",
    ".trai-portal__details summary::-webkit-details-marker{display:none}",
    ".trai-portal__details summary::after{content:'+';font-size:1rem;color:var(--trai-gold2);transition:transform .22s ease}",
    ".trai-portal__details[open] summary::after{transform:rotate(45deg)}",
    ".trai-portal__details-body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.85rem;padding:0 0 1rem}",
    ".trai-portal__datum{border:1px solid rgba(242,234,220,.08);border-radius:16px;padding:.9rem;background:rgba(255,255,255,.018)}",
    ".trai-portal__datum b{display:block;margin-bottom:.28rem;color:rgba(242,234,220,.42);font:700 .61rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase}",
    ".trai-portal__datum span{color:rgba(242,234,220,.75);font:500 .88rem/1.45 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
    ".trai-portal__actions{display:flex;gap:.72rem;align-items:center;flex-wrap:wrap;margin-top:1.8rem}",
    ".trai-portal__primary,.trai-portal__secondary{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-height:3.1rem;border-radius:999px;padding:.8rem 1.18rem;text-decoration:none;cursor:pointer;font:800 .69rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;transition:transform .24s ease,box-shadow .24s ease,background .24s ease,border-color .24s ease}",
    ".trai-portal__primary{border:1px solid rgba(241,202,114,.62);background:linear-gradient(135deg,#d7a740,#f1ca72);color:#111006;box-shadow:0 14px 38px rgba(217,171,69,.18)}",
    ".trai-portal__primary:hover{transform:translateY(-2px);box-shadow:0 21px 50px rgba(217,171,69,.27)}",
    ".trai-portal__secondary{border:1px solid rgba(242,234,220,.15);background:rgba(255,255,255,.024);color:rgba(242,234,220,.8)}",
    ".trai-portal__secondary:hover{transform:translateY(-1px);border-color:rgba(217,171,69,.38);background:rgba(217,171,69,.055)}",
    ".trai-portal__primary[hidden],.trai-portal__secondary[hidden]{display:none}",
    ".trai-portal__destination{margin:.9rem 0 0;color:rgba(242,234,220,.35);font:500 .65rem/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;word-break:break-all}",
    ".trai-portal__offline{display:none;margin:1rem 0 0;padding:.9rem 1rem;border:1px solid rgba(217,171,69,.18);border-radius:16px;background:rgba(217,171,69,.045);color:rgba(242,234,220,.62);font:500 .86rem/1.55 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
    ".trai-portal__offline.is-visible{display:block}",
    ".trai-transition{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;pointer-events:none;background:radial-gradient(circle at 50% 50%,rgba(217,171,69,.16),rgba(3,5,9,.985) 46%,#020305 78%);opacity:0;visibility:hidden;transition:opacity .42s ease,visibility .42s ease}",
    ".trai-transition.is-active{opacity:1;visibility:visible}",
    ".trai-transition__core{position:relative;display:grid;place-items:center;gap:1.1rem;width:min(78vw,660px);aspect-ratio:1}",
    ".trai-transition__ring{position:absolute;border-radius:50%;border:1px solid rgba(217,171,69,.2);box-shadow:0 0 40px rgba(217,171,69,.06)}",
    ".trai-transition__ring:nth-child(1){inset:8%;animation:traiRingA 2.8s linear infinite}",
    ".trai-transition__ring:nth-child(2){inset:21%;border-color:rgba(86,124,200,.18);animation:traiRingB 2.2s linear infinite}",
    ".trai-transition__ring:nth-child(3){inset:34%;border-color:rgba(241,202,114,.34);animation:traiRingA 1.8s linear infinite}",
    ".trai-transition__copy{position:relative;z-index:2;text-align:center;transform:scale(.92);opacity:0;transition:transform .42s cubic-bezier(.16,.84,.24,1),opacity .32s ease}",
    ".trai-transition.is-active .trai-transition__copy{transform:scale(1);opacity:1}",
    ".trai-transition__eyebrow{margin:0 0 .8rem;color:rgba(242,234,220,.45);font:700 .67rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.17em;text-transform:uppercase}",
    ".trai-transition__name{margin:0;color:#fbf4e8;font:600 clamp(2rem,7vw,5rem)/.95 'Cormorant Garamond','Fraunces',Georgia,serif;letter-spacing:-.03em}",
    ".trai-transition__line{width:min(46vw,300px);height:1px;margin:1.15rem auto 0;background:linear-gradient(90deg,transparent,var(--trai-gold2),transparent);box-shadow:0 0 22px rgba(241,202,114,.55);animation:traiSweep 1.2s ease-in-out infinite}",
    "@keyframes traiPortalOrbit{to{transform:rotate(360deg)}}",
    "@keyframes traiPortalBreathe{0%,100%{opacity:.58;transform:translate(-50%,-50%) scale(.96)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.035)}}",
    "@keyframes traiRingA{to{transform:rotate(360deg)}}",
    "@keyframes traiRingB{to{transform:rotate(-360deg)}}",
    "@keyframes traiSweep{0%,100%{opacity:.42;transform:scaleX(.72)}50%{opacity:1;transform:scaleX(1)}}",
    "@media(max-width:640px){.trai-portal{width:calc(100vw - .75rem)}.trai-portal__frame{border-radius:22px}.trai-portal__content{padding:1.2rem}.trai-portal__details-body{grid-template-columns:1fr}.trai-portal__actions{align-items:stretch}.trai-portal__primary,.trai-portal__secondary{width:100%}}",
    "@media(prefers-reduced-motion:reduce){.trai-eco *,.trai-portal *,.trai-transition *{animation:none!important;transition:none!important;scroll-behavior:auto!important}.trai-portal__frame{transform:none}.trai-portal::backdrop{transition:none}}"
  ].join("");

  function byId(id) {
    if (!registry || !id) return null;
    for (var i = 0; i < registry.properties.length; i += 1) {
      if (registry.properties[i].id === id) return registry.properties[i];
    }
    return null;
  }

  function safeUrl(value) {
    try {
      return new URL(value, window.location.href);
    } catch (error) {
      return null;
    }
  }

  function canonicalPropertyForUrl(value) {
    var url = safeUrl(value);
    if (!url || !registry) return null;

    for (var a = 0; a < LEGACY_ALIASES.length; a += 1) {
      if (LEGACY_ALIASES[a].test(url)) {
        return byId(LEGACY_ALIASES[a].id);
      }
    }

    for (var i = 0; i < registry.properties.length; i += 1) {
      var property = registry.properties[i];
      if (!property.url) continue;

      var destination = safeUrl(property.url);
      if (!destination) continue;

      var targetHost = url.hostname.replace(/^www\./i, "").toLowerCase();
      var destinationHost = destination.hostname
        .replace(/^www\./i, "")
        .toLowerCase();

      if (targetHost !== destinationHost) continue;

      var targetPath = url.pathname.replace(/\/+$/, "") || "/";
      var destinationPath = destination.pathname.replace(/\/+$/, "") || "/";

      if (
        destinationPath === "/" ||
        targetPath === destinationPath ||
        targetPath.indexOf(destinationPath + "/") === 0
      ) {
        return property;
      }
    }

    return null;
  }

  function propertyFromTrigger(trigger) {
    if (!trigger) return null;

    var explicitId = trigger.getAttribute("data-trai-property");
    if (explicitId) return byId(explicitId);

    if (trigger.matches && trigger.matches("a[href]")) {
      return canonicalPropertyForUrl(trigger.href);
    }

    return null;
  }

  function create(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = text;
    return element;
  }

  function setTriggerOrigin(frame, trigger) {
    if (!trigger || !trigger.getBoundingClientRect) {
      frame.style.setProperty("--ox", "50%");
      frame.style.setProperty("--oy", "50%");
      return;
    }

    var triggerRect = trigger.getBoundingClientRect();
    var frameRect = frame.getBoundingClientRect();
    if (!frameRect.width || !frameRect.height) return;

    var centerX = triggerRect.left + triggerRect.width / 2;
    var centerY = triggerRect.top + triggerRect.height / 2;
    var x = ((centerX - frameRect.left) / frameRect.width) * 100;
    var y = ((centerY - frameRect.top) / frameRect.height) * 100;

    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    frame.style.setProperty("--ox", x.toFixed(1) + "%");
    frame.style.setProperty("--oy", y.toFixed(1) + "%");
  }

  function ensurePortal() {
    if (portal) return portal;

    portal = create("dialog", "trai-portal");
    portal.setAttribute("aria-labelledby", "trai-portal-title");
    portal.setAttribute("aria-describedby", "trai-portal-lede");

    var frame = create("div", "trai-portal__frame");
    var mesh = create("div", "trai-portal__mesh");
    var content = create("div", "trai-portal__content");
    var toolbar = create("div", "trai-portal__toolbar");
    var meta = create("p", "trai-portal__meta");
    var role = create("span", "trai-portal__role");
    var stage = create("span", "trai-portal__stage");
    var toolbarActions = create("div", "trai-portal__toolbar-actions");
    var collapse = create("button", "trai-portal__icon", "−");
    var close = create("button", "trai-portal__icon", "×");

    collapse.type = "button";
    collapse.setAttribute("aria-label", "Collapse synopsis");
    collapse.setAttribute("aria-expanded", "true");
    close.type = "button";
    close.setAttribute("aria-label", "Close venture preview");

    meta.appendChild(role);
    meta.appendChild(stage);
    toolbarActions.appendChild(collapse);
    toolbarActions.appendChild(close);
    toolbar.appendChild(meta);
    toolbar.appendChild(toolbarActions);

    var sigil = create("div", "trai-portal__sigil", "Φ");
    sigil.setAttribute("aria-hidden", "true");

    var title = create("h2", "trai-portal__title");
    title.id = "trai-portal-title";

    var full = create("p", "trai-portal__full");
    var lede = create("p", "trai-portal__lede");
    lede.id = "trai-portal-lede";

    var details = create("details", "trai-portal__details");
    details.open = true;
    var summary = create("summary", "", "Brief synopsis");
    var detailsBody = create("div", "trai-portal__details-body");

    var roleDatum = create("div", "trai-portal__datum");
    var roleLabel = create("b", "", "Sovereignty role");
    var roleValue = create("span");

    var stageDatum = create("div", "trai-portal__datum");
    var stageLabel = create("b", "", "Current stage");
    var stageValue = create("span");

    roleDatum.appendChild(roleLabel);
    roleDatum.appendChild(roleValue);
    stageDatum.appendChild(stageLabel);
    stageDatum.appendChild(stageValue);
    detailsBody.appendChild(roleDatum);
    detailsBody.appendChild(stageDatum);
    details.appendChild(summary);
    details.appendChild(detailsBody);

    var offline = create("p", "trai-portal__offline");
    var actions = create("div", "trai-portal__actions");
    var enter = create("button", "trai-portal__primary", "Enter experience");
    var newTab = create("a", "trai-portal__secondary", "Open in new tab ↗");
    var stay = create("button", "trai-portal__secondary", "Stay here");
    var destination = create("p", "trai-portal__destination");

    enter.type = "button";
    newTab.target = "_blank";
    newTab.rel = "noopener";
    stay.type = "button";

    actions.appendChild(enter);
    actions.appendChild(newTab);
    actions.appendChild(stay);

    content.appendChild(toolbar);
    content.appendChild(sigil);
    content.appendChild(title);
    content.appendChild(full);
    content.appendChild(lede);
    content.appendChild(details);
    content.appendChild(offline);
    content.appendChild(actions);
    content.appendChild(destination);

    frame.appendChild(mesh);
    frame.appendChild(content);
    portal.appendChild(frame);
    document.body.appendChild(portal);

    portal._trai = {
      frame: frame,
      role: role,
      stage: stage,
      title: title,
      full: full,
      lede: lede,
      details: details,
      roleValue: roleValue,
      stageValue: stageValue,
      offline: offline,
      enter: enter,
      newTab: newTab,
      stay: stay,
      collapse: collapse,
      close: close,
      destination: destination
    };

    close.addEventListener("click", closePortal);
    stay.addEventListener("click", closePortal);

    collapse.addEventListener("click", function () {
      details.open = !details.open;
      collapse.textContent = details.open ? "−" : "+";
      collapse.setAttribute(
        "aria-label",
        details.open ? "Collapse synopsis" : "Expand synopsis"
      );
      collapse.setAttribute("aria-expanded", details.open ? "true" : "false");
    });

    portal.addEventListener("cancel", function (event) {
      event.preventDefault();
      closePortal();
    });

    portal.addEventListener("click", function (event) {
      if (event.target === portal) closePortal();
    });

    enter.addEventListener("click", function () {
      if (activeProperty && activeProperty.url) depart(activeProperty);
    });

    return portal;
  }

  function openPortal(property, trigger) {
    if (!property || property.id === SELF) return;

    var dialog = ensurePortal();
    var refs = dialog._trai;
    activeProperty = property;
    previousFocus = trigger || document.activeElement;

    refs.role.textContent = property.role || "TRAI ecosystem";
    refs.stage.textContent = property.stage || "venture";
    refs.title.textContent = property.name || property.full || "TRAI venture";
    refs.full.textContent = property.full || "";
    refs.lede.textContent =
      property.blurb || "A connected venture within the TRAI ecosystem.";
    refs.roleValue.textContent = property.role || "Connected venture";
    refs.stageValue.textContent = property.stage || "In development";
    refs.details.open = true;
    refs.collapse.textContent = "−";
    refs.collapse.setAttribute("aria-label", "Collapse synopsis");
    refs.collapse.setAttribute("aria-expanded", "true");

    if (property.url) {
      refs.enter.hidden = false;
      refs.newTab.hidden = false;
      refs.newTab.href = property.url;
      refs.offline.classList.remove("is-visible");
      refs.offline.textContent = "";
      var destinationUrl = safeUrl(property.url);
      refs.destination.textContent =
        "Destination · " +
        (destinationUrl ? destinationUrl.hostname : property.url);
    } else {
      refs.enter.hidden = true;
      refs.newTab.hidden = true;
      refs.offline.classList.add("is-visible");
      refs.offline.textContent =
        "This venture is currently " +
        (property.stage || "in development") +
        ". The synopsis is available now; a live destination will appear here when the property is ready.";
      refs.destination.textContent = "No public destination published yet.";
    }

    if (!dialog.open) dialog.showModal();
    document.body.classList.add("trai-portal-open");

    window.requestAnimationFrame(function () {
      setTriggerOrigin(refs.frame, trigger);
      dialog.classList.add("is-open");
      refs.close.focus({ preventScroll: true });
    });
  }

  function closePortal() {
    if (!portal || !portal.open) return;

    portal.classList.remove("is-open");
    document.body.classList.remove("trai-portal-open");

    var finish = function () {
      if (portal.open) portal.close();

      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus({ preventScroll: true });
      }

      previousFocus = null;
      activeProperty = null;
    };

    if (REDUCED) {
      finish();
    } else {
      window.setTimeout(finish, 280);
    }
  }

  function ensureTransition() {
    if (transition) return transition;

    transition = create("div", "trai-transition");
    transition.setAttribute("aria-hidden", "true");

    var core = create("div", "trai-transition__core");
    core.appendChild(create("div", "trai-transition__ring"));
    core.appendChild(create("div", "trai-transition__ring"));
    core.appendChild(create("div", "trai-transition__ring"));

    var copy = create("div", "trai-transition__copy");
    var eyebrow = create("p", "trai-transition__eyebrow", "Entering TRAI venture");
    var name = create("h2", "trai-transition__name");
    var line = create("div", "trai-transition__line");

    copy.appendChild(eyebrow);
    copy.appendChild(name);
    copy.appendChild(line);
    core.appendChild(copy);
    transition.appendChild(core);
    transition._name = name;

    document.body.appendChild(transition);
    return transition;
  }

  function depart(property) {
    if (!property || !property.url) return;

    if (navigationTimer) window.clearTimeout(navigationTimer);

    if (REDUCED) {
      window.location.assign(property.url);
      return;
    }

    var curtain = ensureTransition();
    curtain._name.textContent = property.name || property.full || "TRAI";

    closePortal();

    window.requestAnimationFrame(function () {
      curtain.classList.add("is-active");
    });

    navigationTimer = window.setTimeout(function () {
      window.location.assign(property.url);
    }, 760);
  }

  function createPropertyControl(property) {
    if (property.id === SELF) {
      var self = create(
        "span",
        "trai-eco__item trai-eco__item--self",
        property.name
      );
      self.setAttribute("aria-current", "page");
      return self;
    }

    var control = create("button", "trai-eco__item", property.name);
    control.type = "button";
    control.dataset.traiProperty = property.id;
    control.title =
      (property.role || "") +
      (property.blurb ? " — " + property.blurb : "");

    if (!property.url) {
      control.appendChild(
        create("span", "trai-eco__stage-dot", " · " + property.stage)
      );
    }

    control.addEventListener("click", function () {
      openPortal(property, control);
    });

    return control;
  }

  function inject(reg) {
    registry = reg;

    var style = create("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    var nav = create("nav", "trai-eco");
    nav.setAttribute("aria-label", "TRAI ecosystem");

    var trai = byId("trai");
    var brand;

    if (SELF === "trai") {
      brand = create(
        "span",
        "trai-eco__brand trai-eco__brand--self",
        "TRAI"
      );
      brand.setAttribute("aria-current", "page");
    } else {
      brand = create("button", "trai-eco__brand", "TRAI");
      brand.type = "button";
      brand.dataset.traiProperty = "trai";
      brand.addEventListener("click", function () {
        if (trai) openPortal(trai, brand);
      });
    }

    nav.appendChild(brand);

    var list = create("span", "trai-eco__list");
    nav.appendChild(list);

    reg.properties.forEach(function (property) {
      if (property.id === "trai") return;
      list.appendChild(createPropertyControl(property));
    });

    document.body.insertBefore(nav, document.body.firstChild);

    var setHeight = function () {
      var height = Math.ceil(nav.getBoundingClientRect().height);
      document.documentElement.style.setProperty(
        "--trai-eco-h",
        height + "px"
      );
    };

    setHeight();

    if (window.ResizeObserver) {
      new ResizeObserver(setHeight).observe(nav);
    }

    window.addEventListener("resize", setHeight, { passive: true });

    document.addEventListener(
      "click",
      function (event) {
        if (
          event.defaultPrevented ||
          event.button > 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        var trigger = event.target.closest
          ? event.target.closest("[data-trai-property],a[href]")
          : null;

        if (!trigger || trigger.closest(".trai-portal")) return;

        var property = propertyFromTrigger(trigger);
        if (!property || property.id === SELF) return;

        event.preventDefault();
        event.stopPropagation();
        openPortal(property, trigger);
      },
      true
    );
  }

  function schema(reg) {
    var organization = reg.organization;
    var sites = reg.properties
      .filter(function (property) {
        return Boolean(property.url);
      })
      .map(function (property) {
        return property.url;
      });

    var ld = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: organization.name,
      alternateName: organization.short,
      slogan: organization.standard,
      address: {
        "@type": "PostalAddress",
        addressLocality: organization.locality,
        addressRegion: organization.region,
        addressCountry: organization.country
      },
      founder: {
        "@type": "Person",
        name: organization.founder,
        sameAs: organization.github
      },
      sameAs: sites
    };

    var structuredData = create("script");
    structuredData.type = "application/ld+json";
    structuredData.textContent = JSON.stringify(ld);
    document.head.appendChild(structuredData);
  }

  function boot(reg) {
    registry = reg;

    try {
      schema(reg);
    } catch (error) {
      /* Structured data is optional. */
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        inject(reg);
      });
    } else {
      inject(reg);
    }
  }

  if (window.TRAI_ECOSYSTEM) {
    boot(window.TRAI_ECOSYSTEM);
  } else {
    fetch(BASE + "/trai-ecosystem.json")
      .then(function (response) {
        if (!response.ok) {
          throw new Error("TRAI ecosystem registry unavailable");
        }
        return response.json();
      })
      .then(boot)
      .catch(function () {
        /* The host site remains usable if the shared registry is unavailable. */
      });
  }
})();
