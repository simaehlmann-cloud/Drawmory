# Drawmory

**Look, remember, redraw.** Ein Zeichenspiel für das iPad: Links erscheint eine
Figur, rechts wird sie nachgezeichnet. Nach „Fertig“ legt die App beide
übereinander und bewertet die Zeichnung in Prozent.

Läuft als iOS-App (Cordova) und als installierbare Web-App (PWA) – vollständig
offline, ohne Konto, ohne Werbung, ohne Tracking, ohne externe Bibliotheken.
Android ist vorbereitet.

**Weg in den App Store:** siehe [TESTFLIGHT.md](TESTFLIGHT.md) – Schritt für
Schritt bis TestFlight, einschließlich In-App-Kauf und Universal Links.

Version 0.3.0 · versionCode 300 · iOS-Build 300

## Funktionen

- **47 Level in 8 Welten:** Erste Linien, Auf Zeit, Aus dem Gedächtnis, Maßstab,
  Spiegeln und Drehen, Profi, Meisterstücke, Alles zusammen. Ein Level schaltet
  das nächste ab einem Stern (55 %) frei. Fortschritt hängt an festen Level-IDs,
  neue Welten verschieben ihn nicht; einmal gespielte Level bleiben offen.
- **Zeichenzeit:** 10, 7 oder 5 Sekunden ab dem ersten Strich. Hinschauen kostet
  keine Zeit. Läuft die Uhr ab, wird der angefangene Strich abgeschlossen und
  sofort gewertet. Als Regler im freien Spiel und im Mehrspieler-Modus, als
  eigene Welt „Auf Zeit“ mit fünf einfachen Figuren.
- **Spiegeln und Drehen:** an senkrechter oder waagerechter Achse, 90° und 180°.
  Wer die Figur nur abzeichnet oder falsch herum dreht, bekommt höchstens 40 %
  und einen Hinweis – die App vergleicht dazu mit allen falschen Lagen.
- **Fehlerfarben im Ergebnis:** die eigene Linie grün (trifft), gelb (knapp), rot (daneben).
- **Haus vom Nikolaus** zählt nur in einem Zug; versehentliche Tupfer werden ignoriert.
- **Einführung** in drei Schritten beim ersten Start, später unter „Über das Spiel“.
- **Regler:** Sichtzeit (dauerhaft, 8, 5, 3, 2 s), Zeichenzeit (unbegrenzt, 10, 7, 5 s), Größe (gleich, doppelt, halb),
  Verwandeln (spiegeln, drehen), Raster links und rechts getrennt, Lineal-Hilfe.
- **Maßstab richtig gedacht:** Bei „doppelt so groß“ zeigt die Vorlage links ein
  feineres Raster. Wer Kästchen zählt, kommt auf die richtige Größe.
- **Mehrspieler:** 2 bis 4 Personen an einem iPad, 1/3/5 Runden, Übergabe-Bildschirm
  zwischen den Zügen, Siegerehrung mit allen Zeichnungen im Vergleich.
- **Eigene Vorlagen:** Editor mit Linien (Einrasten auf halben Kästchen) und
  Freihand (wird geglättet). Teilen per QR-Code, Link oder Bild, auch als
  **Paket mit bis zu 20 Vorlagen** in einem QR-Code.
- **Vollversion per In-App-Kauf (1,99 €):** gratis sind die Welten „Erste Linien“ und „Auf Zeit“ (Level 1–11), Mehrspieler zu zweit,
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
Ein Haus braucht unter 40 Byte. Der Link lautet `SHARE_BASE#t=<code>` mit
`SHARE_BASE = https://simaehlmann-cloud.github.io/Drawmory/open/` – der Teil
hinter `#` geht nie an einen Server.

So kommt ein gescannter QR-Code an:

| Lage | Was passiert |
|---|---|
| Drawmory installiert | iOS öffnet den Link als **Universal Link** direkt in der App, Rückfrage „hinzufügen?“ |
| App fehlt | Landeseite `open/` mit Vorschau, „In Drawmory öffnen“ (`drawmory://`) und – sobald `APP_STORE_ID` gesetzt ist – „Im App Store laden“ |
| Links aus 0.2 (`/Drawmory/#t=…`) | gelten weiter, ebenfalls als Universal Link |

Bausteine der Universal Links:

- `cordova-plugins/drawmory-links/` – eigenes Plugin. cordova-ios 8 (UIScene)
  meldet Universal Links nicht an JavaScript und startet Plugins erst nach dem
  Szenenaufbau; das Plugin reicht Warm- und Kaltstart-Links an `handleOpenURL`
  weiter und trägt `applinks:simaehlmann-cloud.github.io` für Release-Builds ein.
- `universal-links/` – Vorlage für das Repo `simaehlmann-cloud.github.io`; dort liegt
  die Freigabe unter `.well-known/apple-app-site-association` mit echter Team-ID. Gilt nur für
  `/Drawmory/open/*` und `/Drawmory/#t=*` – Datenschutz und Impressum öffnen
  weiter im Browser.
- `validate.js` gleicht Domain, Plugin, Freigabe und Landeseite ab und prüft an
  300 Codes, dass Landeseite und App dasselbe lesen.

Eine eigene Domain (etwa drawmory.de) ließe sich später einsetzen:
`SHARE_BASE`, `LINK_HOST` (config.xml, ios.yml) und die Freigabedatei ändern.

## Dateistruktur

```
index.html                  komplette App (HTML, CSS, Logik)
manifest.json               PWA-Manifest
sw.js                       Service Worker (Offline-Cache, Update-Hinweis)
datenschutz(.html|-en.html) Datenschutzerklärung DE/EN
impressum(.html|-en.html)   Impressum DE/EN (§ 5 DDG)
config.xml                  Cordova-Konfiguration (iOS zuerst, Android vorbereitet)
icon*.png                   PWA- und Store-Icons
res/ios/                    iOS-Icons (ohne Alphakanal), Startbild, PrivacyInfo.xcprivacy
res/android/                adaptive Android-Icons je Dichte und colors.xml
make-icons.py               erzeugt alle Icons neu (läuft auch in den Workflows)
open/index.html             Landeseite für QR-Codes und geteilte Links
cordova-plugins/drawmory-links/  Plugin: Universal Links an die App weiterreichen
universal-links/            Vorlage der Apple-Freigabe (wirksam im Repo simaehlmann-cloud.github.io)
validate.js                 statische Prüfung, gleicht auch die Workflows mit der App ab
smoketest.js                Ablauftest im echten Browser
package.json                Prüfwerkzeuge (Playwright, jsQR, pngjs) – nur für Tests
.github/workflows/ios.yml    Prüfen, bauen, signieren, nach TestFlight hochladen
.github/workflows/android.yml  Prüfen, Debug-APK, mit Keystore auch APK und AAB
TESTFLIGHT.md               Anleitung bis TestFlight samt In-App-Kauf
```

## Workflows

| Workflow | Bei jedem Push | Bei „Run workflow“ |
|---|---|---|
| Build Drawmory (iOS) | Prüfungen, unsignierter und (mit Secrets) signierter Build, IPA als Artefakt | zusätzlich Upload nach App Store Connect / TestFlight |
| Build Drawmory (Android) | Prüfungen, Debug-APK; mit Keystore-Secrets zusätzlich APK und AAB | wie Push |

Der Upload nach App Store Connect ist an „Run workflow“ gebunden, weil jede
hochgeladene Build-Nummer dauerhaft belegt ist. `validate.js` prüft das.

## Prüfen

```bash
node validate.js        # Syntax, DE/EN vollständig, IDs, Aktionen, Manifest, Icons, Versionen
npm install && npx playwright install chromium
python3 -m http.server 8765 &
node smoketest.js       # 169 Prüfungen: Level, Bewertung, Fehlerfarben, Maßstab,
                        # Spiegeln/Drehen, Zeichenzeit (auch Ablauf mitten im Strich),
                        # Nikolaus, Gedächtnis, Mehrspieler, Editor, QR-Rücklesen,
                        # Pakete, Landeseite, Universal-Link-Empfang, App-Import,
                        # Vollversion (nachgebildetes StoreKit und Google Play),
                        # Einführung, DE/EN, Hochformat
```

## Version anheben

Drei Stellen müssen gleich sein, `validate.js` prüft das:
`APP_VERSION` in index.html, `version` in config.xml, `CACHE` in sw.js – plus diese README.

## Update einspielen (0.2.1 → 0.3.0)

Nur diese Dateien ins Repo `Drawmory` hochladen, vorhandene werden überschrieben:

```
cordova-plugins/drawmory-links/   neu   Plugin für Universal Links (3 Dateien)
open/index.html                   neu   Landeseite für QR-Codes
universal-links/                  neu   Vorlage für das Freigabe-Repo (4 Dateien)
index.html        Zeichenzeit, 3 neue Welten, 8 neue Figuren, QR-Ziel /open/, Version 0.3.0
config.xml        Version 0.3.0 / Build 300, Plugin drawmory-links
sw.js             Cache-Name 0.3.0, Landeseite offline verfügbar
.github/workflows/ios.yml   prüft Plugin, Associated Domains, Profil und Freigabe
datenschutz.html, datenschutz-en.html   Abschnitt zu Universal Links
validate.js, smoketest.js   neue Prüfungen
README.md, TESTFLIGHT.md
```

Zusätzlich einmalig ein **zweites Repo** `simaehlmann-cloud.github.io` mit dem
Inhalt von `universal-links/` (TESTFLIGHT.md, „Universal Links einrichten“).

Auf der GitHub-Webseite: ZIP entpacken, im Repo „Add file → Upload files“,
**den Inhalt** des entpackten Ordners hineinziehen, „Commit changes“. Ordner,
die mit einem Punkt beginnen (`.github`, `.well-known`), blendet macOS im Finder
aus – mit Cmd+Shift+Punkt einblenden.

## In-App-Kauf einrichten

Ausführlich in [TESTFLIGHT.md](TESTFLIGHT.md), Schritte 6 und 7. Kurz:

1. App Store Connect → App → In-App-Käufe → „Nicht-Verbrauchsartikel“ anlegen,
   Produkt-ID `de.drawmory.app.full` (= `PRODUCT_ID` in index.html), Preis wählen.
   Für Google Play später dieselbe ID als Einmalkauf.
2. Vertrag „Kostenpflichtige Apps“ und Bankdaten in App Store Connect müssen aktiv sein,
   sonst liefert StoreKit kein Produkt (der Kaufknopf bleibt bei „Preis wird geladen“).
3. Testen mit einem Sandbox-Konto (App Store Connect → Benutzer → Sandbox).
4. Die Grenzen stehen in `FREE_LEVELS` und `FREE_PLAYERS`. Ein Kauf gilt ohne
   eigenen Beleg-Server als bestätigt, sobald StoreKit ihn meldet.

## Offen für die Store-Fassung

- Paketkennung `de.drawmory.app` bestätigen (nach Veröffentlichung unveränderlich)
- Nach der Veröffentlichung `APP_STORE_ID` in `open/index.html` eintragen
- Store-Screenshots und App-Store-Texte (Name „Drawmory“, Untertitel
  „Look, remember, redraw“ / „Anschauen, merken, nachzeichnen“)
- Datenschutz- und Impressumsseite zusätzlich öffentlich erreichbar machen
  (wie bei FairMix über `docs/`)
