# Drawmory

**Look, remember, redraw.** Ein Zeichenspiel für das iPad: Links erscheint eine
Figur, rechts wird sie nachgezeichnet. Nach „Fertig“ legt die App beide
übereinander und bewertet die Zeichnung in Prozent.

Läuft als iOS-App (Cordova) und als installierbare Web-App (PWA) – vollständig
offline, ohne Konto, ohne Werbung, ohne Tracking, ohne externe Bibliotheken.

Version 0.2.0 · versionCode 200

## Funktionen

- **30 Level in 5 Welten:** Erste Linien, Aus dem Gedächtnis, Maßstab,
  Spiegeln und Drehen, Profi. Ein Level schaltet das nächste ab einem Stern (55 %) frei.
- **Spiegeln und Drehen:** an senkrechter oder waagerechter Achse, 90° und 180°.
  Wer die Figur nur abzeichnet oder falsch herum dreht, bekommt höchstens 40 %
  und einen Hinweis – die App vergleicht dazu mit allen falschen Lagen.
- **Fehlerfarben im Ergebnis:** die eigene Linie grün (trifft), gelb (knapp), rot (daneben).
- **Haus vom Nikolaus** zählt nur in einem Zug; versehentliche Tupfer werden ignoriert.
- **Einführung** in drei Schritten beim ersten Start, später unter „Über das Spiel“.
- **Regler:** Sichtzeit (dauerhaft, 8, 5, 3, 2 s), Größe (gleich, doppelt, halb),
  Verwandeln (spiegeln, drehen), Raster links und rechts getrennt, Lineal-Hilfe.
- **Maßstab richtig gedacht:** Bei „doppelt so groß“ zeigt die Vorlage links ein
  feineres Raster. Wer Kästchen zählt, kommt auf die richtige Größe.
- **Mehrspieler:** 2 bis 4 Personen an einem iPad, 1/3/5 Runden, Übergabe-Bildschirm
  zwischen den Zügen, Siegerehrung mit allen Zeichnungen im Vergleich.
- **Eigene Vorlagen:** Editor mit Linien (Einrasten auf halben Kästchen) und
  Freihand (wird geglättet). Teilen per QR-Code, Link oder Bild, auch als
  **Paket mit bis zu 20 Vorlagen** in einem QR-Code.
- **Vollversion per In-App-Kauf:** gratis sind Level 1–10, Mehrspieler zu zweit,
  freies Spiel sowie Import und Spielen geteilter Vorlagen. Die Webfassung
  (Ziel der QR-Codes) bleibt vollständig frei.
- **DE/EN** mit Flaggen-Umschalter, hell/dunkel/automatisch, Töne abschaltbar.

## Bewertung

Beide Linienzüge werden in gleichmäßige Punkte zerlegt, die Abstände kommen aus
einer exakten Distanztransformation. Daraus entstehen drei Werte:

| Wert | Bedeutung |
|---|---|
| Auf der Linie | Wie viel der eigenen Linie auf der Vorlage liegt |
| Vollständig | Wie viel der Vorlage getroffen wurde |
| Größe | Größenverhältnis, `exp(-(ln r / 0,35)²)` |

`Ergebnis = harmonisches Mittel(Linie, Vollständig) × Größe`

Die Lage auf der Fläche zählt nicht. Kalibrierung (gemessen):

| Zeichnung | Ergebnis |
|---|---|
| exakt | 100 % |
| leichtes Wackeln (±1 Einheit) | 89–98 % |
| deutliches Wackeln (±2) | 64–87 % |
| 10 % zu klein, sonst exakt | 91 % |
| 20 % zu klein | 66 % |
| gleich groß statt doppelt | ≈ 2 % |

Die Stellschrauben stehen in `SCORE` (index.html, Abschnitt 8).

## Vorlagen teilen

Format v1 (eine Vorlage) und v2 (Paket mit 2–20 Vorlagen), Base64url:
Version, Name (UTF-8), Striche mit Punkten als je ein Byte (0..96), Prüfsumme.
Ein Haus braucht unter 40 Byte. Der Link lautet `SHARE_BASE#t=<code>` – der Teil
hinter `#` geht nie an einen Server. In der App öffnet `drawmory://import#t=<code>`
denselben Import; die Webfassung bietet diesen Link auf iPhone und iPad an.

**Wichtig vor der Veröffentlichung:** `SHARE_BASE` in index.html zeigt auf
`https://simaehlmann-cloud.github.io/Drawmory/`. Dafür das Repo `Drawmory` mit
GitHub Pages (Branch `main`, Ordner `/`) anlegen. Scannt jemand den QR-Code mit
der iPad-Kamera, öffnet sich diese Webfassung und übernimmt die Vorlage. Damit
ein gescannter Link ganz ohne Umweg die installierte App öffnet, wären Universal
Links nötig. Das verlangt eine eigene Domain mit `apple-app-site-association` im
Wurzelverzeichnis (bei GitHub Pages nur über ein Repo `simaehlmann-cloud.github.io`
oder eine eigene Domain) und die Fähigkeit „Associated Domains“ im Provisioning-Profil.
Bis dahin übernimmt der Knopf „In der App öffnen“ diesen Schritt.

## Dateistruktur

```
index.html                  komplette App (HTML, CSS, Logik)
manifest.json               PWA-Manifest
sw.js                       Service Worker (Offline-Cache, Update-Hinweis)
datenschutz(.html|-en.html) Datenschutzerklärung DE/EN
impressum(.html|-en.html)   Impressum DE/EN (§ 5 DDG)
config.xml                  Cordova-Konfiguration (iOS zuerst, Android vorbereitet)
icon*.png                   PWA- und Store-Icons
res/ios/                    iOS-Icons (ohne Alphakanal) und Startbild
make-icons.py               erzeugt alle Icons neu
validate.js                 statische Prüfung
smoketest.js                Ablauftest im echten Browser
```

## Prüfen

```bash
node validate.js        # Syntax, DE/EN vollständig, IDs, Aktionen, Manifest, Icons, Versionen
npm i -D playwright jsqr pngjs && npx playwright install chromium
python3 -m http.server 8765 &
node smoketest.js       # 134 Prüfungen: Level, Bewertung, Fehlerfarben, Maßstab,
                        # Spiegeln/Drehen, Nikolaus, Gedächtnis, Mehrspieler, Editor,
                        # QR-Rücklesen, Pakete, Link- und App-Import, Vollversion
                        # (nachgebildetes StoreKit), Einführung, DE/EN, Hochformat
```

## Version anheben

Drei Stellen müssen gleich sein, `validate.js` prüft das:
`APP_VERSION` in index.html, `version` in config.xml, `CACHE` in sw.js – plus diese README.

## In-App-Kauf einrichten

1. App Store Connect → App → In-App-Käufe → „Nicht-Verbrauchsartikel“ anlegen,
   Produkt-ID `de.drawmory.app.full` (= `PRODUCT_ID` in index.html), Preis wählen.
2. Vertrag „Kostenpflichtige Apps“ und Bankdaten in App Store Connect müssen aktiv sein,
   sonst liefert StoreKit kein Produkt (der Kaufknopf bleibt bei „Preis wird geladen“).
3. Testen mit einem Sandbox-Konto (App Store Connect → Benutzer → Sandbox).
4. Die Grenzen stehen in `FREE_LEVELS` und `FREE_PLAYERS`. Ein Kauf gilt ohne
   eigenen Beleg-Server als bestätigt, sobald StoreKit ihn meldet.

## Offen für die Store-Fassung

- Paketkennung `de.drawmory.app` bestätigen (nach Veröffentlichung unveränderlich)
- Universal Links (siehe oben), sobald eine eigene Domain feststeht
- Store-Screenshots und App-Store-Texte (Name „Drawmory“, Untertitel
  „Look, remember, redraw“ / „Anschauen, merken, nachzeichnen“)
- Datenschutz- und Impressumsseite zusätzlich öffentlich erreichbar machen
  (wie bei FairMix über `docs/`)
