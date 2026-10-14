import { test } from "node:test";
import assert from "node:assert/strict";
import { praeferenzScore, mussZaehler, auswertung, preisLeistung } from "../scoring.js";

const P = ["Papa", "Mama", "Resel", "Jonny"];
const opt = (id, ids, betrag = null) => ({
  id, ticketpreis: { betrag },
  parks: [{ highlights: ids.map((i) => ({ id: i })) }],
});
const disney = opt("disney", ["d1", "d2", "d3"], 4000);
const universal = opt("universal", ["u1", "u2"], 3000);

test("Score: erst Schnitt je Person, dann über Personen; Unbewertetes zählt nicht", () => {
  const b = { Papa: { d1: 3, d2: 3 }, Mama: { d1: 0 } }; // Papa 3.0, Mama 0.0 -> 1.5
  assert.equal(praeferenzScore(disney, b, P), 50);
});

test("Score: niemand hat bewertet -> null", () => {
  assert.equal(praeferenzScore(disney, {}, P), null);
});

test("Muss-Zähler zählt Highlights, nicht Stimmen", () => {
  const b = { Papa: { d1: 3 }, Mama: { d1: 3, d2: 3 }, Jonny: { d3: 2 } };
  assert.equal(mussZaehler(disney, b, P), 2);
});

test("Entscheidung: höherer Score gewinnt, auch knapp", () => {
  const b = { Papa: { d1: 3, u1: 2 } };
  const r = auswertung([disney, universal], b, P);
  assert.equal(r.entscheidung.option.id, "disney");
  assert.equal(r.perTiebreaker, false);
});

test("Entscheidung: Gleichstand -> Muss-Zähler", () => {
  const b = { Papa: { d1: 3, d2: 1, u1: 2, u2: 2 } }; // beide 66.7 %
  const r = auswertung([disney, universal], b, P);
  assert.equal(r.entscheidung.option.id, "disney");
  assert.equal(r.perTiebreaker, true);
});

test("Entscheidung: völliger Gleichstand -> keine", () => {
  const b = { Papa: { d1: 2, u1: 2 } };
  assert.equal(auswertung([disney, universal], b, P).entscheidung, null);
});

test("Preis-Leistung: Prozentpunkte je 1.000 €, ohne Preis null", () => {
  assert.equal(preisLeistung(60, { betrag: 3000 }), 20);
  assert.equal(preisLeistung(60, { betrag: null }), null);
});
