/* Drawmory – Ablauftest im echten Browser (Playwright, Chromium).
     npm i -D playwright jsqr pngjs && npx playwright install chromium
     python3 -m http.server 8765 &      (im Projektordner)
     node smoketest.js
   Spielt die App in iPad-Größe durch: Level, Bewertung, Maßstab, Gedächtnis,
   Mehrspieler, Editor, QR-Code (mit unabhängigem Decoder zurückgelesen),
   Import per Link, Sprachwechsel, Hochformat, Dunkelmodus.
   Ab 0.2: Einführung, Fehlerfarben, Spiegeln und Drehen, Haus vom Nikolaus,
   Vorlagen-Pakete, App-Links, Vollversion mit nachgebildetem StoreKit. */
"use strict";
const { chromium } = require("playwright");
const jsQR = require("jsqr");
const { PNG } = require("pngjs");
const fs = require("fs");

const BASE = process.env.BASE || "http://localhost:8765/index.html";
const SHOTS = process.env.SHOTS || "";          // Ordner für Bildschirmfotos, leer = keine
let passed = 0, failed = 0;
function check(cond, msg) {
  if (cond) { passed++; console.log("  ok  " + msg); }
  else { failed++; console.log("  FEHLER  " + msg); }
}
/* fester Zufall, damit jeder Lauf dieselben Zeichnungen erzeugt */
let seed = 12345;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
async function shot(page, name) { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); }

/* Zeichnet Striche (Einheiten 0..96) mit der Maus auf ein Canvas */
async function drawOn(page, canvasId, strokes, opts = {}) {
  const r = await page.locator("#" + canvasId).boundingBox();
  const off = opts.offset || [0, 0], jitter = opts.jitter || 0;
  for (const s of strokes) {
    const pts = [];
    for (let i = 0; i < s.length; i++) {
      if (i === 0) { pts.push(s[0]); continue; }
      const a = s[i - 1], b = s[i], n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5));
      for (let j = 1; j <= n; j++) pts.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
    }
    const toPx = p => [r.x + (p[0] + off[0] + (rand() - .5) * jitter) / 96 * r.width,
                       r.y + (p[1] + off[1] + (rand() - .5) * jitter) / 96 * r.height];
    const [x0, y0] = toPx(pts[0]);
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    for (const p of pts.slice(1)) { const [x, y] = toPx(p); await page.mouse.move(x, y); }
    await page.mouse.up();
  }
}
async function tap(page, canvasId, u) {
  const r = await page.locator("#" + canvasId).boundingBox();
  await page.mouse.click(r.x + u[0] / 96 * r.width, r.y + u[1] / 96 * r.height);
}
async function scoreText(page) {
  await page.waitForSelector("#mdl-result:not([hidden])");
  await page.waitForTimeout(1100);   // Hochzählen abwarten
  return parseInt(await page.textContent("#resScore"), 10);
}
const scaled = (strokes, k) => strokes.map(s => s.map(p => [p[0] * k, p[1] * k]));
async function unlockUpTo(page, n) {
  await page.evaluate(n => { const p = getProgress(); LEVELS.slice(0, n).forEach(l => { p[l.id] = 95; }); store.set("progress", p); renderLevels(); }, n);
}
/* Zählt Pixel im Ergebniskanal, die der Farbe eines CSS-Tokens nahekommen */
async function countColor(page, canvasId, token) {
  return page.evaluate(([id, tok]) => {
    const hex = getComputedStyle(document.documentElement).getPropertyValue(tok).trim();
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    const cv = document.getElementById(id), d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && Math.abs(d[i] - c[0]) + Math.abs(d[i + 1] - c[1]) + Math.abs(d[i + 2] - c[2]) < 40) n++;
    return n;
  }, [canvasId, token]);
}
/* StoreKit-Nachbildung für den Vollversions-Test */
const MOCK_STORE = `
  window.cordova = { platformId: "ios" };
  window.__buyCalls = 0;
  (function () {
    const L = {};
    const product = { id: "de.drawmory.app.full", owned: false, pricing: { price: "3,99 €" },
      getOffer() { return { order() { window.__buyCalls++; setTimeout(() => { product.owned = true;
        L.productUpdated && L.productUpdated(product); L.finished && L.finished({ products: [{ id: product.id }] }); }, 60);
        return Promise.resolve(undefined); } }; } };
    const when = { productUpdated(f) { L.productUpdated = f; return when; }, approved(f) { L.approved = f; return when; },
      verified(f) { L.verified = f; return when; }, finished(f) { L.finished = f; return when; } };
    window.CdvPurchase = { ProductType: { NON_CONSUMABLE: "non consumable" }, Platform: { APPLE_APPSTORE: "ios-appstore" },
      ErrorCode: { PAYMENT_CANCELLED: 6777006 },
      store: { register() {}, when() { return when; }, error() {},
        initialize() { setTimeout(() => L.productUpdated(product), 10); return Promise.resolve([]); },
        get() { return product; }, owned() { return product.owned; }, restorePurchases() { return Promise.resolve(); } } };
  })();`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: false, locale: "de-DE" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  /* cordova.js gibt es nur in der App-Hülle; im Browser ist der 404 erwartet */
  page.on("response", r => { if (r.status() >= 400 && !/cordova\.js$/.test(r.url())) errors.push(r.status() + " " + r.url()); });
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

  console.log("Start und Einführung");
  await page.goto(BASE);
  check(await page.isVisible("#mdl-intro"), "Einführung erscheint beim ersten Start");
  const titles = [];
  for (let i = 0; i < 3; i++) {
    titles.push(await page.textContent("#introTitle"));
    if (i === 1) await shot(page, "00-intro");
    await page.click("#btnIntroNext");
  }
  check(new Set(titles).size === 3, "Drei verschiedene Schritte");
  check(!(await page.isVisible("#mdl-intro")), "Nach dem letzten Schritt geschlossen");
  await page.reload();
  check(!(await page.isVisible("#mdl-intro")), "Beim zweiten Start keine Einführung");
  check(await page.isVisible("#scr-home"), "Startseite sichtbar");
  check((await page.textContent(".tagline")).includes("Merken"), "Deutsch als Startsprache");
  await page.waitForTimeout(3800);
  await shot(page, "01-home");

  console.log("Level 1: Strich exakt");
  await page.click('[data-to="levels"]');
  await shot(page, "02-levels");
  check(await page.locator(".lvl.locked").count() === 29, "29 Level gesperrt");
  check(await page.locator(".lvl .pro").count() === 0, "Webfassung: keine Vollversions-Sperren");
  check(await page.isVisible("#scr-levels .lang"), "Flaggen auch auf der Levelübersicht");
  await page.click('#scr-levels [data-lang="en"]');
  check((await page.textContent("#scr-levels .title")) === "Play levels", "Sprachwechsel auf der Levelübersicht");
  check((await page.textContent(".world h2")) === "First lines", "Weltnamen wechseln mit");
  await page.click('#scr-levels [data-lang="de"]');
  await page.locator(".lvl").first().click();
  check(await page.isVisible("#scr-game"), "Spielfeld offen");
  const SH = await page.evaluate(() => SHAPES);
  check(await page.isDisabled("#btnDone"), "Fertig gesperrt, solange nichts gezeichnet ist");
  await drawOn(page, "cvR", SH.line, { offset: [3, 10], jitter: .6 });
  await shot(page, "03-game");
  await page.click("#btnDone");
  let sc = await scoreText(page);
  check(sc >= 90, `Exakte Linie, verschoben gezeichnet: ${sc} % (≥ 90)`);
  check(await countColor(page, "cvResult", "--hit") > 200, "Treffende Linie erscheint grün");
  check(await countColor(page, "cvResult", "--miss") < 30, "Kaum Rot bei exakter Linie");
  await shot(page, "04-result");
  check(await page.evaluate(() => isUnlocked(1)), "Level 2 freigeschaltet");
  await page.click("#resActions >> text=Nächstes Level");

  console.log("Level 2: Kritzelei statt Winkel");
  await drawOn(page, "cvR", [[[10, 80], [30, 70], [20, 60], [40, 55]]]);
  await page.click("#btnDone");
  sc = await scoreText(page);
  check(sc < 40, `Falsche Form: ${sc} % (< 40)`);
  check(await countColor(page, "cvResult", "--miss") > 200, "Falsche Form erscheint rot");
  check((await page.textContent("#resActions")).indexOf("Nächstes Level") < 0, "Ohne Stern kein „Nächstes Level“");
  await page.click("#resActions >> text=Nochmal");

  console.log("Rückgängig, Löschen");
  await drawOn(page, "cvR", SH.angle);
  await drawOn(page, "cvR", [[[80, 10], [90, 20]]]);
  check(await page.evaluate(() => game.drawn.length) === 2, "Zwei Striche erfasst");
  await page.click("#btnUndo");
  check(await page.evaluate(() => game.drawn.length) === 1, "Rückgängig entfernt den letzten Strich");
  await page.click("#btnClear");
  check(await page.evaluate(() => game.drawn.length) === 0, "Löschen leert die Zeichnung");
  check(await page.isDisabled("#btnDone"), "Fertig wieder gesperrt");

  console.log("Lineal-Hilfe");
  await drawOn(page, "cvR", [[[24, 24], [25, 48], [24, 72], [48, 72.8], [72, 72]]]);
  check(await page.evaluate(() => game.drawn[0].length) > 2, "Winkel wird nicht fälschlich zur Geraden");
  await page.click("#btnClear");
  await drawOn(page, "cvR", [[[20, 30], [45, 31.2], [70, 30]]]);
  check(await page.evaluate(() => game.drawn[0].length) === 2, "Fast gerader Strich wird gerade");
  await page.click('#scr-game [data-action="quitGame"]');
  check(await page.isVisible("#scr-levels"), "Abbrechen führt zur Levelübersicht");

  console.log("Maßstab: Level 13 (Quadrat doppelt so groß)");
  await unlockUpTo(page, 12);
  await page.locator(".lvl").nth(12).click();
  /* Links ist die Vorlage halb so groß dargestellt; verlangt ist das Doppelte
     des Sichtbaren, also die Originalgröße im Raum 0..96. */
  await drawOn(page, "cvR", scaled(SH.square, 0.5), { offset: [10, 10] });
  await page.click("#btnDone");
  const sc1 = await scoreText(page);
  await page.click("#resActions >> text=Nochmal");
  await drawOn(page, "cvR", scaled(SH.square, 1), { offset: [-4, 6] });
  await shot(page, "05-scale");
  await page.click("#btnDone");
  const sc2 = await scoreText(page);
  check(sc2 >= 85, `Doppelt so groß gezeichnet: ${sc2} % (≥ 85)`);
  check(sc1 < 60, `Gleich groß statt doppelt: ${sc1} % (< 60)`);
  await page.click("#resActions >> text=Levelübersicht");

  console.log("Maßstab: Level 15 (Treppe halb so groß)");
  await unlockUpTo(page, 14);
  await page.locator(".lvl").nth(14).click();
  await drawOn(page, "cvR", scaled(SH.stairs, 0.5), { offset: [20, 20] });
  await page.click("#btnDone");
  sc = await scoreText(page);
  check(sc >= 85, `Halb so groß gezeichnet: ${sc} % (≥ 85)`);
  await page.click("#resActions >> text=Levelübersicht");

  console.log("Gedächtnis: Level 7");
  await unlockUpTo(page, 6);
  await page.locator(".lvl").nth(6).click();
  check(await page.isVisible("#lookVeil"), "Einprägen-Phase sichtbar");
  await drawOn(page, "cvR", [[[10, 10], [50, 50]]]);
  check(await page.evaluate(() => game.drawn.length) === 0, "Während des Einprägens wird nicht gezeichnet");
  await shot(page, "06-memorize");
  await page.waitForTimeout(1200);
  const n = parseInt(await page.textContent("#countNum"), 10);
  check(n <= 5 && n >= 2, `Countdown läuft (${n})`);
  await page.click('[data-action="skipLook"]');
  check(await page.isVisible("#hiddenCard"), "Vorlage danach verdeckt");
  check(!(await page.isVisible("#lookVeil")), "Zeichenfläche frei");
  await drawOn(page, "cvR", SH.arrow);
  await page.click("#btnDone");
  sc = await scoreText(page);
  check(sc >= 90, `Pfeil aus dem Gedächtnis: ${sc} %`);
  await page.click("#resActions >> text=Levelübersicht");
  /* Countdown darf nach dem Verlassen nicht weiterlaufen */
  await page.locator(".lvl").nth(7).click();
  await page.click('#scr-game [data-action="quitGame"]');
  await page.waitForTimeout(6500);
  check(await page.isVisible("#scr-levels"), "Abgebrochener Countdown springt nicht zurück ins Spiel");
  check(await page.evaluate(() => timers.size) === 0, "Keine Zeitgeber übrig");

  console.log("Spiegeln und Drehen");
  await unlockUpTo(page, 24);
  const TR = { mirrorV: p => [96 - p[0], p[1]], rot90: p => [96 - p[1], p[0]], rot180: p => [96 - p[0], 96 - p[1]] };
  const lvlInfo = await page.evaluate(() => LEVELS.map(l => ({ id: l.id, shape: l.shape, transform: l.transform })));
  const mi = lvlInfo.findIndex(l => l.id === "worldMirror-1");
  check(mi === 18 && lvlInfo[mi].transform === "mirrorV", "Welt „Spiegeln und Drehen“ beginnt mit Level 19");
  await page.locator(".lvl").nth(mi).click();
  check((await page.textContent("#gameTask")).includes("senkrechten Achse"), "Aufgabe nennt die Spiegelachse");
  check((await page.textContent("#gameChips")).includes("spiegeln"), "Regel-Chip für Spiegeln");
  await drawOn(page, "cvR", SH.flag);
  await page.click("#btnDone");
  const scWrong = await scoreText(page);
  check(await page.isVisible("#resNote") && (await page.textContent("#resNote")).includes("Lage"), "Hinweis: Form stimmt, Lage nicht");
  await page.click("#resActions >> text=Nochmal");
  await drawOn(page, "cvR", SH.flag.map(s => s.map(TR.mirrorV)), { offset: [-6, 0] });
  await shot(page, "06b-mirror");
  await page.click("#btnDone");
  const scRight = await scoreText(page);
  check(scRight >= 90, `Gespiegelte Fahne: ${scRight} % (≥ 90)`);
  check(scWrong <= 40, `Ungespiegelt abgezeichnet: ${scWrong} % (≤ 40, kein Stern)`);
  await page.click("#resActions >> text=Levelübersicht");
  const ri = lvlInfo.findIndex(l => l.id === "worldMirror-3");
  await page.locator(".lvl").nth(ri).click();
  check((await page.textContent("#gameTask")).includes("90°"), "Aufgabe nennt die Drehung");
  await drawOn(page, "cvR", SH.arrow.map(s => s.map(TR.rot90)));
  await page.click("#btnDone");
  sc = await scoreText(page);
  check(sc >= 90, `Pfeil um 90° gedreht: ${sc} %`);
  await page.click("#resActions >> text=Nochmal");
  await drawOn(page, "cvR", SH.arrow.map(s => s.map(TR.rot90).map(TR.rot180)));
  await page.click("#btnDone");
  sc = await scoreText(page);
  check(sc <= 40 && await page.isVisible("#resNote"), `In die falsche Richtung gedreht: ${sc} % (≤ 40) mit Hinweis`);
  await page.click("#resActions >> text=Levelübersicht");

  console.log("Haus vom Nikolaus");
  const ni = lvlInfo.findIndex(l => l.shape === "nikolaus");
  await unlockUpTo(page, ni + 1);
  await page.locator(".lvl").nth(ni).click();
  check((await page.textContent("#gameChips")).includes("in einem Zug"), "Regel-Chip „in einem Zug“");
  await page.click('[data-action="skipLook"]');
  await drawOn(page, "cvR", SH.nikolaus);
  await page.click("#btnDone");
  sc = await scoreText(page);
  check(sc >= 90 && await page.isHidden("#resNote"), `In einem Zug: ${sc} %, kein Hinweis`);
  await page.click("#resActions >> text=Nochmal");
  await page.click('[data-action="skipLook"]');
  const pieces = [];
  const nk = SH.nikolaus[0];
  for (let i = 1; i < nk.length; i++) pieces.push([nk[i - 1], nk[i]]);
  await drawOn(page, "cvR", pieces);
  await page.click("#btnDone");
  sc = await scoreText(page);
  check(sc <= 50 && await page.isVisible("#resNote"), `Abgesetzt: ${sc} % (≤ 50) mit Hinweis`);
  await page.click("#resActions >> text=Nochmal");
  await page.click('[data-action="skipLook"]');
  await drawOn(page, "cvR", SH.nikolaus);
  await drawOn(page, "cvR", [[[50, 90], [50.3, 90.2]]]);   // versehentlicher Tupfer
  await page.click("#btnDone");
  sc = await scoreText(page);
  check(await page.isHidden("#resNote") && sc >= 90, `Ein winziger Tupfer zählt weder als Absetzen noch gegen die Wertung (${sc} %)`);
  await page.click("#resActions >> text=Levelübersicht");

  console.log("Freies Spiel");
  await page.click('#scr-levels [data-action="back"]');
  await page.click('[data-to="free"]');
  await page.click('#freeShapes button[aria-label="Herz"]');
  await page.click('#freeRules .seg button:has-text("Doppelt")');
  await shot(page, "07-free");
  await page.click('[data-action="startFree"]');
  check((await page.textContent("#gameTitle")) === "Herz", "Gewählte Figur wird gespielt");
  check((await page.textContent("#gameTask")).includes("doppelt"), "Aufgabe nennt den Maßstab");
  await drawOn(page, "cvR", SH.heart);
  await page.click("#btnDone");
  sc = await scoreText(page);
  check(sc >= 85, `Herz (Kurve, doppelt): ${sc} %`);
  await page.click("#resActions >> text=Andere Figur");
  check(await page.isVisible("#scr-free"), "„Andere Figur“ führt zur Auswahl");
  await page.click('#freeRules .seg button:has-text("Gleich")');
  await page.click('#freeRules .seg button:has-text("180° drehen")');
  await page.click('[data-action="startFree"]');
  check((await page.textContent("#gameTask")).includes("180°"), "Freies Spiel: Verwandlung greift");
  await page.click('#scr-game [data-action="quitGame"]');
  await page.click('#freeRules .seg button:has-text("Keine")');
  await page.click('#scr-free [data-action="back"]');

  console.log("Mehrspieler: 3 Personen, 1 Runde");
  await page.click('[data-to="multiSetup"]');
  await page.click('#playerCount button:has-text("3")');
  await page.fill("#playerNames input >> nth=0", "Lena");
  await page.fill("#playerNames input >> nth=1", "Max");
  await page.click('#roundCount button:has-text("1")');
  await page.click('#poolPick button:has-text("Leicht")');
  await page.click('#multiRules .seg button:has-text("Dauerhaft")');
  await shot(page, "08-multisetup");
  await page.click('[data-action="startMulti"]');
  check((await page.textContent("#handoffName")) === "Lena", "Erste Spielerin ist Lena");
  await shot(page, "09-handoff");
  const target = await page.evaluate(() => resolveShape(match.rounds[0].shape).strokes);
  const quality = [0.4, 2.5, 1.2];       // Zittrigkeit je Person
  for (let p = 0; p < 3; p++) {
    await page.click('[data-action="beginTurn"]');
    check(await page.isVisible("#scr-game"), `Spielfeld für Person ${p + 1}`);
    await drawOn(page, "cvR", target, { jitter: quality[p] * 2, offset: [p, p] });
    await page.click("#btnDone");
    if (p < 2) check(await page.isVisible("#scr-handoff"), "Danach Übergabe");
  }
  check(await page.isVisible("#scr-multiResult"), "Ergebnis erscheint");
  const ms = await page.evaluate(() => match.rounds[0].results.map(r => r.score));
  check(ms[0] - ms[1] >= 10, `Bewertung unterscheidet sauber (${ms[0]} %) und zittrig (${ms[1]} %)`);
  check(ms[0] > ms[2] && ms[2] > ms[1], `Reihenfolge passt zur Genauigkeit: ${ms.join(" / ")}`);
  await page.waitForTimeout(300);
  await shot(page, "10-multiresult");
  check((await page.textContent("#multiWinner")).includes("gewinnt") || (await page.textContent("#multiWinner")).includes("Unentschieden"), "Sieger wird genannt");
  check(await page.locator("#podium .card").count() === 3, "Drei Karten auf dem Podest");
  const pnames = await page.locator("#podium .pname").allTextContents();
  check(pnames.includes("Spieler 3"), "Leerer Name wird zu „Spieler 3“");
  await page.click("#roundNav button >> nth=1");
  check((await page.textContent("#podium .pscore >> nth=0")).includes("%"), "Rundenansicht zeigt Prozent");

  console.log("Mehrspieler abbrechen");
  await page.click('#scr-multiResult [data-action="startMulti"]');
  await page.click('[data-action="beginTurn"]');
  await page.click('#scr-game [data-action="quitGame"]');
  check(await page.isVisible("#scr-multiSetup"), "Abbruch führt zu den Einstellungen");
  await page.click('#scr-multiSetup [data-action="back"]');
  check(await page.isVisible("#scr-home"), "Von dort zurück zur Startseite");

  console.log("Editor");
  await page.click('[data-to="templates"]');
  check((await page.textContent("#tplList")).includes("Noch keine"), "Leerer Zustand mit Hinweis");
  await page.click('[data-action="newTemplate"]');
  await page.waitForTimeout(200);
  await page.click('[data-action="saveTemplate"]');
  check((await page.textContent("#toastText")).includes("mindestens"), "Leere Vorlage wird nicht gespeichert");
  for (const p of [[16, 64], [48, 24], [80, 64], [16, 64]]) await tap(page, "cvE", p);  // geschlossenes Dreieck
  for (const p of [[32, 80], [64, 80]]) await tap(page, "cvE", p);
  await page.click('[data-action="endLine"]');
  await page.click('[data-tool="free"]');
  await drawOn(page, "cvE", [[[40, 40], [44, 46], [48, 48], [52, 46], [56, 40]]]);
  await page.fill("#tplName", "Zelt <b>&</b> Weg");
  await shot(page, "11-editor");
  const ed = await page.evaluate(() => editor.strokes);
  check(ed.length === 3, `Drei Striche im Editor (${ed.length})`);
  check(JSON.stringify(ed[0]) === JSON.stringify([[16, 64], [48, 24], [80, 64], [16, 64]]), "Tippen auf den Startpunkt schließt die Form");
  check(ed[2].every(p => Number.isInteger(p[0]) && Number.isInteger(p[1])), "Freihand wird auf ganze Einheiten gerundet");
  await page.click('[data-action="saveTemplate"]');
  check(await page.isVisible("#scr-templates"), "Nach dem Speichern: Vorlagenliste");
  check((await page.textContent(".tpl-name")) === "Zelt <b>&</b> Weg", "Name wird als Text angezeigt, nicht als HTML");
  await page.click('#scr-templates [data-action="back"]');
  check(await page.isVisible("#scr-home"), "Zurück führt nicht wieder in den Editor");
  await page.click('[data-to="templates"]');

  console.log("QR-Code");
  await page.click('.tpl .icon-btn[aria-label="Teilen"]');
  await page.waitForSelector("#mdl-share:not([hidden])");
  await shot(page, "12-share");
  const url = await page.textContent("#shareCode");
  const qrPng = await page.evaluate(() => document.getElementById("cvQR").toDataURL("image/png"));
  const img = PNG.sync.read(Buffer.from(qrPng.split(",")[1], "base64"));
  const dec = jsQR(new Uint8ClampedArray(img.data), img.width, img.height);
  check(dec && dec.data === url, "QR-Code liest sich als Link zurück");
  const poster = await page.evaluate(() => qrPoster(shareList));
  const pimg = PNG.sync.read(Buffer.from(poster.split(",")[1], "base64"));
  const pdec = jsQR(new Uint8ClampedArray(pimg.data), pimg.width, pimg.height);
  check(pdec && pdec.data === url, "Auch das Teilen-Bild enthält einen lesbaren QR-Code");
  await page.click('#mdl-share [data-action="closeModal"]');

  console.log("QR-Encoder über viele Längen");
  const lens = [1, 10, 17, 30, 60, 100, 150, 220, 300, 400, 600, 900, 1200];
  let qrOk = 0;
  for (const L of lens) {
    const r = await page.evaluate(L => {
      const s = Array.from({ length: L }, (_, i) => "Aä€-_#".charAt(i % 6)).join("").slice(0, L);
      const q = QR.encode(s);
      const cv = document.createElement("canvas"); renderQR(cv, q, 4);
      return { s, v: q.version, png: cv.toDataURL("image/png") };
    }, L);
    const im = PNG.sync.read(Buffer.from(r.png.split(",")[1], "base64"));
    const d = jsQR(new Uint8ClampedArray(im.data), im.width, im.height);
    if (d && d.data === r.s) qrOk++; else console.log(`     Länge ${L} (Version ${r.v}) nicht lesbar`);
  }
  check(qrOk === lens.length, `${qrOk}/${lens.length} QR-Codes (Version 1 bis 20+) fehlerfrei gelesen`);

  console.log("Import");
  const codeOnly = url.split("#t=")[1];
  check(await page.evaluate(c => decodeTemplate(c) !== null, codeOnly), "Code ohne Link wird erkannt");
  check(await page.evaluate(c => decodeTemplate(c.slice(0, -2) + "AA") === null, codeOnly), "Beschädigter Code wird abgelehnt (Prüfsumme)");
  check(await page.evaluate(() => decodeTemplate("<script>alert(1)</script>") === null), "Unsinn wird abgelehnt");
  check(await page.evaluate(() => decodeTemplate("#t=AQAA") === null), "Zu kurzer Code wird abgelehnt");
  await page.click('[data-action="openImport"]');
  await page.fill("#importText", url);
  await page.click('[data-action="doImport"]');
  check((await page.textContent("#toastText")).includes("schon"), "Doppelte Vorlage wird erkannt");

  /* zweites Gerät: eigener Kontext, leerer Speicher */
  const ctx2 = await browser.newContext({ viewport: { width: 1180, height: 820 }, locale: "de-DE" });
  const p2 = await ctx2.newPage();
  p2.on("pageerror", e => errors.push("Gerät 2: " + e.message));
  await p2.goto(BASE + url.slice(url.indexOf("#")));
  await p2.waitForSelector("#mdl-confirm:not([hidden])");
  check((await p2.textContent("#confirmText")).includes("Zelt"), "Geöffneter Link fragt nach Übernahme");
  check(!(await p2.evaluate(() => location.hash)), "Code wird aus der Adresszeile entfernt");
  await p2.click("#confirmYes");
  check(await p2.isVisible("#scr-templates"), "Vorlage übernommen, Liste offen");
  const imported = await p2.evaluate(() => getTemplates()[0]);
  check(imported && imported.name === "Zelt <b>&</b> Weg" && imported.strokes.length === 3, "Name und Linien vollständig übertragen");
  await ctx2.close();

  console.log("Vorlagen-Pakete");
  check(await page.isHidden("#btnSelect"), "„Mehrere teilen“ erst ab zwei Vorlagen");
  const starCode = await page.evaluate(() => shareUrl([{ name: "Stern", strokes: SHAPES.star.map(s => s.map(p => p.map(Math.round))) }]));
  await page.click('[data-action="openImport"]');
  await page.fill("#importText", starCode);
  await page.click('[data-action="doImport"]');
  check(await page.locator("#tplList .tpl").count() === 2, "Zweite Vorlage per Code importiert");
  check((await page.textContent("#tplList .tpl-name >> nth=0")) === "Stern", "Neu importierte Vorlage steht oben");
  await page.click("#btnSelect");
  check(await page.isVisible("#selectBar") && await page.isDisabled("#btnShareSel"), "Auswahlmodus, Teilen erst nach Auswahl");
  await page.locator("#tplList .tpl").nth(0).click();
  await page.locator("#tplList .tpl").nth(1).click();
  check((await page.textContent("#selectCount")).includes("2"), "Zwei ausgewählt");
  await shot(page, "12b-select");
  await page.click("#btnShareSel");
  check((await page.textContent("#shareTitle")).includes("2 Vorlagen"), "Paket-Dialog");
  const packUrl = await page.textContent("#shareCode");
  const packPng = await page.evaluate(() => document.getElementById("cvQR").toDataURL("image/png"));
  const pk = PNG.sync.read(Buffer.from(packPng.split(",")[1], "base64"));
  const pkd = jsQR(new Uint8ClampedArray(pk.data), pk.width, pk.height);
  check(pkd && pkd.data === packUrl, "Paket-QR liest sich zurück");
  check(await page.evaluate(u => { const l = decodeShare(u); return l && l.length === 2 && l.map(x => x.name).sort().join("|") === "Stern|Zelt <b>&</b> Weg"; }, packUrl), "Paket enthält beide Vorlagen");
  await page.click('#mdl-share [data-action="closeModal"]');
  await page.click('[data-action="selectCancel"]');
  check(await page.isHidden("#selectBar"), "Auswahlmodus beendet");
  /* Grenzfälle des Formats */
  check(await page.evaluate(() => {
    const big = Array.from({ length: 21 }, (_, i) => ({ name: "F" + i, strokes: [[[0, 0], [i, i]]] }));
    return decodeShare(SHARE_BASE + "#t=" + encodeShare(big)) === null;   // mehr als 20
  }), "Pakete über 20 Vorlagen werden abgelehnt");
  check(await page.evaluate(() => {
    const two = [{ name: "Ä€😀", strokes: [[[1, 2], [3, 4]]] }, { name: "B", strokes: [[[96, 96]]] }];
    const l = decodeShare(encodeShare(two));
    return l && l[0].name === "Ä€😀" && l[1].strokes[0][0][0] === 96;
  }), "Sonderzeichen und Randwerte überstehen den Code");

  /* zweites Gerät als iPad: Paket öffnen, App-Angebot sichtbar */
  const ctx3 = await browser.newContext({ viewport: { width: 1180, height: 820 }, locale: "de-DE",
    userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
  const p3 = await ctx3.newPage();
  p3.on("pageerror", e => errors.push("iPad: " + e.message));
  await p3.goto(BASE + packUrl.slice(packUrl.indexOf("#")));
  await p3.waitForSelector("#mdl-confirm:not([hidden])");
  check((await p3.textContent("#confirmText")).includes("2 Vorlagen"), "Paket-Link fragt nach Übernahme");
  check(await p3.isVisible("#confirmExtra") && (await p3.getAttribute("#confirmExtra", "href")).startsWith("drawmory://import#t="), "iPad: Angebot „In der App öffnen“");
  await shot(p3, "12c-pack-import");
  await p3.click("#confirmYes");
  check(await p3.evaluate(() => getTemplates().length) === 2, "Beide Vorlagen übernommen");
  check(!(await p3.isVisible("#mdl-intro")), "Kein Einführungsdialog über dem Import");
  await ctx3.close();

  console.log("App-Link drawmory://");
  await page.evaluate(u => window.handleOpenURL("drawmory://import#t=" + u.split("#t=")[1]), packUrl);
  await page.waitForSelector("#mdl-confirm:not([hidden])");
  check((await page.textContent("#confirmText")).includes("2 Vorlagen") && await page.isHidden("#confirmExtra"), "App-Link öffnet die Rückfrage, ohne App-Angebot");
  await page.click("#confirmYes");
  check((await page.textContent("#toastText")).includes("schon"), "Bereits vorhandene Vorlagen werden übersprungen");

  console.log("Eigene Vorlage spielen");
  await page.locator('.tpl', { hasText: "Zelt" }).locator('.icon-btn[aria-label="Spielen"]').click();
  check((await page.textContent("#gameTitle")).startsWith("Zelt"), "Eigene Vorlage im Spiel");
  const tplStrokes = await page.evaluate(() => game.round.strokes);
  await drawOn(page, "cvR", tplStrokes);
  await page.click("#btnDone");
  sc = await scoreText(page);
  check(sc >= 90, `Eigene Vorlage exakt: ${sc} %`);
  await page.click("#resActions >> text=Nochmal");
  await page.click('#scr-game [data-action="quitGame"]');

  console.log("Sprache, Darstellung, Hochformat");
  await page.click('#scr-templates [data-action="back"]');
  await page.click('#scr-home [data-lang="en"]');
  check((await page.textContent(".tagline")) === "Look. Remember. Redraw.", "Englisch aktiv");
  check((await page.getAttribute("html", "lang")) === "en", "html lang = en");
  await page.reload();
  check((await page.textContent(".tagline")) === "Look. Remember. Redraw.", "Sprache bleibt nach Neustart");
  await page.click('[data-action="openSettings"]');
  await page.click('[data-theme="dark"]');
  await page.click('#mdl-settings [data-action="closeModal"]');
  await page.waitForTimeout(3800);
  await shot(page, "13-home-dark-en");
  await page.click('[data-to="levels"]');
  await unlockUpTo(page, 16);
  await shot(page, "13b-levels-dark");
  await page.locator(".lvl").nth(16).click();
  await page.waitForTimeout(200);
  await shot(page, "14-game-dark");
  await page.click('#scr-game [data-action="quitGame"]');
  await page.click('#scr-levels [data-action="back"]');
  await page.click('[data-action="openSettings"]');
  await page.click('[data-theme="auto"]');
  await page.click('#mdl-settings [data-lang="de"]');
  await page.click('#mdl-settings [data-action="closeModal"]');

  await page.setViewportSize({ width: 820, height: 1180 });
  await page.click('[data-to="levels"]');
  await page.locator(".lvl").first().click();
  await page.waitForTimeout(200);
  check(await page.evaluate(() => document.getElementById("stage").classList.contains("portrait")), "Hochformat: Felder übereinander");
  const bl = await page.locator("#panelL").boundingBox(), br = await page.locator("#panelR").boundingBox();
  check(br.y >= bl.y + bl.height && bl.width > 380, `Beide Felder passen (${Math.round(bl.width)} px)`);
  await drawOn(page, "cvR", SH.line);
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.waitForTimeout(200);
  check(await page.evaluate(() => game.drawn.length) === 1, "Drehen behält die Zeichnung");
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.waitForTimeout(200);
  await shot(page, "15-portrait");

  console.log("Datenschutz und Impressum");
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.click('#scr-game [data-action="quitGame"]');
  await page.click('#scr-levels [data-action="back"]');
  await page.click('[data-action="openAbout"]');
  await shot(page, "16-about");
  await page.click('#mdl-about [data-page="datenschutz"]');
  await page.waitForLoadState();
  check((await page.textContent("h1")) === "Datenschutzerklärung", "Datenschutz öffnet");
  await page.click("text=Zurück zur App");
  await page.click('[data-page="impressum"]');
  check((await page.textContent("h1")) === "Impressum", "Impressum öffnet");
  await page.click("text=Zurück zur App");
  check(await page.isVisible("#scr-home"), "Zurück in der App");

  console.log("Fortschritt zurücksetzen");
  await page.click('[data-action="openSettings"]');
  await page.click('[data-action="resetProgress"]');
  await page.click("#confirmYes");
  check(await page.evaluate(() => Object.keys(getProgress()).length === 0), "Fortschritt gelöscht");
  check(await page.evaluate(() => getTemplates().length === 2), "Vorlagen bleiben erhalten");

  console.log("Vollversion (App, nachgebildetes StoreKit)");
  const ctx4 = await browser.newContext({ viewport: { width: 1180, height: 820 }, locale: "de-DE" });
  await ctx4.addInitScript(MOCK_STORE);
  const p4 = await ctx4.newPage();
  p4.on("pageerror", e => errors.push("App: " + e.message));
  await p4.goto(BASE);
  await p4.click('[data-action="introSkip"]');
  await p4.evaluate(() => document.dispatchEvent(new Event("deviceready")));
  await p4.waitForTimeout(100);
  await p4.click('[data-to="levels"]');
  check(await p4.locator(".lvl .pro").count() === 20, "20 Level mit Vollversions-Hinweis");
  await unlockUpTo(p4, 10);
  await p4.locator(".lvl").nth(10).click();
  check(await p4.isVisible("#mdl-paywall") && await p4.isHidden("#scr-game"), "Level 11 öffnet den Kaufdialog statt des Spiels");
  check((await p4.textContent("#btnBuy")).includes("3,99"), "Preis aus dem Store");
  check((await p4.textContent("#payReason")).includes("Level 11"), "Grund wird genannt");
  await shot(p4, "17-paywall");
  await p4.click('#mdl-paywall [data-action="closeModal"]');
  await p4.click('#scr-levels [data-action="back"]');
  await p4.click('[data-to="multiSetup"]');
  await p4.click('#playerCount button:has-text("3")');
  check(await p4.isVisible("#mdl-paywall"), "3 Personen nur mit Vollversion");
  await p4.click('#mdl-paywall [data-action="closeModal"]');
  check(await p4.evaluate(() => multi.count) === 2, "Spielerzahl bleibt bei 2");
  await p4.click('#scr-multiSetup [data-action="back"]');
  await p4.click('[data-to="templates"]');
  await p4.click('[data-action="newTemplate"]');
  check(await p4.isVisible("#mdl-paywall") && (await p4.textContent("#payReason")).includes("Importierte"), "Editor nur mit Vollversion");
  await p4.click("#btnBuy");
  await p4.waitForTimeout(250);
  check(await p4.evaluate(() => window.__buyCalls) === 1 && await p4.evaluate(() => isFull()), "Kauf schaltet frei");
  check(await p4.isHidden("#mdl-paywall") && (await p4.textContent("#toastText")).includes("freigeschaltet"), "Dialog schließt, Bestätigung erscheint");
  await p4.click('[data-action="newTemplate"]');
  check(await p4.isVisible("#scr-editor"), "Editor jetzt offen");
  await p4.click('#scr-editor [data-action="back"]');
  await p4.click('#scr-templates [data-action="back"]');
  await p4.click('[data-action="openSettings"]');
  check((await p4.textContent("#proStatus")) === "Freigeschaltet" && await p4.isHidden("#btnProRow"), "Einstellungen zeigen die Vollversion");
  await p4.reload();
  await p4.evaluate(() => document.dispatchEvent(new Event("deviceready")));
  check(await p4.evaluate(() => isFull()), "Freischaltung bleibt nach Neustart");
  await ctx4.close();

  check(errors.length === 0, "Keine Fehler in der Konsole" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log(`\n${passed} ok, ${failed} Fehler`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
