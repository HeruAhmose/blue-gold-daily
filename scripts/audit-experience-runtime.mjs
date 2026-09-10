import http from "node:http";
import fs from "node:fs/promises";

const BASE = process.env.BLUEGOLD_BASE_URL || "http://127.0.0.1:4190/";
const CDP_HTTP = process.env.BLUEGOLD_CDP_URL || "http://127.0.0.1:9240";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function getText(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: 2500 }, res => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        if ((res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300) resolve(data);
        else reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      });
    });
    req.on("timeout", () => req.destroy(new Error(`timeout ${url}`)));
    req.on("error", reject);
  });
}

async function waitFor(url, attempts = 20) {
  for (let i = 0; i < attempts; i++) {
    try { return await getText(url); } catch {}
    await sleep(250);
  }
  throw new Error(`timeout ${url}`);
}

class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", event => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const pending = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? pending.reject(new Error(JSON.stringify(msg.error))) : pending.resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "evaluation failed");
    return result.result.value;
  }
  close() { this.ws?.close(); }
}

await waitFor(BASE);
await waitFor(`${CDP_HTTP}/json/version`);
const targets = JSON.parse(await getText(`${CDP_HTTP}/json/list`));
const target = targets.find(item => item.type === "page");
if (!target?.webSocketDebuggerUrl) throw new Error("No Chrome page target");
const cdp = new CDP(target.webSocketDebuggerUrl);
await cdp.open();
try {
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: `
    (() => {
      const Native = window.AudioContext || window.webkitAudioContext;
      window.__bgAudioProbe = { contexts: 0, oscillators: 0 };
      if (!Native) return;
      const Wrapped = new Proxy(Native, {
        construct(Target, args) {
          const ctx = new Target(...args);
          window.__bgAudioProbe.contexts++;
          const original = ctx.createOscillator.bind(ctx);
          ctx.createOscillator = (...oscArgs) => {
            window.__bgAudioProbe.oscillators++;
            return original(...oscArgs);
          };
          return ctx;
        }
      });
      window.AudioContext = Wrapped;
      if (window.webkitAudioContext) window.webkitAudioContext = Wrapped;
    })();
  ` });
  await cdp.send("Page.navigate", { url: BASE });
  await sleep(1000);

  const initial = await cdp.eval(`(() => {
    const button = document.querySelector('[data-bluegold-sound]');
    const cue = document.querySelector('.cue');
    return {
      sound: button?.dataset.bluegoldSound,
      pressed: button?.getAttribute('aria-pressed'),
      probe: window.__bgAudioProbe,
      favicon: document.querySelector('link[rel~="icon"]')?.href || null,
      motion: cue ? getComputedStyle(cue, '::after').animationName : null,
      overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
    };
  })()`);
  if (initial.sound !== "off" || initial.pressed !== "false" || initial.probe.contexts !== 0 || initial.probe.oscillators !== 0 || !initial.favicon?.endsWith("/assets/favicon.svg") || initial.motion !== "drip" || initial.overflow > 1) {
    throw new Error(`initial contract ${JSON.stringify(initial)}`);
  }

  await cdp.eval(`document.querySelector('[data-bluegold-sound]')?.click(); true`);
  await sleep(220);
  const enabled = await cdp.eval(`(() => ({ sound: document.querySelector('[data-bluegold-sound]')?.dataset.bluegoldSound, probe: window.__bgAudioProbe }))()`);
  if (enabled.sound !== "on" || enabled.probe.contexts < 1 || enabled.probe.oscillators < 3) throw new Error(`opt-in failed ${JSON.stringify(enabled)}`);

  const before = enabled.probe.oscillators;
  await cdp.eval(`document.querySelector('.nav .links a')?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })); true`);
  await sleep(150);
  const after = await cdp.eval(`window.__bgAudioProbe.oscillators`);
  if (after <= before) throw new Error(`hover cue missing ${before}->${after}`);

  await cdp.eval(`document.querySelector('[data-bluegold-sound]')?.click(); true`);
  await sleep(150);
  const mutedBefore = await cdp.eval(`window.__bgAudioProbe.oscillators`);
  await cdp.eval(`document.querySelector('.nav .links a')?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })); true`);
  await sleep(150);
  const mutedAfter = await cdp.eval(`window.__bgAudioProbe.oscillators`);
  if (mutedAfter !== mutedBefore) throw new Error(`mute failed ${mutedBefore}->${mutedAfter}`);

  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await cdp.send("Page.navigate", { url: BASE });
  await sleep(800);
  const reduced = await cdp.eval(`(() => {
    const rv = document.querySelector('.rv');
    return {
      media: matchMedia('(prefers-reduced-motion: reduce)').matches,
      sound: document.querySelector('[data-bluegold-sound]')?.dataset.bluegoldSound,
      rvOpacity: rv ? getComputedStyle(rv).opacity : null,
      broken: [...document.images].filter(img => img.complete && img.naturalWidth === 0).map(img => img.src),
      overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
    };
  })()`);
  if (!reduced.media || reduced.sound !== "off" || reduced.rvOpacity !== "1" || reduced.broken.length || reduced.overflow > 1) {
    throw new Error(`reduced-motion/layout failed ${JSON.stringify(reduced)}`);
  }

  const report = { initial, enabled, hover: { before, after }, muted: { before: mutedBefore, after: mutedAfter }, reduced, failures: 0 };
  await fs.writeFile("bluegold-experience-audit.json", JSON.stringify(report, null, 2));
  console.log("BLUEGOLD_EXPERIENCE_RUNTIME=PASS");
  console.log(JSON.stringify(report));
} finally {
  cdp.close();
}
