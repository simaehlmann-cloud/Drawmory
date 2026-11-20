# Drawmory

**Look, remember, redraw.** Ein Zeichenspiel für das iPad: Links erscheint eine
Figur, rechts wird sie nachgezeichnet. Nach „Fertig“ legt die App beide
übereinander und bewertet die Zeichnung in Prozent.

Läuft als iOS-App (Cordova) und als installierbare Web-App (PWA) – vollständig
offline, ohne Konto, ohne Werbung, ohne Tracking, ohne externe Bibliotheken.
Android ist vorbereitet.

**Weg in den App Store:** siehe [TESTFLIGHT.md](TESTFLIGHT.md) – Schritt für
Schritt bis TestFlight, einschließlich In-App-Kauf und Universal Links.
**Weg in den Play Store:** Anleitung als Dokument im Projekt „Zeichnenspiel“
(eigener Keystore, Secrets, Einmalkauf, interner und geschlossener Test).

Version 1.0.2 · Android-versionCode 1004 · iOS-Build 1004

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
- **Mehrspieler:** 2 bis 4 Personen an einem Gerät, 1/3/5 Runden, Übergabe-Bildschirm
  zwischen den Zügen, Siegerehrung mit allen Zeichnungen im Vergleich.
- **Eigene Vorlagen:** Editor mit Linien (Einrasten auf halben Kästchen) und
  Freihand (wird geglättet). Teilen per QR-Code, Link oder Bild, auch als
  **Paket mit bis zu 20 Vorlagen** in einem QR-Code.
- **Vollversion per In-App-Kauf (1,99 €):** gratis sind die Welten „Erste Linien“ und „Auf Zeit“ (Level 1–11), Mehrspieler zu zweit,
  freies Spiel sowie Import und Spielen geteilter Vorlagen. Die Webfassung
  (Ziel der QR-Codes) bleibt vollständig frei.
- **Tagesaufgabe** (gratis): jeden Tag eine feste Aufgabe, die Fähigkeit wechselt
  reihum (Abzeichnen, Gedächtnis, Maßstab, Spiegeln/Drehen, Auf Zeit). Figur und
  Variante ergeben sich aus dem Datum – alle Geräte haben am selben Tag dieselbe
  Aufgabe, ganz ohne Server. Serie „n Tage in Folge“.
- **Mein Lernstand** (gratis): Durchschnitt der besten Ergebnisse je Fähigkeit aus
  Leveln und Tagesaufgaben, schwächstes Feld mit konkretem Übungstipp.
- **Zeichnung abspielen:** im Ergebnis werden die eigenen Striche nummeriert in
  der gezeichneten Reihenfolge über der blassen Vorlage nachgespielt.
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
node smoketest.js       # 206 Prüfungen: Level, Bewertung, Fehlerfarben, Maßstab,
                        # Spiegeln/Drehen, Zeichenzeit (auch Ablauf mitten im Strich),
                        # Nikolaus, Gedächtnis, Mehrspieler, Editor, QR-Rücklesen,
                        # Pakete, Landeseite, Universal-Link-Empfang, App-Import,
                        # Vollversion (nachgebildetes StoreKit und Google Play),
                        # Wiederherstellen, Android-Zurücktaste, 360-dp-Handy,
                        # Tagesaufgabe, Lernstand, Wiederholung,
                        # Einführung, DE/EN, Hochformat
```

## Version anheben

Drei Stellen müssen gleich sein, `validate.js` prüft das:
`APP_VERSION` in index.html, `version` in config.xml, `CACHE` in sw.js – plus diese README.

## Update einspielen (1.0.2, Build 1004: Bewerten und Feedback)

Umsetzung aus dem Feedback-Bericht des geschlossenen Play-Tests. Diese Dateien
ins Repo `Drawmory` hochladen, vorhandene werden überschrieben:

```
index.html        APP_VERSION 1.0.2
                  Einstellungen: „Drawmory bewerten“ (iOS: Bewertungsseite im
                  App Store, Apple-ID 6827935615; Android: Play Store; im Browser
                  ausgeblendet) und „Feedback senden“ (E-Mail mit Version und Gerät).
                  Keine eigene Bewertungs-Abfrage (Apple 5.6.1), keine Erwähnung
                  der jeweils anderen Plattform.
config.xml        Version 1.0.2, iOS-Build 1004, Android-versionCode 1004;
                  allow-intent für itms-apps: und market:
sw.js             Cache-Name drawmory-b1004-1.0.2
open/index.html   Apple-ID eingetragen: „Im App Store laden“ + Safari-Banner;
                  Android-Handys sehen „Bei Google Play laden“, Computer beide
smoketest.js      prüft Bewerten/Feedback je Plattform und die Landeseite
README.md
```

## Update einspielen (1.0.1, Build 1003: Store-Einreichung und Android-Test)

Fasst zwei Updates zusammen: das Android-Update 1.0.1 (bisher nicht im Repo)
und die neuen Funktionen nach der Ablehnung von Build 1001 bei Apple
(Guideline 4.3). Build 1003, damit die Nummer sicher frei ist – auch falls
1002 schon in der Play Console liegt. Diese Dateien ins Repo `Drawmory`
hochladen, vorhandene werden überschrieben:

```
index.html        APP_VERSION 1.0.1
                  Neu: Tagesaufgabe, Mein Lernstand, Zeichnung abspielen (DE/EN)
                  Android-Zurücktaste/-Geste: schließt Dialoge, geht eine Seite
                  zurück, fragt im Spiel nach, beendet die App nur auf der Startseite.
                  Handys bis 440 px Breite: Werkzeugleiste im Spiel in einer Zeile,
                  Rückgängig/Löschen als Symbol.
config.xml        Version 1.0.1, iOS-Build 1003, Android-versionCode 1003
sw.js             Cache-Name drawmory-b1003-1.0.1 (Webfassung lädt neu)
validate.js       prüft Texte der Fähigkeiten und Daten der Tagesaufgabe
smoketest.js      prüft Tagesaufgabe, Lernstand, Wiederholung, Android-Handy
README.md
```

Danach:
- **App Store Connect:** In der abgelehnten Version die Versionsnummer von 1.0.0
  auf **1.0.1** ändern (geht, solange nichts veröffentlicht ist), iOS-Workflow
  mit „Run workflow“ starten, Build 1003 wählen, Hinweise für App Review
  ergänzen, erneut einreichen.
- **Play Console:** Android-Workflow liefert das AAB (versionCode 1003) für den
  geschlossenen Test.

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
