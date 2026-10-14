"""Erzeugt highlights-pruefliste.md aus data/highlights.json."""
import json
from pathlib import Path
from urllib.parse import quote_plus

ROOT = Path(__file__).resolve().parent.parent
SUFFIX = {"Fahrgeschäft": "POV", "Show": "full show", "Abendshow": "full show", "Themenbereich": "walkthrough"}


def video_url(h, park):
    return "https://www.youtube.com/results?search_query=" + quote_plus(f"{h['name']} {park} {SUFFIX[h['typ']]}")


def zelle(text):
    return (text or "").replace("|", "\\|")


d = json.loads((ROOT / "data/highlights.json").read_text())
z = [f"# Highlight-Liste zum Prüfen\n\nStand der Recherche: {d['stand']}. ⚠️ markiert Einträge mit offenem Punkt.\n"]
for o in d["optionen"]:
    anzahl = sum(len(p["highlights"]) for p in o["parks"])
    z.append(f"\n## {o['name']} ({len(o['parks'])} Parks, {anzahl} Highlights)\n\nTicket: {o['ticket']}\n")
    for p in o["parks"]:
        z.append(f"\n### [{p['name']}]({p['infoUrl']}) – {p['art']}\n")
        if p.get("hinweis"):
            z.append(f"\n⚠️ {p['hinweis']}\n")
        z.append("\n| Highlight | Typ | Was erwartet einen | Mindestgröße | Links |\n|---|---|---|---|---|")
        for h in p["highlights"]:
            name = zelle(h["name"]) + (" ⚠️" if h.get("hinweis") else "")
            text = zelle(h["beschreibung"]) + (f" **⚠️ {zelle(h['hinweis'])}**" if h.get("hinweis") else "")
            groesse = f"ab {h['mindestgroesseCm']} cm" if h.get("mindestgroesseCm") else "–"
            z.append(f"| {name} | {h['typ']} | {text} | {groesse} | [Ansehen]({video_url(h, p['name'])}) · [Infos]({h['infoUrl']}) |")
        z.append("")
(ROOT / "highlights-pruefliste.md").write_text("\n".join(z))
