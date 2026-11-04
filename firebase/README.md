# Firebase — implementación mixta de estudiantes

> **Estado: código preparado, NO configurado ni desplegado en un proyecto Firebase.**
> El inicio de sesión y los datos en nube estarán inactivos hasta completar los pasos siguientes.
> No se requiere modificar el HTML educativo ni las 140 palabras para configurarlo.

## 1. Crear un proyecto bajo tu administración

1. Visita https://console.firebase.google.com/ y crea un proyecto nuevo (por ejemplo `hebreo-biblico-i`; el identificador real debe ser único).
2. En **Build → Authentication → Sign-in method**, activa **Google** y configura el correo de soporte.
3. En Authentication → Settings → Authorized domains, añade `job140.github.io` (sin `https://` ni la ruta). No se garantiza que nuevos proyectos incluyan ese dominio por defecto.
4. En Project settings → Your apps registra **una aplicación Web** y copia únicamente `apiKey`, `authDomain`, `projectId` y `appId` al archivo [`auth/firebase-config.js`](../auth/firebase-config.js). Añade `messagingSenderId` y `storageBucket` si aparecen.
5. Crea una base **Cloud Firestore** en **modo producción**, con ubicación adecuada. Elige una región compatible con las Cloud Functions.
6. La cuenta del proyecto debe ser gestionada por un titular autorizado; revisa el tratamiento de datos y el presupuesto de Firebase.

## 2. Instalar CLI y desplegar reglas y funciones

Desde una computadora con Node.js 22 y una instalación de Firebase CLI:

```sh
npm install -g firebase-tools
firebase login
firebase projects:list
firebase use --add
# Selecciona el proyecto existente. La primera vez genera .firebaserc local.
firebase deploy --only firestore
cd firebase/functions && npm install && cd ../..
firebase deploy --only functions
```

**Importante:** `firebase use --add` debe apuntar al mismo proyecto que has escrito en el config Web. El despliegue de Cloud Functions puede requerir pasar al **plan Blaze** con facturación; revisa límites y establece avisos de presupuesto. No subas `.firebaserc` si contiene un proyecto personal que no deseas asociar automáticamente a este repositorio.

Las reglas se encuentran en `firebase/firestore.rules`, y la configuración de despliegue en `firebase.json` (en la raíz del repositorio).

## 3. Prueba con Google (primero)

1. En la aplicación, abre **Mi cuenta → Continuar con Google**.
2. Debe crearse `users/{uid}` y `studentCodes/{HB-...}` en un lote atómico; después, lee tu perfil.
3. En `Firestore → users/{uid}`, comprueba que el rol sea `student` y `institutionId` sea `null`.
4. Haz una práctica y selecciona **Guardar los avances de este dispositivo en la nube**.
5. Abre la app en otro navegador e inicia sesión con la misma cuenta. Elige **Recuperar la copia de la nube**.
6. Verifica que los ejercicios y el vocabulario sean iguales. Prueba también una disputa de versiones y comprueba que ninguna copia sea sustituida automáticamente.
7. La opción invitado sigue usando solo `localStorage`.

## 4. Apple (activar después)

Para usar **Continuar con Apple** debes pertenecer al Apple Developer Program, configurar un **Services ID**, la web y el retorno `https://TU_PROJECT_ID.firebaseapp.com/__/auth/handler`, generar una clave Apple privada desde el portal Apple y habilitar el proveedor Apple en Firebase Authentication. La clave privada se registra en los controles protegidos de Firebase, **no en GitHub**.

Cuando esté configurado y comprobado, cambia el campo `appleEnabled` de `auth/firebase-config.js` a `true` y actualiza la versión del service worker; prueba inicio de sesión y eliminación. Apple puede ocultar el correo real usando un correo relay; hay que respetar esa elección. **No vincules automáticamente dos identidades por coincidencia de correo.**

Documentación:
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/auth/web/apple

## 5. Modelo institucional seguro

Cada estudiante comienza con perfil público. Un alumno **no puede** escribir `institutionId`, `role` ni `accountType` en su perfil desde el navegador. La vinculación solo ocurre usando Cloud Functions.

Preparación inicial que debe efectuar el **administrador del proyecto Firebase**:
- Crear un documento `institutions/mi-instituto` con el campo `name` (texto).
- Localizar el `uid` en Authentication del docente autorizado (el docente inicia sesión primero).
- Crear por consola administrativa segura el documento `institutions/mi-instituto/members/UID_DEL_DOCENTE` con `uid`, `institutionId: "mi-instituto"`, `role: "admin"` y `createdAt`. Estos documentos se escriben solo con credenciales administrativas, nunca por el cliente. No concedas rol docente a usuarios no verificados.
- Desde un cliente autorizado llamar a `createInstitutionInvite({institutionId:"mi-instituto",maxUses:30})`; el backend devuelve un código de 32 caracteres que caduca en 7 días.
- El alumno introduce ese código en **Mi cuenta → Vincular una institución**. `redeemInstitutionInvite` verifica la invitación y el cupo mediante una transacción, y asigna el rol seguro `student` al miembro.

**Alcance actual:** matrícula de alumnos. No se ha creado todavía panel para profesores ni consulta de notas de otros estudiantes. Los docentes no pueden obtener esos datos directamente por las reglas de cliente; se necesitaría añadir una función explícita con autorizaciones y consentimiento.

## 6. Eliminación de la cuenta

La interfaz ofrece **Eliminar cuenta y datos**. Llama a `deleteMyAccount`, que borra código, membresía, perfil, subcolecciones y cuenta de Authentication con Admin SDK. Para usuarios que usan Apple, la aplicación deberá revocar sus tokens de autorización antes del borrado, como establecen las instrucciones de Apple/Firebase. Puedes probar el procedimiento con cuentas de test antes de una revisión de Google Play.

La URL pública orientativa de eliminación es `https://job140.github.io/hebreo-biblico-I/eliminar-cuenta.html`. Su enlace de acción abre la interfaz de cuenta; el borrado efectivo requiere que las Cloud Functions estén desplegadas. No presentes el proceso como operativo antes de comprobarlo.

## 7. Seguridad, privacidad y producción

- Las reglas Firestore deniegan la lectura de datos ajenos, la escalada de rol y las modificaciones manuales a un grupo institucional.
- **No despliegues las reglas sin probarlas primero** con Emulator Suite y al menos dos cuentas de prueba. Usa reglas unitarias para acceso propio, acceso ajeno, creación de código y cambios indebidos de rol.
- Emplea App Check y controles de abuso antes de escalar; revisa métricas de Firestore/Functions, costos de facturación y disponibilidad offline.
- La nube guarda nombre, correo disponible, código único, pertenencia institucional y progreso de estudio. Actualiza la política de privacidad y los formularios de Data safety de Google Play **antes de lanzar la app**.
- La carga de archivos de la PWA seguirá desde GitHub Pages; la configuración Firebase y la base deben desplegarse por el propietario desde la consola o CLI. No hay una conexión de Firebase autorizada desde este chat.
