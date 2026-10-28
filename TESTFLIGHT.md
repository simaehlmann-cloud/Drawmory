# Drawmory nach TestFlight bringen – mit In-App-Kauf und Universal Links

Stand: Version 0.3.0, iOS-Build 300. Der Weg folgt FairMix. Was du dort schon
hast, nutzt du weiter; neu sind nur die Teile, die an der Kennung
`de.drawmory.app` hängen.

**Schon erledigt?** Wer TestFlight mit Version 0.2 schon geschafft hat, springt
direkt zu [Universal Links einrichten](#universal-links-einrichten-ab-03-einmalig).

| Bereits vorhanden (von FairMix) | Neu für Drawmory |
|---|---|
| Apple-Distribution-Zertifikat (.p12) samt Passwort | App-ID `de.drawmory.app` mit In-App Purchase und Associated Domains |
| Team-ID, Signier-Identität | App-Store-Profil für diese App-ID |
| App-Store-Connect-API-Schlüssel (.p8, Key-ID, Issuer-ID) | App in App Store Connect |
| Vertrag „Kostenpflichtige Apps“ | In-App-Kauf `de.drawmory.app.full` |
| | Secrets im Repo **Drawmory** (Secrets gelten je Repo) |
| | Repo `simaehlmann-cloud.github.io` für die Universal-Link-Freigabe |

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
- Capabilities: **In-App Purchase** (vorausgewählt) und **Associated Domains**
  anhaken. Sonst nichts.

## 3. App-Store-Profil erzeugen

**Profiles** → **+** → **Distribution: App Store Connect** →
App-ID `de.drawmory.app` → dein vorhandenes **Apple-Distribution-Zertifikat**
→ Name `Drawmory App Store` → herunterladen.

Als base64 in die Zwischenablage (Windows PowerShell, im Ordner Downloads):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\Drawmory_App_Store.mobileprovision")) | Set-Clipboard
```

Das FairMix-Profil funktioniert hier nicht. Der Workflow erkennt das und
bricht mit einer klaren Meldung ab, statt beim Signieren zu scheitern.

## 4. Secrets im Repo Drawmory anlegen

Repo → **Settings → Secrets and variables → Actions → New repository secret**.
Die Werte kopierst du aus deinen FairMix-Unterlagen; nur das Profil ist neu.

| Name | Inhalt |
|---|---|
| `IOS_CERTIFICATE_P12_BASE64` | wie bei FairMix (PowerShell wie oben, mit `dist.p12`) |
| `IOS_CERTIFICATE_PASSWORD` | wie bei FairMix |
| `IOS_TEAM_ID` | wie bei FairMix |
| `IOS_SIGNING_IDENTITY` | `Apple Distribution: Simon Mählmann (TEAMID)` – Wortlaut aus `(Get-PfxCertificate -FilePath .\dist.p12).Subject`, Teil nach `CN=` |
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

**Business** → **Kostenpflichtige Apps** → Vertrag annehmen, Bankkonto und
Steuerformulare ausfüllen. Ohne aktiven Vertrag liefert StoreKit **kein
Produkt** – die App zeigt dann dauerhaft „Preis wird geladen …“.

## 7. In-App-Kauf anlegen

App → **Monetarisierung → In-App-Käufe** → **+**

- Typ: **Nicht-Verbrauchsartikel**
- Referenzname: `Vollversion`
- Produkt-ID: **`de.drawmory.app.full`** – exakt so, sie steht in der App fest
- Preis: 1,99 €
- Verfügbarkeit: alle Länder
- Lokalisierung Deutsch: Anzeigename `Vollversion`,
  Beschreibung `Alle Level, Mehrspieler bis 4 Personen, eigene Vorlagen`
- Lokalisierung Englisch: `Full version`,
  `All levels, multiplayer for up to 4, your own templates`
- Prüfungsinformationen: `iap-review-screenshot.png` hochladen. Als Notiz den
  Text aus [Prüfungsanmerkungen](#prüfungsanmerkungen-für-apple).

Die Beschreibung nennt bewusst keine Levelzahl – sie wäre mit jeder neuen
Welt veraltet. Die App selbst zeigt die aktuelle Zahl.

Ziel: Status **„Bereit zur Einreichung“**. Steht dort „Fehlende Metadaten“,
lädt das Produkt in TestFlight unter Umständen nicht.

## 8. Build hochladen

Repo → **Actions → Build Drawmory (iOS) → Run workflow** (Branch `main`).

- Erst laufen auf Linux die Prüfungen (Prüfer und 169 Abläufe im Browser).
- Dann baut ein Mac die App. Im Schritt **„Erzeugtes Projekt bestätigen“**
  stehen Kennung, Version 0.3.0, Build 300, URL-Schema, In-App-Kauf-Plugin,
  Universal-Link-Plugin, Associated Domains und Privacy-Manifest. Jeder Fehler
  dort bricht ab, bevor eine Build-Nummer verbraucht ist.
- Hochgeladen wird **nur bei „Run workflow“**, nicht bei jedem Push.

Dauer insgesamt etwa 20–30 Minuten.

## 9. TestFlight

Nach 5–30 Minuten Verarbeitung erscheint der Build unter **TestFlight**.
**Interne Tests → +** → Gruppe `Ich` → dich als Tester hinzufügen → Build
zuordnen. Die Mail öffnen, TestFlight-App installieren, Drawmory laden.

## 10. Kauf in TestFlight testen

TestFlight-Käufe laufen in Apples Testumgebung: **es wird nichts abgebucht**,
auch wenn der Dialog einen Preis zeigt.

1. Level 12 antippen (erstes Level von „Aus dem Gedächtnis“) → Kaufdialog mit 1,99 €.
2. „Für 1,99 € freischalten“ → Apple-Dialog bestätigen → „Vollversion freigeschaltet“.
3. App löschen, neu aus TestFlight installieren → Einstellungen → Freischalten →
   **„Käufe wiederherstellen“** → Vollversion ist wieder da.

---

## Universal Links einrichten (ab 0.3, einmalig)

Ziel: Ein gescannter QR-Code öffnet **direkt die App**. Ist sie nicht
installiert, erscheint eine kleine Seite mit Vorschau der Figur und – nach der
Veröffentlichung – dem Weg in den App Store.

Die Reihenfolge ist wichtig: iOS holt die Freigabe beim **Installieren** der
App ab. Deshalb erst die Freigabe online stellen, dann den Build installieren.

### A. Freigabe-Repo anlegen

1. github.com → **New repository** → Name genau **`simaehlmann-cloud.github.io`**,
   **Public**, ohne README → Create.
2. `Drawmory-Freigabe.zip` entpacken. In
   `.well-known/apple-app-site-association` (mit dem Editor öffnen)
   `DEINE_TEAM_ID` durch deine zehnstellige Team-ID ersetzen, speichern.
3. **Add file → Upload files** → den **Inhalt** des entpackten Ordners
   hineinziehen: `.nojekyll`, Ordner `.well-known`, `index.html`, `LIESMICH.md`.
   Im Windows-Explorer sind Punkt-Dateien sichtbar; im Mac-Finder mit
   Cmd+Shift+Punkt einblenden. → Commit changes.
4. **Settings → Pages:** Branch `main`, Ordner `/ (root)` → Save.
5. Nach 1–2 Minuten im Browser öffnen:
   `https://simaehlmann-cloud.github.io/.well-known/apple-app-site-association`
   Es muss der Text mit deiner Team-ID erscheinen. Bei 404: Fehlt `.nojekyll`?

FairMix und Drawmory unter `/FairMix/` und `/Drawmory/` bleiben davon unberührt.

### B. App-ID und Profil erweitern

1. developer.apple.com → **Identifiers** → `de.drawmory.app` →
   **Associated Domains** anhaken → **Save** (Hinweis zu Profilen bestätigen).
2. **Profiles** → `Drawmory App Store` → **Edit** → **Save** → **Download**.
   Das alte Profil ist durch die neue Fähigkeit ungültig geworden.
3. Mit dem PowerShell-Befehl aus Schritt 3 in base64 umwandeln und das Secret
   **`IOS_PROVISIONING_PROFILE` ersetzen** (Secret anklicken → Update).

Vergisst du B, bricht der Workflow mit „Das Profil erlaubt keine Associated
Domains“ ab – bevor eine Build-Nummer verbraucht ist.

### C. Build hochladen und frisch installieren

1. **Run workflow** wie in Schritt 8. Der Schritt **„Universal-Link-Freigabe
   auf der Domain prüfen“** meldet, ob die Datei aus A erreichbar ist und die
   richtige Team-ID nennt.
2. Auf dem iPad **Drawmory löschen** und Build 300 aus TestFlight neu
   installieren. Nur bei der Installation holt iOS die Freigabe ab.

### D. Testen

1. Auf Gerät 1 eine Vorlage teilen → QR-Code.
2. Mit der Kamera von Gerät 2 (Drawmory installiert) scannen → Banner
   „In Drawmory öffnen“ → die App öffnet sich mit der Rückfrage.
3. Ohne installierte App öffnet derselbe QR-Code die Landeseite mit Vorschau.

Apple speichert die Freigabe zwischen. Direkt nach Schritt A kann es einige
Stunden dauern, bis Geräte sie sehen. Bis dahin führt der QR-Code zur
Landeseite – dort öffnet „In Drawmory öffnen“ die App ebenfalls.

### E. Nach der Veröffentlichung im App Store

In `open/index.html` die Zeile `const APP_STORE_ID = "";` mit der Apple-ID der
App füllen (App Store Connect → App-Informationen → Apple-ID, nur Ziffern) und
hochladen. Dann zeigt die Landeseite „Im App Store laden“ und Safari zusätzlich
das App-Banner. Ein neuer App-Build ist dafür nicht nötig.

---

## Prüfungsanmerkungen für Apple

```
The full version is a one-time, non-consumable purchase that unlocks levels 12–47, multiplayer for 3–4 players and the template editor.

How to reach the purchase screen:
1. Tap "Meine Vorlagen" (My templates) on the home screen, then "Neue Vorlage" (New template). The purchase screen opens immediately.
2. Alternatively: Settings (gear icon) → "Vollversion" → "Freischalten".

"Käufe wiederherstellen" (Restore purchases) is on the same screen.

The app is in German and English; the language can be switched with the flags in the top right corner. No account or login is required.
```

## Nächster Upload

Jede hochgeladene Build-Nummer ist dauerhaft belegt. Vor dem nächsten
„Run workflow“ in der `config.xml` `ios-CFBundleVersion` erhöhen (301, 302, …).
Ändert sich der Inhalt der App, zusätzlich die Version an den Stellen
anheben, die `validate.js` vergleicht.

## Wenn etwas hakt

| Zeichen | Ursache und Abhilfe |
|---|---|
| Kaufknopf bleibt bei „Preis wird geladen …“ | Vertrag nicht aktiv (6), Produkt-ID abweichend oder Status „Fehlende Metadaten“ (7) |
| „Das Profil gehört zu …“ | FairMix-Profil eingetragen – Profil aus Schritt 3 verwenden |
| „Das Profil erlaubt keine Associated Domains“ | Universal Links, Schritt B |
| QR-Code öffnet die Landeseite statt der App | Freigabe aus A erreichbar? Team-ID ersetzt? App nach A neu installiert? Einige Stunden warten (Apples Zwischenspeicher) |
| Upload: „bundle version already used“ | `ios-CFBundleVersion` erhöhen |
| Build erscheint nicht in TestFlight | 30 Minuten warten, dann Mail von Apple und Actions-Protokoll prüfen |
| „Kein Zertifikat hinterlegt – übersprungen“ | Secrets fehlen im Repo Drawmory (Schritt 4) |
| Kauf klappt, nach Neuinstallation gesperrt | „Käufe wiederherstellen“ tippen – bei Nicht-Verbrauchsartikeln so vorgesehen |

## Vor der Veröffentlichung entscheiden

Drawmory ist derzeit eine **Universal-App** für iPad und iPhone. Für den Store
brauchst du dann Bildschirmfotos für beide. Soll die App nur aufs iPad, genügt
in der `config.xml` unter `<platform name="ios">` die Zeile
`<preference name="target-device" value="tablet" />`. Die Richtung ist
wichtig: Eine reine iPad-App lässt sich später um das iPhone erweitern, eine
veröffentlichte Universal-App aber nicht mehr auf das iPad beschränken.
