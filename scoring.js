// Berechnung von Präferenz-Score, Muss-Zähler, Preis-Leistung und Entscheidung.
// Begriffe siehe CONTEXT.md.

export const STUFEN = [
  { wert: 3, emoji: "🤩", text: "Muss ich unbedingt machen" },
  { wert: 2, emoji: "🙂", text: "Gerne" },
  { wert: 1, emoji: "😐", text: "Egal" },
  { wert: 0, emoji: "🙅", text: "Will ich nicht / kann ich nicht" },
];
export const MUSS = 3;
const MAX = 3;

export function highlightsDerOption(option) {
  return option.parks.flatMap((park) => park.highlights);
}

// bewertungen: { [person]: { [highlightId]: 0..3 } }
// Liefert den Präferenz-Score in Prozent (0–100) oder null, wenn niemand etwas bewertet hat.
export function praeferenzScore(option, bewertungen, personen) {
  const ids = highlightsDerOption(option).map((h) => h.id);
  const schnitte = [];
  for (const person of personen) {
    const eigene = bewertungen[person] || {};
    const werte = ids.map((id) => eigene[id]).filter((w) => w !== undefined && w !== null);
    if (werte.length) schnitte.push(werte.reduce((a, b) => a + b, 0) / werte.length);
  }
  if (!schnitte.length) return null;
  const mittel = schnitte.reduce((a, b) => a + b, 0) / schnitte.length;
  return (mittel / MAX) * 100;
}

export function mussZaehler(option, bewertungen, personen) {
  return highlightsDerOption(option).filter((h) =>
    personen.some((p) => (bewertungen[p] || {})[h.id] === MUSS)
  ).length;
}

// Prozentpunkte des Präferenz-Scores je 1.000 € Ticketpreis; nur Information.
export function preisLeistung(score, ticketpreis) {
  if (score === null || !ticketpreis || !ticketpreis.betrag) return null;
  return score / (ticketpreis.betrag / 1000);
}

const aufEineStelle = (x) => Math.round(x * 10) / 10;

export function auswertung(optionen, bewertungen, personen) {
  const ergebnisse = optionen.map((option) => {
    const score = praeferenzScore(option, bewertungen, personen);
    return {
      option,
      score,
      muss: mussZaehler(option, bewertungen, personen),
      preisLeistung: preisLeistung(score, option.ticketpreis),
    };
  });
  const [a, b] = ergebnisse;
  const sa = aufEineStelle(a.score ?? 0);
  const sb = aufEineStelle(b.score ?? 0);
  let entscheidung = null;
  let perTiebreaker = false;
  if (sa !== sb) entscheidung = sa > sb ? a : b;
  else if (a.muss !== b.muss) {
    entscheidung = a.muss > b.muss ? a : b;
    perTiebreaker = true;
  }
  return { ergebnisse, entscheidung, perTiebreaker, abstand: Math.abs(sa - sb) };
}

// Durchschnittliche Bewertung eines Highlights über alle, die es bewertet haben (für Ranglisten).
export function highlightSchnitt(highlightId, bewertungen, personen) {
  const werte = personen
    .map((p) => (bewertungen[p] || {})[highlightId])
    .filter((w) => w !== undefined && w !== null);
  if (!werte.length) return null;
  return werte.reduce((a, b) => a + b, 0) / werte.length;
}
