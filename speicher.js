// Speicher für Bewertungen und Abschlüsse.
// Beide Varianten liefern denselben Zustand:
//   { eigene: {highlightId: wert}, abgeschlossen: {person: bool}, alle: {person: {...}} | null }
// "alle" ist erst gefüllt, wenn alle Familienmitglieder abgeschlossen haben (Aufdecken).

const alleFertig = (personen, abgeschlossen) => personen.every((p) => abgeschlossen[p]);

export class TestSpeicher {
  constructor(personen) {
    this.personen = personen;
    this.key = "orlando2027-test";
  }
  #lesen() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || { bewertungen: {}, abgeschlossen: {} };
    } catch {
      return { bewertungen: {}, abgeschlossen: {} };
    }
  }
  #schreiben(daten) {
    try { localStorage.setItem(this.key, JSON.stringify(daten)); } catch { /* privates Fenster */ }
  }
  async laden(person) {
    const d = this.#lesen();
    const fertig = alleFertig(this.personen, d.abgeschlossen);
    return { eigene: d.bewertungen[person] || {}, abgeschlossen: d.abgeschlossen, alle: fertig ? d.bewertungen : null };
  }
  async bewerten(person, highlightId, wert) {
    const d = this.#lesen();
    if (alleFertig(this.personen, d.abgeschlossen)) throw new Error("Das Ergebnis ist schon aufgedeckt.");
    d.bewertungen[person] ??= {};
    if (wert === null) delete d.bewertungen[person][highlightId];
    else d.bewertungen[person][highlightId] = wert;
    this.#schreiben(d);
  }
  async abschliessen(person, wert) {
    const d = this.#lesen();
    if (alleFertig(this.personen, d.abgeschlossen)) throw new Error("Das Ergebnis ist schon aufgedeckt.");
    d.abgeschlossen[person] = wert;
    this.#schreiben(d);
  }
  zuruecksetzen() {
    try { localStorage.removeItem(this.key); } catch { /* egal */ }
  }
}

export class GoogleSpeicher {
  constructor(url) {
    this.url = url;
  }
  async #post(body) {
    // text/plain vermeidet den CORS-Preflight, den Apps Script nicht beantwortet.
    const r = await fetch(this.url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "text/plain;charset=utf-8" } });
    const json = await r.json();
    if (!json.ok) throw new Error(json.fehler || "Speichern fehlgeschlagen.");
    return json;
  }
  async laden(person) {
    const r = await fetch(`${this.url}?action=zustand&person=${encodeURIComponent(person)}`);
    const json = await r.json();
    if (!json.ok) throw new Error(json.fehler || "Laden fehlgeschlagen.");
    return { eigene: json.eigene, abgeschlossen: json.abgeschlossen, alle: json.alle };
  }
  bewerten(person, highlightId, wert) {
    return this.#post({ action: "bewerten", person, highlightId, wert });
  }
  abschliessen(person, wert) {
    return this.#post({ action: "abschliessen", person, wert });
  }
}
