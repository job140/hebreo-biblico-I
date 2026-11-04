"use strict";

/**
 * Hebreo Bíblico I · Firebase Functions v2
 * Funciones de servidor para grupos institucionales y derecho de eliminación.
 * Requiere desplegar con Firebase CLI desde la raíz del repositorio.
 * Ninguna clave privada debe subirse al repositorio.
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { randomBytes, createHash } = require("node:crypto");

initializeApp();
const db = getFirestore();
const REGION = "us-central1";

function needUser(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "Inicia sesión para continuar.");
  }
  return request.auth.uid;
}
function institutionId(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{3,64}$/.test(value)) {
    throw new HttpsError("invalid-argument", "Institución no válida.");
  }
  return value;
}
function inviteCode(raw) {
  const value = String(raw || "").trim().toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-F0-9]{32}$/.test(value)) {
    throw new HttpsError("invalid-argument", "Código de invitación no válido.");
  }
  return value;
}
function inviteHash(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function errorStatus(error) {
  if (error instanceof HttpsError) throw error;
  console.error("Error interno de funciones", error);
  throw new HttpsError("internal", "No se pudo completar la operación.");
}

/**
 * El docente/administrador emite invitaciones de 128 bits, que se almacenan
 * ÚNICAMENTE como SHA-256; el código completo solo se muestra una vez.
 * Un administrador inicial debe ser designado por el titular desde
 * Firebase Console/Admin SDK, nunca desde la aplicación cliente.
 */
exports.createInstitutionInvite = onCall(
  { region: REGION, maxInstances: 5 },
  async request => {
    const uid = needUser(request);
    const orgId = institutionId(request.data && request.data.institutionId);
    const requestedUses = Number(request.data && request.data.maxUses || 1);
    if (!Number.isInteger(requestedUses) || requestedUses < 1 || requestedUses > 100) {
      throw new HttpsError("invalid-argument", "La invitación puede tener entre 1 y 100 usos.");
    }
    const memberRef = db.doc("institutions/" + orgId + "/members/" + uid);
    const [member, institution] = await Promise.all([
      memberRef.get(), db.doc("institutions/" + orgId).get()
    ]);
    if (!member.exists || !["admin", "teacher"].includes(member.data().role) ||
        !institution.exists) {
      throw new HttpsError("permission-denied", "No tienes permiso para generar invitaciones.");
    }
    const code = randomBytes(16).toString("hex").toUpperCase();
    const hash = inviteHash(code);
    const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 3600 * 1000);
    try {
      await db.doc("institutionInvites/" + hash).create({
        institutionId: orgId,
        issuedBy: uid,
        enabled: true,
        maxUses: requestedUses,
        uses: 0,
        expiresAt,
        createdAt: FieldValue.serverTimestamp()
      });
      return { code, institutionId: orgId, maxUses: requestedUses,
        expiresAt: expiresAt.toDate().toISOString() };
    } catch (error) { return errorStatus(error); }
  }
);

/**
 * Los estudiantes solo se unen con invitaciones emitidas por un docente.
 * La operación de consumo de cupos y la matrícula es atómica.
 */
exports.redeemInstitutionInvite = onCall(
  { region: REGION, maxInstances: 15 },
  async request => {
    const uid = needUser(request);
    const code = inviteCode(request.data && request.data.code);
    const inviteRef = db.doc("institutionInvites/" + inviteHash(code));
    const profileRef = db.doc("users/" + uid);
    try {
      return await db.runTransaction(async tx => {
        const [inviteSnap, userSnap] = await Promise.all([
          tx.get(inviteRef), tx.get(profileRef)
        ]);
        if (!inviteSnap.exists) throw new HttpsError("not-found", "Invitación inexistente.");
        if (!userSnap.exists) throw new HttpsError("failed-precondition", "Primero crea tu perfil.");
        const inv = inviteSnap.data();
        const orgId = institutionId(inv.institutionId);
        const orgRef = db.doc("institutions/" + orgId);
        const memberRef = db.doc("institutions/" + orgId + "/members/" + uid);
        const [orgSnap, memberSnap] = await Promise.all([
          tx.get(orgRef), tx.get(memberRef)
        ]);
        if (!orgSnap.exists || typeof orgSnap.data().name !== "string") {
          throw new HttpsError("failed-precondition", "La institución no está disponible.");
        }
        const profile = userSnap.data();
        if (profile.institutionId && profile.institutionId !== orgId) {
          throw new HttpsError("failed-precondition", "Tu cuenta ya pertenece a otra institución.");
        }
        if (memberSnap.exists) {
          return { institutionId: orgId, name: orgSnap.data().name, alreadyMember: true };
        }
        const expireMs = inv.expiresAt && typeof inv.expiresAt.toMillis === "function"
          ? inv.expiresAt.toMillis() : 0;
        if (!inv.enabled || expireMs <= Date.now() ||
            (inv.uses || 0) >= (inv.maxUses || 0)) {
          throw new HttpsError("failed-precondition", "La invitación está vencida o agotada.");
        }
        if (profile.role !== "student") {
          throw new HttpsError("permission-denied", "El código es exclusivo para estudiantes.");
        }
        tx.create(memberRef, {
          uid, role: "student", createdAt: FieldValue.serverTimestamp(),
          institutionId: orgId
        });
        tx.update(profileRef, {
          institutionId: orgId,
          institutionName: orgSnap.data().name,
          accountType: "institution",
          updatedAt: FieldValue.serverTimestamp()
        });
        tx.update(inviteRef, {
          uses: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp()
        });
        return { institutionId: orgId, name: orgSnap.data().name, alreadyMember: false };
      });
    } catch (error) { return errorStatus(error); }
  }
);

/**
 * Eliminación iniciada por el propio usuario.
 * Borra progreso/subcolecciones, registro de código, matrícula y credenciales.
 * Es necesario ofrecer también un enlace web externo para solicitar borrado
 * antes de aprobar Google Play.
 */
exports.deleteMyAccount = onCall(
  { region: REGION, maxInstances: 10 },
  async request => {
    const uid = needUser(request);
    const profileRef = db.doc("users/" + uid);
    try {
      const profileSnap = await profileRef.get();
      const profile = profileSnap.exists ? profileSnap.data() : null;
      if (profile && typeof profile.studentCode === "string") {
        const codeRef = db.doc("studentCodes/" + profile.studentCode);
        const codeSnap = await codeRef.get();
        if (codeSnap.exists && codeSnap.data().uid === uid) {
          await codeRef.delete();
        }
      }
      if (profile && typeof profile.institutionId === "string") {
        const orgId = institutionId(profile.institutionId);
        await db.doc("institutions/" + orgId + "/members/" + uid).delete();
      }
      await db.recursiveDelete(profileRef);
      await getAuth().deleteUser(uid);
      return { deleted: true };
    } catch (error) { return errorStatus(error); }
  }
);
