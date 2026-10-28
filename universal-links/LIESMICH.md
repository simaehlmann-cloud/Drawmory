# Repo simaehlmann-cloud.github.io

Dieses Repo gibt es nur, damit iOS geteilte Drawmory-Links direkt in der App
öffnet (Universal Links). Apple sucht die Freigabe immer im Wurzelverzeichnis
der Domain – bei GitHub Pages ist das dieses besondere Repo, nicht das Repo
`Drawmory`.

| Datei | Zweck |
|---|---|
| `.well-known/apple-app-site-association` | Freigabe für die App `de.drawmory.app` |
| `.nojekyll` | Ohne diese leere Datei liefert GitHub Pages Ordner mit Punkt (`.well-known`) nicht aus |
| `index.html` | Kleine Startseite, damit die Domain nicht leer ist |

**Vor dem Hochladen:** In `apple-app-site-association` `DEINE_TEAM_ID` durch
die zehnstellige Team-ID ersetzen (dieselbe wie im Secret `IOS_TEAM_ID`).

Prüfen nach dem Hochladen: Im Browser
`https://simaehlmann-cloud.github.io/.well-known/apple-app-site-association`
öffnen – es muss der Text mit deiner Team-ID erscheinen, keine 404-Seite.

Die Seiten von FairMix und Drawmory (`/FairMix/`, `/Drawmory/`) bleiben davon
unberührt. Die Freigabe gilt nur für die Pfade `/Drawmory/open/…` und alte
Links `/Drawmory/#t=…` – Datenschutzerklärung und Impressum öffnen weiterhin
im Browser.
