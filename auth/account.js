/*
 * Hebreo Bíblico I · Cuentas v4.9.0
 * Firebase es opcional hasta completar el archivo firebase-config.js.
 * No se transmiten resultados al iniciar sesión sin una elección explícita.
 */
(() => {
  "use strict";

  const CONFIG = window.HEBREO_FIREBASE_CONFIG || {};
  const READY = ["apiKey", "authDomain", "projectId", "appId"].every(
    key => typeof CONFIG[key] === "string" && CONFIG[key].trim() &&
    !/CAMBIAR|REEMPLAZAR|TU_|YOUR_/i.test(CONFIG[key])
  );
  const OWNER_KEY = "hb_auth_active_uid";
  const BACKUP_PREFIX = "hb_account_backup_";
  const SNAPSHOT_LIMIT = 600000;
  const state = {
    sdk: null, auth: null, db: null, functions: null, user: null,
    profile: null, revision: 0, lastSig: "", syncEnabled: false,
    saving: false, choosing: false, deleting: false
  };
  const escapeStorageError = err => String(err && (err.code || err.message) || err);
  const progressKey = key => /^(hb_|hebreo_)/.test(key) &&
    !/^hb_(account_|auth_|cloud_)/.test(key);

  function snapshot() {
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && progressKey(key)) out[key] = localStorage.getItem(key);
      }
    } catch (err) { console.warn("No se pudo leer el progreso local", err); }
    return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  }
  const signature = data => JSON.stringify(Object.fromEntries(
    Object.entries(data || {}).sort(([a], [b]) => a.localeCompare(b))
  ));
  function backup(label) {
    try { localStorage.setItem(BACKUP_PREFIX + label, JSON.stringify(snapshot())); }
    catch (err) { console.warn("No se pudo hacer respaldo local", err); }
  }
  function clearProgress() {
    for (const key of Object.keys(snapshot())) {
      try { localStorage.removeItem(key); } catch (err) { console.warn(err); }
    }
  }
  function applySnapshot(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("La copia recibida no tiene el formato esperado.");
    }
    const raw = signature(data);
    if (raw.length > SNAPSHOT_LIMIT) throw new Error("El respaldo excede el límite seguro.");
    clearProgress();
    for (const [key, value] of Object.entries(data)) {
      if (progressKey(key) && typeof value === "string") localStorage.setItem(key, value);
    }
  }
  function switchOwner(uid) {
    const previous = localStorage.getItem(OWNER_KEY);
    if (previous === uid) return false;
    if (previous) {
      backup(previous);
      clearProgress();
      const cached = localStorage.getItem(BACKUP_PREFIX + uid);
      if (cached) {
        try { applySnapshot(JSON.parse(cached)); } catch (err) { console.warn(err); }
      }
      localStorage.setItem(OWNER_KEY, uid);
      location.reload();
      return true;
    }
    backup("guest");
    localStorage.setItem(OWNER_KEY, uid);
    return false;
  }
  function switchToGuest() {
    const previous = localStorage.getItem(OWNER_KEY);
    if (!previous) return false;
    backup(previous);
    clearProgress();
    const guest = localStorage.getItem(BACKUP_PREFIX + "guest");
    if (guest) {
      try { applySnapshot(JSON.parse(guest)); } catch (err) { console.warn(err); }
    }
    localStorage.removeItem(OWNER_KEY);
    return true;
  }

  const open = document.createElement("button");
  open.id = "hb-account-open";
  open.type = "button";
  open.className = "hb-account-open";
  open.innerHTML = '<span class="hb-account-icon" aria-hidden="true">👤</span><span class="hb-account-text">Mi cuenta</span>';

  const overlay = document.createElement("div");
  overlay.id = "hb-account-overlay";
  overlay.className = "hb-account-overlay";
  overlay.hidden = true;
  overlay.innerHTML = [
    '<section class="hb-account-modal" role="dialog" aria-modal="true" aria-label="Cuenta de Hebreo Bíblico I">',
    '<button type="button" class="hb-account-close" id="hb-auth-close" aria-label="Cerrar">×</button>',
    '<h2>Mi cuenta académica</h2>',
    '<p>Guarda tu progreso, reconoce tus avances y participa en grupos institucionales.</p>',
    '<div class="hb-msg" id="hb-auth-msg" role="status" aria-live="polite"></div>',
    '<div class="hb-account-pane" id="hb-auth-guest">',
    '<button type="button" id="hb-auth-google" class="hb-auth-btn hb-auth-primary">Continuar con Google</button>',
    '<button type="button" id="hb-auth-apple" class="hb-auth-btn">Continuar con Apple</button>',
    '<button type="button" id="hb-auth-anon" class="hb-auth-btn">Seguir estudiando como invitado</button>',
    '<p class="hb-muted">Sin cuenta, las actividades siguen disponibles. El progreso se guarda únicamente en este dispositivo.</p>',
    '</div>',
    '<div class="hb-account-pane" id="hb-auth-profile" hidden>',
    '<div class="hb-card"><div class="hb-row"><strong id="hb-name-view">Estudiante</strong><span id="hb-account-type" class="hb-pill">Público</span></div>',
    '<p id="hb-email-view" class="hb-muted"></p>',
    '<p class="hb-muted">Código estudiantil</p><div class="hb-code" id="hb-student-code">—</div>',
    '<p id="hb-institution" class="hb-muted"></p></div>',
    '<div class="hb-metrics"><div class="hb-metric"><b id="hb-prog-count">0</b><span>Registros locales</span></div>',
    '<div class="hb-metric"><b id="hb-cloud-indicator">—</b><span>Estado de nube</span></div></div>',
    '<div class="hb-sync-choice" id="hb-sync-choice" hidden>',
    '<h3>¿Qué avances quieres conservar?</h3><p id="hb-sync-explain">Encontramos datos diferentes en este dispositivo y en la nube.</p>',
    '<button type="button" class="hb-auth-btn hb-auth-primary" id="hb-push-local">Guardar los avances de este dispositivo en la nube</button>',
    '<button type="button" class="hb-auth-btn" id="hb-pull-cloud">Recuperar la copia de la nube en este dispositivo</button>',
    '<p class="hb-muted">No sustituiremos resultados sin que elijas. Antes de recuperar la nube guardaremos una copia local.</p></div>',
    '<button type="button" id="hb-save-now" class="hb-auth-btn">Sincronizar cambios ahora</button>',
    '<div class="hb-divider"></div>',
    '<form id="hb-profile-form"><h3>Mis datos</h3>',
    '<label for="hb-display-name">Nombre visible<input id="hb-display-name" name="displayName" maxlength="80" autocomplete="name" required></label>',
    '<button type="submit" class="hb-auth-btn">Guardar nombre</button></form>',
    '<form id="hb-institution-form" class="hb-institution-form"><h3>Vincular una institución</h3>',
    '<p class="hb-muted">Necesitas un código de invitación válido que te dé un docente autorizado. El código estudiantil no es un código de invitación.</p>',
    '<label for="hb-invite-code">Código institucional<input id="hb-invite-code" name="invite" maxlength="40" minlength="20" autocomplete="off" placeholder="Código de invitación" required></label>',
    '<button type="submit" class="hb-auth-btn">Unirme a mi institución</button></form>',
    '<div class="hb-divider"></div>',
    '<button type="button" id="hb-sign-out" class="hb-auth-btn">Cerrar sesión</button>',
    '<button type="button" id="hb-delete-account" class="hb-auth-btn hb-auth-danger">Eliminar cuenta y datos en la nube</button>',
    '<p class="hb-muted">Tu código y tus grupos solo se crean o verifican mediante las reglas de seguridad de Firebase.</p>',
    '</div></section>'
  ].join("");
  document.body.appendChild(overlay);
  const where = document.querySelector(".v4-header-right") ||
                document.querySelector(".v4-header") || document.querySelector(".hero");
  if (where) where.appendChild(open);
  else document.body.appendChild(open);
  const $ = id => overlay.querySelector("#" + id);
  function message(text, error = false) {
    $("hb-auth-msg").textContent = text;
    $("hb-auth-msg").classList.toggle("hb-error", error);
  }
  function toggle(show) {
    overlay.hidden = !show;
    document.body.classList.toggle("hb-account-opened", show);
    if (show) {
      $("hb-prog-count").textContent = Object.keys(snapshot()).length;
      $("hb-auth-close").focus();
    } else open.focus();
  }
  function guestView() {
    $("hb-auth-guest").hidden = false;
    $("hb-auth-profile").hidden = true;
    $("hb-sync-choice").hidden = true;
    open.querySelector(".hb-account-text").textContent = "Mi cuenta";
  }
  function profileView() {
    const p = state.profile || {};
    $("hb-auth-guest").hidden = true;
    $("hb-auth-profile").hidden = false;
    $("hb-name-view").textContent = p.displayName || "Estudiante";
    $("hb-email-view").textContent = p.email || "Correo no compartido por el proveedor";
    $("hb-student-code").textContent = p.studentCode || "Pendiente";
    $("hb-account-type").textContent = p.institutionId ? "Institucional" : "Público";
    $("hb-institution").textContent = p.institutionName ? "Institución: " + p.institutionName : "Cuenta personal";
    $("hb-display-name").value = p.displayName || "";
    $("hb-institution-form").hidden = !!p.institutionId;
    $("hb-cloud-indicator").textContent = state.syncEnabled ? "Activo" : "Pendiente";
    $("hb-prog-count").textContent = Object.keys(snapshot()).length;
    open.querySelector(".hb-account-text").textContent = (p.displayName || "Mi perfil").split(/\s+/)[0].slice(0,13);
  }
  const friendlyError = err => {
    const code = escapeStorageError(err);
    if (/auth\/popup-blocked|auth\/popup-closed-by-user/.test(code)) return "No terminó el inicio de sesión. Permite ventanas emergentes o vuelve a intentarlo.";
    if (/auth\/unauthorized-domain/.test(code)) return "Debes autorizar el dominio job140.github.io en Firebase Authentication.";
    if (/auth\/operation-not-allowed/.test(code)) return "Este proveedor todavía no está habilitado en Firebase.";
    if (/permission-denied/.test(code)) return "Firebase rechazó una operación. Comprueba las reglas de seguridad de Firestore.";
    if (/unavailable|network-request-failed|failed to fetch/i.test(code)) return "Comprueba tu conexión a internet y vuelve a intentarlo.";
    if (/functions\/not-found|not-found/.test(code)) return "La función institucional o de eliminación aún no se ha desplegado en Firebase.";
    if (/SYNC_CONFLICT/.test(code)) return "Hay avances más recientes en otro dispositivo. Debes elegir qué copia conservar.";
    return "No se pudo completar la operación: " + code;
  };
  function configureButtons() {
    $("hb-auth-google").disabled = !READY;
    $("hb-auth-apple").disabled = !READY || CONFIG.appleEnabled !== true;
    if (!READY) {
      message("El sistema de cuentas está preparado, pero Firebase todavía no está configurado. Puedes continuar como invitado.");
    } else {
      message("Inicia sesión para crear tu perfil o recuperar tus avances.");
      if (!CONFIG.appleEnabled) {
        $("hb-auth-apple").textContent = "Continuar con Apple · pendiente de activar";
      }
    }
  }
  async function loadFirebase() {
    const base = "https://www.gstatic.com/firebasejs/12.6.0/";
    const mods = await Promise.all([
      import(base + "firebase-app.js"),
      import(base + "firebase-auth.js"),
      import(base + "firebase-firestore.js"),
      import(base + "firebase-functions.js")
    ]);
    state.sdk = Object.assign({}, ...mods);
    const app = state.sdk.initializeApp({
      apiKey: CONFIG.apiKey.trim(),
      authDomain: CONFIG.authDomain.trim(),
      projectId: CONFIG.projectId.trim(),
      appId: CONFIG.appId.trim(),
      ...(CONFIG.messagingSenderId ? { messagingSenderId: CONFIG.messagingSenderId } : {}),
      ...(CONFIG.storageBucket ? { storageBucket: CONFIG.storageBucket } : {})
    });
    state.auth = state.sdk.getAuth(app);
    state.auth.languageCode = "es";
    state.db = state.sdk.getFirestore(app);
    state.functions = state.sdk.getFunctions(app, "us-central1");
  }
  const profileRef = uid => state.sdk.doc(state.db, "users", uid);
  const dataRef = uid => state.sdk.doc(state.db, "users", uid, "progress", "main");
  function randomStudentCode() {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return "HB-" + Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  async function ensureProfile(user) {
    const api = state.sdk;
    const ref = profileRef(user.uid);
    let docSnap = await api.getDoc(ref);
    if (docSnap.exists()) return docSnap.data();
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = randomStudentCode();
      const profile = {
        uid: user.uid,
        displayName: (user.displayName || "Estudiante").trim().slice(0,80),
        email: user.email || null,
        studentCode: code, role: "student", accountType: "public",
        institutionId: null, institutionName: null,
        createdAt: api.serverTimestamp(), updatedAt: api.serverTimestamp()
      };
      const batch = api.writeBatch(state.db);
      batch.set(ref, profile);
      batch.set(api.doc(state.db, "studentCodes", code), {
        uid: user.uid, createdAt: api.serverTimestamp()
      });
      try {
        await batch.commit();
        const confirmed = await api.getDoc(ref);
        return confirmed.data();
      } catch (err) {
        docSnap = await api.getDoc(ref).catch(() => null);
        if (docSnap && docSnap.exists()) return docSnap.data();
        if (attempt === 3) throw err;
      }
    }
    throw new Error("No se pudo crear el código estudiantil único.");
  }
  async function prepareCloud() {
    const api = state.sdk;
    const cloudDoc = await api.getDoc(dataRef(state.user.uid));
    const cloud = cloudDoc.exists() ? cloudDoc.data() : null;
    const inCloud = cloud && cloud.progress && typeof cloud.progress === "object" ? cloud.progress : {};
    const local = snapshot();
    state.revision = cloud && Number.isInteger(cloud.revision) ? cloud.revision : 0;
    state.lastSig = signature(inCloud);
    state.syncEnabled = false;
    if (signature(local) === signature(inCloud)) {
      state.syncEnabled = true;
      state.choosing = false;
      $("hb-sync-choice").hidden = true;
      message("Tu progreso está sincronizado. Los próximos cambios se guardarán en la nube.");
    } else {
      state.choosing = true;
      $("hb-sync-choice").hidden = false;
      const localCount = Object.keys(local).length;
      const cloudCount = Object.keys(inCloud).length;
      $("hb-sync-explain").textContent = "Este dispositivo tiene " + localCount +
        " registros y la nube " + cloudCount + ". Elige cuál conservar; ninguno se sobrescribirá automáticamente.";
      $("hb-pull-cloud").disabled = !cloudCount;
      $("hb-push-local").disabled = !localCount && cloudCount > 0;
      message("Hay avances pendientes de conciliar. Elige una de las opciones para activar la sincronización.");
    }
    profileView();
  }
  async function upload(force = false) {
    if (!state.user || !state.sdk || state.saving || !navigator.onLine) return;
    const current = snapshot(), str = signature(current);
    if (str.length > SNAPSHOT_LIMIT) throw new Error("El progreso supera el límite de 600 KB. Exporta tu respaldo antes de continuar.");
    if (!force && (!state.syncEnabled || str === state.lastSig)) return;
    const api = state.sdk, ref = dataRef(state.user.uid);
    state.saving = true;
    try {
      const nextRevision = await api.runTransaction(state.db, async tx => {
        const existing = await tx.get(ref);
        const remoteRevision = existing.exists() ? (existing.data().revision || 0) : 0;
        if (!force && remoteRevision !== state.revision) throw new Error("SYNC_CONFLICT");
        tx.set(ref, {
          progress: current, revision: remoteRevision + 1,
          updatedAt: api.serverTimestamp()
        });
        return remoteRevision + 1;
      });
      state.revision = nextRevision;
      state.lastSig = str;
      state.syncEnabled = true;
      state.choosing = false;
      $("hb-sync-choice").hidden = true;
      profileView();
      message("Tus avances se guardaron en la nube correctamente.");
    } catch (err) {
      if (/SYNC_CONFLICT/.test(String(err))) {
        state.syncEnabled = false;
        state.choosing = true;
        await prepareCloud();
      }
      throw err;
    } finally { state.saving = false; }
  }
  async function restoreCloud() {
    if (!state.user || !navigator.onLine) throw new Error("Conéctate a internet para recuperar una copia.");
    const document = await state.sdk.getDoc(dataRef(state.user.uid));
    if (!document.exists() || !document.data().progress) throw new Error("No existe una copia en la nube.");
    const old = snapshot();
    try {
      localStorage.setItem(BACKUP_PREFIX + "pre_restore_" + Date.now(), JSON.stringify(old));
      applySnapshot(document.data().progress);
    } catch (err) {
      applySnapshot(old);
      throw err;
    }
    message("Progreso recuperado. La aplicación volverá a abrirse con los datos de tu cuenta.");
    location.reload();
  }
  async function signedIn(user) {
    state.user = user;
    if (switchOwner(user.uid)) return;
    message("Preparando tu perfil académico…");
    state.profile = await ensureProfile(user);
    profileView();
    await prepareCloud();
  }
  async function startLogin(which) {
    if (!READY) { message("Primero hay que completar auth/firebase-config.js y configurar Firebase.", true); return; }
    if (!navigator.onLine) { message("Conéctate a internet para iniciar sesión.", true); return; }
    const api = state.sdk;
    const provider = which === "apple" ? new api.OAuthProvider("apple.com") : new api.GoogleAuthProvider();
    if (which === "apple") {
      provider.addScope("email");
      provider.addScope("name");
      provider.setCustomParameters({ locale: "es_ES" });
    } else provider.setCustomParameters({ prompt: "select_account" });
    try {
      message("Abriendo el inicio de sesión…");
      await api.signInWithPopup(state.auth, provider);
    } catch (err) { message(friendlyError(err), true); }
  }

  async function joinInstitution(code) {
    if (!state.user || !state.functions) return;
    const value = code.trim().toUpperCase().replace(/[\s-]/g, "");
    if (!/^[A-F0-9]{32}$/.test(value)) {
      message("El código institucional debe contener 32 caracteres hexadecimales proporcionados por un docente.", true);
      return;
    }
    try {
      message("Comprobando tu invitación…");
      const result = await state.sdk.httpsCallable(state.functions, "redeemInstitutionInvite")({ code: value });
      const latest = await state.sdk.getDoc(profileRef(state.user.uid));
      state.profile = latest.data();
      profileView();
      message("Ya perteneces a " + (result.data.name || "tu institución") + ".");
    } catch (err) { message(friendlyError(err), true); }
  }

  open.addEventListener("click", () => toggle(true));
  $("hb-auth-close").addEventListener("click", () => toggle(false));
  overlay.addEventListener("click", event => { if (event.target === overlay) toggle(false); });
  document.addEventListener("keydown", event => {
    if (!overlay.hidden && event.key === "Escape") toggle(false);
  });
  $("hb-auth-anon").addEventListener("click", () => toggle(false));
  $("hb-auth-google").addEventListener("click", () => startLogin("google"));
  $("hb-auth-apple").addEventListener("click", () => startLogin("apple"));
  $("hb-push-local").addEventListener("click", async () => {
    if (!confirm("¿Guardar los avances de este dispositivo como tu copia principal en la nube?")) return;
    try { await upload(true); } catch (err) { message(friendlyError(err), true); }
  });
  $("hb-pull-cloud").addEventListener("click", async () => {
    if (!confirm("Se guardará un respaldo de los avances actuales en este dispositivo y se recuperará la nube. ¿Continuar?")) return;
    try { await restoreCloud(); } catch (err) { message(friendlyError(err), true); }
  });
  $("hb-save-now").addEventListener("click", async () => {
    try {
      if (!state.syncEnabled) {
        message("Primero elige qué copia conservar en la sección de sincronización.", true); return;
      }
      await upload();
      if (signature(snapshot()) === state.lastSig) message("Tus avances ya están actualizados en la nube.");
    } catch (err) { message(friendlyError(err), true); }
  });
  $("hb-profile-form").addEventListener("submit", async event => {
    event.preventDefault();
    if (!state.user) return;
    const value = $("hb-display-name").value.trim().slice(0,80);
    if (value.length < 2) return message("Escribe un nombre de al menos dos caracteres.", true);
    try {
      await state.sdk.updateDoc(profileRef(state.user.uid), { displayName: value, updatedAt: state.sdk.serverTimestamp() });
      state.profile.displayName = value;
      profileView();
      message("Tu nombre se actualizó correctamente.");
    } catch (err) { message(friendlyError(err), true); }
  });
  $("hb-institution-form").addEventListener("submit", async event => {
    event.preventDefault();
    await joinInstitution($("hb-invite-code").value);
  });
  $("hb-sign-out").addEventListener("click", async () => {
    if (!state.auth) return;
    if (state.syncEnabled) {
      try { await upload(); }
      catch (err) {
        if (!confirm("No se pudo guardar el último cambio en la nube. Se conservará una copia local. ¿Cerrar sesión igualmente?")) return;
      }
    }
    switchToGuest();
    await state.sdk.signOut(state.auth);
    location.reload();
  });
  $("hb-delete-account").addEventListener("click", async () => {
    if (!state.user || state.deleting) return;
    if (!confirm("ELIMINAR CUENTA: Se borrarán tu cuenta, perfil, progresos y vinculación institucional en la nube. Esta acción no se puede deshacer. ¿Continuar?")) return;
    try {
      state.deleting = true;
      message("Solicitando eliminación de tu cuenta y de tus datos…");
      // Apple exige revocar la autorización de inicio de sesión antes de borrar la cuenta.
      if (state.user.providerData.some(item => item.providerId === "apple.com")) {
        const apple = new state.sdk.OAuthProvider("apple.com");
        apple.addScope("email");
        const result = await state.sdk.reauthenticateWithPopup(state.user, apple);
        const credential = state.sdk.OAuthProvider.credentialFromResult(result);
        if (!credential || !credential.accessToken) {
          throw new Error("No fue posible obtener el token de Apple para revocarlo.");
        }
        await state.sdk.revokeAccessToken(state.auth, credential.accessToken);
      }
      await state.sdk.httpsCallable(state.functions, "deleteMyAccount")({});
      const uid = state.user.uid;
      state.syncEnabled = false;
      localStorage.removeItem(BACKUP_PREFIX + uid);
      clearProgress();
      localStorage.removeItem(OWNER_KEY);
      try {
        const guest = localStorage.getItem(BACKUP_PREFIX + "guest");
        if (guest) applySnapshot(JSON.parse(guest));
      } catch (err) { console.warn(err); }
      location.reload();
    } catch (err) { state.deleting = false; message(friendlyError(err), true); }
  });
  const autoSave = () => {
    if (state.user && state.syncEnabled && !state.saving && navigator.onLine) {
      upload().catch(err => message(friendlyError(err), true));
    }
  };
  setInterval(autoSave, 20000);
  window.addEventListener("online", autoSave);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") autoSave(); });
  window.HebreoAccount = Object.freeze({
    open: () => toggle(true),
    isConfigured: READY,
    getStatus: () => ({
      signedIn: !!state.user,
      studentCode: state.profile && state.profile.studentCode || null,
      institutionId: state.profile && state.profile.institutionId || null,
      synced: state.syncEnabled
    })
  });
  guestView();
  configureButtons();
  if (location.hash === "#cuenta") toggle(true);
  if (READY) {
    loadFirebase().then(() => {
      state.sdk.onAuthStateChanged(state.auth, async user => {
        if (state.deleting) return;
        if (!user) {
          state.user = null;
          state.profile = null;
          state.syncEnabled = false;
          guestView();
          if (switchToGuest()) location.reload();
          return;
        }
        try { await signedIn(user); }
        catch (err) { message(friendlyError(err), true); }
      }, err => message(friendlyError(err), true));
    }).catch(err => message("No se pudo cargar Firebase: " + escapeStorageError(err), true));
  }
})();