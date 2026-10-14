# Einrichtung: Google-Tabelle und GitHub Pages

Ohne diese Schritte läuft die Seite im **Testmodus**: Bewertungen bleiben nur im jeweiligen Browser.

## 1. Google-Tabelle als Speicher (ca. 10 Minuten)

1. Unter [sheets.new](https://sheets.new) eine neue Tabelle anlegen, z. B. „Orlando 2027 – Abstimmung“.
2. Im Menü **Erweiterungen → Apps Script** öffnen.
3. Den gesamten Inhalt von `Code.gs` dort löschen und durch den Inhalt von [apps-script/Code.gs](apps-script/Code.gs) ersetzen. Speichern (Disketten-Symbol).
4. Rechts oben **Bereitstellen → Neue Bereitstellung**:
   - Typ (Zahnrad): **Web-App**
   - Ausführen als: **Ich**
   - Zugriff: **Jeder**
5. **Bereitstellen** klicken und den Zugriff auf die Tabelle erlauben. Google zeigt dabei eine Warnung „Google hat diese App nicht überprüft“. Das ist normal, weil es dein eigenes Script ist: **Erweitert → Zu … wechseln (unsicher)**.
6. Die angezeigte **Web-App-URL** kopieren (endet auf `/exec`) und mir geben. Ich trage sie in `config.js` ein.

Die Blätter „Bewertungen“ und „Abschluss“ legt das Script beim ersten Aufruf selbst an.

**Wenn jemand nie abschließt:** Im Blatt „Abschluss“ in der Zeile der Person `TRUE` eintragen.

**Wichtig:** Wenn das Script später geändert wird, unter **Bereitstellen → Bereitstellungen verwalten → Bearbeiten → Version: Neue Version** neu bereitstellen. Nur so bleibt die URL gleich.

## 2. GitHub Pages

1. Ein GitHub-Konto anlegen (falls noch nicht vorhanden) und mir den Benutzernamen nennen.
2. Ich lege das Repository an und schalte GitHub Pages ein. Die Seite ist dann unter `https://<benutzername>.github.io/orlando2027/` erreichbar.

Hinweis: Die Seite ist für jeden mit dem Link erreichbar. Die Abstimmung ist verdeckt, aber nicht geheim (siehe [ADR 0001](docs/adr/0001-github-pages-und-google-tabelle.md)).

## 3. Ticketpreise

In [data/highlights.json](data/highlights.json) bei beiden Optionen unter `ticketpreis` den Gesamtpreis für 3 Erwachsene + 1 Kind (`betrag`) und das Datum (`stand`) eintragen, oder mir die Preise nennen.

## 4. Probelauf und Start

1. Mit Testbewertungen einmal komplett durchspielen.
2. In der Google-Tabelle im Blatt „Bewertungen“ alle Zeilen ab Zeile 2 löschen und im Blatt „Abschluss“ alle Werte auf `FALSE` setzen.
3. Den Link an Mama, Resel und Jonny schicken.
