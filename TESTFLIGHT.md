# Drawmory nach TestFlight bringen – mit In-App-Kauf

Stand: Version 0.2.1, iOS-Build 201. Der Weg folgt FairMix. Was du dort schon
hast, nutzt du weiter; neu sind nur die Teile, die an der Kennung
`de.drawmory.app` hängen.

| Bereits vorhanden (von FairMix) | Neu für Drawmory |
|---|---|
| Apple-Distribution-Zertifikat (.p12) samt Passwort | App-ID `de.drawmory.app` |
| Team-ID, Signier-Identität | App-Store-Profil für diese App-ID |
| App-Store-Connect-API-Schlüssel (.p8, Key-ID, Issuer-ID) | App in App Store Connect |
| Vertrag „Kostenlose Apps“ | Vertrag „Kostenpflichtige Apps“ (für den Kauf) |
| | In-App-Kauf `de.drawmory.app.full` |
| | Secrets im Repo **Drawmory** (Secrets gelten je Repo) |

---

## 1. Repo vorbereiten

1. Update-Dateien hochladen (siehe README, Abschnitt „Update einspielen“).
2. **Settings → Pages:** Branch `main`, Ordner `/ (root)`. Danach ist die
   Datenschutzerklärung öffentlich erreichbar unter
   `https://simaehlmann-cloud.github.io/Drawmory/datenschutz.html` –
   diese Adresse verlangt App Store Connect.

## 2. App-ID anlegen

developer.apple.com → Account → **Certificates, Identifiers & Profiles** →
**Identifiers** → **+**

- Typ: **App IDs** → **App**
- Beschreibung: `Drawmory`
- Bundle ID: **Explicit**, `de.drawmory.app`
- Capabilities: **In-App Purchase** ist vorausgewählt – angehakt lassen.
  Sonst nichts ankreuzen. (Die `drawmory://`-Links brauchen keine Capability.)

## 3. App-Store-Profil erzeugen

**Profiles** → **+** → **Distribution: App Store Connect** →
App-ID `de.drawmory.app` → dein vorhandenes **Apple-Distribution-Zertifikat**
→ Name `Drawmory App Store` → herunterladen.

Als base64 umwandeln (eine Zeile, ohne Umbrüche):

```bash
# Mac
base64 -i Drawmory_App_Store.mobileprovision | pbcopy
# Windows (Git Bash)
base64 -w0 Drawmory_App_Store.mobileprovision > profil.txt
```

Das FairMix-Profil funktioniert hier nicht. Der Workflow erkennt das und
bricht mit einer klaren Meldung ab, statt beim Signieren zu scheitern.

## 4. Secrets im Repo Drawmory anlegen

Repo → **Settings → Secrets and variables → Actions → New repository secret**.
Die Werte kopierst du aus deinen FairMix-Unterlagen; nur das Profil ist neu.

| Name | Inhalt |
|---|---|
| `IOS_CERTIFICATE_P12_BASE64` | wie bei FairMix |
| `IOS_CERTIFICATE_PASSWORD` | wie bei FairMix |
| `IOS_TEAM_ID` | wie bei FairMix |
| `IOS_SIGNING_IDENTITY` | wie bei FairMix, z. B. `Apple Distribution: Simon Mählmann (TEAMID)` |
| `IOS_PROVISIONING_PROFILE` | **neu:** base64 aus Schritt 3 |
| `ASC_KEY_ID` | wie bei FairMix |
| `ASC_ISSUER_ID` | wie bei FairMix |
| `ASC_KEY_P8` | wie bei FairMix, vollständig mit BEGIN/END-Zeilen |

Android braucht später vier weitere (`ANDROID_KEYSTORE_BASE64` usw.) mit einem
**eigenen** Keystore für Drawmory. Bis dahin baut der Android-Workflow nur ein
Debug-APK und ist trotzdem grün.

## 5. App in App Store Connect anlegen

appstoreconnect.apple.com → **Apps** → **+** → **Neue App**

- Plattform: iOS
- Name: `Drawmory` (falls vergeben: `Drawmory: Draw from Memory`, max. 30 Zeichen)
- Primärsprache: Deutsch
- Bundle-ID: `de.drawmory.app`
- SKU: `drawmory-ios`

Danach unter **App-Informationen**:

- Untertitel DE: `Anschauen, merken, nachzeichnen` · EN: `Look, remember, redraw`
- Primäre Kategorie: Spiele, Unterkategorien Lernspiele und Puzzle
- Sekundäre Kategorie: Bildung
- Datenschutzrichtlinie: die Pages-Adresse aus Schritt 1

Unter **App-Datenschutz**: „Daten werden nicht erfasst“. Das deckt sich mit
der Datenschutzerklärung und dem Privacy-Manifest.

## 6. Vertrag für kostenpflichtige Apps

**Business** (früher „Verträge, Steuern und Bankdaten“) → **Kostenpflichtige
Apps** → Vertrag annehmen, Bankkonto und Steuerformulare ausfüllen.

Ohne aktiven Vertrag liefert StoreKit **kein Produkt** – auch nicht in
TestFlight. Die App zeigt dann dauerhaft „Preis wird geladen …“. Das ist die
häufigste Ursache für einen scheinbar kaputten Kauf.

## 7. In-App-Kauf anlegen

App → **Monetarisierung → In-App-Käufe** → **+**

- Typ: **Nicht-Verbrauchsartikel**
- Referenzname: `Vollversion`
- Produkt-ID: **`de.drawmory.app.full`** – exakt so, sie steht in der App fest
- Preis: zum Beispiel 3,99 € (Stufe frei wählbar)
- Verfügbarkeit: alle Länder
- Lokalisierung Deutsch: Anzeigename `Vollversion`,
  Beschreibung `Alle 30 Level, Mehrspieler bis 4 Personen, eigene Vorlagen`
- Lokalisierung Englisch: `Full version`,
  `All 30 levels, multiplayer for up to 4, your own templates`
- Prüfungsinformationen: das mitgelieferte Bild `iap-review-screenshot.png`
  hochladen, als Notiz: `Kaufdialog erscheint ab Level 11, bei 3–4 Spielenden
  und beim Anlegen eigener Vorlagen.`

Ziel: Status **„Bereit zur Einreichung“**. Steht dort „Fehlende Metadaten“,
lädt das Produkt in TestFlight unter Umständen nicht.

Beim ersten Einreichen zur App-Prüfung später den In-App-Kauf in der
App-Version unter „In-App-Käufe und Abonnements“ mit auswählen. Für TestFlight
ist das noch nicht nötig.

## 8. Build hochladen

Repo → **Actions → Build Drawmory (iOS) → Run workflow** (Branch `main`).

- Erst laufen auf Linux die Prüfungen (Prüfer und 139 Abläufe im Browser).
- Dann baut ein Mac die App. Im Schritt **„Erzeugtes Projekt bestätigen“**
  stehen Kennung, Version 0.2.1, Build 201, URL-Schema, In-App-Kauf-Plugin und
  Privacy-Manifest. Jeder Fehler dort bricht ab, bevor eine Build-Nummer
  verbraucht ist.
- Hochgeladen wird **nur bei „Run workflow“**, nicht bei jedem Push.

Dauer insgesamt etwa 20–30 Minuten.

## 9. TestFlight

Nach 5–30 Minuten Verarbeitung erscheint der Build unter **TestFlight**.
Die Frage zur Exportkonformität entfällt, das regelt die App selbst.

**Interne Tests → +** → Gruppe `Ich` → dich als Tester hinzufügen → Build
zuordnen. Keine Beta-Prüfung nötig. Die Mail öffnen, TestFlight-App
installieren, Drawmory laden.

## 10. Kauf in TestFlight testen

TestFlight-Käufe laufen automatisch in Apples Testumgebung: **es wird nichts
abgebucht**, auch wenn der Dialog einen Preis zeigt.

1. Level spielen bis Level 11 → Kaufdialog mit echtem Preis aus App Store Connect.
2. „Für … freischalten“ → Apple-Dialog bestätigen → „Vollversion freigeschaltet“.
3. App löschen, neu aus TestFlight installieren → Einstellungen → Freischalten →
   **„Käufe wiederherstellen“** → Vollversion ist wieder da.
4. Zusätzlich prüfen: Mehrspieler mit 3 Personen, „Neue Vorlage“ – beides
   ohne Kaufdialog.

## 11. QR-Codes und `drawmory://` testen

1. In der App eine Vorlage teilen → QR-Code.
2. Mit der Kamera eines zweiten Geräts scannen → Safari öffnet die Webfassung
   → Rückfrage mit dem Knopf **„In der App öffnen“**.
3. Ist Drawmory dort installiert, öffnet der Knopf die App mit derselben
   Rückfrage.

## Nächster Upload

Jede hochgeladene Build-Nummer ist dauerhaft belegt. Vor dem nächsten
„Run workflow“ in der `config.xml` `ios-CFBundleVersion` erhöhen (202, 203, …).
Ändert sich der Inhalt der App, zusätzlich die Version an den vier Stellen
anheben, die `validate.js` vergleicht.

## Wenn etwas hakt

| Zeichen | Ursache und Abhilfe |
|---|---|
| Kaufknopf bleibt bei „Preis wird geladen …“ | Vertrag „Kostenpflichtige Apps“ nicht aktiv (6), Produkt-ID abweichend oder Status „Fehlende Metadaten“ (7) |
| „Das Profil gehört zu …“ | FairMix-Profil eingetragen – Profil aus Schritt 3 verwenden |
| Upload: „bundle version already used“ | `ios-CFBundleVersion` erhöhen |
| Build erscheint nicht in TestFlight | 30 Minuten warten, dann Mail von Apple und Actions-Protokoll prüfen |
| „Kein Zertifikat hinterlegt – übersprungen“ | Secrets fehlen im Repo Drawmory (Schritt 4) |
| Kauf klappt, nach Neuinstallation gesperrt | „Käufe wiederherstellen“ tippen – das ist bei Nicht-Verbrauchsartikeln so vorgesehen |

## Vor der Veröffentlichung entscheiden

Drawmory ist derzeit eine **Universal-App** für iPad und iPhone. Für den Store
brauchst du dann Bildschirmfotos für beide. Soll die App nur aufs iPad, genügt
in der `config.xml` unter `<platform name="ios">` die Zeile
`<preference name="target-device" value="tablet" />`. Die Richtung ist
wichtig: Eine reine iPad-App lässt sich später um das iPhone erweitern, eine
veröffentlichte Universal-App aber nicht mehr auf das iPad beschränken.
