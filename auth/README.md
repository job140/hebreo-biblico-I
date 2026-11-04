# Cuentas y progreso — Hebreo Bíblico I (versión 4.9.0)

## Qué se ha implementado
- Entrada **Mi cuenta** con interfaz móvil: Google, Apple, invitado y ficha del estudiante.
- Autenticación web con Firebase Authentication (Google, Apple **solo después de configurar Apple Developer**).
- Código estudiantil público `HB-XXXXXXXXXXXXXXXX` (64 bits aleatorios) único gracias a **registro atómico en Firestore**, independiente del correo.
- Perfil público y posibilidad de ingresar a una institución **solo** mediante un código emitido por un docente autorizado en Cloud Functions.
- Copia y sincronización de progreso de los módulos existentes. Para no perder datos, compara el dispositivo y la nube y obliga a elegir antes de sobrescribir.
- Una copia local por cuenta cuando se comparte un dispositivo, además de la copia para invitado. No se suben contraseñas.
- Actualizaciones de la aplicación mediante el service worker de la misma PWA.
- Eliminación de cuenta desde la interfaz, completada por una Cloud Function **solo después de desplegar el backend**.

## Cómo activarlo
1. Completa `auth/firebase-config.js` únicamente con la **configuración pública** de tu Web App registrada en Firebase.
2. Crea Firestore (modo producción), habilita Google Auth y autoriza `job140.github.io`. El proyecto requiere identidad de adulto titular si las políticas lo exigen.
3. Publica las reglas: `firebase deploy --only firestore --project TU_PROYECTO`.
4. Publica las funciones: `firebase deploy --only functions --project TU_PROYECTO`. **Cloud Functions puede requerir plan Blaze y facturación habilitada**.
5. Para Apple, configura Apple Developer Team, Services ID y clave privada solo en la **consola de Firebase**; habilita el proveedor y cambia `appleEnabled` a `true`.
6. Haz pruebas con cuentas de test y Firebase Emulator Suite antes de invitar a estudiantes reales.

Guía completa: [firebase/README.md](../firebase/README.md).

## Modelo de datos
```text
/users/{uid}
  uid, displayName, email, studentCode, role="student"
  accountType="public"|"institution", institutionId, institutionName
  createdAt, updatedAt
  /progress/main
    progress: { "hb_done": "...", "hb_bible_v46": "...", ... }
    revision: número monótono, updatedAt

/studentCodes/{code}
  uid, createdAt

/institutions/{institutionId}
  name, ... [solo puede crearlo el administrador del proyecto]
  /members/{uid}
    uid, institutionId, role="student"|"teacher"|"admin", createdAt

/institutionInvites/{SHA256(codigo)}
  institutionId, issuedBy, maxUses, uses, enabled, expiresAt
```

**Seguridad:** el navegador no puede cambiar `role`, `studentCode`, `institutionId` ni `institutionName`. Un docente autorizado genera un código seguro mediante `createInstitutionInvite`; el servidor lo consume con transacción mediante `redeemInstitutionInvite`. No hay acceso a datos ajenos por conocer un código estudiantil.

**Sincronización:** `progress/main` almacena una copia de cadenas de `localStorage` que comiencen por `hb_` o `hebreo_`, excluyendo claves `hb_account_*`, `hb_auth_*` y `hb_cloud_*`. La copia tiene un límite cliente de 600 KB y revisión verificada en transacción. En una discrepancia, el usuario debe elegir copiar el dispositivo o restaurar la nube. Una restauración recarga la aplicación para reinicializar los módulos existentes.

**Limitación actual:** no se fusionan automáticamente respuestas de dos dispositivos que avanzan simultáneamente; se ofrece elegir una copia para evitar reemplazos silenciosos. El seguimiento docente, la administración multiinstitución, una política de retención y las pruebas con emulador siguen como etapas posteriores. La autenticación y el respaldo real **no** funcionan hasta configurar y desplegar Firebase.

## Riesgos a comprobar
- Algunos navegadores de Android pueden bloquear ventanas emergentes de OAuth; probar Google y Apple en Chrome y TWA. Para futuros flujos de redirección, verificar las restricciones de terceros y dominio de autenticación.
- La app anterior almacena los avances en la misma área local del origen. Antes de cambiar de PWA a una instalación de Google Play, probar con datos reales y exportar respaldo.
- Antes de producción, revisar reglas con `firebase emulators:start` y `@firebase/rules-unit-testing`, así como borrado seguro y recuperación tras desconexión.
- Las claves de configuración web de Firebase no son contraseñas, pero **nunca** publicar la clave privada de Apple, llaves `.p8`, cuentas de servicio o certificados de firma.
