/* Drawmory – statische Prüfung.   node validate.js
   Bricht mit Exit-Code 1 ab, sobald etwas nicht stimmt. */
"use strict";
const fs = require("fs");
const vm = require("vm");

const errors = [];
const E = m => errors.push(m);
const O = m => console.log("  ok  " + m);

const html = fs.readFileSync("index.html", "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const js = scripts.join("\n");

/* 1. Syntax */
try { new vm.Script(js, { filename: "index.html" }); O("Skript ist syntaktisch gültig"); }
catch (e) { E("Syntaxfehler: " + e.message); }

/* 2. Texte laden, ohne die App zu starten */
let I18N = null, SHAPES = null, WORLDS = null, ACTIONS_KEYS = null, TRANSFORMS = null;
try {
  const cut = js.indexOf("let lang =");
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(js.slice(js.indexOf("const I18N"), cut) + ";this.I18N=I18N;", ctx);
  I18N = ctx.I18N;
  const s0 = js.indexOf("function ngon"), s1 = js.indexOf("const LEVELS");
  const U = 96;
  vm.runInContext("const U=96;" + js.slice(s0, s1) + ";this.SHAPES=SHAPES;this.WORLDS=WORLDS;this.DIFF=SHAPE_DIFFICULTY;", ctx);
  SHAPES = ctx.SHAPES; WORLDS = ctx.WORLDS;
  const tr0 = js.indexOf("const TRANSFORMS = {"), tr1 = js.indexOf("};", tr0) + 2;
  vm.runInContext(js.slice(tr0, tr1) + ";this.TRANSFORMS=TRANSFORMS;", ctx);
  TRANSFORMS = ctx.TRANSFORMS;
  /* Verwandlungen müssen im Raum 0..96 bleiben und umkehrbar sein */
  for (const [k, f] of Object.entries(TRANSFORMS)) {
    for (const p of [[0, 0], [96, 0], [10, 70], [96, 96]]) {
      const q = f(p);
      if (q.some(n => n < 0 || n > 96)) E(`Verwandlung ${k} verlässt den Raum bei ${p}`);
    }
  }
  const r4 = [10, 30]; let q = r4; for (let i = 0; i < 4; i++) q = TRANSFORMS.rot90(q);
  if (q[0] !== r4[0] || q[1] !== r4[1]) E("Viermal 90° drehen ergibt nicht wieder den Ausgangspunkt");
  const a0 = js.indexOf("const ACTIONS = {"), a1 = js.indexOf("\n};", a0);
  ACTIONS_KEYS = [...js.slice(a0, a1).matchAll(/^\s{2}(\w+):/gm)].map(m => m[1]);
  /* Figuren: alle Punkte im Raum 0..96 */
  for (const [id, strokes] of Object.entries(SHAPES)) {
    const bad = strokes.some(s => s.length < 2 || s.some(p => p.length !== 2 || p.some(n => !(n >= 0 && n <= U))));
    if (bad) E(`Figur ${id} hat Punkte außerhalb 0..96 oder zu kurze Striche`);
  }
  for (const list of Object.values(ctx.DIFF)) for (const id of list) if (!SHAPES[id]) E(`Schwierigkeitsliste nennt unbekannte Figur ${id}`);
  const lv = WORLDS.flatMap(w => w.levels);
  lv.forEach((l, i) => {
    if (!SHAPES[l.shape]) E(`Level ${i + 1}: unbekannte Figur ${l.shape}`);
    if (![1, 2, 0.5].includes(l.scale)) E(`Level ${i + 1}: Maßstab ${l.scale} nicht vorgesehen`);
    if (l.transform && !TRANSFORMS[l.transform]) E(`Level ${i + 1}: unbekannte Verwandlung ${l.transform}`);
  });
  /* Die Zahlen auf der Startseite und im Kaufdialog müssen stimmen */
  const promise = (I18N.de.playLevelsSub.match(/^(\d+) Level in (\d+) Welten$/) || []);
  if (+promise[1] !== lv.length || +promise[2] !== WORLDS.length)
    E(`Startseite verspricht "${I18N.de.playLevelsSub}", es sind ${lv.length} Level in ${WORLDS.length} Welten`);
  for (const l of ["de", "en"]) if (!I18N[l].payLevels.includes(String(lv.length))) E(`payLevels (${l}) nennt nicht ${lv.length} Level`);
  const free = +(js.match(/const FREE_LEVELS = (\d+);/) || [])[1];
  if (!I18N.de.reasonLevels.includes(String(free + 1)) || !I18N.de.reasonLevels.includes(String(lv.length)))
    E("reasonLevels passt nicht zu FREE_LEVELS und Levelzahl");
  O(`${Object.keys(SHAPES).length} Figuren, ${lv.length} Level`);
} catch (e) { E("Daten nicht auswertbar: " + e.message); }

/* 3. Sprachen vollständig */
if (I18N) {
  const de = Object.keys(I18N.de), en = Object.keys(I18N.en);
  const onlyDe = de.filter(k => !en.includes(k)), onlyEn = en.filter(k => !de.includes(k));
  if (onlyDe.length) E("Nur auf Deutsch: " + onlyDe.join(", "));
  if (onlyEn.length) E("Nur auf Englisch: " + onlyEn.join(", "));
  const empty = ["de", "en"].flatMap(l => Object.entries(I18N[l]).filter(([, v]) => !String(v).trim()).map(([k]) => l + ":" + k));
  if (empty.length) E("Leere Texte: " + empty.join(", "));

  const used = new Set();
  for (const m of html.matchAll(/data-i18n(?:-aria|-ph)?="([^"]+)"/g)) used.add(m[1]);
  for (const m of js.matchAll(/\bt\("([A-Za-z0-9_]+)"\s*[,)]/g)) used.add(m[1]);
  if (SHAPES) Object.keys(SHAPES).forEach(id => used.add("s_" + id));
  if (WORLDS) WORLDS.forEach(w => { used.add(w.key); used.add(w.key + "Sub"); });
  ["v0", "v1", "v2", "v3"].forEach(k => used.add(k));
  /* zusammengesetzte Schlüssel */
  if (TRANSFORMS) Object.keys(TRANSFORMS).filter(k => k !== "none").forEach(k => { used.add("task_" + k); used.add("chip_" + k); });
  for (const m of js.matchAll(/openPaywall\("(\w+)"\)/g)) used.add(m[1]);
  for (const m of js.matchAll(/title: "(\w+)", text: "(\w+)"/g)) { used.add(m[1]); used.add(m[2]); }
  const missing = [...used].filter(k => !(k in I18N.de));
  if (missing.length) E("Verwendet, aber nicht übersetzt: " + missing.join(", "));
  const unused = de.filter(k => !used.has(k));
  if (unused.length) E("Übersetzt, aber nirgends verwendet: " + unused.join(", "));
  /* Platzhalter müssen in beiden Sprachen gleich sein */
  for (const k of de) {
    const ph = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(",");
    if (I18N.en[k] !== undefined && ph(I18N.de[k]) !== ph(I18N.en[k])) E(`Platzhalter in "${k}" weichen ab`);
  }
  if (!errors.length) O(`${de.length} Texte in DE und EN, alle verwendet`);
}

/* 4. IDs und Aktionen */
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const dupIds = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]).filter((v, i, a) => a.indexOf(v) !== i);
if (dupIds.length) E("Doppelte IDs: " + [...new Set(dupIds)].join(", "));
const refIds = [...js.matchAll(/getElementById\("([^"]+)"\)/g)].map(m => m[1]);
const dynamicScr = new Set(["scr-"]);
const missingIds = [...new Set(refIds)].filter(id => !ids.has(id) && !dynamicScr.has(id));
if (missingIds.length) E("Im Skript gesucht, im HTML nicht vorhanden: " + missingIds.join(", "));
const screens = (js.match(/const SCREENS = \[([^\]]+)\]/) || [])[1];
if (screens) for (const s of screens.match(/"(\w+)"/g).map(x => x.slice(1, -1))) if (!ids.has("scr-" + s)) E("Bildschirm fehlt: scr-" + s);
const modals = [...js.matchAll(/openModal\("([^"]+)"\)/g)].map(m => m[1]);
for (const m of modals) if (!ids.has(m)) E("Dialog fehlt: " + m);
O(`${ids.size} IDs, ${new Set(refIds).size} davon im Skript genutzt`);

if (ACTIONS_KEYS) {
  const acts = [...new Set([...html.matchAll(/data-action="([^"]+)"/g)].map(m => m[1]))];
  const noHandler = acts.filter(a => !ACTIONS_KEYS.includes(a));
  if (noHandler.length) E("Knöpfe ohne Aktion: " + noHandler.join(", "));
  else O(`${acts.length} Knopf-Aktionen, alle mit Handler`);
  if (/\sonclick=/.test(html)) E("Inline-onclick gefunden – Aktionen laufen über data-action");
}

/* 5. Manifest, Service Worker, Dateien */
const mf = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const need = ["name", "short_name", "start_url", "display", "icons", "id", "scope"];
const miss = need.filter(k => !(k in mf));
if (miss.length) E("manifest.json fehlt: " + miss.join(", ")); else O("manifest.json vollständig");
if (!mf.icons.some(i => (i.purpose || "").includes("maskable"))) E("manifest.json braucht ein maskable-Icon");

const sw = fs.readFileSync("sw.js", "utf8");
if (!/caches\.delete/.test(sw)) E("sw.js löscht alte Caches nicht");
if (!/SKIP_WAITING/.test(sw)) E("sw.js reagiert nicht auf SKIP_WAITING");
const assets = [...sw.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]).filter(Boolean);
const missingAssets = assets.filter(a => !fs.existsSync(a));
if (missingAssets.length) E("sw.js cached fehlende Dateien: " + missingAssets.join(", "));
else O(`Alle ${assets.length} gecachten Dateien vorhanden`);

const locals = [...html.matchAll(/(?:src|href)="(?!https?:|data:|#|mailto:)([^"]+)"/g)].map(m => m[1]).filter(f => f !== "cordova.js");
const missingLocal = locals.filter(f => !fs.existsSync(f));
if (missingLocal.length) E("Im HTML verlinkt, aber fehlend: " + missingLocal.join(", "));

for (const f of ["datenschutz.html", "datenschutz-en.html", "impressum.html", "impressum-en.html"]) {
  if (!fs.existsSync(f)) { E("Rechtstext fehlt: " + f); continue; }
  const c = fs.readFileSync(f, "utf8");
  for (const l of [...c.matchAll(/href="(?!https?:|mailto:)([^"]+)"/g)].map(m => m[1])) if (!fs.existsSync(l)) E(`${f} verlinkt fehlende Datei ${l}`);
}

/* 6. Icons: Maße und kein Alphakanal bei iOS */
function png(path) {
  const b = fs.readFileSync(path);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] };
}
const cfg = fs.readFileSync("config.xml", "utf8");
for (const m of cfg.matchAll(/<icon src="([^"]+)"(?:\s+width="(\d+)"\s+height="(\d+)")?/g)) {
  if (!fs.existsSync(m[1])) { E("Icon fehlt: " + m[1]); continue; }
  const p = png(m[1]);
  if (m[2] && (p.w !== +m[2] || p.h !== +m[3])) E(`${m[1]} ist ${p.w}×${p.h}, erwartet ${m[2]}×${m[3]}`);
  if (m[1].includes("res/ios") && (p.colorType === 4 || p.colorType === 6)) E(`${m[1]} hat einen Alphakanal – App Store Connect lehnt das ab`);
}
for (const i of mf.icons) {
  if (!fs.existsSync(i.src)) { E("Manifest-Icon fehlt: " + i.src); continue; }
  const p = png(i.src), [w, h] = i.sizes.split("x").map(Number);
  if (p.w !== w || p.h !== h) E(`${i.src} ist ${p.w}×${p.h}, Manifest sagt ${i.sizes}`);
}
O("Icons geprüft");

/* 7. Versionen überall gleich */
const appVer = (js.match(/const APP_VERSION = "([\d.]+)"/) || [])[1];
const cfgVer = (cfg.match(/\sversion="([\d.]+)"/) || [])[1];
const swCache = (sw.match(/const CACHE = '([^']+)'/) || [])[1];
const readme = fs.existsSync("README.md") ? fs.readFileSync("README.md", "utf8") : "";
if (!appVer) E("APP_VERSION nicht gefunden");
else {
  if (appVer !== cfgVer) E(`Version weicht ab: APP_VERSION ${appVer}, config.xml ${cfgVer}`);
  if (!swCache || !swCache.endsWith(appVer)) E(`sw.js cached unter "${swCache}", die App ist ${appVer}`);
  if (!readme.includes(appVer)) E(`README.md nennt Version ${appVer} nicht`);
  if (!errors.some(e => e.includes("Version") || e.includes("cached unter"))) O(`Version ${appVer} überall gleich`);
}

/* 7b. Workflows passen zur App */
{
  const appId = (cfg.match(/<widget id="([^"]+)"/) || [])[1];
  const scheme = (cfg.match(/name="URL_SCHEME" value="([^"]+)"/) || [])[1];
  const productId = (js.match(/const PRODUCT_ID = "([^"]+)";/) || [])[1];
  if (!productId || !productId.startsWith(appId + ".")) E(`PRODUCT_ID "${productId}" beginnt nicht mit der Kennung ${appId}.`);
  if (!/drawmory:\/\/import#t=/.test(js) || scheme !== "drawmory") E("URL-Schema in config.xml und App passen nicht zusammen");
  for (const wf of [".github/workflows/ios.yml", ".github/workflows/android.yml"]) {
    if (!fs.existsSync(wf)) { E("Workflow fehlt: " + wf); continue; }
    const y = fs.readFileSync(wf, "utf8");
    const wfId = (y.match(/APP_ID: (\S+)/) || [])[1];
    if (wfId !== appId) E(`${wf}: APP_ID ${wfId}, config.xml sagt ${appId}`);
    if (/\t/.test(y)) E(`${wf}: Tabulator gefunden – YAML erlaubt nur Leerzeichen`);
    /* Jede Datei, die der Workflow ins Cordova-Projekt kopiert, muss existieren */
    for (const m of y.matchAll(/^\s*cp ((?:[\w.-]+\.(?:html|json|js|png)\s+(?:\\\s*)?)+)build\/www\//gm))
      for (const f of m[1].split(/[\s\\]+/).filter(Boolean)) if (!fs.existsSync(f)) E(`${wf} kopiert fehlende Datei ${f}`);
    if (/node smoketest\.js/.test(y) && !fs.existsSync("package.json")) E(`${wf} braucht package.json für den Ablauftest`);
  }
  const ios = fs.existsSync(".github/workflows/ios.yml") ? fs.readFileSync(".github/workflows/ios.yml", "utf8") : "";
  const wfScheme = (ios.match(/URL_SCHEME: (\S+)/) || [])[1];
  if (wfScheme !== scheme) E(`ios.yml prüft URL-Schema ${wfScheme}, config.xml setzt ${scheme}`);
  if (!/workflow_dispatch/.test((ios.match(/In App Store Connect hochladen[\s\S]*?run:/) || [""])[0]))
    E("ios.yml: Upload nach App Store Connect muss an workflow_dispatch gebunden sein (Build-Nummern)");
  const pm = "res/ios/PrivacyInfo.xcprivacy";
  /* Nach dem Eintrag selbst suchen: "CA92.1" steht auch im Kommentar der Datei */
  if (!fs.existsSync(pm) || !/<string>CA92\.1<\/string>/.test(fs.readFileSync(pm, "utf8").replace(/<!--[\s\S]*?-->/g, ""))) E("Privacy-Manifest fehlt oder nennt CA92.1 nicht");
  /* Android: Vordergrund-Icons und Farbe des adaptiven Icons */
  for (const m of cfg.matchAll(/foreground="([^"]+)"/g)) if (!fs.existsSync(m[1])) E("Android-Vordergrund fehlt: " + m[1]);
  if (!fs.existsSync("res/android/colors.xml") || !/drawmory_icon_background/.test(fs.readFileSync("res/android/colors.xml", "utf8")))
    E("res/android/colors.xml fehlt oder enthält drawmory_icon_background nicht");
  if (!errors.some(e => /Workflow|yml|PRODUCT_ID|Schema|Privacy|Android/.test(e))) O(`Workflows passen zur App (${appId}, ${productId}, ${scheme}://)`);
}

/* 8. Sicherheitsregeln */
if (/innerHTML\s*=\s*[^'"\n]*\b(name|tpl|text|value)\b/.test(js)) E("innerHTML mit Nutzerdaten gefunden – textContent verwenden");
if (!/Content-Security-Policy/.test(html)) E("Content-Security-Policy fehlt");
if (/https?:\/\/(?!simaehlmann-cloud\.github\.io)[a-z]/i.test(js.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")))
  E("Skript enthält externe Adressen außer der Webfassung");

if (errors.length) {
  console.log("\n" + errors.length + " Fehler:");
  errors.forEach(e => console.log("  FEHLER  " + e));
  process.exit(1);
}
console.log("\nAlles in Ordnung.");
