import { SCRIPT_URL } from "./config.js";
import { TestSpeicher, GoogleSpeicher } from "./speicher.js";
import { STUFEN, auswertung, praeferenzScore, highlightsDerOption, highlightSchnitt } from "./scoring.js";

const app = document.getElementById("app");
const PERSON_KEY = "orlando2027-person";
const OPTION_KEY = "orlando2027-option";
const VIDEO_SUFFIX = { "Fahrgeschäft": "POV", "Show": "full show", "Abendshow": "full show", "Themenbereich": "walkthrough" };
const OPTION_EMOJI = { disney: "🏰", universal: "🎢" };

let daten;
let speicher;
let person = merken(PERSON_KEY);
let aktiveOption = merken(OPTION_KEY) || "disney";
let zustand = null;
let aendern = false; // nach Abschluss doch noch ändern

// ---------- Hilfen ----------

function merken(key, wert) {
  try {
    if (wert === undefined) return localStorage.getItem(key);
    if (wert === null) localStorage.removeItem(key);
    else localStorage.setItem(key, wert);
  } catch { return null; }
}

function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const prozent = (x) => (x === null ? "–" : `${x.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`);
const euro = (x) => x.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function videoUrl(h, park) {
  const suche = `${h.name} ${park.name} ${VIDEO_SUFFIX[h.typ]}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(suche)}`;
}

function toast(text) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), 3500);
}

function frage(titel, text, ja, nein = "Abbrechen") {
  const dlg = document.getElementById("dialog");
  dlg.innerHTML = `<h2>${esc(titel)}</h2><p>${text}</p>
    <div class="knoepfe"><button class="sekundaer" value="nein">${esc(nein)}</button><button class="primaer" value="ja">${esc(ja)}</button></div>`;
  return new Promise((resolve) => {
    dlg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { dlg.close(); resolve(b.value === "ja"); }));
    dlg.addEventListener("cancel", () => resolve(false), { once: true });
    dlg.showModal();
  });
}

const alleHighlights = () => daten.optionen.flatMap(highlightsDerOption);
const istAbgeschlossen = () => Boolean(zustand.abgeschlossen[person]);
const offenePersonen = () => daten.personen.filter((p) => !zustand.abgeschlossen[p]);

// ---------- Ansichten ----------

function zeigeStart() {
  app.innerHTML = `
    <section class="start">
      <h1>Orlando 2027 🌴</h1>
      <p>Disney oder Universal? Wer bist du?</p>
      <div class="personen">
        ${daten.personen.map((p) => `<button class="person-btn" data-person="${esc(p)}">${esc(p)}</button>`).join("")}
      </div>
    </section>`;
  app.querySelectorAll("[data-person]").forEach((b) =>
    b.addEventListener("click", () => {
      person = b.dataset.person;
      merken(PERSON_KEY, person);
      starten();
    })
  );
}

function zeigeBewerten() {
  const alle = alleHighlights();
  const anzahl = Object.keys(zustand.eigene).filter((id) => alle.some((h) => h.id === id)).length;
  const gesperrt = istAbgeschlossen() && !aendern;
  const option = daten.optionen.find((o) => o.id === aktiveOption) || daten.optionen[0];

  const tabs = daten.optionen.map((o) => {
    const hs = highlightsDerOption(o);
    const bewertet = hs.filter((h) => h.id in zustand.eigene).length;
    return `<button class="tab" role="tab" data-option="${o.id}" aria-selected="${o.id === option.id}">
      ${OPTION_EMOJI[o.id] || ""} ${esc(o.name)}<small>${bewertet} von ${hs.length} bewertet</small></button>`;
  }).join("");

  const status = istAbgeschlossen()
    ? `<div class="hinweis-box"><strong>Du hast abgeschlossen ✓</strong>
        ${offenePersonen().length ? `Noch nicht fertig: ${offenePersonen().map(esc).join(", ")}. Das Ergebnis wird aufgedeckt, sobald alle abgeschlossen haben.` : ""}
        ${gesperrt ? `<br><button class="link-btn" id="aendern">Doch noch etwas ändern</button>` : ""}</div>`
    : `<p class="intro">Bewerte jedes Highlight. Was du überspringst, zählt bei dir nicht mit. Die Bewertungen der anderen siehst du erst, wenn alle fertig sind.</p>`;

  app.innerHTML = `
    <header class="kopf">
      <h1>Hallo ${esc(person)} 👋</h1>
      <button class="link-btn" id="wechseln">Nicht ${esc(person)}?</button>
    </header>
    <div class="fortschritt" aria-hidden="true"><div style="width:${(anzahl / alle.length) * 100}%"></div></div>
    <div class="fortschritt-text">${anzahl} von ${alle.length} Highlights bewertet</div>
    ${status}
    <nav class="tabs" role="tablist">${tabs}</nav>
    ${option.parks.map((park) => parkHtml(park, gesperrt)).join("")}
    <div class="fuss"><div class="fuss-innen">${fussHtml(anzahl, alle.length)}</div></div>`;

  app.querySelector("#wechseln").addEventListener("click", () => { person = null; merken(PERSON_KEY, null); aendern = false; zeigeStart(); });
  app.querySelector("#aendern")?.addEventListener("click", () => { aendern = true; zeigeBewerten(); });
  app.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => {
    aktiveOption = t.dataset.option;
    merken(OPTION_KEY, aktiveOption);
    zeigeBewerten();
    window.scrollTo({ top: 0 });
  }));
  app.querySelectorAll(".stufe").forEach((b) => b.addEventListener("click", () => bewerten(b)));
  app.querySelector("#abschliessen")?.addEventListener("click", abschliessen);
  app.querySelector("#wieder-oeffnen")?.addEventListener("click", wiederOeffnen);
  app.querySelector("#fertig-aendern")?.addEventListener("click", () => { aendern = false; zeigeBewerten(); });
}

function parkHtml(park, gesperrt) {
  const bewertet = park.highlights.filter((h) => h.id in zustand.eigene).length;
  return `
    <details class="park" open>
      <summary><h2>${esc(park.name)}</h2><span class="park-meta">${esc(park.art)} · ${bewertet}/${park.highlights.length}</span></summary>
      ${park.hinweis ? `<p class="park-hinweis">⚠️ ${esc(park.hinweis)}</p>` : ""}
      ${park.highlights.map((h) => karteHtml(h, park, gesperrt)).join("")}
    </details>`;
}

function karteHtml(h, park, gesperrt) {
  const wert = zustand.eigene[h.id];
  const stufen = STUFEN.map((s) => `
    <button class="stufe" data-id="${h.id}" data-wert="${s.wert}" aria-pressed="${wert === s.wert}" ${gesperrt ? "disabled" : ""}>
      <span aria-hidden="true">${s.emoji}</span>${esc(s.text)}</button>`).join("");
  return `
    <article class="karte ${wert !== undefined ? "bewertet" : ""}" id="h-${h.id}">
      <h3>${esc(h.name)}</h3>
      <div class="chips">
        <span class="chip">${esc(h.typ)}</span>
        ${h.mindestgroesseCm ? `<span class="chip groesse">ab ${h.mindestgroesseCm} cm</span>` : ""}
      </div>
      <p class="beschreibung">${esc(h.beschreibung)}</p>
      ${h.hinweis ? `<p class="warn-text">⚠️ ${esc(h.hinweis)}</p>` : ""}
      <div class="links">
        <a href="${esc(videoUrl(h, park))}" target="_blank" rel="noopener">▶ Ansehen</a>
        <a href="${esc(h.infoUrl)}" target="_blank" rel="noopener">ℹ Infos</a>
      </div>
      <div class="stufen" role="group" aria-label="Bewertung für ${esc(h.name)}">${stufen}</div>
    </article>`;
}

function fussHtml(anzahl, gesamt) {
  if (!istAbgeschlossen()) {
    return `<span class="fuss-text">${anzahl === gesamt ? "Alles bewertet 🎉" : `Noch ${gesamt - anzahl} offen`}</span>
      <button class="primaer" id="abschliessen">Fertig – abschließen</button>`;
  }
  if (aendern) {
    return `<span class="fuss-text">Änderungen werden sofort gespeichert.</span>
      <button class="primaer" id="fertig-aendern">Fertig</button>`;
  }
  return `<span class="fuss-text">Du bist fertig.</span>
    <button class="sekundaer" id="wieder-oeffnen">Abschluss zurücknehmen</button>`;
}

function zeigeErgebnis() {
  const bewertungen = zustand.alle;
  const p = daten.personen;
  const r = auswertung(daten.optionen, bewertungen, p);
  const sieger = r.entscheidung;

  let titel, unterzeile;
  if (sieger) {
    titel = `Es geht zu ${esc(sieger.option.name)}!`;
    const [a, b] = r.ergebnisse;
    unterzeile = `${esc(a.option.name)} ${prozent(a.score)} · ${esc(b.option.name)} ${prozent(b.score)} · Abstand ${r.abstand.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Prozentpunkte`;
    if (r.perTiebreaker) unterzeile += `<br>Gleicher Präferenz-Score – entschieden hat der Muss-Zähler.`;
  } else {
    titel = "Exakter Gleichstand";
    unterzeile = "Präferenz-Score und Muss-Zähler sind gleich. Jetzt müsst ihr reden.";
  }

  const karten = r.ergebnisse.map((e) => {
    const preis = e.option.ticketpreis?.betrag;
    return `
      <div class="option-karte ${e === sieger ? "sieger" : ""}" data-option="${e.option.id}">
        <h2>${OPTION_EMOJI[e.option.id] || ""} ${esc(e.option.name)}</h2>
        <div class="score">${prozent(e.score)}</div>
        <div class="info-label">Präferenz-Score</div>
        <dl>
          <dt>Muss-Zähler</dt><dd>${e.muss} Highlights</dd>
          <dt>Ticketpreis</dt><dd>${preis ? euro(preis) : "fehlt noch"}</dd>
          <dt>Preis-Leistung <span class="info-label">(nur Info)</span></dt>
          <dd>${e.preisLeistung === null ? "–" : `${e.preisLeistung.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Pkt. je 1.000 €`}</dd>
        </dl>
        ${e.option.ticketpreis?.stand ? `<div class="info-label">Preisstand: ${esc(e.option.ticketpreis.stand)}</div>` : ""}
      </div>`;
  }).join("");

  const zeilen = p.map((name) => `<tr><td>${esc(name)}</td>${daten.optionen
    .map((o) => `<td class="zahl">${prozent(praeferenzScore(o, bewertungen, [name]))}</td>`).join("")}</tr>`).join("");

  const top = daten.optionen.map((o) => {
    const liste = highlightsDerOption(o)
      .map((h) => ({ h, schnitt: highlightSchnitt(h.id, bewertungen, p) }))
      .filter((x) => x.schnitt !== null)
      .sort((a, b) => b.schnitt - a.schnitt)
      .slice(0, 5);
    return `<div><h3>${OPTION_EMOJI[o.id] || ""} ${esc(o.name)}</h3><ol>${liste
      .map((x) => `<li>${esc(x.h.name)}</li>`).join("")}</ol></div>`;
  }).join("");

  app.innerHTML = `
    <section class="ergebnis-kopf">
      <div class="emoji" aria-hidden="true">${sieger ? OPTION_EMOJI[sieger.option.id] || "🎉" : "🤝"}</div>
      <h1>${titel}</h1>
      <p>${unterzeile}</p>
    </section>
    <section class="optionen">${karten}</section>
    <section class="abschnitt">
      <h2>Wie jeder abgestimmt hat</h2>
      <table><thead><tr><th>Familienmitglied</th>${daten.optionen.map((o) => `<th class="zahl">${esc(o.name)}</th>`).join("")}</tr></thead>
      <tbody>${zeilen}</tbody></table>
    </section>
    <section class="abschnitt">
      <h2>Die Lieblings-Highlights</h2>
      <div class="top-liste">${top}</div>
    </section>`;
}

// ---------- Aktionen ----------

async function bewerten(button) {
  const id = button.dataset.id;
  const neu = Number(button.dataset.wert);
  const alt = zustand.eigene[id];
  const wert = alt === neu ? null : neu; // erneutes Antippen hebt die Bewertung auf
  if (wert === null) delete zustand.eigene[id];
  else zustand.eigene[id] = wert;
  aktualisiereKarte(id);
  try {
    await speicher.bewerten(person, id, wert);
  } catch (e) {
    if (alt === undefined) delete zustand.eigene[id];
    else zustand.eigene[id] = alt;
    aktualisiereKarte(id);
    toast(`Nicht gespeichert: ${e.message}`);
  }
}

// Nur die betroffene Karte und Zähler neu zeichnen, damit die Scrollposition bleibt.
function aktualisiereKarte(id) {
  const karte = document.getElementById(`h-${id}`);
  const wert = zustand.eigene[id];
  karte.classList.toggle("bewertet", wert !== undefined);
  karte.querySelectorAll(".stufe").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.wert) === wert)));
  const alle = alleHighlights();
  const anzahl = alle.filter((h) => h.id in zustand.eigene).length;
  app.querySelector(".fortschritt > div").style.width = `${(anzahl / alle.length) * 100}%`;
  app.querySelector(".fortschritt-text").textContent = `${anzahl} von ${alle.length} Highlights bewertet`;
  app.querySelectorAll(".tab").forEach((t) => {
    const hs = highlightsDerOption(daten.optionen.find((o) => o.id === t.dataset.option));
    t.querySelector("small").textContent = `${hs.filter((h) => h.id in zustand.eigene).length} von ${hs.length} bewertet`;
  });
  app.querySelectorAll(".park").forEach((d) => {
    const ids = [...d.querySelectorAll(".karte")].map((k) => k.id.slice(2));
    const meta = d.querySelector(".park-meta");
    meta.textContent = meta.textContent.replace(/\d+\/\d+$/, `${ids.filter((i) => i in zustand.eigene).length}/${ids.length}`);
  });
  const fuss = app.querySelector(".fuss-text");
  if (fuss && !istAbgeschlossen()) fuss.textContent = anzahl === alle.length ? "Alles bewertet 🎉" : `Noch ${alle.length - anzahl} offen`;
}

async function abschliessen() {
  const alle = alleHighlights();
  const offen = alle.filter((h) => !(h.id in zustand.eigene)).length;
  const text = offen
    ? `Du hast <strong>${offen} von ${alle.length}</strong> Highlights noch nicht bewertet. Die zählen bei dir dann nicht mit.`
    : "Du hast alle Highlights bewertet. Bis alle fertig sind, kannst du den Abschluss noch zurücknehmen.";
  if (!(await frage(offen ? "Noch nicht alles bewertet" : "Super, alles bewertet!", text, "Abschließen", offen ? "Weiter bewerten" : "Abbrechen"))) return;
  await setzeAbschluss(true);
}

async function wiederOeffnen() {
  await setzeAbschluss(false);
}

async function setzeAbschluss(wert) {
  try {
    await speicher.abschliessen(person, wert);
    aendern = false;
    await neuLaden();
  } catch (e) {
    toast(e.message);
  }
}

// ---------- Ablauf ----------

async function neuLaden() {
  zustand = await speicher.laden(person);
  if (zustand.alle) zeigeErgebnis();
  else zeigeBewerten();
}

async function starten() {
  if (!person || !daten.personen.includes(person)) return zeigeStart();
  app.innerHTML = `<p class="laden">Lade …</p>`;
  try {
    await neuLaden();
  } catch (e) {
    app.innerHTML = `<p class="laden">Laden fehlgeschlagen: ${esc(e.message)}<br><button class="sekundaer" onclick="location.reload()">Nochmal versuchen</button></p>`;
  }
}

// Regelmäßig prüfen, ob inzwischen alle abgeschlossen haben (Aufdecken).
setInterval(async () => {
  if (!person || !zustand || zustand.alle || document.hidden) return;
  try {
    const neu = await speicher.laden(person);
    if (neu.alle) { zustand = neu; zeigeErgebnis(); return; }
    const vorher = JSON.stringify(zustand.abgeschlossen);
    zustand.abgeschlossen = neu.abgeschlossen;
    if (istAbgeschlossen() && !aendern && vorher !== JSON.stringify(neu.abgeschlossen)) zeigeBewerten();
  } catch { /* nächster Versuch */ }
}, 20000);

async function init() {
  daten = await (await fetch("data/highlights.json", { cache: "no-cache" })).json();
  if (SCRIPT_URL) {
    speicher = new GoogleSpeicher(SCRIPT_URL);
  } else {
    speicher = new TestSpeicher(daten.personen);
    const banner = document.getElementById("testmodus");
    banner.innerHTML = `Testmodus – Bewertungen bleiben nur in diesem Browser. <button id="test-reset">Testdaten löschen</button>`;
    banner.hidden = false;
    banner.querySelector("#test-reset").addEventListener("click", async () => {
      if (!(await frage("Testdaten löschen?", "Alle Bewertungen und Abschlüsse in diesem Browser werden gelöscht.", "Löschen"))) return;
      speicher.zuruecksetzen();
      starten();
    });
  }
  starten();
}

init();
