// Speicher für die Orlando-2027-Abstimmung in einer Google-Tabelle.
// Blatt "Bewertungen": Person | Highlight | Wert | Zeitpunkt
// Blatt "Abschluss":   Person | Abgeschlossen (TRUE/FALSE)
// Papa kann einen Abschluss stellvertretend setzen, indem er im Blatt "Abschluss" TRUE einträgt.

const PERSONEN = ["Papa", "Mama", "Resel", "Jonny"];

function blatt_(name, kopf) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(kopf);
    sh.setFrozenRows(1);
  }
  return sh;
}

const bewertungsBlatt_ = () => blatt_("Bewertungen", ["Person", "Highlight", "Wert", "Zeitpunkt"]);

function abschlussBlatt_() {
  const sh = blatt_("Abschluss", ["Person", "Abgeschlossen"]);
  if (sh.getLastRow() < 2) PERSONEN.forEach((p) => sh.appendRow([p, false]));
  return sh;
}

function abschluesse_() {
  const werte = abschlussBlatt_().getDataRange().getValues().slice(1);
  const ergebnis = {};
  PERSONEN.forEach((p) => (ergebnis[p] = false));
  werte.forEach(([p, a]) => { if (PERSONEN.includes(p)) ergebnis[p] = a === true || String(a).toUpperCase() === "TRUE"; });
  return ergebnis;
}

function bewertungen_() {
  const ergebnis = {};
  bewertungsBlatt_().getDataRange().getValues().slice(1).forEach(([p, id, wert]) => {
    if (!PERSONEN.includes(p) || wert === "" || wert === null) return;
    (ergebnis[p] = ergebnis[p] || {})[id] = Number(wert);
  });
  return ergebnis;
}

const alleFertig_ = (abgeschlossen) => PERSONEN.every((p) => abgeschlossen[p]);

function antwort_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const person = e.parameter.person;
  if (!PERSONEN.includes(person)) return antwort_({ ok: false, fehler: "Unbekannte Person." });
  const abgeschlossen = abschluesse_();
  const alle = bewertungen_();
  // Verdeckt: Fremde Bewertungen gibt es erst nach dem Aufdecken.
  return antwort_({ ok: true, eigene: alle[person] || {}, abgeschlossen, alle: alleFertig_(abgeschlossen) ? alle : null });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse(e.postData.contents);
    if (!PERSONEN.includes(body.person)) return antwort_({ ok: false, fehler: "Unbekannte Person." });
    if (alleFertig_(abschluesse_())) return antwort_({ ok: false, fehler: "Das Ergebnis ist schon aufgedeckt." });

    if (body.action === "bewerten") {
      const wert = body.wert;
      if (wert !== null && ![0, 1, 2, 3].includes(wert)) return antwort_({ ok: false, fehler: "Ungültige Bewertung." });
      const sh = bewertungsBlatt_();
      const zeilen = sh.getDataRange().getValues();
      const index = zeilen.findIndex((z, i) => i > 0 && z[0] === body.person && z[1] === body.highlightId);
      if (wert === null) {
        if (index > 0) sh.deleteRow(index + 1);
      } else if (index > 0) {
        sh.getRange(index + 1, 3, 1, 2).setValues([[wert, new Date()]]);
      } else {
        sh.appendRow([body.person, body.highlightId, wert, new Date()]);
      }
      return antwort_({ ok: true });
    }

    if (body.action === "abschliessen") {
      const sh = abschlussBlatt_();
      const zeilen = sh.getDataRange().getValues();
      const index = zeilen.findIndex((z, i) => i > 0 && z[0] === body.person);
      if (index > 0) sh.getRange(index + 1, 2).setValue(body.wert === true);
      else sh.appendRow([body.person, body.wert === true]);
      return antwort_({ ok: true });
    }

    return antwort_({ ok: false, fehler: "Unbekannte Aktion." });
  } finally {
    lock.releaseLock();
  }
}
