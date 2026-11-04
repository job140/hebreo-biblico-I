"use strict";
// Contratos estáticos: no sustituyen Firebase Emulator Suite ni pruebas reales OAuth.
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { test } = require("node:test");
const read = path => readFileSync(path, "utf8");

test("Hay recursos de la cuenta y manifiesto estable de la PWA", () => {
  for (const name of [
    "index.html", "auth/account.js", "auth/account.css",
    "auth/firebase-config.js", "firebase/firestore.rules",
    "firebase/functions/index.js", "eliminar-cuenta.html"
  ]) assert.ok(existsSync(name), "Falta " + name);
  const html = read("index.html");
  assert.match(html, /auth\/account\.css/);
  assert.match(html, /auth\/firebase-config\.js/);
  assert.match(html, /type="module" src="\.\/auth\/account\.js"/);
  assert.match(html, /eliminar-cuenta\.html/);
  assert.equal(JSON.parse(read("manifest.webmanifest")).id, "./index.html");
});
test("La app funciona sin proyecto Firebase y Apple está inactivo", () => {
  const config = read("auth/firebase-config.js");
  assert.match(config, /apiKey: ""/);
  assert.match(config, /appleEnabled: false/);
  assert.match(read("auth/account.js"), /if \(READY\)/);
  assert.match(read("auth/account.js"), /guestView\(\)/);
});
test("No se exportan ni importan datos de otra cuenta", () => {
  const html = read("index.html");
  assert.equal((html.match(/!\s*\/\^hb_\(account_\|auth_\|cloud_\)\//g) || []).length, 2);
  assert.match(read("auth/account.js"), /hb_account_backup_/);
});
test("Hay protección contra sobreescritura silenciosa de nube", () => {
  const src = read("auth/account.js");
  assert.match(src, /runTransaction/);
  assert.match(src, /remoteRevision !== state\.revision/);
  assert.match(src, /SYNC_CONFLICT/);
  assert.match(src, /if \(signature\(local\) === signature\(inCloud\)\)/);
  assert.match(src, /window\.location|location\.reload/);
});
test("La creación del estudiante es atómica; los roles institucionales no son editables", () => {
  const rules = read("firebase/firestore.rules");
  const account = read("auth/account.js");
  assert.match(account, /writeBatch/);
  assert.match(account, /studentCodes/);
  assert.match(rules, /getAfter/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(\["displayName", "updatedAt"\]\)/);
  assert.match(rules, /match \/institutionInvites/);
  assert.match(rules, /allow read, write: if false/);
});
test("El backend tiene emisión de invitaciones, matrícula y eliminación de cuenta", () => {
  const fns = read("firebase/functions/index.js");
  for (const name of ["createInstitutionInvite", "redeemInstitutionInvite", "deleteMyAccount"]) {
    assert.match(fns, new RegExp("exports\\." + name));
  }
  assert.match(fns, /runTransaction/);
  assert.match(fns, /getAuth\(\)\.deleteUser/);
  assert.match(read("auth/account.js"), /revokeAccessToken/);
});
test("El service worker almacena la interfaz de cuentas sin cambiar la identidad", () => {
  const sw = read("sw.js");
  for (const path of [
    "auth/account.js", "auth/account.css", "auth/firebase-config.js", "eliminar-cuenta.html"
  ]) assert.ok(sw.includes("'./" + path + "'"), "No se guarda " + path);
  assert.match(sw, /CACHE_VERSION = '4\.9\.0'/);
});
